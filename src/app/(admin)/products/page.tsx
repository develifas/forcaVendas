import React from "react";
import Link from "next/link";
import { getActiveTenant } from "@/modules/tenants/resolver";
import { getTenantDatabase } from "@/lib/tenant-store";
import { formatBRL, initialOf } from "@/modules/store/format";
import {
  createGroupAction,
  createProductAction,
  deleteGroupAction,
  deleteProductAction,
  toggleProductStockAction,
  updateProductPriceAction,
} from "@/modules/admin/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ImageUploadField,
  ProductRowImageUploader,
} from "@/components/admin/image-upload-field";
import { Package, Layers, Plus, Trash2, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { activeTenant } = await getActiveTenant();
  const db = activeTenant ? getTenantDatabase(activeTenant.cnpj) : null;
  const groups = db?.groups ?? [];
  const roots = groups.filter((g) => !g.parentId);
  const products = db?.products ?? [];

  const groupLabel = (groupId: string | null) => {
    if (!groupId) return "Sem categoria";
    const g = groups.find((x) => x.id === groupId);
    if (!g) return "Sem categoria";
    if (!g.parentId) return g.name;
    const parent = groups.find((x) => x.id === g.parentId);
    return parent ? `${parent.name} › ${g.name}` : g.name;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Produtos &amp; Categorias • {activeTenant?.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Qualquer alteração aqui atualiza imediatamente a vitrine{" "}
            {activeTenant && (
              <Link
                href={`/loja/${activeTenant.cnpj}`}
                target="_blank"
                className="font-semibold text-foreground underline"
              >
                /loja/{activeTenant.cnpj}
              </Link>
            )}
          </p>
        </div>
        {activeTenant && (
          <Link
            href={`/loja/${activeTenant.cnpj}`}
            target="_blank"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-bold shadow-sm hover:bg-accent"
          >
            Ver no catálogo público <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {/* Formulário: Novo Produto + Novo Grupo/Subgrupo */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4 text-primary" /> Cadastrar Novo Produto na Loja
            </CardTitle>
            <CardDescription>
              Deixe o preço em branco ou marque “Sob consulta” para itens de orçamento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createProductAction} className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold sm:col-span-2">
                Nome do Produto (com medidas se houver, ex.: Vaso 22cm) *
                <input
                  name="name"
                  required
                  placeholder="Ex.: Vaso Decorativo Cristal 25cm"
                  className="mt-1 block h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </label>

              <label className="text-xs font-semibold">
                Código / SKU
                <input
                  name="sku"
                  placeholder="Ex.: IG-010"
                  className="mt-1 block h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </label>

              <label className="text-xs font-semibold">
                Marca
                <input
                  name="brand"
                  placeholder="Ex.: DIV / Studio Home"
                  className="mt-1 block h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </label>

              <label className="text-xs font-semibold">
                Grupo / Subgrupo
                <select
                  name="groupId"
                  defaultValue=""
                  className="mt-1 block h-9 w-full rounded-md border bg-background px-2.5 text-sm"
                >
                  <option value="">Sem categoria</option>
                  {roots.map((r) => (
                    <React.Fragment key={r.id}>
                      <option value={r.id}>{r.name}</option>
                      {groups
                        .filter((c) => c.parentId === r.id)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            &nbsp;&nbsp;↳ {c.name}
                          </option>
                        ))}
                    </React.Fragment>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold">
                Unidade (UN, CX, CJ, PC, RL)
                <input
                  name="unit"
                  defaultValue="UN"
                  className="mt-1 block h-9 w-full rounded-md border bg-background px-3 text-sm uppercase"
                />
              </label>

              <label className="text-xs font-semibold sm:col-span-2">
                Preço Unitário (R$)
                <input
                  name="price"
                  placeholder="Ex.: 149,90 (vazio = Sob consulta)"
                  className="mt-1 block h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </label>

              <ImageUploadField />

              <label className="text-xs font-semibold sm:col-span-2">
                Descrição detalhada (exibida ao clicar no item)
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Detalhes técnicos, material, acabamento..."
                  className="mt-1 block w-full rounded-md border bg-background p-2 text-sm"
                />
              </label>

              <div className="flex items-center justify-between gap-3 pt-1 sm:col-span-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold">
                  <input type="checkbox" name="isConsult" className="h-4 w-4 rounded" />
                  Produto com preço “Sob Consulta”
                </label>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow hover:opacity-90"
                >
                  <Plus className="h-4 w-4" /> Salvar Produto
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Gestão de Grupos e Subgrupos */}
        <Card id="grupos">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-primary" /> Grupos e Subgrupos
            </CardTitle>
            <CardDescription>
              Aparecem no menu lateral e nos filtros em chips da loja.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={createGroupAction} className="space-y-2.5">
              <label className="block text-xs font-semibold">
                Nome do Grupo ou Subgrupo *
                <input
                  name="name"
                  required
                  placeholder="Ex.: Espelhos"
                  className="mt-1 block h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold">
                Dentro de (opcional — deixe vazio para grupo principal)
                <select
                  name="parentId"
                  defaultValue=""
                  className="mt-1 block h-9 w-full rounded-md border bg-background px-2.5 text-sm"
                >
                  <option value="">Grupo Principal (Raiz)</option>
                  {roots.map((r) => (
                    <option key={r.id} value={r.id}>
                      Subgrupo de: {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground shadow hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Adicionar Categoria
              </button>
            </form>

            <div className="max-h-80 space-y-2.5 overflow-y-auto pr-1 text-xs">
              {roots.map((r) => {
                const subGroups = groups.filter((c) => c.parentId === r.id);
                const subIds = new Set([r.id, ...subGroups.map((s) => s.id)]);
                const prodCount = products.filter((p) => p.groupId && subIds.has(p.groupId)).length;

                return (
                  <div key={r.id} className="rounded-xl border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{r.name}</span>
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {subGroups.length} {subGroups.length === 1 ? "subgrupo" : "subgrupos"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          • {prodCount} {prodCount === 1 ? "item" : "itens"}
                        </span>
                      </div>
                      <form action={deleteGroupAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          title="Excluir grupo principal e seus subgrupos"
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </div>

                    {/* Chips dos subgrupos deste grupo principal */}
                    {subGroups.length > 0 ? (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {subGroups.map((c) => {
                          const cCount = products.filter((p) => p.groupId === c.id).length;
                          return (
                            <div
                              key={c.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1 text-[11px] font-medium shadow-2xs"
                            >
                              <span>{c.name}</span>
                              {cCount > 0 && (
                                <span className="rounded bg-muted px-1 py-0.2 font-mono text-[9px] text-muted-foreground">
                                  {cCount}
                                </span>
                              )}
                              <form action={deleteGroupAction} className="inline-flex">
                                <input type="hidden" name="id" value={c.id} />
                                <button
                                  type="submit"
                                  title={`Excluir subgrupo ${c.name}`}
                                  className="ml-0.5 rounded text-muted-foreground hover:text-destructive"
                                >
                                  ×
                                </button>
                              </form>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        Nenhum subgrupo cadastrado neste grupo.
                      </p>
                    )}

                    {/* Adicionar subgrupo direto dentro deste grupo */}
                    <form action={createGroupAction} className="mt-2.5 flex items-center gap-1.5">
                      <input type="hidden" name="parentId" value={r.id} />
                      <input
                        name="name"
                        required
                        placeholder={`+ Novo subgrupo em ${r.name}...`}
                        className="h-7 flex-1 rounded-md border bg-background px-2.5 text-[11px]"
                      />
                      <button
                        type="submit"
                        className="h-7 rounded-md border bg-card px-2.5 text-[11px] font-bold hover:bg-accent"
                      >
                        Adicionar
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Produtos Cadastrados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-primary" /> Catálogo Ativo ({products.length} itens)
          </CardTitle>
          <CardDescription>
            Altere o preço diretamente na linha ou alterne entre “Em estoque” e “Indisponível”.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Produto</th>
                  <th className="py-2 pr-3">Categoria</th>
                  <th className="py-2 pr-3">Unid</th>
                  <th className="py-2 pr-3">Preço / Sob Consulta</th>
                  <th className="py-2 pr-3">Estoque</th>
                  <th className="py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2.5">
                        <ProductRowImageUploader
                          productId={p.id}
                          productName={p.name}
                          currentImageUrl={p.imageUrl}
                          initial={initialOf(p.name)}
                        />
                        <div>
                          <Link
                            href={`/loja/${activeTenant?.cnpj}/produto/${p.id}`}
                            target="_blank"
                            className="font-semibold hover:underline"
                          >
                            {p.name}
                          </Link>
                          <p className="text-[11px] text-muted-foreground">
                            SKU: {p.sku} {p.brand ? `• Marca: ${p.brand}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                      {groupLabel(p.groupId)}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-xs font-bold">{p.unit}</td>
                    <td className="py-2.5 pr-3">
                      <form action={updateProductPriceAction} className="flex items-center gap-1.5">
                        <input type="hidden" name="id" value={p.id} />
                        <input
                          name="price"
                          defaultValue={
                            p.priceCents !== null ? (p.priceCents / 100).toFixed(2).replace(".", ",") : ""
                          }
                          placeholder="Sob consulta"
                          className="h-8 w-28 rounded border bg-background px-2 text-xs font-semibold"
                        />
                        <button
                          type="submit"
                          className="h-8 rounded border bg-muted px-2 text-[11px] font-bold hover:bg-accent"
                        >
                          Salvar
                        </button>
                      </form>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        Atual: {p.priceCents === null ? "Sob consulta" : formatBRL(p.priceCents)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <form action={toggleProductStockAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            p.inStock
                              ? "bg-emerald-500/15 text-emerald-700"
                              : "bg-red-500/15 text-red-700"
                          }`}
                        >
                          {p.inStock ? "Em estoque" : "Indisponível"}
                        </button>
                      </form>
                    </td>
                    <td className="py-2.5 text-right">
                      <form action={deleteProductAction} className="inline">
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          title="Excluir produto"
                          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
