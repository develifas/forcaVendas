// Utilitários puros da loja (seguros para usar em componentes client).

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Medidas/volume no final do nome: "19x10,5x28cm", "400ml", "22cm"...
const SPEC_RE =
  /\s+(\d+(?:[.,]\d+)?(?:\s*[x×]\s*\d+(?:[.,]\d+)?)+\s*(?:cm|mm|m)?|\d+(?:[.,]\d+)?\s*(?:ml|l|cm|mm|kg|g|w|v))\s*$/i;

/** Separa o nome comercial das medidas para destacá-las em linha própria. */
export function splitName(name: string): { title: string; spec: string | null } {
  const m = name.match(SPEC_RE);
  if (!m || m.index === undefined || m.index === 0) return { title: name, spec: null };
  return { title: name.slice(0, m.index).trim(), spec: m[1].replace(/\s*[x×]\s*/gi, " × ").trim() };
}

export function initialOf(name: string): string {
  const ch = name.trim().charAt(0);
  return ch ? ch.toLocaleUpperCase("pt-BR") : "?";
}

