export type CampaignTier =
  | "NEW_CUSTOMER_30"
  | "COHORT_ORDER_2_20"
  | "COHORT_ORDER_3_10"
  | "STANDARD_PRICE_0";

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
 * 
 * Progression Tiers (Single Source of Truth in Firestore):
 * 1. New Customer (Slots Open): successfulOrdersCount == 0 && claimedSlots < 25 -> 30% OFF
 * 2. Order #2 (Cohort Member): isFirst25KitchensMember == true && successfulOrdersCount == 1 -> 20% OFF
 * 3. Order #3 & Beyond: isFirst25KitchensMember == true && successfulOrdersCount >= 2 -> 10% OFF
 * 4. Customer #26+ (After Cap): successfulOrdersCount == 0 && claimedSlots >= 25 -> 0% (Standard Price)
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

export interface CampaignTierInfo {
  tier: CampaignTier;
  discountPercent: number; // 30, 20, 10, or 0
  badge: string;
  supportingLabel: string;
  cartBannerHeadline: string;
  cartBannerSubtext: string;
  isEligibleFor30ProductPrice: boolean;
  isCohortMember: boolean;
  isSlotsOpen: boolean;
  remainingSlots: number;
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
 * Evaluates the exact dynamic tier based on Firestore single source of truth
 */
export function determineCampaignTier(
  successfulOrdersCount: number,
  claimedSlots: number,
  isFirst25KitchensMember: boolean,
  maxSlots: number = 25
): CampaignTierInfo {
  const isSlotsOpen = claimedSlots < maxSlots;
  const remainingSlots = Math.max(0, maxSlots - claimedSlots);

  // Stage 2: Order #2 (Cohort Member) -> 20% OFF
  if (isFirst25KitchensMember && successfulOrdersCount === 1) {
    return {
      tier: "COHORT_ORDER_2_20",
      discountPercent: 20,
      badge: "FIRST 25 REWARD: 20% OFF YOUR 2ND ORDER",
      supportingLabel: "2ND ORDER COHORT REWARD",
      cartBannerHeadline:
        "Welcome back! You have unlocked 20% OFF on your 2nd order as part of the First 25 Kitchens.",
      cartBannerSubtext:
        "Complete your purchase and enjoy 20% off your subtotal. Subsequent refills enjoy 10% lifetime privilege.",
      isEligibleFor30ProductPrice: false,
      isCohortMember: true,
      isSlotsOpen,
      remainingSlots,
    };
  }

  // Stage 3: Order #3 & Beyond (Cohort Member) -> 10% OFF
  if (isFirst25KitchensMember && successfulOrdersCount >= 2) {
    return {
      tier: "COHORT_ORDER_3_10",
      discountPercent: 10,
      badge: "LOYAL KITCHEN PRIVILEGE: 10% OFF",
      supportingLabel: "LOYAL KITCHEN PRIVILEGE",
      cartBannerHeadline:
        "Welcome back! Flat 10% OFF applied automatically for life as a First 25 Kitchens member.",
      cartBannerSubtext:
        "Thank you for being part of our founding kitchens cohort. Your 10% loyal privilege applies to every refill.",
      isEligibleFor30ProductPrice: false,
      isCohortMember: true,
      isSlotsOpen,
      remainingSlots,
    };
  }

  // Stage 1: New Customer (Slots Open) -> 30% OFF
  if (successfulOrdersCount === 0 && isSlotsOpen) {
    return {
      tier: "NEW_CUSTOMER_30",
      discountPercent: 30,
      badge: "FIRST 25 KITCHENS (30% OFF)",
      supportingLabel: "FIRST ORDER OFFER",
      cartBannerHeadline: "You're saving 30% on your first order!",
      cartBannerSubtext:
        "Complete your purchase to lock in your spot in the First 25 Kitchens cohort and unlock 20% OFF on your 2nd order.",
      isEligibleFor30ProductPrice: true,
      isCohortMember: false,
      isSlotsOpen: true,
      remainingSlots,
    };
  }

  // Stage 4: Customer #26+ (After Cap or non-cohort customer) -> 0% standard pricing
  return {
    tier: "STANDARD_PRICE_0",
    discountPercent: 0,
    badge: "Regular Price",
    supportingLabel: "STANDARD PRICING",
    cartBannerHeadline: "Handcrafted Wood-Pressed Cooking Oils",
    cartBannerSubtext:
      "Authentic Marachekku extracted in Peenya, Bengaluru with zero chemical refining.",
    isEligibleFor30ProductPrice: false,
    isCohortMember: false,
    isSlotsOpen: false,
    remainingSlots: 0,
  };
}

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
      badge: isEligible ? "30% OFF" : "Regular Price",
      supportingLabel: isEligible ? "FIRST ORDER OFFER" : "STANDARD PRICE",
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
    badge: isEligible ? "30% OFF" : "Regular Price",
    supportingLabel: isEligible ? "FIRST ORDER OFFER" : "STANDARD PRICE",
    isEligible,
  };
}
