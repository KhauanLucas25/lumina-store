import { z } from "zod";

const text = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .refine(
    (value) => !/[<>]/.test(value),
    "Não use marcação HTML",
  );

const localImagePattern =
  /^\/images\/[a-zA-Z0-9._-]+$/;

const supabaseImagePattern =
  /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/lumina-imagens\/[a-f0-9-]+\.(jpg|png|webp)$/i;

const image = z
  .string()
  .max(500)
  .refine(
    (value) =>
      localImagePattern.test(value) ||
      supabaseImagePattern.test(value),
    "A imagem deve pertencer ao armazenamento autorizado",
  );

const path = z
  .string()
  .max(250)
  .refine(
    (value) =>
      value.startsWith("/") &&
      !value.startsWith("//") &&
      !/[\\\r\n]/.test(value),
    "Use um caminho interno, como /#catalogo",
  );

export const contentSchema = z
  .object({
    revision: z.number().int().nonnegative(),

    data: z.object({
      categories: z
        .array(
          z.object({
            id: text,
            title: text,
          }),
        )
        .min(1)
        .max(30),

      products: z
        .array(
          z.object({
            id: text,
            title: text,

            description: z
              .string()
              .max(5000)
              .refine(
                (value) => !/[<>]/.test(value),
                "Não use marcação HTML",
              ),

            category: text,
            price: z.number().int().min(1).max(100_000_000),
            stock: z.number().int().min(0).max(1_000_000),
            image,
            photos: z.array(image).max(8),
          }),
        )
        .max(300),

      banners: z
        .array(
          z.object({
            id: text,
            title: text,
            description: z.string().max(500),
            image,
            link: path,
            label: text,
            position: z.number().int().min(0).max(100),
          }),
        )
        .max(10),

      settings: z.object({
        whatsapp: z
          .union([
            z.literal(""),
            z
              .string()
              .regex(
                /^[1-9]\d{7,14}$/,
                "Informe o WhatsApp com código do país e DDD, apenas números",
              ),
          ])
          .optional(),

        brand: text,
        about: z.string().max(3000),

        email: z.union([
          z.literal(""),
          z.string().email(),
        ]),

        instagram: z.union([
          z.literal(""),
          z.string().url().refine((value) => {
            const hostname = new URL(value).hostname;

            return (
              hostname === "www.instagram.com" ||
              hostname === "instagram.com"
            );
          }),
        ]),
      }),
    }),
  })
  .superRefine(({ data }, context) => {
    for (const key of [
      "categories",
      "products",
      "banners",
    ] as const) {
      const identifiers = data[key].map((item) => item.id);

      if (new Set(identifiers).size !== identifiers.length) {
        context.addIssue({
          code: "custom",
          message: "Identificadores duplicados",
        });
      }
    }

    const hasInvalidCategory = data.products.some(
      (product) =>
        !data.categories.some(
          (category) => category.id === product.category,
        ),
    );

    if (hasInvalidCategory) {
      context.addIssue({
        code: "custom",
        message: "Categoria inválida",
      });
    }
  });