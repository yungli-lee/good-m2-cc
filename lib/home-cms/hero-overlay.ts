export const heroOverlayStrengthValues = ["none", "light", "medium", "dark"] as const;

export type HeroOverlayStrength = (typeof heroOverlayStrengthValues)[number];

export const heroOverlayStrengthLabels: Record<HeroOverlayStrength, string> = {
  none: "無",
  light: "淡",
  medium: "中",
  dark: "深"
};

export function normalizeHeroOverlayStrength(value: unknown): HeroOverlayStrength {
  return heroOverlayStrengthValues.includes(value as HeroOverlayStrength)
    ? value as HeroOverlayStrength
    : "medium";
}
