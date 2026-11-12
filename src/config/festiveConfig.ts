/**
 * Central Festive (Diwali) Configuration
 * Controls Diwali banners, ribbons, badges, copy and styling.
 * Automatically reverts to normal after the endDate.
 */
export interface FestiveConfig {
  enabled: boolean;
  endDate: string | null;
  ribbonText: string;
  subText: string;
  subtext: string;
  giftButtonText: string;
  offerDeadlineText: string;
  badgeText: string;
}

export const FESTIVE_CONFIG: FestiveConfig = {
  enabled: false,
  endDate: null,
  ribbonText: "",
  subText: "",
  subtext: "",
  giftButtonText: "Buy Now",
  offerDeadlineText: "",
  badgeText: "",
};

/**
 * Returns true if the festive campaign is active.
 */
export const isFestiveActive = (): boolean => {
  return false;
};

