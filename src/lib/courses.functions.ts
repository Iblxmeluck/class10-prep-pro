import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertAdmin(ctx: { supabase: { rpc: Function }; userId: string }) {
  const { data } = await (ctx.supabase.rpc as (n: string, a: unknown) => Promise<{ data: boolean }>)("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Only teachers can do this");
}

export type DurationUnit = "minute" | "hour" | "day" | "week" | "month";

export type StoreCourse = {
  id: string;
  name: string;
  description: string;
  thumbnail_url: string | null;
  exp_price: number;
  duration_value: number;
  duration_unit: DurationUnit;
  is_active: boolean;
  store_visible: boolean;
  expiresAt: string | null;
  hasAccess: boolean;
};

const activeFilter = (rows: Array<{ status: string; expires_at: string | null }>) =>
  rows.filter((r) => r.status === "active" && (!r.expires_at || new Date(r.expires_at).getTime() > Date.now()));

/** Courses visible in the EXP store + the member's own active access. */
export const listStoreCourses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const [coursesRes, accessRes, balRes] = await Promise.all([
      db
        .from("exp_courses")
        .select("id, name, description, thumbnail_url, exp_price, duration_value, duration_unit, is_active, store_visible")
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      db
        .from("exp_course_access")
        .select("course_id, status, expires_at")
        .eq("user_id", context.userId),
      db.from("member_exp").select("balance, lifetime").eq("user_id", context.userId).maybeSingle(),
    ]);
    const active = activeFilter((accessRes.data ?? []) as never);
    const byCourse = new Map(active.map((a) => [(a as unknown as { course_id: string }).course_id, a.expires_at]));
    const courses = (coursesRes.data ?? [])
      .filter((c) => c.store_visible || byCourse.has(c.id))
      .map((c) => ({
        ...c,
        hasAccess: byCourse.has(c.id),
        expiresAt: byCourse.get(c.id) ?? null,
      })) as StoreCourse[];
    return { courses, balance: balRes.data?.balance ?? 0 };
  });

/** Only the courses this member currently has access to (for navigation). */
export const myActiveCourses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const { data } = await db
      .from("exp_course_access")
      .select("course_id, status, expires_at, exp_courses(id, name, is_active)")
      .eq("user_id", context.userId);
    return activeFilter((data ?? []) as never)
      .map((r) => {
        const c = (r as unknown as { exp_courses: { id: string; name: string; is_active: boolean } | null }).exp_courses;
        return c && c.is_active ? { id: c.id, name: c.name, expiresAt: r.expires_at } : null;
      })
      .filter(Boolean) as Array<{ id: string; name: string; expiresAt: string | null }>;
  });

export const purchaseCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ courseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc("purchase_exp_course", { _course: data.courseId });
    if (error) throw new Error(error.message.includes("Not enough EXP") ? "You do not have enough EXP" : error.message);
    return res as { ok: boolean; alreadyOwned: boolean; balance?: number; expiresAt?: string };
  });

/** Server-authoritative course content fetch — throws when access is missing or expired. */
export const getCourseForMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ courseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: access } = await db
      .from("exp_course_access")
      .select("id, status, expires_at, purchased_at")
      .eq("user_id", context.userId)
      .eq("course_id", data.courseId)
      .order("purchased_at", { ascending: false })
      .limit(5);
    const live = activeFilter((access ?? []) as never)[0];
    if (!live) return { allowed: false as const };
    const { data: course } = await db
      .from("exp_courses")
      .select("id, name, description, thumbnail_url, course_url, body, is_active")
      .eq("id", data.courseId)
      .maybeSingle();
    if (!course || !course.is_active) return { allowed: false as const };
    return { allowed: true as const, course, expiresAt: live.expires_at, now: new Date().toISOString() };
  });

/* ---------------- admin ---------------- */

const courseInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(1000).default(""),
  thumbnailUrl: z.string().max(500).nullable().optional(),
  courseUrl: z.string().max(500).nullable().optional(),
  body: z.string().max(20000).default(""),
  expPrice: z.number().int().min(0).max(1000000),
  durationValue: z.number().int().min(1).max(100000),
  durationUnit: z.enum(["minute", "hour", "day", "week", "month"]),
  isActive: z.boolean().default(true),
  storeVisible: z.boolean().default(true),
});

export const adminCoursesOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    const [courses, purchases, members] = await Promise.all([
      db.from("exp_courses").select("*").order("created_at", { ascending: false }),
      db
        .from("exp_course_access")
        .select("id, user_id, course_id, exp_spent, source, status, purchased_at, expires_at")
        .order("purchased_at", { ascending: false })
        .limit(300),
      db.from("profiles").select("id, username, display_name").order("username"),
    ]);
    return { courses: courses.data ?? [], purchases: purchases.data ?? [], members: members.data ?? [] };
  });

export const saveCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => courseInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const row = {
      name: data.name,
      description: data.description,
      thumbnail_url: data.thumbnailUrl?.trim() || null,
      course_url: data.courseUrl?.trim() || null,
      body: data.body,
      exp_price: data.expPrice,
      duration_value: data.durationValue,
      duration_unit: data.durationUnit,
      is_active: data.isActive,
      store_visible: data.storeVisible,
      created_by: context.userId,
    };
    if (data.id) await db.from("exp_courses").update(row).eq("id", data.id);
    else await db.from("exp_courses").insert(row);
    return { ok: true };
  });

export const setCourseFlags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), isActive: z.boolean().optional(), storeVisible: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const patch: { is_active?: boolean; store_visible?: boolean } = {};
    if (data.isActive !== undefined) patch.is_active = data.isActive;
    if (data.storeVisible !== undefined) patch.store_visible = data.storeVisible;
    if (Object.keys(patch).length) await db.from("exp_courses").update(patch).eq("id", data.id);
    return { ok: true };
  });

export const deleteCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    await db.from("exp_courses").delete().eq("id", data.id);
    return { ok: true };
  });

export const grantCourseAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ courseId: z.string().uuid(), userId: z.string().uuid(), useDuration: z.boolean().default(true) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data: course } = await db
      .from("exp_courses")
      .select("duration_value, duration_unit")
      .eq("id", data.courseId)
      .maybeSingle();
    if (!course) throw new Error("Course not found");
    const ms: Record<string, number> = { minute: 6e4, hour: 36e5, day: 864e5, week: 6048e5, month: 2592e6 };
    const expires = data.useDuration
      ? new Date(Date.now() + course.duration_value * (ms[course.duration_unit] ?? 864e5)).toISOString()
      : null;
    await db.from("exp_course_access").insert({
      user_id: data.userId,
      course_id: data.courseId,
      exp_spent: 0,
      source: "admin",
      status: "active",
      expires_at: expires,
    });
    return { ok: true };
  });

export const revokeCourseAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ accessId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    await db.from("exp_course_access").update({ status: "cancelled" }).eq("id", data.accessId);
    return { ok: true };
  });
