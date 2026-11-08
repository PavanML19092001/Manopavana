export type SiteTheme = "diwali-green" | "classic-brown";

/**
 * MASTER THEME SWITCH
 * Change this single value to switch between "diwali-green" and "classic-brown".
 */
export const THEME: SiteTheme = "diwali-green";

export interface ThemePalette {
  brandDark: string;       // Deep green #1F3D2B or classic brown #43230A
  brandDarker: string;     // Darker green #14291D or classic brown #1C120B
  brandMid: string;        // Lighter green #2D5A3F or classic brown #5E3210
  accent: string;          // Gold #E0B04A or classic orange-gold #D49A37
  accentLight: string;     // Light gold #F3D17A or classic light gold #F5BC51
  accentDeep: string;      // Deep gold #C8962E or classic amber #C8751B
  surface: string;         // Cream #FAF3E0 or classic cream #FAF6F0
  surfaceWarm: string;     // Warmer cream #F2E8CC or classic #F7EFE3
  textOnDark: string;      // Cream #FAF3E0 on dark green
  textOnLight: string;     // Near-black green #14291D on cream
  textMutedOnLight: string;// Dark green-grey #3F4F45 (strictly >= 4.5:1 contrast)
}

export const THEME_PALETTES: Record<SiteTheme, ThemePalette> = {
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
    textOnLight: "#14291D",
    textMutedOnLight: "#3F4F45",
  },
  "classic-brown": {
    brandDark: "#43230A",
    brandDarker: "#1C120B",
    brandMid: "#5E3210",
    accent: "#D49A37",
    accentLight: "#F5BC51",
    accentDeep: "#C8751B",
    surface: "#FAF6F0",
    surfaceWarm: "#F7EFE3",
    textOnDark: "#FAF6F0",
    textOnLight: "#23150C",
    textMutedOnLight: "#5C402D",
  },
};

export const CURRENT_THEME_PALETTE = THEME_PALETTES[THEME];
