import Link from "next/link";

import Store from "@/components/store/store";
import { readCatalog } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  let catalog: Awaited<ReturnType<typeof readCatalog>> | null = null;
  let failure: string | null = null;

  try {
    catalog = await readCatalog();
  } catch (exception) {
    failure =
      exception instanceof Error
        ? exception.message
        : "Erro desconhecido";

    console.error("CATALOG_ERROR_MESSAGE:", failure);
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