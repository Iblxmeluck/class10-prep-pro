import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Returns a short-lived signed URL for a resource, but only after verifying
 * server-side that this user may view (or download) it. Never trust the client.
 */
export const getResourceLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ resourceId: z.string().uuid(), mode: z.enum(["view", "download"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // RLS already restricts this select to resources the member may view.
    const { data: resource, error } = await supabase
      .from("resources")
      .select("id, name, kind, storage_path")
      .eq("id", data.resourceId)
      .maybeSingle();
    if (error || !resource) throw new Error("You do not have access to this resource");

    const { data: adminRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!adminRow;

    if (!isAdmin) {
      const { data: settings } = await supabase
        .from("member_settings")
        .select("can_view_pdf, can_download_pdf, can_view_image, can_download_image")
        .eq("user_id", userId)
        .maybeSingle();
      if (!settings) throw new Error("No access configured for your account");
      const isPdf = resource.kind === "pdf";
      const allowed =
        data.mode === "download"
          ? isPdf
            ? settings.can_download_pdf
            : settings.can_download_image
          : isPdf
            ? settings.can_view_pdf
            : settings.can_view_image;
      if (!allowed) throw new Error("Your account is not allowed to " + data.mode + " this resource");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("resources")
      .createSignedUrl(resource.storage_path, 300, data.mode === "download" ? { download: resource.name } : {});
    if (signErr || !signed) throw new Error("Could not prepare the file link");

    if (data.mode === "download") {
      await supabase.from("downloads").insert({ user_id: userId, resource_id: resource.id });
    }
    await supabase.from("activity_logs").insert({
      user_id: userId,
      event: `${resource.kind === "pdf" ? "PDF" : "Image"} ${data.mode === "download" ? "downloaded" : "viewed"}`,
      detail: resource.name,
    });

    return { url: signed.signedUrl, name: resource.name };
  });
