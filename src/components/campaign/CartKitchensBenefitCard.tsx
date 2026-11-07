import React from "react";
import { Sparkles, Gift, Award, Heart } from "lucide-react";
import { useStore } from "../../context/StoreContext";

interface CartKitchensBenefitCardProps {
  totalSavings?: number;
  className?: string;
}

export const CartKitchensBenefitCard: React.FC<CartKitchensBenefitCardProps> = ({
  totalSavings = 0,
  className = "",
}) => {
  const { campaignTierInfo } = useStore();

  if (campaignTierInfo.tier === "STANDARD_PRICE_0") {
    return null;
  }

  const isOrder2 = campaignTierInfo.tier === "COHORT_ORDER_2_20";
  const isOrder3Plus = campaignTierInfo.tier === "COHORT_ORDER_3_10";

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#061D11] via-[#0A2918] to-[#0F3D24] border border-[#D4AF37]/50 text-[#FAF7F2] shadow-md space-y-2 relative overflow-hidden ${className}`}
    >
      {/* Decorative top-right gold accent glow */}
      <div
        aria-hidden="true"
        className="absolute -top-10 -right-10 w-32 h-32 bg-[#D4AF37]/15 rounded-full blur-2xl pointer-events-none"
      />

      <div className="flex items-center justify-between gap-2 relative z-10 flex-wrap">
        <div className="flex items-center gap-1.5">
          {isOrder2 || isOrder3Plus ? (
            <Award className="w-4 h-4 text-[#F3D17A] shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-[#F3D17A] shrink-0" />
          )}
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-[#F3D17A]">
            {campaignTierInfo.badge}
          </span>
        </div>

        {totalSavings > 0 && (
          <span className="px-2 py-0.5 rounded-md bg-[#D4AF37]/20 border border-[#D4AF37]/60 text-[#F3D17A] font-black text-[10px] uppercase tracking-wider shrink-0">
            SAVE ₹{totalSavings}
          </span>
        )}
      </div>

      <p className="text-sm sm:text-base font-extrabold font-serif text-white leading-snug relative z-10">
        {campaignTierInfo.cartBannerHeadline}
      </p>

      <div className="flex items-center gap-2 pt-0.5 text-xs text-[#E5D7C3] leading-relaxed relative z-10">
        {isOrder3Plus ? (
          <Heart className="w-3.5 h-3.5 text-[#F3D17A] shrink-0" />
        ) : (
          <Gift className="w-3.5 h-3.5 text-[#F3D17A] shrink-0" />
        )}
        <span>{campaignTierInfo.cartBannerSubtext}</span>
      </div>
    </div>
  );
};
