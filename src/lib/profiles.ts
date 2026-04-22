import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

export async function ensureProfile() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const payload = {
    id: user.id,
    email: user.email?.toLowerCase() || null,
  };

  await supabase.from("profiles").upsert(payload, { onConflict: "id" });

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data || null) as Profile | null;
}
