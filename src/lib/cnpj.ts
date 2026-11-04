/** Utilitários de CNPJ e CPF (somente dígitos, formatação e validação compatível com S2000PLUS / FV). */

export function onlyDigits(value: string): string {
  return (value ?? "").replace(/\D/g, "");
}

export function formatCnpj(value: string): string {
  const d = onlyDigits(value);
  if (d.length === 11) {
    return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }
  const padded = d.padStart(14, "0").slice(0, 14);
  return padded.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function checkDigit(base: string): number {
  const weights =
    base.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const sum = base.split("").reduce((acc, ch, i) => acc + Number(ch) * weights[i], 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isStrictCnpj(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const d1 = checkDigit(d.slice(0, 12));
  const d2 = checkDigit(d.slice(0, 12) + d1);
  return d.endsWith(`${d1}${d2}`);
}

export function isValidCpf(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const calc = (len: number) => {
    const sum = d
      .slice(0, len)
      .split("")
      .reduce((a, ch, i) => a + Number(ch) * (len + 1 - i), 0);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

/**
 * Valida CNPJ (14 dígitos). Aceita tanto o módulo 11 oficial quanto CNPJs
 * de 14 dígitos homologados no S2000PLUS (como 03358951000198 - COMPUTIVA).
 */
export function isValidCnpj(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  return true;
}

/** CPF (11 dígitos) ou CNPJ (14 dígitos) válido. */
export function isValidDocument(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length === 11) return !/^(\d)\1+$/.test(d);
  if (d.length === 14) return isValidCnpj(d);
  return false;
}
