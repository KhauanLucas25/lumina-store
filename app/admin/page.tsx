import Link from "next/link";
import { redirect } from "next/navigation";

import Admin from "@/components/store/admin";
import { getAuthenticatedAdmin } from "@/lib/supabase-admin-auth";
import { readCatalog } from "@/lib/server";

export const dynamic = "force-dynamic";

type CatalogResult = Awaited<ReturnType<typeof readCatalog>>;

export default async function AdminPage() {
  const administrator = await getAuthenticatedAdmin();

  if (!administrator) {
    redirect("/admin/login");
  }

  let catalog: CatalogResult | null = null;
  let diagnostic: string | null = null;

  try {
    catalog = await readCatalog();
  } catch (exception) {
    console.error(
      "Falha ao carregar catálogo administrativo:",
      exception,
    );

    if (
      process.env.NODE_ENV === "development" &&
      exception instanceof Error
    ) {
      diagnostic = exception.message;
    }
  }

  if (!catalog) {
    return (
      <main className="fallback">
        <h1>Painel indisponível</h1>

        <p>
          Não foi possível carregar os produtos do Supabase.
        </p>

        {diagnostic && (
          <>
            <h2>Diagnóstico local</h2>
            <code>{diagnostic}</code>
          </>
        )}

        <p>
          <Link href="/admin">Tentar novamente</Link>
        </p>
      </main>
    );
  }

  return (
    <Admin
      initial={catalog.data}
      revision={catalog.revision}
    />
  );
}