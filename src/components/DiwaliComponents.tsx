import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Leaf,
  Droplets,
  Truck,
  ArrowRight,
  Check,
} from "lucide-react";
import { DIWALI_CONFIG, isDiwaliActive, isDiwaliCombo } from "../diwaliConfig";
import { ComboProduct } from "../types";

/**
 * Traditional Indian Clay Diya (Oil Lamp) SVG Icon
 * Styled in warm festive Gold (#E0B04A) with a glowing flame
 */
export const DiyaIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`${className} inline-block shrink-0`}
    aria-hidden="true"
  >
    {/* Outer Flame Glow */}
    <path
      d="M12 1.5C12 1.5 14.8 5 14.8 7.8C14.8 9.5 13.5 10.8 12 10.8C10.5 10.8 9.2 9.5 9.2 7.8C9.2 5 12 1.5 12 1.5Z"
      fill="#E0B04A"
    />
    {/* Inner White-Gold Hot Flame */}
    <path
      d="M12 3.8C12 3.8 13.5 6 13.5 7.5C13.5 8.3 12.8 9 12 9C11.2 9 10.5 8.3 10.5 7.5C10.5 6 12 3.8 12 3.8Z"
      fill="#FFF3D1"
    />
    {/* Diya Bowl (Earthen lamp rim and body) */}
    <path
      d="M3 13C3.5 17.5 7.5 21 12 21C16.5 21 20.5 17.5 21 13H3Z"
      fill="#E0B04A"
    />
    <path
      d="M2 13C2 12.3 2.5 11.8 3.2 11.8H20.8C21.5 11.8 22 12.3 22 13C22 13.7 21.5 14.2 20.8 14.2H3.2C2.5 14.2 2 13.7 2 13Z"
      fill="#C99836"
    />
    {/* Diya Lamp Base Stand */}
    <path
      d="M9 21H15V22.2H9V21Z"
      fill="#A87B22"
    />
  </svg>
);

/**
 * Gold "Diwali Special" Ribbon
 * Used on product image and every card that shows this product
 * Features shimmering gold gradient
 */
export const DiwaliRibbon: React.FC<{
  className?: string;
  size?: "sm" | "md" | "lg";
}> = ({ className = "", size = "md" }) => {
  const padding =
    size === "sm"
      ? "px-2.5 py-0.5 text-[10px]"
      : size === "lg"
      ? "px-4 py-1.5 text-xs sm:text-sm"
      : "px-3 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-serif font-black tracking-wide uppercase gold-shimmer text-[#1F3D2B] shadow-lg border border-[#FAF3E0]/70 select-none ${padding} ${className}`}
    >
      <DiyaIcon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      <span>{DIWALI_CONFIG.ribbonText}</span>
    </span>
  );
};

/**
 * Full-width Home Page Diwali Banner
 * - Responsive image keeping centre visible on phones and wide screens
 * - Live text button: "Gift a Diwali combo" (min 44px tall, text min 16px)
 * - Entire banner (image and button) is ONE clickable link opening combo product page in same tab
 * - Descriptive alt text: "Manopavana Diwali Special combo"
 */
