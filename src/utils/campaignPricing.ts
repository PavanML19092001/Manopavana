/**
 * MANOPAVANA — FIRST 25 KITCHENS CAMPAIGN PRICING UTILITY
 * 
 * Official Campaign Rules:
 * Campaign Name: FIRST 25 KITCHENS
 * Primary Offer: FLAT 30% OFF YOUR FIRST ORDER
 * Official Tagline: PURE BY NATURE, TRUSTED FOR LIFE.
 * 
 * Exact Promotional Table:
 * - Groundnut Oil 1 L : Original ₹399 | Offer ₹279 | Save ₹120 (30% OFF)
 * - Coconut Oil 1 L   : Original ₹499 | Offer ₹349 | Save ₹150 (30% OFF)
 * - Sesame Oil 1 L    : Original ₹499 | Offer ₹349 | Save ₹150 (30% OFF)
 */

export interface CampaignOfferInfo {
  originalPrice: number;
  offerPrice: number;
  savings: number;
  discountPercent: number;
  badge: string;
  supportingLabel: string;
  isEligible: boolean;
}

export const FIRST_25_KITCHENS_EXACT: Record<
  string,
  { originalPrice: number; offerPrice: number; savings: number }
> = {
  "groundnut-1l": { originalPrice: 399, offerPrice: 279, savings: 120 },
  "coconut-1l": { originalPrice: 499, offerPrice: 349, savings: 150 },
  "sesame-1l": { originalPrice: 499, offerPrice: 349, savings: 150 },
};

/**
 * Returns the First 25 Kitchens promotional pricing calculation.
 * Preserves the actual base price and applies promotional discount cleanly.
 */
export function getProductCampaignPricing(
  productId: string,
  variant: string,
  basePrice: number,
  isEligible: boolean = true
): CampaignOfferInfo {
  const normId = String(productId || "").toLowerCase().replace(/^(oil-|wood-pressed-)/, "");
  const normVariant = String(variant || "1L").toLowerCase();
  const key = `${normId}-${normVariant}`;

  const exact = FIRST_25_KITCHENS_EXACT[key];

  if (exact) {
    return {
      originalPrice: exact.originalPrice,
      offerPrice: isEligible ? exact.offerPrice : exact.originalPrice,
      savings: isEligible ? exact.savings : 0,
      discountPercent: 30,
      badge: "30% OFF",
      supportingLabel: "FIRST ORDER OFFER",
      isEligible,
    };
  }

  // For 500ml or combo items: flat 30% promotional discount for first order
  const savings = Math.round(basePrice * 0.3);
  return {
    originalPrice: basePrice,
    offerPrice: isEligible ? basePrice - savings : basePrice,
    savings: isEligible ? savings : 0,
    discountPercent: 30,
    badge: "30% OFF",
    supportingLabel: "FIRST ORDER OFFER",
    isEligible,
  };
}
