declare module "cloudflare:workers" {
  interface WorkerEnvironment {
    ASSETS?: {
      fetch(request: Request): Promise<Response>;
    };

    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
    SUPABASE_URL?: string;
    SUPABASE_SECRET_KEY?: string;
  }

  export const env: WorkerEnvironment;
}