export const DiwaliBanner: React.FC<{ comboUrl?: string }> = ({
  comboUrl = `/product/${DIWALI_CONFIG.targetComboId}`,
}) => {
  return (
    <section className="w-full relative overflow-hidden bg-[#1F3D2B]">
      <Link
        to={comboUrl}
        className="w-full block relative group overflow-hidden focus:outline-none cursor-pointer"
        aria-label="Gift a Diwali combo - Manopavana Diwali Special combo"
      >
        <div className="relative w-full h-[340px] xs:h-[400px] sm:h-[480px] md:h-[540px] lg:h-[600px] overflow-hidden bg-[#1F3D2B]">
          <img
            src={DIWALI_CONFIG.bannerImage}
            alt={DIWALI_CONFIG.bannerAltText}
            loading="lazy"
            className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          />

          {/* Vignette & soft lower gradient to ensure WCAG text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#14291D]/90 via-[#1F3D2B]/25 to-black/30 pointer-events-none" />

          {/* Overlay Live Text CTA Button */}
          <div className="absolute bottom-6 sm:bottom-10 inset-x-0 flex flex-col items-center justify-center px-4 text-center pointer-events-none z-10 space-y-2">
            <div className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 min-h-[48px] rounded-full bg-[#E0B04A] hover:bg-[#d69e35] text-[#1F3D2B] font-serif font-black text-base sm:text-lg shadow-2xl border-2 border-[#FAF3E0] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(224,176,74,0.6)] active:scale-98">
              <DiyaIcon className="w-5 h-5" />
              <span>{DIWALI_CONFIG.buttonText}</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </div>

            <p className="text-xs sm:text-sm font-serif font-semibold text-[#FAF3E0]/90 tracking-wide drop-shadow-md">
              {DIWALI_CONFIG.offerLine}
            </p>
          </div>
        </div>
      </Link>
    </section>
  );
};

/**
 * Diwali Special Section (Home Page, directly below the banner)
 * - Deep green (#1F3D2B) background area
 * - Gold (#E0B04A) accents
 * - Cream (#FAF3E0) text and cards
 * - Serif headings, clean sans-serif body text, thin gold border lines
 * - Small diya icon beside the heading
 * - Supports both 1L (3L Trio) and 500ml (1.5L Trio) Diwali Combos!
 * - Trust row with four small icons and labels
 * - Small line underneath: "Offer till 12 November."
 */
export const DiwaliSpecialSection: React.FC<{
  combos: ComboProduct[];
  onAddToCart?: (combo: ComboProduct) => void;
}> = ({ combos, onAddToCart }) => {
  const navigate = useNavigate();

  // Find 1L and 500ml combos
  const combo3L = combos.find((c) => c.id === "combo-3l") || combos[0];
  const combo15L = combos.find((c) => c.id === "combo-1.5l") || combos[1];

  // Active combo state allows user to toggle between 1L Family Trio & 500ml Starter Trio
  const [selectedComboId, setSelectedComboId] = useState<string>("combo-3l");
  const activeCombo = selectedComboId === "combo-3l" ? combo3L : (combo15L || combo3L);

  if (!activeCombo) return null;

  const comboUrl = `/product/${activeCombo.id}`;
  const price = activeCombo.regularPrice;
  const mrp = activeCombo.mrp;
  const hasComparePrice = mrp > price;
  const savings = mrp - price;

  const handleGiftClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(activeCombo);
    }
    navigate(comboUrl);
  };

  return (
    <section
      aria-label="Diwali Special Combo"
      className="w-full bg-[#1F3D2B] text-[#FAF3E0] py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-b border-[#E0B04A]/30 transition-colors"
    >
      <div className="max-w-5xl mx-auto space-y-8 sm:space-y-10">
        {/* Section Heading & Subheading */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2.5">
            <DiyaIcon className="w-7 h-7 sm:w-8 sm:h-8" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[#FAF3E0] tracking-wide">
              {DIWALI_CONFIG.sectionHeading}
            </h2>
            <DiyaIcon className="w-7 h-7 sm:w-8 sm:h-8 transform scale-x-[-1]" />
          </div>
          <p className="text-sm sm:text-base font-sans text-[#FAF3E0]/85 max-w-xl mx-auto leading-relaxed">
            {DIWALI_CONFIG.sectionSubheading}
          </p>

          {/* Size Selector: 1L Family Trio vs 500ml Starter Trio */}
          <div className="pt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedComboId("combo-3l")}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-serif font-bold transition-all cursor-pointer border ${
                selectedComboId === "combo-3l"
                  ? "bg-[#E0B04A] text-[#1F3D2B] border-[#FAF3E0] shadow-md"
                  : "bg-[#14291D] text-[#FAF3E0] border-[#E0B04A]/40 hover:border-[#E0B04A]"
              }`}
            >
              1L Trio (Family Gift Set) • ₹1,299
            </button>
            <button
              type="button"
              onClick={() => setSelectedComboId("combo-1.5l")}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-serif font-bold transition-all cursor-pointer border ${
                selectedComboId === "combo-1.5l"
                  ? "bg-[#E0B04A] text-[#1F3D2B] border-[#FAF3E0] shadow-md"
                  : "bg-[#14291D] text-[#FAF3E0] border-[#E0B04A]/40 hover:border-[#E0B04A]"
              }`}
            >
              500ml Trio (Starter Gift Set) • ₹699
            </button>
          </div>
        </div>

        {/* Large Highlighted Card with Gold Border and Ribbon */}
        <div
          onClick={() => navigate(comboUrl)}
          className="w-full bg-[#FAF3E0] text-[#1F3D2B] rounded-3xl p-6 sm:p-8 md:p-10 border-2 border-[#E0B04A] shadow-[0_15px_40px_rgba(0,0,0,0.35)] relative overflow-hidden transition-all duration-300 hover:shadow-[0_20px_50px_rgba(224,176,74,0.35)] cursor-pointer group"
        >
          {/* Subtle Golden Glow Accent */}
          <div className="absolute -top-16 -right-16 w-44 h-44 bg-[#E0B04A]/20 rounded-full blur-2xl pointer-events-none" />

          {/* Gold "Diwali Special" Ribbon */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
            <DiwaliRibbon size="lg" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center pt-8 md:pt-0">
            {/* Product Photo */}
            <div className="md:col-span-5 relative flex items-center justify-center">
              <div className="relative aspect-square max-h-[340px] w-full rounded-2xl bg-white/80 border border-[#E0B04A]/40 p-3 sm:p-5 shadow-inner flex items-center justify-center overflow-hidden">
                <img
                  src={DIWALI_CONFIG.comboProductImage}
                  alt={activeCombo.name}
                  loading="lazy"
                  className="max-h-full max-w-full object-contain mx-auto transition-transform duration-500 group-hover:scale-105 drop-shadow-xl"
                />
              </div>
            </div>

            {/* Product Info & CTA */}
            <div className="md:col-span-7 space-y-4 sm:space-y-5 text-left">
              <div>
                <span className="text-xs font-serif font-black tracking-widest text-[#A6781E] uppercase block mb-1">
                  Festive Limited Edition Trio
                </span>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-[#1F3D2B] leading-tight">
                  {DIWALI_CONFIG.titlePrefix}
                  {activeCombo.name}
                </h3>
              </div>

              {/* Contents & Description */}
              <div className="space-y-2">
                <div className="p-3 sm:p-3.5 rounded-xl bg-white/70 border border-[#E0B04A]/30">
                  <span className="block text-xs font-bold uppercase tracking-wider text-[#1F3D2B]/70">
                    Combo Contents:
                  </span>
                  <p className="text-sm font-serif font-bold text-[#1F3D2B] mt-0.5">
                    {activeCombo.includedOils && activeCombo.includedOils.length > 0
                      ? activeCombo.includedOils.join(" + ")
                      : activeCombo.volumeLabel}
                  </p>
                </div>

                <p className="text-xs sm:text-sm font-sans text-[#1F3D2B]/85 leading-relaxed">
                  {DIWALI_CONFIG.descriptionPrefix}
                </p>
              </div>

              {/* Price & Savings */}
              <div className="pt-2 border-t border-[#E0B04A]/30 flex flex-wrap items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-serif font-black text-[#1F3D2B]">
                  ₹{price}
                </span>

                {hasComparePrice && (
                  <>
                    <span className="text-base sm:text-lg line-through text-stone-400 font-semibold">
                      ₹{mrp}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-[#1F3D2B] bg-[#E0B04A]/30 border border-[#E0B04A] px-2.5 py-1 rounded-md">
                      You save ₹{savings}
                    </span>
                  </>
                )}

                <span className="text-xs font-bold text-[#1F3D2B]/75 bg-white/80 px-2 py-0.5 rounded-md border border-stone-200">
                  Inclusive of all taxes & free shipping
                </span>
              </div>

              {/* Gold Button: Gift a Diwali combo */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGiftClick}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 min-h-[44px] rounded-xl bg-[#E0B04A] hover:bg-[#d69e35] text-[#1F3D2B] font-serif font-black text-base sm:text-lg shadow-lg border border-[#FAF3E0] transition-all duration-200 cursor-pointer active:scale-98"
                >
                  <DiyaIcon className="w-5 h-5" />
                  <span>{DIWALI_CONFIG.buttonText}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Row with 4 small icons and labels */}
        <div className="pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-[#E0B04A]/30 text-center flex flex-col items-center justify-center gap-1.5 transition-colors hover:bg-white/10">
              <Sparkles className="w-5 h-5 text-[#E0B04A]" />
              <span className="text-xs sm:text-sm font-serif font-bold text-[#FAF3E0]">
                Pure and unrefined
              </span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-[#E0B04A]/30 text-center flex flex-col items-center justify-center gap-1.5 transition-colors hover:bg-white/10">
              <Leaf className="w-5 h-5 text-[#E0B04A]" />
              <span className="text-xs sm:text-sm font-serif font-bold text-[#FAF3E0]">
                Wood-pressed, the traditional way
              </span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-[#E0B04A]/30 text-center flex flex-col items-center justify-center gap-1.5 transition-colors hover:bg-white/10">
              <Droplets className="w-5 h-5 text-[#E0B04A]" />
              <span className="text-xs sm:text-sm font-serif font-bold text-[#FAF3E0]">
                Drip-free spout bottle
              </span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-[#E0B04A]/30 text-center flex flex-col items-center justify-center gap-1.5 transition-colors hover:bg-white/10">
              <Truck className="w-5 h-5 text-[#E0B04A]" />
              <span className="text-xs sm:text-sm font-serif font-bold text-[#FAF3E0]">
                Delivered across India
              </span>
            </div>
          </div>

          {/* Small line underneath: "Offer till 12 November." */}
          <p className="text-center text-xs sm:text-sm font-serif font-semibold text-[#FAF3E0]/75 mt-5 tracking-wide">
            {DIWALI_CONFIG.offerLine}
          </p>
        </div>
      </div>
    </section>
  );
};
