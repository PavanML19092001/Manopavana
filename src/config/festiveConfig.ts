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
  enabled: true,
  endDate: "2026-11-12T23:59:59+05:30",
  ribbonText: "Diwali Special",
  subText: "Gift a Diwali combo",
  subtext: "Gift a Diwali combo",
  giftButtonText: "Gift a Diwali combo",
  offerDeadlineText: "Offer till 12 November",
  badgeText: "Offer till 12 November",
};

/**
 * Returns true if the festive Diwali campaign is active.
 * Reverts automatically after endDate.
 */
export const isFestiveActive = (): boolean => {
  if (!FESTIVE_CONFIG.enabled) return false;
  if (!FESTIVE_CONFIG.endDate) return true;
  return new Date() <= new Date(FESTIVE_CONFIG.endDate);
};
