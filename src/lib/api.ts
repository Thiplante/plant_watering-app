import { supabase } from "@/lib/supabase";

export async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

export async function getAuthenticatedHeaders(headers?: HeadersInit) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("Session introuvable. Reconnecte-toi puis reessaie.");
  }

  return {
    ...(headers || {}),
    Authorization: `Bearer ${accessToken}`,
  };
}
