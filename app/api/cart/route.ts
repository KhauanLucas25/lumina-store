import { getCartId } from "@/lib/cart-session";
import {
  error,
  sameOrigin,
  readCart,
  setCart,
  databaseFailure,
} from "@/lib/server";
import { z } from "zod";

export async function GET() {
  const id = await getCartId();
  try {
    return Response.json(await readCart(id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return databaseFailure(e, "Carrinho indisponível");
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("Origem inválida", 403);
  const id = await getCartId();
  try {
    const parsed = z
      .object({
        id: z.string().max(160),
        quantity: z.number().int().min(0).max(99),
      })
      .safeParse(await req.json());
    if (!parsed.success) return error("Quantidade inválida");
    return Response.json(
      await setCart(id, parsed.data.id, parsed.data.quantity),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return databaseFailure(e, "Não foi possível atualizar o carrinho");
  }
}
