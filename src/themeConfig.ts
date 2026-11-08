/**
 * Master Site Theme Configuration
 * -------------------------------------------------------------
 * Allows switching the whole site between:
 * - "diwali-green": Deep green (#1F3D2B), gold (#E0B04A), cream (#FAF3E0)
 * - "classic-brown": Artisanal teakwood brown (#24140A), amber (#E08F35), cream (#FAF7F2)
 *
 * Change THEME value below to toggle the entire site theme instantly.
 */
export type SiteTheme = "diwali-green" | "classic-brown";

export const THEME: SiteTheme = "diwali-green";

export const THEME_TOKENS = {
  "diwali-green": {
    brandDark: "#1F3D2B",
    brandDarker: "#14291D",
    brandMid: "#2D5A3F",
    accent: "#E0B04A",
    accentLight: "#F3D17A",
    accentDeep: "#C8962E",
    surface: "#FAF3E0",
    surfaceWarm: "#F2E8CC",
    textOnDark: "#FAF3E0",
    textOnLight: "#1F3D2B",
    textMuted: "#4B6153",
    borderGold: "rgba(224, 176, 74, 0.35)",
    cardBg: "#FFFFFF",
  },
  "classic-brown": {
    brandDark: "#24140A",
    brandDarker: "#1C110A",
    brandMid: "#4A301E",
    accent: "#E08F35",
    accentLight: "#F5BC51",
    accentDeep: "#C8751B",
    surface: "#FAF7F2",
    surfaceWarm: "#F7EFE3",
    textOnDark: "#FDF6EC",
    textOnLight: "#24140A",
    textMuted: "#7A5E48",
    borderGold: "rgba(212, 154, 55, 0.35)",
    cardBg: "#FFFFFF",
  },
} as const;

/**
 * Initialize theme attributes on the document root
 */
export function initializeTheme() {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-site-theme", THEME);
}
