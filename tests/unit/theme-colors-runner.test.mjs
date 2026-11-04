import { describe, it } from "node:test";
import assert from "node:assert";

function hexToHsl(hex) {
  let cleanHex = hex.replace("#", "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

describe("Engine de Cores e Temas do shadcn/ui por Tenant", () => {
  it("converte cor primária ciano padrão (#44C5ED) para HSL correto", () => {
    const hsl = hexToHsl("#44C5ED");
    const [h, s, l] = hsl.split(" ");
    const hue = parseInt(h);
    assert.ok(hue >= 190 && hue <= 198, `Matiz esperada entre 190 e 198, obtida: ${hue}`);
    assert.ok(s.includes("%"));
    assert.ok(l.includes("%"));
  });

  it("converte cor de texto de contraste escuro (#0F172A) para HSL com alta legibilidade", () => {
    const hsl = hexToHsl("#0F172A");
    const [h, s, l] = hsl.split(" ");
    const lightness = parseInt(l);
    assert.ok(lightness <= 15, `Luminosidade para texto escuro deve ser <= 15%, obtida: ${lightness}`);
  });
});

