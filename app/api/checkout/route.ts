import { getCartId } from "@/lib/cart-session";
import {
  readCart,
  readCatalog,
  sameOrigin,
  error,
  databaseFailure,
} from "@/lib/server";
import { checkoutMessage } from "@/lib/whatsapp";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("Origem inválida.", 403);
  try {
    const id = await getCartId();
    const { data } = await readCatalog();
    const phone = data.settings.whatsapp ?? "";
    if (!/^[1-9]\d{7,14}$/.test(phone))
      return error("O WhatsApp do vendedor ainda não foi configurado.", 503);
    const cart = await readCart(id, data);
    try {
      const message = checkoutMessage(data, cart);
      return Response.json(
        { url: `https://wa.me/${phone}?text=${encodeURIComponent(message)}` },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (e) {
      return Response.json(
        { error: (e as Error).message, cart, data },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
  } catch (e) {
    return databaseFailure(
      e,
      "Não foi possível preparar o pedido. Tente novamente.",
    );
  }
}
