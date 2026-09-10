import { describe, it, expect } from "vitest";
import { parseTitleRef, rarityColor, RARITY_COLORS } from "./cosmeticStyle";

describe("parseTitleRef", () => {
  it("splits a well-formed title ref into text and color", () => {
    expect(parseTitleRef("Pausenkönig|#ffd24a")).toEqual({
      text: "Pausenkönig", color: "#ffd24a",
    });
  });

  it("returns null for a ref with no pipe", () => {
    expect(parseTitleRef("Pausenkönig")).toBeNull();
  });

  it("returns null for an empty or missing ref", () => {
    expect(parseTitleRef("")).toBeNull();
    expect(parseTitleRef(undefined)).toBeNull();
  });

  it("returns null when the color half isn't a hex color", () => {
    expect(parseTitleRef("Pausenkönig|not-a-color")).toBeNull();
  });
});

describe("rarityColor", () => {
  it("resolves each known rarity to its catalog colour", () => {
    for (const [rarity, color] of Object.entries(RARITY_COLORS)) {
      expect(rarityColor(rarity)).toBe(color);
    }
  });

  it("falls back to the common colour for an unknown or missing rarity", () => {
    expect(rarityColor("mythic")).toBe(RARITY_COLORS.common);
    expect(rarityColor(undefined)).toBe(RARITY_COLORS.common);
  });
});
