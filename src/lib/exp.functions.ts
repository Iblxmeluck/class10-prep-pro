import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertAdmin(ctx: { supabase: { rpc: Function }; userId: string }) {
  const { data } = await (ctx.supabase.rpc as (n: string, a: unknown) => Promise<{ data: boolean }>)(
    "has_role",
    { _user_id: ctx.userId, _role: "admin" },
  );
  if (!data) throw new Error("Only teachers can do this");
  return true;
}

async function addExp(db: Admin, userId: string, delta: number, reason: string, ref?: string | null) {
  if (!delta) return 0;
  if (ref) {
    const { data: dupe } = await db
      .from("exp_ledger")
      .select("id")
      .eq("user_id", userId)
      .eq("reason", reason)
      .eq("ref", ref)
      .maybeSingle();
    if (dupe) return 0;
  }
  const { data: row } = await db.from("member_exp").select("balance, lifetime").eq("user_id", userId).maybeSingle();
  const balance = (row?.balance ?? 0) + delta;
  const lifetime = (row?.lifetime ?? 0) + Math.max(0, delta);
  if (balance < 0) throw new Error("Not enough EXP");
  await db
    .from("member_exp")
    .upsert({ user_id: userId, balance, lifetime, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  await db.from("exp_ledger").insert({ user_id: userId, delta, reason, ref: ref ?? null });
  return delta;
}

/** Award EXP for a rule key; safe to call repeatedly with the same ref. */
export async function awardRuleExp(userId: string, key: string, ref?: string | null, times = 1) {
  const db = await admin();
  const { data: rule } = await db.from("exp_rules").select("exp, enabled").eq("key", key).maybeSingle();
  if (!rule?.enabled || !rule.exp) return 0;
  return addExp(db, userId, rule.exp * times, key, ref ?? null);
}

export const awardExpForEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ key: z.string().min(1).max(50), ref: z.string().max(100).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const allowed = ["todo_task", "streak_day", "chapter_complete", "achievement"];
    if (!allowed.includes(data.key)) throw new Error("Unknown reward");
    const gained = await awardRuleExp(context.userId, data.key, data.ref ?? null);
    return { gained };
  });

/** Game points a student has not turned into EXP yet. */
export const getGamePoints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const [ruleRes, attemptsRes, ledgerRes] = await Promise.all([
      db.from("exp_rules").select("exp, enabled").eq("key", "game_point").maybeSingle(),
      db
        .from("game_attempts")
        .select("id, score, correct")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(300),
      db.from("exp_ledger").select("ref").eq("user_id", context.userId).eq("reason", "game_point").limit(2000),
    ]);
    const done = new Set((ledgerRes.data ?? []).map((l) => l.ref));
    const pending = (attemptsRes.data ?? []).filter((a) => !done.has(a.id) && (a.correct ?? 0) > 0);
    const points = pending.reduce((s, a) => s + (a.correct ?? 0), 0);
    const rate = ruleRes.data?.enabled ? (ruleRes.data.exp ?? 0) : 0;
    return { points, rate, exp: points * rate, enabled: Boolean(ruleRes.data?.enabled) };
  });

/** Turn earned game points into EXP (each round is counted only once). */
export const convertGamePoints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const { data: rule } = await db.from("exp_rules").select("exp, enabled").eq("key", "game_point").maybeSingle();
    if (!rule?.enabled || !rule.exp) throw new Error("Game point conversion is turned off");
    const [attemptsRes, ledgerRes] = await Promise.all([
      db
        .from("game_attempts")
        .select("id, score, correct")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(300),
      db.from("exp_ledger").select("ref").eq("user_id", context.userId).eq("reason", "game_point").limit(2000),
    ]);
    const done = new Set((ledgerRes.data ?? []).map((l) => l.ref));
    const pending = (attemptsRes.data ?? []).filter((a) => !done.has(a.id) && (a.correct ?? 0) > 0);
    if (!pending.length) return { gained: 0, points: 0 };
    let gained = 0;
    let points = 0;
    for (const a of pending) {
      gained += await addExp(db, context.userId, rule.exp * (a.correct ?? 0), "game_point", a.id);
      points += a.correct ?? 0;
    }
    if (gained)
      await db.from("activity_logs").insert({
        user_id: context.userId,
        event: "game_points_converted",
        detail: `${points} points → ${gained} EXP`,
      });
    return { gained, points };
  });

