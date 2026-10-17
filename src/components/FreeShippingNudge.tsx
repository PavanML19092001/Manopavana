import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Truck, Sparkles, ShoppingBag, ArrowRight } from "lucide-react";
import { useStore } from "../context/StoreContext";

export const FreeShippingNudge: React.FC = () => {
  const location = useLocation();
  const {
    cartCount,
    freeShippingProgress,
    freeShippingShortfall,
    cmsConfig,
    themeMode,
  } = useStore();

  const isDark = themeMode === "dark";

  // Hide on Cart and Checkout pages where full breakdowns are already visible
  if (
    cartCount === 0 ||
    location.pathname === "/cart" ||
    location.pathname === "/checkout"
  ) {
    return null;
  }

  const isUnlocked = freeShippingProgress >= 100;

  return (
    <aside
      aria-label="Free Delivery Progress Bar"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md animate-fade-in"
    >
      <div
        className={`p-3 rounded-2xl shadow-2xl border backdrop-blur-md transition-all ${
          isDark
            ? "bg-[#1C120B]/95 border-[#4A301E] text-[#FAF4EA]"
            : "bg-white/95 border-[#E5DAC8] text-[#1F120A]"
        }`}
      >
        <div className="flex items-center justify-between gap-3 text-xs mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`p-1.5 rounded-xl shrink-0 ${
                isUnlocked
                  ? "bg-emerald-500/20 text-emerald-500"
                  : "bg-amber-500/20 text-[#E08F35]"
              }`}
            >
              {isUnlocked ? (
                <Sparkles className="w-4 h-4 animate-spin" />
              ) : (
                <Truck className="w-4 h-4" />
              )}
            </span>
            <span className="font-bold truncate text-[11px] sm:text-xs">
              {isUnlocked ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  🎉 FREE Doorstep Delivery Unlocked!
                </span>
              ) : (
                <span>
                  Add <strong className="text-[#E08F35]">₹{freeShippingShortfall}</strong> more for{" "}
                  <strong>FREE Delivery</strong>
                </span>
              )}
            </span>
          </div>

          <Link
            to="/cart"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-[11px] shrink-0 transition-colors shadow-xs"
          >
            <span>View Bag</span>
            <ArrowRight className="w-3 h-3 text-amber-300" />
          </Link>
        </div>

        {/* Progress Track */}
        <div
          className={`w-full h-1.5 rounded-full overflow-hidden ${
            isDark ? "bg-[#140D07]" : "bg-stone-200"
          }`}
        >
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isUnlocked
                ? "bg-emerald-500"
                : "bg-gradient-to-r from-[#E08F35] to-[#B87C24]"
            }`}
            style={{ width: `${freeShippingProgress}%` }}
          />
        </div>
      </div>
    </aside>
  );
};