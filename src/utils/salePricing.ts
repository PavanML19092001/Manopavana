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
  enabled: false,
  percent: 0,
  label: "",
  endDate: null,
};

/**
 * Returns true if the sitewide sale is currently active.
 */
export const isSaleActive = (): boolean => {
  return false;
};

/**
 * Calculates the active discounted sale price for any given regular price.
 * Returns regularPrice (original price).
 */
export const getSalePrice = (regularPrice: number): number => {
  if (!regularPrice || regularPrice <= 0) return 0;
  return regularPrice;
};

/**
 * Calculates savings between regular price and sale price.
 */
export const getSaleSavings = (regularPrice: number): number => {
  return 0;
};

/**
 * Returns formatted deadline string
 */
export const getSaleDeadlineLabel = (): string => {
  return "Limited Period Offer";
};