export const getExpStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const db = await admin();

    const [balanceRes, itemsRes, purchasesRes, ledgerRes] = await Promise.all([
      db.from("member_exp").select("balance, lifetime").eq("user_id", userId).maybeSingle(),
      supabase
        .from("store_items")
        .select(
          "id, title, description, item_type, exp_price, external_url, link_id, resource_id, flashcard_set_id, course_id, page_id, is_active, custom_pages(name, slug), links(url, title)",
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      db
        .from("store_purchases")
        .select("id, item_id, exp_spent, created_at, store_items(title, item_type)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      db.from("exp_ledger").select("id, delta, reason, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(25),
    ]);

    const owned = new Set((purchasesRes.data ?? []).map((p) => p.item_id));
    return {
      balance: balanceRes.data?.balance ?? 0,
      lifetime: balanceRes.data?.lifetime ?? 0,
      items: (itemsRes.data ?? []).map((i) => ({ ...i, purchased: owned.has(i.id) })),
      purchases: purchasesRes.data ?? [],
      ledger: ledgerRes.data ?? [],
    };
  });

export const purchaseStoreItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ itemId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const db = await admin();
    const { data: item } = await db
      .from("store_items")
      .select("id, title, exp_price, is_active, page_id")
      .eq("id", data.itemId)
      .maybeSingle();
    if (!item || !item.is_active) throw new Error("This item is not available");

    const { data: existing } = await db
      .from("store_purchases")
      .select("id")
      .eq("user_id", userId)
      .eq("item_id", item.id)
      .maybeSingle();
    if (existing) return { ok: true, alreadyOwned: true };

    const { data: bal } = await db.from("member_exp").select("balance").eq("user_id", userId).maybeSingle();
    if ((bal?.balance ?? 0) < item.exp_price) throw new Error("You do not have enough EXP for this item");

    await addExp(db, userId, -item.exp_price, "purchase", item.id);
    await db.from("store_purchases").insert({ user_id: userId, item_id: item.id, exp_spent: item.exp_price });
    if (item.page_id)
      await db
        .from("custom_page_access")
        .upsert({ page_id: item.page_id, user_id: userId, source: "purchase" }, { onConflict: "page_id,user_id" });
    await db.from("activity_logs").insert({ user_id: userId, event: "store_purchase", detail: item.title });
    return { ok: true, alreadyOwned: false };
  });

/* ---------------- admin ---------------- */

export const adminExpOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    const [rules, items, pages, access, members, balances] = await Promise.all([
      db.from("exp_rules").select("key, label, exp, enabled").order("key"),
      db
        .from("store_items")
        .select("id, title, description, item_type, exp_price, is_active, page_id, external_url, created_at")
        .order("created_at", { ascending: false }),
      db.from("custom_pages").select("id, name, slug, description, visibility, is_published").order("created_at", { ascending: false }),
      db.from("custom_page_access").select("page_id, user_id, source"),
      db.from("profiles").select("id, username, display_name").order("username"),
      db.from("member_exp").select("user_id, balance, lifetime"),
    ]);
    return {
      rules: rules.data ?? [],
      items: items.data ?? [],
      pages: pages.data ?? [],
      access: access.data ?? [],
      members: members.data ?? [],
      balances: balances.data ?? [],
    };
  });

export const setExpRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ key: z.string(), exp: z.number().int().min(0).max(10000), enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    await db.from("exp_rules").update({ exp: data.exp, enabled: data.enabled, updated_at: new Date().toISOString() }).eq("key", data.key);
    return { ok: true };
  });

