"use client";
import { useState } from "react";
import { Content } from "@/lib/catalog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Toaster, toast } from "sonner";
import { ArrowLeft, Plus, Save, Trash2, Flame } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
function Remove({ action }: { action: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button type="button" className="outline">
          <Trash2 size={16} />
          Remover
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Remover este item?</AlertDialogTitle>
        <AlertDialogDescription>
          A remoção será aplicada à loja quando você salvar as alterações.
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={action}>Remover</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export default function Admin({
  initial,
  revision,
}: {
  initial: Content;
  revision: number;
}) {
  const [data, setData] = useState(initial),
    [rev, setRev] = useState(revision),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  async function logout() {
    if (
      dirty &&
      !window.confirm("Existem alterações não salvas. Deseja sair mesmo assim?")
    )
      return;
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.assign("/admin/login");
    } catch {
      toast.error("Não foi possível sair do painel. Tente novamente.");
    }
  }
  function update(next: Content) {
    setData(next);
    setDirty(true);
  }
  function patch(
    kind: "products" | "banners" | "categories",
    id: string,
    key: string,
    value: unknown,
  ) {
    update({
      ...data,
      [kind]: data[kind].map((x) => (x.id === id ? { ...x, [key]: value } : x)),
    });
  }
  async function upload(file: File | undefined, done: (url: string) => void) {
    if (!file) return;
    if (file.size > 5000000) {
      toast.error("Limite de 5 MB");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/admin", { method: "POST", body: form });
      const j = (await r.json()) as {
        error: string;
        url: string;
        revision: number;
      };
      if (!r.ok) throw Error(j.error);
      done(j.url);
      toast.success("Imagem carregada. Salve as alterações.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    try {
      const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, revision: rev }),
      });
      const j = (await r.json()) as {
        error: string;
        url: string;
        revision: number;
      };
      if (!r.ok) throw Error(j.error);
      setRev(j.revision);
      setDirty(false);
      toast.success("Loja atualizada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="admin">
      <Toaster richColors />
      <a className="back" href="/">
        <ArrowLeft size={17} /> Voltar à loja
      </a>
      <button type="button" className="outline" onClick={logout}>
        Sair do painel
      </button>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">
            <Flame size={16} /> LUMINA · ADMINISTRAÇÃO
          </span>
          <h1>Seu ateliê, organizado.</h1>
          <p>Cuide de cada detalhe da sua loja.</p>
        </div>
        <button className="cta" disabled={busy} onClick={save}>
          <Save size={18} />
          {busy ? "Aguarde…" : "Salvar alterações"}
          {dirty ? " *" : ""}
        </button>
      </div>
      <Tabs defaultValue="overview">
        <TabsList className="admin-tabs">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="banners">Carrossel</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="settings">Sobre e contato</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="admin-card">
            <h2>Banco de dados</h2>
            <p>PostgreSQL do Supabase conectado.</p>
          </div>
          <div className="metrics">
            <article>
              <span>Produtos no catálogo</span>
              <strong>{data.products.length}</strong>
            </article>
            <article>
              <span>Unidades em estoque</span>
              <strong>{data.products.reduce((n, p) => n + p.stock, 0)}</strong>
            </article>
            <article>
              <span>Vendas e pedidos</span>
              <strong>—</strong>
              <p>Disponíveis após integrar pagamentos.</p>
            </article>
            <article>
              <span>Estoque baixo</span>
              <strong>
                {data.products.filter((p) => p.stock <= 5).length}
              </strong>
            </article>
          </div>
          <div className="admin-card">
            <h2>Uma loja com a sua essência</h2>
            <p>
              Personalize os produtos ilustrativos, envie suas fotos e configure
              seus contatos antes de abrir a loja ao público. Salve as
              alterações para publicá-las na vitrine.
            </p>
            <p>
              Os valores de vendas e pedidos não são simulados: serão conectados
              ao provedor de pagamentos escolhido.
            </p>
            <h3>Produtos com até 5 unidades</h3>
            {data.products
              .filter((p) => p.stock <= 5)
              .map((p) => (
                <p key={p.id}>
                  {p.title} · {p.stock} unidades
                </p>
              ))}
            {!data.products.some((p) => p.stock <= 5) && (
              <p>Nenhum produto com estoque baixo.</p>
            )}
          </div>
        </TabsContent>
        <TabsContent value="products">
          <div className="tab-heading">
            <h2>Produtos</h2>
            <button
              className="outline"
              onClick={() =>
                update({
                  ...data,
                  products: [
                    ...data.products,
                    {
                      id: crypto.randomUUID(),
                      title: "Novo produto",
                      description: "",
                      category: data.categories[0].id,
                      price: 100,
                      stock: 0,
                      image: "/images/hero.webp",
                      photos: [],
                    },
                  ],
                })
              }
            >
              <Plus size={16} />
              Novo produto
            </button>
          </div>
          {data.products.map((p) => (
            <article className="admin-card" key={p.id}>
              <div className="editor-heading">
                <h3>{p.title}</h3>
                <Remove
                  action={() =>
                    update({
                      ...data,
                      products: data.products.filter((x) => x.id !== p.id),
                    })
                  }
                />
              </div>
              <div className="editor-grid">
                <div>
                  <img className="editor-image" src={p.image} alt={p.title} />
                  <label>
                    Foto principal
                    <input
                      disabled={busy}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) =>
                        upload(e.target.files?.[0], (url) =>
                          patch("products", p.id, "image", url),
                        )
                      }
                    />
                  </label>
                  <label>
                    Adicionar foto à galeria (até 8)
                    <input
                      disabled={busy || p.photos.length >= 8}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) =>
                        upload(e.target.files?.[0], (url) =>
                          patch("products", p.id, "photos", [...p.photos, url]),
                        )
                      }
                    />
                  </label>
                  <div className="photo-gallery">
                    {p.photos.map((src, i) => (
                      <button
                        title="Remover foto"
                        key={src}
                        onClick={() =>
                          patch(
                            "products",
                            p.id,
                            "photos",
                            p.photos.filter((_, j) => j !== i),
                          )
                        }
                      >
                        <img
                          src={src}
                          alt={`Foto ${i + 1}; clique para remover`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="fields">
                  <label>
                    Título
                    <input
                      maxLength={160}
                      value={p.title}
                      onChange={(e) =>
                        patch("products", p.id, "title", e.target.value)
                      }
                    />
                  </label>
                  <label>
                    Descrição
                    <textarea
                      rows={3}
                      maxLength={5000}
                      value={p.description}
                      onChange={(e) =>
                        patch("products", p.id, "description", e.target.value)
                      }
                    />
                  </label>
                  <div className="two-fields">
                    <label>
                      Preço (R$)
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={p.price / 100}
                        onChange={(e) =>
                          patch(
                            "products",
                            p.id,
                            "price",
                            Math.round(Number(e.target.value) * 100),
                          )
                        }
                      />
                    </label>
                    <label>
                      Estoque
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={p.stock}
                        onChange={(e) =>
                          patch(
                            "products",
                            p.id,
                            "stock",
                            Number(e.target.value),
                          )
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Categoria
                    <Select
                      value={p.category}
                      onValueChange={(v) =>
                        patch("products", p.id, "category", v)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {data.categories.map((c) => (
                          <SelectItem value={c.id} key={c.id}>
                            {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                </div>
              </div>
            </article>
          ))}
        </TabsContent>
        <TabsContent value="banners">
          <div className="tab-heading">
            <h2>Banners do carrossel</h2>
            <button
              className="outline"
              onClick={() =>
                update({
                  ...data,
                  banners: [
                    ...data.banners,
                    {
                      id: crypto.randomUUID(),
                      title: "Um novo ritual",
                      description: "Conheça nossa seleção.",
                      image: "/images/hero.webp",
                      link: "/#catalogo",
                      label: "Explorar produtos",
                      position: data.banners.length,
                    },
                  ],
                })
              }
            >
              <Plus size={16} />
              Novo banner
            </button>
          </div>
          {data.banners.map((b) => (
            <article className="admin-card" key={b.id}>
              <div className="editor-heading">
                <h3>{b.title}</h3>
                <Remove
                  action={() =>
                    update({
                      ...data,
                      banners: data.banners.filter((x) => x.id !== b.id),
                    })
                  }
                />
              </div>
              <div className="editor-grid">
                <div>
                  <img className="editor-image" src={b.image} alt={b.title} />
                  <label>
                    Imagem (JPG, PNG ou WebP, até 5 MB)
                    <input
                      disabled={busy}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) =>
                        upload(e.target.files?.[0], (url) =>
                          patch("banners", b.id, "image", url),
                        )
                      }
                    />
                  </label>
                </div>
                <div className="fields">
                  {[
                    ["title", "Título"],
                    ["description", "Descrição"],
                    ["label", "Texto do botão"],
                    ["link", "Destino (ex.: /#catalogo)"],
                  ].map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input
                        value={String(b[key as keyof typeof b])}
                        onChange={(e) =>
                          patch("banners", b.id, key, e.target.value)
                        }
                      />
                    </label>
                  ))}
                  <label>
                    Ordem de exibição
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={b.position}
                      onChange={(e) =>
                        patch(
                          "banners",
                          b.id,
                          "position",
                          Number(e.target.value),
                        )
                      }
                    />
                  </label>
                </div>
              </div>
            </article>
          ))}
        </TabsContent>
        <TabsContent value="categories">
          <div className="tab-heading">
            <h2>Categorias</h2>
            <button
              className="outline"
              onClick={() =>
                update({
                  ...data,
                  categories: [
                    ...data.categories,
                    { id: crypto.randomUUID(), title: "Nova categoria" },
                  ],
                })
              }
            >
              <Plus size={16} />
              Adicionar categoria
            </button>
          </div>
          {data.categories.map((c) => (
            <div className="admin-card" key={c.id}>
              <label>
                Nome da categoria
                <input
                  value={c.title}
                  onChange={(e) =>
                    patch("categories", c.id, "title", e.target.value)
                  }
                />
              </label>
              <p>
                {data.products.filter((p) => p.category === c.id).length}{" "}
                produtos nesta categoria
              </p>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="settings">
          <div className="admin-card fields">
            {[
              ["brand", "Nome da marca"],
              ["about", "Sobre Nós"],
              ["email", "E-mail de contato"],
              ["instagram", "Link do Instagram"],
              [
                "whatsapp",
                "WhatsApp do vendedor (código do país + DDD + número, apenas dígitos)",
              ],
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <textarea
                  rows={key === "about" ? 5 : 1}
                  value={data.settings[key as keyof typeof data.settings] ?? ""}
                  onChange={(e) =>
                    update({
                      ...data,
                      settings: { ...data.settings, [key]: e.target.value },
                    })
                  }
                />
              </label>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
