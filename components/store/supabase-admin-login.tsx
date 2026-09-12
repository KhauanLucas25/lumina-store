"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function AdminLogin() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (busy) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    setBusy(true);
    setError("");

    try {
      const supabase = createClient();

      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) {
        setError("E-mail ou senha incorretos.");
        setBusy(false);
        return;
      }

      window.location.assign("/admin");
    } catch {
      setError("Não foi possível conectar ao sistema de login.");
      setBusy(false);
    }
  }

  return (
    <main className="admin-login">
      <a href="/">← Voltar à loja</a>

      <h1>Área administrativa</h1>

      <p>Entre para gerenciar produtos, banners e estoque.</p>

      <form onSubmit={handleSubmit}>
        <label>
          E-mail

          <input
            name="email"
            type="email"
            autoComplete="username"
            required
          />
        </label>

        <label>
          Senha

          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p role="alert">{error}</p>}

        <button className="cta" disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}