import Link from "next/link";

import Store from "@/components/store/store";
import { readCatalog } from "@/lib/server";

export const dynamic = "force-dynamic";

type CatalogResult = Awaited<ReturnType<typeof readCatalog>>;

export default async function Page() {
  let catalog: CatalogResult | null = null;

  try {
    catalog = await readCatalog();
  } catch (exception) {
    console.error(
      "Falha ao carregar o catálogo da loja:",
      exception,
    );
  }

  if (!catalog) {
    return (
      <main className="fallback">
        <h1>Uma pequena pausa.</h1>

        <p>Não foi possível carregar a loja agora.</p>

        <Link href="/">Tentar novamente</Link>
      </main>
    );
  }

  return <Store data={catalog.data} />;
}