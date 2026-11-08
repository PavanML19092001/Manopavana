import React from "react";
import { getSalePrice, getSaleSavings, isSaleActive, getSaleDeadlineLabel } from "../../utils/salePricing";

interface ProductOfferPriceBlockProps {
  productId?: string;
  variant?: string;
  basePrice: number;
  size?: "sm" | "md" | "lg";
  isDark?: boolean;
  showDeadline?: boolean;
}

export const ProductOfferPriceBlock: React.FC<ProductOfferPriceBlockProps> = ({
  basePrice,
  size = "md",
  isDark = false,
  showDeadline = false,
}) => {
  const saleActive = isSaleActive();
  const salePrice = getSalePrice(basePrice);
  const savings = getSaleSavings(basePrice);
  const deadline = getSaleDeadlineLabel();

  return (
    <div className="space-y-1.5">
      {/* Price Line: Discounted price large & bold, regular price struck through */}
      <div className="flex items-baseline gap-2.5 flex-wrap">
        <span
          className={`font-black font-serif tracking-tight ${
            size === "lg"
              ? "text-3xl sm:text-4xl text-[#14291D] dark:text-[#F3D17A]"
              : size === "sm"
              ? "text-lg sm:text-xl font-bold text-[#14291D] dark:text-[#F3D17A]"
              : "text-2xl sm:text-3xl font-extrabold text-[#14291D] dark:text-[#F3D17A]"
          }`}
        >
          ₹{salePrice}
        </span>

        {saleActive && savings > 0 && (
          <span
            className={`line-through font-semibold text-[#4A5A50] dark:text-[#FAF3E0]/70 ${
              size === "lg" ? "text-base sm:text-lg" : "text-xs sm:text-sm"
            }`}
          >
            ₹{basePrice}
          </span>
        )}

        <span className={`text-[11px] font-medium ${isDark ? "text-[#FAF3E0]/80" : "text-[#3F4F45]"}`}>
          (GST Incl.)
        </span>
      </div>

      {/* 10% OFF Badge & Savings */}
      {saleActive && savings > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-0.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#E0B04A] text-[#14291D] text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-2xs">
            10% OFF
          </span>
          <span className="inline-flex items-center text-[11px] font-bold text-[#14291D] dark:text-[#F3D17A]">
            You save ₹{savings}
          </span>
          {showDeadline && deadline && (
            <span className="inline-flex items-center text-[10.5px] font-medium text-[#3F4F45] dark:text-[#FAF3E0]/80">
              • {deadline}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
