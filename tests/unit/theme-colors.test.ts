import { describe, it, expect } from "vitest";
import { hexToHsl } from "../../src/modules/store-settings/colors";

describe("Store Settings & Color Theme Engine", () => {
  it("converts default primary cyan (#44C5ED) to correct HSL representation", () => {
    const hsl = hexToHsl("#44C5ED");
    expect(hsl).toBeDefined();
    // 44C5ED corresponds to hue ~194, saturation ~83%, lightness ~60%
    const [h, s, l] = hsl.split(" ");
    expect(parseInt(h)).toBeGreaterThanOrEqual(190);
    expect(parseInt(h)).toBeLessThanOrEqual(198);
    expect(s).toContain("%");
    expect(l).toContain("%");
  });

  it("converts dark contrast text (#0F172A) to correct HSL representation", () => {
    const hsl = hexToHsl("#0F172A");
    expect(hsl).toBeDefined();
    // 0F172A is dark slate text with ~11% lightness
    const [h, s, l] = hsl.split(" ");
    expect(parseInt(h)).toBeGreaterThanOrEqual(215);
    expect(parseInt(h)).toBeLessThanOrEqual(230);
    expect(parseInt(l)).toBeLessThanOrEqual(15);
  });
});

