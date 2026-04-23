import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

export async function ensureProfile() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const normalizedEmail = user.email?.toLowerCase() || null;
  const { data: existingProfile, error: selectError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existingProfile) {
    if (existingProfile.email !== normalizedEmail) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ email: normalizedEmail })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }
    }

    return {
      ...existingProfile,
      email: normalizedEmail,
    } as Profile;
  }

  const { data: insertedProfile, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: normalizedEmail,
    })
    .select("*")
    .single();

  if (insertError) {
    throw insertError;
  }

  return insertedProfile as Profile;
}
