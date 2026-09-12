import "server-only";

import { createClient } from "@/utils/supabase/server";

export async function getAuthenticatedAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const {
    data: administrator,
    error: administratorError,
  } = await supabase
    .from("lumina_administradores")
    .select("usuario_id, ativo")
    .eq("usuario_id", user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (administratorError || !administrator) {
    return null;
  }

  return user;
}