import { env } from "cloudflare:workers";

import { currentCart } from "./cart";
import type { Content } from "./catalog";

import {
  pgCatalog,
  pgCart,
  pgSave,
  pgSetCart,
  DatabaseError,
} from "./supabase";

export type RuntimeBindings = {
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
};

export const bindings = () =>
  env as unknown as RuntimeBindings;

export async function readCatalog() {
  const result = await pgCatalog();

  result.data.categories = result.data.categories.map((category) =>
    category.id === "kits"
      ? {
          ...category,
          title: "Kits e Acessórios",
        }
      : category,
  );

  return result;
}

export async function saveCatalog(
  data: Content,
  revision: number,
) {
  return pgSave(data, revision);
}

export async function readCart(
  id: string,
  catalog?: Content,
) {
  const data = catalog ?? (await readCatalog()).data;

  return currentCart(data, await pgCart(id));
}

export async function setCart(
  id: string,
  product: string,
  quantity: number,
) {
  await pgSetCart(id, product, quantity);

  return readCart(id);
}

export function sameOrigin(req: Request) {
  return req.headers.get("origin") === new URL(req.url).origin;
}

export function error(
  message: string,
  status = 400,
) {
  return Response.json(
    {
      error: message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export function databaseFailure(
  exception: unknown,
  fallback: string,
) {
  return exception instanceof DatabaseError
    ? error(exception.message, exception.status)
    : error(fallback, 503);
}