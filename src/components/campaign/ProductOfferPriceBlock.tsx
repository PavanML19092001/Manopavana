import React from "react";
import { getProductCampaignPricing } from "../../utils/campaignPricing";
import { useStore } from "../../context/StoreContext";

interface ProductOfferPriceBlockProps {
  productId: string;
  variant: string;
  basePrice: number;
  isFirstTimeCustomer?: boolean;
  size?: "sm" | "md" | "lg";
  isDark?: boolean;
}

export const ProductOfferPriceBlock: React.FC<ProductOfferPriceBlockProps> = ({
  productId,
  variant,
  basePrice,
  isFirstTimeCustomer: propIsFirstTime,
  size = "md",
  isDark = false,
}) => {
  const { campaignTierInfo } = useStore();

  const isEligibleFor30 =
    propIsFirstTime !== undefined
      ? propIsFirstTime
      : campaignTierInfo.isEligibleFor30ProductPrice;

  const info = getProductCampaignPricing(productId, variant, basePrice, isEligibleFor30);

  return (
    <div className="space-y-1.5">
      {/* Price Line Hierarchy: Offer price large & prominent; Original price struck-through */}
      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className={`font-black font-serif tracking-tight ${
            size === "lg"
              ? "text-3xl sm:text-4xl text-[#0B2E1B] dark:text-[#F3D17A]"
              : size === "sm"
              ? "text-xl font-bold text-[#0B2E1B] dark:text-[#F3D17A]"
              : "text-2xl sm:text-3xl text-[#0B2E1B] dark:text-[#F3D17A]"
          }`}
        >
          ₹{info.offerPrice}
        </span>

        {info.savings > 0 && (
          <span
            className={`line-through font-semibold ${
              size === "lg" ? "text-base sm:text-lg" : "text-xs sm:text-sm"
            } ${isDark ? "text-stone-400" : "text-stone-500"}`}
          >
            ₹{info.originalPrice}
          </span>
        )}

        <span className={`text-[10.5px] font-medium ${isDark ? "text-[#A8907E]" : "text-[#7A5E48]"}`}>
          (GST Incl.)
        </span>
      </div>

      {/* Campaign Badge Hierarchy */}
      {info.savings > 0 ? (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#0B2E1B] text-[#F3D17A] text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-2xs">
            SAVE ₹{info.savings}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#D4AF37]/20 border border-[#D4AF37]/60 text-[#7A5510] dark:text-[#F3D17A] text-[10px] sm:text-[11px] font-black uppercase tracking-wider">
            {info.badge}
          </span>
          <span className="inline-flex items-center text-[10px] font-bold text-[#0B2E1B] dark:text-[#A4E0B8] uppercase tracking-wider">
            {info.supportingLabel}
          </span>
        </div>
      ) : campaignTierInfo.tier === "COHORT_ORDER_2_20" ? (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#0B2E1B] text-[#F3D17A] text-[10px] sm:text-[11px] font-black uppercase tracking-wider">
            FIRST 25 REWARD: 20% OFF IN CART
          </span>
        </div>
      ) : campaignTierInfo.tier === "COHORT_ORDER_3_10" ? (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#0B2E1B] text-[#F3D17A] text-[10px] sm:text-[11px] font-black uppercase tracking-wider">
            LOYAL PRIVILEGE: 10% OFF IN CART
          </span>
        </div>
      ) : null}
    </div>
  );
};
