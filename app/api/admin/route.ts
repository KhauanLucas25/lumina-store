import { denyNonAdmin } from "@/lib/api-admin-auth";

import {
  bindings,
  readCatalog,
  sameOrigin,
  error,
  saveCatalog,
  databaseFailure,
} from "@/lib/server";

import { contentSchema } from "@/lib/validation";

type SupabaseEnvironment = {
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
};

export async function GET() {
  const denied = await denyNonAdmin();

  if (denied) {
    return denied;
  }

  try {
    return Response.json(await readCatalog(), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return error("Não foi possível carregar o painel", 503);
  }
}

export async function POST(req: Request) {
  const denied = await denyNonAdmin();

  if (denied) {
    return denied;
  }

  if (!sameOrigin(req)) {
    return error("Origem inválida", 403);
  }

  try {
    const contentTypeHeader = req.headers.get("content-type") ?? "";

    if (contentTypeHeader.includes("multipart/form-data")) {
      const declaredSize = Number(req.headers.get("content-length") || 0);

      if (declaredSize > 5_500_000) {
        return error("Limite de 5 MB", 413);
      }

      const formData = await req.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return error("Selecione uma imagem válida");
      }

      if (file.size === 0 || file.size > 5_000_000) {
        return error("Escolha uma imagem de até 5 MB", 413);
      }

      const bytes = new Uint8Array(await file.arrayBuffer());

      const isJpeg =
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff;

      const isPng =
        bytes.length >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47;

      const isWebp =
        bytes.length >= 12 &&
        new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
        new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";

      if (!isJpeg && !isPng && !isWebp) {
        return error("Use uma imagem JPG, PNG ou WebP");
      }

      const mimeType = isJpeg
        ? "image/jpeg"
        : isPng
          ? "image/png"
          : "image/webp";

      const extension = isJpeg ? "jpg" : isPng ? "png" : "webp";
      const fileName = `${crypto.randomUUID()}.${extension}`;

      const environment = bindings() as unknown as SupabaseEnvironment;

      const supabaseUrl = environment.SUPABASE_URL?.replace(/\/+$/, "");
      const secretKey = environment.SUPABASE_SECRET_KEY;

      if (!supabaseUrl || !secretKey) {
        return error(
          "O Supabase Storage não está configurado no servidor",
          503,
        );
      }

      const uploadUrl =
        `${supabaseUrl}/storage/v1/object/lumina-imagens/${fileName}`;

      const uploadBody = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": mimeType,
          "Cache-Control": "31536000",
          "x-upsert": "false",
        },
        body: uploadBody,
      });

      if (!uploadResponse.ok) {
        console.error(
          "Falha no upload para o Supabase Storage:",
          uploadResponse.status,
        );

        return error("Não foi possível enviar a imagem", 503);
      }

      const publicUrl =
        `${supabaseUrl}/storage/v1/object/public/lumina-imagens/${fileName}`;

      return Response.json({
        url: publicUrl,
      });
    }

    const raw = await req.text();

    if (raw.length > 1_000_000) {
      return error("Conteúdo muito grande", 413);
    }

    let json: unknown;

    try {
      json = JSON.parse(raw);
    } catch {
      return error("Os dados enviados são inválidos", 400);
    }

    const parsed = contentSchema.safeParse(json);

    if (!parsed.success) {
      return error(parsed.error.issues[0].message);
    }

    const { data, revision } = parsed.data;
    const nextRevision = await saveCatalog(data, revision);

    return Response.json({
      revision: nextRevision,
    });
  } catch (exception) {
    return databaseFailure(
      exception,
      "Não foi possível salvar. Seus campos foram preservados.",
    );
  }
}