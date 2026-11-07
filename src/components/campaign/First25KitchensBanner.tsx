import React from "react";
import { Sparkles } from "lucide-react";

interface First25KitchensBannerProps {
  onShopNowClick?: () => void;
}

export const First25KitchensBanner: React.FC<First25KitchensBannerProps> = ({
  onShopNowClick,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (onShopNowClick) {
      e.preventDefault();
      onShopNowClick();
      return;
    }
    const target = document.getElementById("catalog");
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      aria-label="MANOPAVANA First 25 Kitchens Campaign"
      onClick={handleClick}
      className="relative w-full overflow-hidden bg-[#0A2617] border-b border-[#D4AF37]/25 text-[#FAF7F2] cursor-pointer select-none transition-colors hover:bg-[#0c2e1c]"
    >
      {/* Subtle ambient lighting glows matching the screenshot's vignette */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,#114328_0%,#082013_70%,#05180e_100%)] pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none"
      />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 flex flex-col items-center text-center space-y-5 sm:space-y-6">
        {/* 1. Campaign Pill Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full border border-[#C5A04D]/60 bg-[#0B2A1B]/40 text-[#F3D17A] text-xs sm:text-sm font-bold tracking-[0.22em] uppercase shadow-xs">
          <Sparkles className="w-4 h-4 text-[#F3D17A] stroke-[2.2]" />
          <span>FIRST 25 KITCHENS</span>
        </div>

        {/* 2. Secondary Headline */}
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-bold font-serif text-[#FAF7F2] tracking-wide leading-snug max-w-2xl">
          YOUR KITCHEN DESERVES
          <br className="hidden sm:inline" /> SOMETHING BETTER.
        </h2>

        {/* 3. Hero Dominant 30% Offer Lockup */}
        <div className="space-y-1.5 sm:space-y-2 pt-1 sm:pt-2">
          <div className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black font-serif tracking-tight text-[#F3D17A] drop-shadow-[0_4px_24px_rgba(243,209,122,0.25)]">
            FLAT 30% OFF
          </div>
          <div className="text-base sm:text-2xl md:text-3xl font-extrabold tracking-wider text-white uppercase font-sans">
            ON YOUR FIRST ORDER
          </div>
        </div>

        {/* 4. Subhead / Invitation */}
        <p className="pt-2 text-xs sm:text-sm md:text-base text-[#E5D7C3] leading-relaxed max-w-xl font-normal">
          Be among the first 25 customers to welcome MANOPAVANA into your kitchen.
        </p>
      </div>
    </section>
  );
};
