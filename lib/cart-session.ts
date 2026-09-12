import { cookies } from "next/headers";

const CART_COOKIE = "__Host-lumina-cart";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getCartId(): Promise<string> {
  const cookieStore = await cookies();

  const currentId =
    cookieStore.get(CART_COOKIE)?.value;

  if (
    currentId &&
    UUID_PATTERN.test(currentId)
  ) {
    return currentId;
  }

  const newId = crypto.randomUUID();

  cookieStore.set(
    CART_COOKIE,
    newId,
    {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  );

  return newId;
}