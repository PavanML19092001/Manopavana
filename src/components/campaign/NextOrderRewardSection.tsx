import React from "react";
import { Gift, ArrowRight, ShieldCheck, HeartHandshake, Sparkles } from "lucide-react";

interface NextOrderRewardSectionProps {
  onShopClick?: () => void;
}

export const NextOrderRewardSection: React.FC<NextOrderRewardSectionProps> = ({
  onShopClick,
}) => {
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onShopClick) {
      e.preventDefault();
      onShopClick();
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
      aria-label="Returning Customer Reward Campaign"
      className="w-full py-12 sm:py-16 bg-[#082415] border-y border-[#D4AF37]/30 text-[#FAF7F2] relative overflow-hidden"
    >
      {/* Background ambient lighting */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none"
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        {/* Subtle Top Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#F3D17A] text-xs font-black uppercase tracking-[0.2em]">
          <Gift className="w-3.5 h-3.5 text-[#F3D17A]" />
          <span>FIRST 25 KITCHENS PRIVILEGE</span>
        </div>

        {/* Exact Headline Required by User */}
        <div className="space-y-3 max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-serif tracking-wide text-white leading-tight">
            YOUR FIRST ORDER IS JUST THE BEGINNING.
          </h2>

          {/* Exact Subhead Required by User */}
          <p className="text-sm sm:text-base lg:text-lg text-[#E5D7C3] leading-relaxed max-w-2xl mx-auto font-normal">
            Enjoy 30% OFF on your first purchase and unlock a special returning-customer reward for your next order.
          </p>
        </div>

        {/* 3 Step Journey */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-2 text-left">
          <div className="p-5 rounded-2xl bg-black/30 border border-[#D4AF37]/25 backdrop-blur-xs space-y-2">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F3D17A] font-black text-xs flex items-center justify-center">
              1
            </div>
            <h3 className="font-bold text-sm text-white font-serif">Welcome 30% OFF</h3>
            <p className="text-xs text-[#C8B89E] leading-relaxed">
              Order your first 1L wood-pressed cooking oils at special promotional launch prices.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-black/30 border border-[#D4AF37]/25 backdrop-blur-xs space-y-2">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F3D17A] font-black text-xs flex items-center justify-center">
              2
            </div>
            <h3 className="font-bold text-sm text-white font-serif">Cold-Pressed Purity</h3>
            <p className="text-xs text-[#C8B89E] leading-relaxed">
              Taste the difference of traditional Marachekku oil settled naturally with zero chemical refining.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-black/30 border border-[#D4AF37]/25 backdrop-blur-xs space-y-2">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F3D17A] font-black text-xs flex items-center justify-center">
              3
            </div>
            <h3 className="font-bold text-sm text-white font-serif">Next-Order Reward</h3>
            <p className="text-xs text-[#C8B89E] leading-relaxed">
              Complete your first purchase and automatically unlock an exclusive reward for your next refill.
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="pt-2">
          <a
            href="#catalog"
            onClick={handleScroll}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-[#D4AF37] via-[#F3D17A] to-[#C89B2B] text-[#082415] font-black text-xs sm:text-sm uppercase tracking-wider hover:brightness-110 shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <span>SHOP FIRST ORDER OFFER (30% OFF)</span>
            <ArrowRight className="w-4 h-4 text-[#082415]" />
          </a>
        </div>

        {/* Official Tagline */}
        <div className="text-[11px] text-[#A6957E] font-medium tracking-wider uppercase">
          MANOPAVANA • PURE BY NATURE, TRUSTED FOR LIFE.
        </div>
      </div>
    </section>
  );
};