export const adjustMemberExp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), delta: z.number().int().min(-100000).max(100000), note: z.string().max(120).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    await addExp(db, data.userId, data.delta, data.note?.trim() || "teacher_adjustment");
    return { ok: true };
  });

const itemInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(120),
  description: z.string().max(500).default(""),
  itemType: z.enum(["note", "pdf", "video", "flashcards", "course", "page"]),
  expPrice: z.number().int().min(0).max(100000),
  linkId: z.string().uuid().nullable().optional(),
  resourceId: z.string().uuid().nullable().optional(),
  flashcardSetId: z.string().uuid().nullable().optional(),
  courseId: z.string().uuid().nullable().optional(),
  externalUrl: z.string().max(500).nullable().optional(),
  isActive: z.boolean().default(true),
  page: z
    .object({
      name: z.string().min(1).max(80),
      slug: z
        .string()
        .min(1)
        .max(60)
        .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes only"),
      description: z.string().max(500).default(""),
      icon: z.string().max(40).default("Sparkles"),
      body: z.string().max(20000).default(""),
      visibility: z.enum(["all", "selected"]).default("selected"),
      memberIds: z.array(z.string().uuid()).default([]),
    })
    .optional(),
});

export const saveStoreItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => itemInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();

    let pageId: string | null = null;
    if (data.itemType === "page") {
      if (!data.page) throw new Error("Page details are required");
      const { data: page, error } = await db
        .from("custom_pages")
        .upsert(
          {
            name: data.page.name,
            slug: data.page.slug,
            description: data.page.description,
            icon: data.page.icon,
            body: data.page.body,
            visibility: data.page.visibility,
            is_published: true,
            created_by: context.userId,
          },
          { onConflict: "slug" },
        )
        .select("id")
        .single();
      if (error || !page) throw new Error(error?.message ?? "Could not save this page");
      pageId = page.id;
      if (data.page.memberIds.length)
        await db
          .from("custom_page_access")
          .upsert(
            data.page.memberIds.map((u) => ({ page_id: page.id, user_id: u, source: "admin" })),
            { onConflict: "page_id,user_id" },
          );
    }

    const row = {
      title: data.title,
      description: data.description,
      item_type: data.itemType,
      exp_price: data.expPrice,
      link_id: data.linkId ?? null,
      resource_id: data.resourceId ?? null,
      flashcard_set_id: data.flashcardSetId ?? null,
      course_id: data.courseId ?? null,
      page_id: pageId,
      external_url: data.externalUrl?.trim() || null,
      is_active: data.isActive,
      created_by: context.userId,
    };
    if (data.id) await db.from("store_items").update(row).eq("id", data.id);
    else await db.from("store_items").insert(row);
    return { ok: true };
  });

export const setStoreItemActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), isActive: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    await db.from("store_items").update({ is_active: data.isActive }).eq("id", data.id);
    return { ok: true };
  });

export const deleteStoreItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    await db.from("store_items").delete().eq("id", data.id);
    return { ok: true };
  });

export const setPageVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        pageId: z.string().uuid(),
        visibility: z.enum(["all", "selected"]).optional(),
        isPublished: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const patch: { visibility?: string; is_published?: boolean } = {};
    if (data.visibility) patch.visibility = data.visibility;
    if (data.isPublished !== undefined) patch.is_published = data.isPublished;
    if (Object.keys(patch).length) await db.from("custom_pages").update(patch).eq("id", data.pageId);
    return { ok: true };
  });

export const setPageMemberAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ pageId: z.string().uuid(), userId: z.string().uuid(), granted: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    if (data.granted)
      await db
        .from("custom_page_access")
        .upsert({ page_id: data.pageId, user_id: data.userId, source: "admin" }, { onConflict: "page_id,user_id" });
    else await db.from("custom_page_access").delete().eq("page_id", data.pageId).eq("user_id", data.userId);
    return { ok: true };
  });

export const deleteCustomPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pageId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    await db.from("custom_pages").delete().eq("id", data.pageId);
    return { ok: true };
  });
