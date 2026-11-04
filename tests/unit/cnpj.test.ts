import { describe, it, expect } from "vitest";
import { isValidCnpj, formatCnpj, onlyDigits } from "../../src/lib/cnpj";

describe("CNPJ", () => {
  it("valida CNPJs corretos com ou sem máscara", () => {
    expect(isValidCnpj("11222333000181")).toBe(true);
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
  });
  it("rejeita inválidos", () => {
    expect(isValidCnpj("11222333000182")).toBe(false);
    expect(isValidCnpj("00000000000000")).toBe(false);
    expect(isValidCnpj("359514666000157")).toBe(false);
    expect(isValidCnpj("")).toBe(false);
  });
  it("formata e limpa", () => {
    expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(onlyDigits("11.222.333/0001-81")).toBe("11222333000181");
  });
});

