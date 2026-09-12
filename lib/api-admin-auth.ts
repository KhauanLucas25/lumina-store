import "server-only";

import { getAuthenticatedAdmin } from "@/lib/supabase-admin-auth";

export async function denyNonAdmin() {
  const administrator = await getAuthenticatedAdmin();

  if (administrator) {
    return null;
  }

  return Response.json(
    {
      error: "Acesso administrativo não autorizado.",
    },
    {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}