import handler from "vinext/server/app-router-entry";

interface WorkerEnvironment {
  ASSETS?: {
    fetch(request: Request): Promise<Response>;
  };

  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
}

interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const worker = {
  async fetch(
    request: Request,
    environment: WorkerEnvironment,
    context: WorkerExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    const response = await handler.fetch(
      request,
      environment,
      context,
    );

    const securedResponse = new Response(
      response.body,
      response,
    );

    securedResponse.headers.set(
      "X-Content-Type-Options",
      "nosniff",
    );

    securedResponse.headers.set(
      "Referrer-Policy",
      "strict-origin-when-cross-origin",
    );

    if (
      url.pathname.startsWith("/admin") ||
      url.pathname.startsWith("/api/admin") ||
      url.pathname.startsWith("/api/cart") ||
      url.pathname.startsWith("/api/checkout")
    ) {
      securedResponse.headers.set(
        "Cache-Control",
        "private, no-store",
      );
    }

    return securedResponse;
  },
};

export default worker;