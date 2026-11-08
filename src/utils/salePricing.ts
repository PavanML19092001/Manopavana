/**
 * Central Sale & Discount Configuration (Part D)
 * Single source of truth for sitewide discounts, pricing helpers, savings, and deadlines.
 */
export interface SaleConfig {
  enabled: boolean;
  percent: number;
  label: string;
  endDate: string | null;
}

export const SALE_CONFIG: SaleConfig = {
  enabled: true,
  percent: 10,
  label: "10% OFF",
  endDate: "2026-11-12T23:59:59+05:30",
};

/**
 * Returns true if the sitewide sale is currently active.
 */
export const isSaleActive = (): boolean => {
  if (!SALE_CONFIG.enabled) return false;
  if (!SALE_CONFIG.endDate) return true;
  return new Date() <= new Date(SALE_CONFIG.endDate);
};

/**
 * Calculates the active discounted sale price for any given regular price.
 * Returns Math.round(regularPrice * (1 - percent/100)) while active,
 * or regularPrice if inactive.
 */
export const getSalePrice = (regularPrice: number): number => {
  if (!regularPrice || regularPrice <= 0) return 0;
  if (!isSaleActive()) return regularPrice;
  return Math.round(regularPrice * (1 - SALE_CONFIG.percent / 100));
};

/**
 * Calculates savings between regular price and sale price.
 */
export const getSaleSavings = (regularPrice: number): number => {
  if (!regularPrice || regularPrice <= 0 || !isSaleActive()) return 0;
  return regularPrice - getSalePrice(regularPrice);
};

/**
 * Returns formatted deadline string e.g. "Offer till 12 November"
 */
export const getSaleDeadlineLabel = (): string => {
  if (!SALE_CONFIG.endDate) return "";
  try {
    const end = new Date(SALE_CONFIG.endDate);
    const day = end.getDate();
    const month = end.toLocaleString("en-IN", { month: "long" });
    return `Offer till ${day} ${month}`;
  } catch {
    return "Offer till 12 November";
  }
};
