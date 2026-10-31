import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Truck,
  ShieldCheck,
  CreditCard,
  MessageCircle,
  AlertCircle,
  Pause,
  Play,
  ArrowRight,
  Droplet,
  Package,
  Info,
  Camera,
  Layers,
  Sliders,
  Plus,
  Minus,
  Edit3,
  X,
  Check,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { THEMED_PRODUCT_IMAGES, BUSINESS_CONFIG } from "../constants";

/**
 * Universal ordinal suffix formatter (1st, 2nd, 3rd, 4th, 21st, 22nd, 23rd, etc.)
 */
export const getOrdinalSuffix = (day: number | string | undefined | null): string => {
  if (day === undefined || day === null || day === "") return "";
  const n = typeof day === "number" ? day : parseInt(String(day), 10);
  if (isNaN(n)) return `${day}`;
  const remainder10 = n % 10;
  const remainder100 = n % 100;
  if (remainder100 >= 11 && remainder100 <= 13) {
    return `${n}th`;
  }
  switch (remainder10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
};

/**
 * Generates an official WhatsApp notification and direct PhonePe UPI payment link for a subscription.
 */
export const getSubscriptionWhatsAppUrl = (sub: any): { url: string; upiLink: string; text: string } => {
  const cleanPhone = (sub?.shippingAddress?.phone || sub?.customerPhone || "").replace(/\D/g, "").slice(-10);
  const dayStr = getOrdinalSuffix(sub?.deliveryDay || 1);
  const amount = sub?.monthlyPrice || 0;
  const subRef = sub?.id || "sub_active";
  const upiLink = `upi://pay?pa=manopavana@ybl&pn=MANOPAVANA&am=${amount}&cu=INR&tn=MANOPAVANA_Monthly_Subscription_${subRef}`;

  const text =
`*ನಮಸ್ಕಾರ / Greetings from MANOPAVANA Bengaluru!* 🙏🌿

Your *Monthly Cooking Oil Club Subscription* is confirmed!

📦 *Subscription Box:* ${sub?.comboName || "Monthly Oil Box"}
🥛 *Bottles:* ${(sub?.items || []).join(" + ")}
📅 *Schedule:* ${dayStr} of Every Month
🚚 *Next Scheduled Dispatch:* ${sub?.nextDispatchDate || "Upcoming Date"}
💰 *Monthly Subscription Amount:* ₹${amount}
📍 *Delivery Address:* ${sub?.shippingAddress?.addressLine1 || ""}, ${sub?.shippingAddress?.district || "Bengaluru"} - ${sub?.shippingAddress?.pincode || ""}

💳 *PhonePe / UPI Direct Payment Link:*
${upiLink}

_Tap the link above to pay instantly via PhonePe, GPay, or Paytm. Fresh wood-pressed oil is bottled and delivered directly to your home!_ 🌾`;

  const url = `https://api.whatsapp.com/send?phone=91${cleanPhone || BUSINESS_CONFIG.PHONE_RAW}&text=${encodeURIComponent(text)}`;
  return { url, upiLink, text };
};

export interface SubscriptionBottleConfig {
  type: "groundnut" | "coconut" | "sesame";
  count: number;
  label: string;
  volume: string;
}

export interface SubscriptionCombo {
  id: string;
  name: string;
  kannadaName: string;
  description: string;
  items: string[];
  bottles: SubscriptionBottleConfig[];
  monthlyPrice: number;
  mrp: number;
  savings: number;
  image?: string;
  badge?: string;
  isCustom?: boolean;
}

// Dynamic subscription pricing per 1L bottle for custom combos
export const getCustomBottleRates = (discountPercent: number = 10) => {
  const factor = (100 - Math.max(0, Math.min(50, discountPercent))) / 100;
  return {
    groundnut: {
      id: "groundnut",
      type: "groundnut" as const,
      name: "Wood-Pressed Groundnut Oil",
      kannadaName: "ಕಡಲೆಕಾಯಿ ಎಣ್ಣೆ",
      volume: "1L",
      mrp: 399,
      subPrice: Math.round(399 * factor), // ₹359 at 10%
      description: "Cold Marachekku pressed peanut oil for daily South Indian cooking.",
    },
    coconut: {
      id: "coconut",
      type: "coconut" as const,
      name: "Wood-Pressed Coconut Oil",
      kannadaName: "ತೆಂಗಿನ ಎಣ್ಣೆ",
      volume: "1L",
      mrp: 499,
      subPrice: Math.round(499 * factor), // ₹449 at 10%
      description: "Sulfur-free copra extract with natural healthy MCTs.",
    },
    sesame: {
      id: "sesame",
      type: "sesame" as const,
      name: "Wood-Pressed Sesame Oil",
      kannadaName: "ಎಳ್ಳೆಣ್ಣೆ (ಜಿಂಜೆಲ್ಲಿ)",
      volume: "1L",
      mrp: 499,
      subPrice: Math.round(499 * factor), // ₹449 at 10%
      description: "Crushed with palm jaggery for traditional nutty warmth.",
    },
  };
};

export const getPresetSubscriptionCombos = (discountPercent: number = 10): SubscriptionCombo[] => {
  const factor = (100 - Math.max(0, Math.min(50, discountPercent))) / 100;
  const gnRate = Math.round(399 * factor);
  const coRate = Math.round(499 * factor);
  const seRate = Math.round(499 * factor);

  return [
    {
      id: "sub-essential-3l",
      name: "Essential Kitchen Duo (3L)",
      kannadaName: "ಅಡುಗೆ ಮನೆ ಅಗತ್ಯ ಕಾಂಬೊ (೩ ಲೀ)",
      description: "2 Litres Pure Wood-Pressed Groundnut Oil + 1 Litre Cold-Pressed Coconut Oil.",
      items: ["2x 1L Groundnut Oil", "1x 1L Coconut Oil"],
      bottles: [
        { type: "groundnut", count: 2, label: "Groundnut (2L)", volume: "2x 1L" },
        { type: "coconut", count: 1, label: "Coconut (1L)", volume: "1x 1L" },
      ],
      mrp: 1297, // 2*399 + 499
      monthlyPrice: 2 * gnRate + coRate, // ₹1,167 at 10%
      savings: 1297 - (2 * gnRate + coRate),
      badge: "Most Popular",
    },
    {
      id: "sub-traditional-3l",
      name: "Traditional Wellness Trio (3L)",
      kannadaName: "ಸಾಂಪ್ರದಾಯಿಕ ಆರೋಗ್ಯ ತ್ರಿವೇಣಿ (೩ ಲೀ)",
      description: "1L Groundnut Oil + 1L Coconut Oil + 1L Black Sesame (Gingelly) Oil.",
      items: ["1x 1L Groundnut Oil", "1x 1L Coconut Oil", "1x 1L Sesame Oil"],
      bottles: [
        { type: "groundnut", count: 1, label: "Groundnut", volume: "1L" },
        { type: "coconut", count: 1, label: "Coconut", volume: "1L" },
        { type: "sesame", count: 1, label: "Sesame", volume: "1L" },
      ],
      mrp: 1397, // 399 + 499 + 499
      monthlyPrice: gnRate + coRate + seRate, // ₹1,257 at 10%
      savings: 1397 - (gnRate + coRate + seRate),
      badge: "Best Value",
    },
    {
      id: "sub-family-4l",
      name: "Family Feast Master Pack (4L)",
      kannadaName: "ಸಂಪೂರ್ಣ ಕುಟುಂಬ ಪ್ಯಾಕ್ (೪ ಲೀ)",
      description: "2L Groundnut Oil + 1L Coconut Oil + 1L Sesame Oil for large traditional families.",
      items: ["2x 1L Groundnut Oil", "1x 1L Coconut Oil", "1x 1L Sesame Oil"],
      bottles: [
        { type: "groundnut", count: 2, label: "Groundnut (2L)", volume: "2x 1L" },
        { type: "coconut", count: 1, label: "Coconut (1L)", volume: "1x 1L" },
        { type: "sesame", count: 1, label: "Sesame", volume: "1L" },
      ],
      mrp: 1796, // 2*399 + 499 + 499
      monthlyPrice: 2 * gnRate + coRate + seRate, // ₹1,616 at 10%
      savings: 1796 - (2 * gnRate + coRate + seRate),
      badge: "Maximum Savings",
    },
  ];
};

export const CUSTOM_BOTTLE_RATES = getCustomBottleRates(10);
export const PRESET_SUBSCRIPTION_COMBOS = getPresetSubscriptionCombos(10);

/**
 * Combo Visual Component
 * Renders authentic high-resolution bottle mockups layered with quantity badges
 * or falls back gracefully to custom image URL if supplied by the merchant.
 */
const ComboBottleVisual: React.FC<{
  combo: SubscriptionCombo;
  isDark: boolean;
}> = ({ combo, isDark }) => {
  const [imageError, setImageError] = useState(false);

  // If a custom image exists and hasn't errored, display it
  if (combo.image && !imageError) {
    return (
      <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-gradient-to-b from-amber-500/10 to-amber-500/5 flex items-center justify-center p-3">
        <img
          src={combo.image}
          alt={combo.name}
          onError={() => setImageError(true)}
          className="h-full object-contain drop-shadow-md"
        />
      </div>
    );
  }

  // Multi-bottle authentic composite visual
  return (
    <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-gradient-to-b from-amber-500/10 to-amber-500/5 dark:from-amber-900/20 dark:to-stone-900/40 p-3 flex flex-col justify-between border border-amber-500/15">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(224,143,53,0.18)_0%,transparent_70%)] pointer-events-none" />

      {/* Bottles presentation */}
      <div className="relative z-10 h-32 flex items-center justify-center gap-2 sm:gap-3">
        {combo.bottles && combo.bottles.length > 0 ? (
          combo.bottles.map((b, idx) => {
            const bottleImg =
              THEMED_PRODUCT_IMAGES[b.type]?.[isDark ? "dark" : "light"] ||
              THEMED_PRODUCT_IMAGES.groundnut.light;
            return (
              <div
                key={idx}
                className="relative flex flex-col items-center group transition-transform duration-300 hover:scale-105"
              >
                <img
                  src={bottleImg}
                  alt={b.label}
                  className="h-28 w-auto object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.15)] filter"
                />
                <span className="mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-[#5E3210] dark:text-amber-200 border border-amber-500/30">
                  {b.volume}
                </span>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center text-stone-400 text-xs">
            <Sliders className="w-8 h-8 text-[#E08F35] mb-1 animate-pulse" />
            <span>Select bottles below</span>
          </div>
        )}
      </div>

      {/* Bottom summary pill */}
      <div className="relative z-10 flex items-center justify-center">
        <span className="text-[10px] font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1 bg-white/70 dark:bg-stone-800/80 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-stone-200/50 dark:border-stone-700/50 shadow-2xs">
          <Package className="w-3 h-3 text-[#E08F35]" />
          <span>{combo.items.length > 0 ? combo.items.join(" + ") : "Choose bottle counts"}</span>
        </span>
      </div>
    </div>
  );
};

/**
 * Interactive Monthly Calendar Picker
 * Allows visual selection of the subscription start date and recurring delivery day
 */
const InteractiveCalendarPicker: React.FC<{
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  isDark: boolean;
}> = ({ selectedDate, onSelectDate, isDark }) => {
  // Calendar viewed month state
  const [viewedDate, setViewedDate] = useState<Date>(() => new Date(selectedDate));

  // Earliest allowed date: Today + 2 days (48h Marachekku fresh press & courier transit lead time)
  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Maximum schedule window: 6 months from today
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d;
  }, []);

  const viewedYear = viewedDate.getFullYear();
  const viewedMonth = viewedDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const daysInMonth = new Date(viewedYear, viewedMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewedYear, viewedMonth, 1).getDay(); // 0 = Sun

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  // Month navigation
  const canGoPrev = useMemo(() => {
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const viewedMonthStart = new Date(viewedYear, viewedMonth, 1);
    return viewedMonthStart > currentMonthStart;
  }, [viewedYear, viewedMonth]);

  const canGoNext = useMemo(() => {
    const nextMonthStart = new Date(viewedYear, viewedMonth + 1, 1);
    return nextMonthStart <= maxDate;
  }, [viewedYear, viewedMonth, maxDate]);

  const handlePrevMonth = () => {
    if (canGoPrev) {
      setViewedDate(new Date(viewedYear, viewedMonth - 1, 1));
    }
  };

  const handleNextMonth = () => {
    if (canGoNext) {
      setViewedDate(new Date(viewedYear, viewedMonth + 1, 1));
    }
  };

  // Quick preset helper
  const applyPreset = (daysFromToday: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromToday);
    target.setHours(0, 0, 0, 0);
    onSelectDate(target);
    setViewedDate(new Date(target.getFullYear(), target.getMonth(), 1));
  };

  // Next 3 projected recurring deliveries
  const deliveryDay = selectedDate.getDate();
  const recurringCycles = useMemo(() => {
    const cycles: { cycle: number; label: string; dateStr: string }[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + i, deliveryDay);
      const maxDaysInTargetMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + i + 1, 0).getDate();
      if (deliveryDay > maxDaysInTargetMonth) {
        d.setDate(maxDaysInTargetMonth);
      }
      cycles.push({
        cycle: i + 1,
        label: i === 0 ? "First Delivery" : `Month ${i + 1} Delivery`,
        dateStr: d.toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      });
    }
    return cycles;
  }, [selectedDate, deliveryDay]);

  const getOrdinal = (n: number) => getOrdinalSuffix(n);

  return (
    <div
      className={`rounded-3xl border p-5 sm:p-7 space-y-6 shadow-sm transition-all ${
        isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
      }`}
    >
      {/* Quick Presets */}
      <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-stone-200 dark:border-stone-800">
        <span className="text-xs font-bold text-stone-800 dark:text-stone-300 flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-[#E08F35]" />
          <span>Quick Pick:</span>
        </span>
        <button
          type="button"
          onClick={() => applyPreset(2)}
          className="px-3 py-1 rounded-xl text-xs font-bold border border-amber-500/40 hover:bg-amber-500/10 text-stone-800 dark:text-stone-200 bg-amber-50/40 dark:bg-transparent transition-colors cursor-pointer"
        >
          Earliest Available (In 2 Days)
        </button>
        <button
          type="button"
          onClick={() => {
            const now = new Date();
            const firstNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            onSelectDate(firstNextMonth);
            setViewedDate(firstNextMonth);
          }}
          className="px-3 py-1 rounded-xl text-xs font-bold border border-amber-500/40 hover:bg-amber-500/10 text-stone-800 dark:text-stone-200 bg-amber-50/40 dark:bg-transparent transition-colors cursor-pointer"
        >
          1st of Next Month
        </button>
        <button
          type="button"
          onClick={() => {
            const now = new Date();
            const midNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
            onSelectDate(midNextMonth);
            setViewedDate(midNextMonth);
          }}
          className="px-3 py-1 rounded-xl text-xs font-bold border border-amber-500/40 hover:bg-amber-500/10 text-stone-800 dark:text-stone-200 bg-amber-50/40 dark:bg-transparent transition-colors cursor-pointer"
        >
          15th of Next Month
        </button>
      </div>

      {/* Month Navigator Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold font-serif text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <span>
              {monthNames[viewedMonth]} {viewedYear}
            </span>
          </h3>
          <p className="text-[11px] text-stone-700 dark:text-stone-400 font-medium">
            Click any available day to set your monthly recurring delivery.
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={handlePrevMonth}
            className={`p-2 rounded-xl border transition-all ${
              canGoPrev
                ? "border-stone-300 dark:border-stone-700 hover:bg-amber-500/10 text-stone-800 dark:text-stone-200 cursor-pointer font-bold"
                : "border-transparent text-stone-300 dark:text-stone-700 cursor-not-allowed opacity-40"
            }`}
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={!canGoNext}
            onClick={handleNextMonth}
            className={`p-2 rounded-xl border transition-all ${
              canGoNext
                ? "border-stone-300 dark:border-stone-700 hover:bg-amber-500/10 text-stone-800 dark:text-stone-200 cursor-pointer font-bold"
                : "border-transparent text-stone-300 dark:text-stone-700 cursor-not-allowed opacity-40"
            }`}
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
          {dayNames.map((d) => (
            <span
              key={d}
              className="text-[11px] font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 py-1"
            >
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {blanksArray.map((_, idx) => (
            <div key={`blank-${idx}`} className="h-10 sm:h-12" />
          ))}

          {daysArray.map((dayNum) => {
            const thisDate = new Date(viewedYear, viewedMonth, dayNum);
            thisDate.setHours(0, 0, 0, 0);

            const isPastOrTooSoon = thisDate < minDate;
            const isSelected =
              selectedDate.getFullYear() === viewedYear &&
              selectedDate.getMonth() === viewedMonth &&
              selectedDate.getDate() === dayNum;

            const isToday =
              new Date().getFullYear() === viewedYear &&
              new Date().getMonth() === viewedMonth &&
              new Date().getDate() === dayNum;

            return (
              <button
                key={dayNum}
                type="button"
                disabled={isPastOrTooSoon}
                onClick={() => onSelectDate(thisDate)}
                className={`relative h-10 sm:h-12 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? "bg-[#5E3210] text-amber-100 font-black shadow-md ring-2 ring-[#E08F35] scale-105 cursor-pointer z-10"
                    : isPastOrTooSoon
                    ? "text-stone-400 dark:text-stone-600 cursor-not-allowed bg-stone-100/50 dark:bg-stone-900/20"
                    : isDark
                    ? "bg-[#25150C]/70 text-stone-200 hover:bg-[#362114] hover:text-amber-200 cursor-pointer font-bold"
                    : "bg-amber-50/70 border border-amber-200/80 text-stone-900 font-bold hover:bg-amber-100 cursor-pointer shadow-2xs"
                }`}
              >
                <span className="text-xs sm:text-sm font-bold">{dayNum}</span>
                {isToday && !isSelected && (
                  <span className="text-[8px] font-extrabold text-[#C8751B] leading-none">Today</span>
                )}
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300 mt-0.5 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Schedule Summary & Projection */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[11px] uppercase tracking-wider font-extrabold text-[#9A4E0B] dark:text-[#E08F35]">
              Recurring Delivery Confirmed
            </span>
            <h4 className="text-base sm:text-lg font-bold font-serif text-stone-900 dark:text-stone-100">
              {getOrdinal(deliveryDay)} of Every Month
            </h4>
            <p className="text-xs text-stone-800 dark:text-stone-300 font-medium">
              First Delivery starts:{" "}
              <strong className="text-stone-950 dark:text-stone-100 font-bold">
                {selectedDate.toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </strong>
            </p>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-stone-800/90 border border-amber-500/40 text-[11px] font-bold text-stone-800 dark:text-stone-200 shrink-0 flex items-center gap-2 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>48-Hour Fresh Press Guarantee</span>
          </div>
        </div>

        {/* 3-Cycle Timeline */}
        <div className="pt-3 border-t border-amber-500/20">
          <span className="text-[11px] font-bold text-stone-800 dark:text-stone-300 block mb-2">
            Your Upcoming 3 Delivery Cycles:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            {recurringCycles.map((cy) => (
              <div
                key={cy.cycle}
                className="p-2.5 rounded-xl bg-white dark:bg-stone-800/80 border border-amber-500/30 dark:border-stone-700/60 space-y-0.5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase">
                    {cy.label}
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
                </div>
                <p className="font-extrabold text-stone-900 dark:text-stone-100">{cy.dateStr}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const SubscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentUser,
    customerProfile,
    address,
    savedAddresses,
    themeMode,
    showToast,
    setLoginModalOpen,
    cmsConfig,
  } = useStore();

  const isDark = themeMode === "dark";
  const discountPercent = cmsConfig?.subscriptionDiscountPercent ?? 10;
  const currentBottleRates = useMemo(
    () => getCustomBottleRates(discountPercent),
    [discountPercent]
  );
  const currentPresetCombos = useMemo(
    () => getPresetSubscriptionCombos(discountPercent),
    [discountPercent]
  );

  // Step 1: Selected Combo Mode ("preset" or "custom")
  const [comboMode, setComboMode] = useState<"preset" | "custom">("preset");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("sub-essential-3l");

  // Custom Combo Bottle Counts (minimum 2 bottles total)
  const [customCounts, setCustomCounts] = useState<{
    groundnut: number;
    coconut: number;
    sesame: number;
  }>({
    groundnut: 2,
    coconut: 1,
    sesame: 0,
  });

  // Calculate dynamic custom combo data
  const customComboData: SubscriptionCombo = useMemo(() => {
    const totalLitres = customCounts.groundnut + customCounts.coconut + customCounts.sesame;
    const items: string[] = [];
    const bottles: SubscriptionBottleConfig[] = [];

    let totalSubPrice = 0;
    let totalMrp = 0;

    if (customCounts.groundnut > 0) {
      items.push(`${customCounts.groundnut}x 1L Groundnut Oil`);
      bottles.push({
        type: "groundnut",
        count: customCounts.groundnut,
        label: `Groundnut (${customCounts.groundnut}L)`,
        volume: `${customCounts.groundnut}x 1L`,
      });
      totalSubPrice += customCounts.groundnut * currentBottleRates.groundnut.subPrice;
      totalMrp += customCounts.groundnut * currentBottleRates.groundnut.mrp;
    }

    if (customCounts.coconut > 0) {
      items.push(`${customCounts.coconut}x 1L Coconut Oil`);
      bottles.push({
        type: "coconut",
        count: customCounts.coconut,
        label: `Coconut (${customCounts.coconut}L)`,
        volume: `${customCounts.coconut}x 1L`,
      });
      totalSubPrice += customCounts.coconut * currentBottleRates.coconut.subPrice;
      totalMrp += customCounts.coconut * currentBottleRates.coconut.mrp;
    }

    if (customCounts.sesame > 0) {
      items.push(`${customCounts.sesame}x 1L Sesame Oil`);
      bottles.push({
        type: "sesame",
        count: customCounts.sesame,
        label: `Sesame (${customCounts.sesame}L)`,
        volume: `${customCounts.sesame}x 1L`,
      });
      totalSubPrice += customCounts.sesame * currentBottleRates.sesame.subPrice;
      totalMrp += customCounts.sesame * currentBottleRates.sesame.mrp;
    }

    const savings = totalMrp - totalSubPrice;

    return {
      id: "sub-custom-box",
      name: `Custom Kitchen Box (${totalLitres}L)`,
      kannadaName: "ನಿಮ್ಮದೇ ಕಾಂಬೊ ಬಾಕ್ಸ್",
      description: items.length > 0 ? items.join(" + ") : "Select your bottles",
      items,
      bottles,
      monthlyPrice: totalSubPrice,
      mrp: totalMrp,
      savings,
      badge: "Custom Blend",
      isCustom: true,
    };
  }, [customCounts, currentBottleRates]);

  // Chosen combo based on mode
  const chosenCombo: SubscriptionCombo = useMemo(() => {
    if (comboMode === "custom") {
      return customComboData;
    }
    return (
      currentPresetCombos.find((c) => c.id === selectedPresetId) ||
      currentPresetCombos[0]
    );
  }, [comboMode, selectedPresetId, customComboData, currentPresetCombos]);

  // Step 2: Selected Start Date from Interactive Calendar (defaults to Today + 2 days)
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Step 3: Payment Option (Strictly NO COD)
  const [paymentPlan, setPaymentPlan] = useState<"monthly_online" | "annual_prepaid">(
    "monthly_online"
  );

  // Active Subscription State in Firestore
  const [activeSub, setActiveSub] = useState<any | null>(null);
  const [isLoadingSub, setIsLoadingSub] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImageGuide, setShowImageGuide] = useState(false);
  const [subSuccessModal, setSubSuccessModal] = useState<{
    subId: string;
    amount: number;
    comboName: string;
    dayStr: string;
    waUrl: string;
    upiLink: string;
  } | null>(null);

  // Monthly Combo Edit Modal State
  const [isEditingCombo, setIsEditingCombo] = useState(false);
  const [editComboMode, setEditComboMode] = useState<"preset" | "custom">("preset");
  const [editSelectedPresetId, setEditSelectedPresetId] = useState<string>("sub-essential-3l");
  const [editCustomCounts, setEditCustomCounts] = useState<{
    groundnut: number;
    coconut: number;
    sesame: number;
  }>({
    groundnut: 2,
    coconut: 1,
    sesame: 0,
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Direct Firestore listener/loader for user's subscription
  useEffect(() => {
    if (!currentUser?.uid) {
      setIsLoadingSub(false);
      return;
    }
    async function loadSubscription() {
      try {
        const subDoc = await getDoc(doc(db, "subscriptions", currentUser!.uid));
        if (subDoc.exists()) {
          const data = subDoc.data();
          setActiveSub(data);
          // Pre-fill editor state
          if (data.comboId === "sub-custom-box") {
            setEditComboMode("custom");
            const counts = { groundnut: 0, coconut: 0, sesame: 0 };
            (data.bottles || []).forEach((b: any) => {
              if (b.type in counts) counts[b.type as keyof typeof counts] = b.count;
            });
            setEditCustomCounts(counts);
          } else {
            setEditComboMode("preset");
            setEditSelectedPresetId(data.comboId || "sub-essential-3l");
          }
        }
      } catch (e) {
        console.warn("Notice loading subscription from Firestore:", e);
      } finally {
        setIsLoadingSub(false);
      }
    }
    loadSubscription();
  }, [currentUser?.uid]);

  const deliveryDay = selectedDate.getDate();

  // Create & Save Subscription Directly to Firestore
  const handleSubscribe = async () => {
    if (!currentUser) {
      showToast("Please sign in to start your oil subscription.");
      setLoginModalOpen(true);
      return;
    }

    if (!address.addressLine1?.trim() || !address.pincode?.trim()) {
      showToast("Please enter a valid delivery address in checkout or profile first.");
      navigate("/profile");
      return;
    }

    const totalLitres =
      chosenCombo.bottles?.reduce((acc, b) => acc + (b.count || 1), 0) || 0;
    if (totalLitres < 2) {
      showToast("Please select at least 2 Litres for your monthly subscription box.");
      return;
    }

    setIsSubmitting(true);
    try {
      const subId = `sub_${currentUser.uid}`;
      const subscriptionData = {
        id: subId,
        customerUid: currentUser.uid,
        customerName:
          customerProfile?.name || currentUser.displayName || address.fullName || "Valued Customer",
        customerPhone: customerProfile?.phone || address.phone || "",
        customerEmail: customerProfile?.email || currentUser.email || "",
        comboId: chosenCombo.id,
        comboName: chosenCombo.name,
        comboType: chosenCombo.isCustom ? "custom" : "preset",
        items: chosenCombo.items,
        bottles: chosenCombo.bottles,
        monthlyPrice: chosenCombo.monthlyPrice,
        mrp: chosenCombo.mrp,
        savings: chosenCombo.savings,
        deliveryDay,
        startDate: selectedDate.toISOString(),
        paymentPlan,
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastModifiedNote: "Subscription initiated by customer",
        nextDispatchDate: selectedDate.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        shippingAddress: {
          fullName: address.fullName || customerProfile?.name || "Customer",
          phone: address.phone || customerProfile?.phone || "",
          addressLine1: address.addressLine1,
          landmark: address.landmark || "",
          district: address.district || "Bengaluru",
          state: address.state || "Karnataka",
          pincode: address.pincode,
        },
      };

      // Directly write to Firestore
      await setDoc(doc(db, "subscriptions", currentUser.uid), subscriptionData, { merge: true });
      setActiveSub(subscriptionData);

      // Generate WhatsApp Payment Link & Message
      const waDetails = getSubscriptionWhatsAppUrl(subscriptionData);
      setSubSuccessModal({
        subId,
        amount: chosenCombo.monthlyPrice,
        comboName: chosenCombo.name,
        dayStr: getOrdinalSuffix(deliveryDay),
        waUrl: waDetails.url,
        upiLink: waDetails.upiLink,
      });

      // Automatically launch WhatsApp so customer receives their confirmation & payment link
      try {
        window.open(waDetails.url, "_blank");
      } catch (err) {
        console.warn("Popup blocked for WhatsApp:", err);
      }

      showToast("🎉 Congratulations! Your subscription is ACTIVE and your WhatsApp payment link is ready!");
    } catch (e) {
      console.error("Subscription activation error:", e);
      showToast("Could not activate subscription. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Monthly Edit Handler: Customer modifies their combo for upcoming cycles
  const handleSaveComboEdit = async () => {
    if (!currentUser?.uid || !activeSub) return;

    let updatedCombo: SubscriptionCombo;
    if (editComboMode === "custom") {
      const totalLitres =
        editCustomCounts.groundnut + editCustomCounts.coconut + editCustomCounts.sesame;
      if (totalLitres < 2) {
        showToast("Please choose at least 2 bottles for your custom monthly box.");
        return;
      }

      const items: string[] = [];
      const bottles: SubscriptionBottleConfig[] = [];
      let totalSubPrice = 0;
      let totalMrp = 0;

      if (editCustomCounts.groundnut > 0) {
        items.push(`${editCustomCounts.groundnut}x 1L Groundnut Oil`);
        bottles.push({
          type: "groundnut",
          count: editCustomCounts.groundnut,
          label: `Groundnut (${editCustomCounts.groundnut}L)`,
          volume: `${editCustomCounts.groundnut}x 1L`,
        });
        totalSubPrice += editCustomCounts.groundnut * currentBottleRates.groundnut.subPrice;
        totalMrp += editCustomCounts.groundnut * currentBottleRates.groundnut.mrp;
      }
      if (editCustomCounts.coconut > 0) {
        items.push(`${editCustomCounts.coconut}x 1L Coconut Oil`);
        bottles.push({
          type: "coconut",
          count: editCustomCounts.coconut,
          label: `Coconut (${editCustomCounts.coconut}L)`,
          volume: `${editCustomCounts.coconut}x 1L`,
        });
        totalSubPrice += editCustomCounts.coconut * currentBottleRates.coconut.subPrice;
        totalMrp += editCustomCounts.coconut * currentBottleRates.coconut.mrp;
      }
      if (editCustomCounts.sesame > 0) {
        items.push(`${editCustomCounts.sesame}x 1L Sesame Oil`);
        bottles.push({
          type: "sesame",
          count: editCustomCounts.sesame,
          label: `Sesame (${editCustomCounts.sesame}L)`,
          volume: `${editCustomCounts.sesame}x 1L`,
        });
        totalSubPrice += editCustomCounts.sesame * currentBottleRates.sesame.subPrice;
        totalMrp += editCustomCounts.sesame * currentBottleRates.sesame.mrp;
      }

      updatedCombo = {
        id: "sub-custom-box",
        name: `Custom Kitchen Box (${totalLitres}L)`,
        kannadaName: "ನಿಮ್ಮದೇ ಕಾಂಬೊ ಬಾಕ್ಸ್",
        description: items.join(" + "),
        items,
        bottles,
        monthlyPrice: totalSubPrice,
        mrp: totalMrp,
        savings: totalMrp - totalSubPrice,
        isCustom: true,
      };
    } else {
      updatedCombo =
        currentPresetCombos.find((c) => c.id === editSelectedPresetId) ||
        currentPresetCombos[0];
    }

    setIsSavingEdit(true);
    try {
      const nowStr = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const updatedPayload = {
        comboId: updatedCombo.id,
        comboName: updatedCombo.name,
        comboType: updatedCombo.isCustom ? "custom" : "preset",
        items: updatedCombo.items,
        bottles: updatedCombo.bottles,
        monthlyPrice: updatedCombo.monthlyPrice,
        mrp: updatedCombo.mrp,
        savings: updatedCombo.savings,
        updatedAt: serverTimestamp(),
        lastEditedAt: new Date().toISOString(),
        lastModifiedNote: `Customer changed monthly combo to "${updatedCombo.name}" on ${nowStr}`,
      };

      // Directly update Firestore
      await setDoc(doc(db, "subscriptions", currentUser.uid), updatedPayload, { merge: true });

      setActiveSub((prev: any) => ({
        ...prev,
        ...updatedPayload,
      }));

      setIsEditingCombo(false);
      showToast("🎉 Your monthly combo has been updated in Firestore for your next delivery!");
    } catch (e) {
      console.error("Error updating subscription combo in Firestore:", e);
      showToast("Could not update monthly combo. Please try again.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleTogglePause = async () => {
    if (!activeSub || !currentUser?.uid) return;
    const nextStatus = activeSub.status === "paused" ? "active" : "paused";
    try {
      await setDoc(
        doc(db, "subscriptions", currentUser.uid),
        {
          status: nextStatus,
          updatedAt: serverTimestamp(),
          lastModifiedNote: `Status toggled to ${nextStatus} by customer`,
        },
        { merge: true }
      );
      setActiveSub((prev: any) => ({ ...prev, status: nextStatus }));
      showToast(
        nextStatus === "paused"
          ? "Subscription paused for next month. You can resume anytime."
          : "Subscription resumed! Fresh batch will dispatch on your scheduled date."
      );
    } catch (e) {
      showToast("Error updating subscription status.");
    }
  };

  const handleCancelSub = async () => {
    if (!currentUser?.uid) return;
    if (window.confirm("Are you sure you want to cancel your monthly subscription?")) {
      try {
        await setDoc(
          doc(db, "subscriptions", currentUser.uid),
          {
            status: "cancelled",
            cancelledAt: serverTimestamp(),
            lastModifiedNote: "Cancelled by customer",
          },
          { merge: true }
        );
        setActiveSub(null);
        showToast("Subscription cancelled. We hope to serve you again!");
      } catch (e) {
        showToast("Error cancelling subscription.");
      }
    }
  };

  return (
    <div
      className={`w-full min-h-[calc(100vh-80px)] py-8 sm:py-12 transition-colors ${
        isDark ? "bg-[#140D09] text-[#FAF4EA]" : "bg-[#FAF7F2] text-[#24140A]"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#3D2514] via-[#5E3210] to-[#2B170B] text-white p-6 sm:p-10 shadow-xl border border-amber-500/30">
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>MANOPAVANA Monthly Cooking Oil Club</span>
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold font-serif tracking-tight leading-tight">
              Fresh Marachekku Oils Delivered Every Month, Automatically.
            </h1>
            <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
              Never run out of pure wood-pressed cooking oils again. Choose a popular combo or{" "}
              <strong className="text-amber-300">build your own custom monthly box</strong>. You can
              edit your combo every month directly from your portal.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-bold text-amber-200">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Save {discountPercent}% Every Month</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Free Doorstep Delivery</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Edit or Pause Anytime</span>
              </div>
            </div>
          </div>
        </div>

        {/* If Active Subscription Exists: Display Subscriber Portal with Edit Button */}
        {activeSub && activeSub.status !== "cancelled" ? (
          <div
            className={`p-6 sm:p-8 rounded-3xl border shadow-lg space-y-6 ${
              isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-stone-200 dark:border-stone-800">
              <div>
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300 block">Your Active Monthly Subscription</span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      activeSub.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                    }`}
                  />
                  <h2 className="text-xl font-bold font-serif text-stone-900 dark:text-stone-100">{activeSub.comboName}</h2>
                  {activeSub.comboType === "custom" && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E08F35]/20 text-[#A85810] dark:text-[#E08F35]">
                      Custom Box
                    </span>
                  )}
                </div>
                {activeSub.lastModifiedNote && (
                  <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1 italic font-medium">
                    {activeSub.lastModifiedNote}
                  </p>
                )}
              </div>

              {/* Action Buttons: Edit Monthly Combo, Pause, Cancel */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingCombo(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#5E3210] hover:bg-[#43230A] text-white flex items-center gap-1.5 cursor-pointer shadow-md transition-all hover:scale-105"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Edit Monthly Combo</span>
                </button>
                <button
                  type="button"
                  onClick={handleTogglePause}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    activeSub.status === "active"
                      ? "bg-amber-500/20 text-amber-900 dark:text-amber-200 hover:bg-amber-500/30"
                      : "bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-500/30"
                  }`}
                >
                  {activeSub.status === "active" ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause for Next Month</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Resume Subscription</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancelSub}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                <span className="text-stone-700 dark:text-stone-300 font-bold block">Monthly Schedule</span>
                <p className="font-bold text-sm text-stone-900 dark:text-stone-100">
                  {getOrdinalSuffix(activeSub.deliveryDay)} of Every Month
                </p>
                <p className="text-[11px] text-stone-700 dark:text-stone-400 font-medium">
                  Next Dispatch:{" "}
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{activeSub.nextDispatchDate}</span>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                <span className="text-stone-700 dark:text-stone-300 font-bold block">Payment Mode</span>
                <p className="font-bold text-sm text-stone-900 dark:text-stone-100 uppercase">
                  {activeSub.paymentPlan === "annual_prepaid"
                    ? "Prepaid (12 Months)"
                    : "Online UPI (PhonePe)"}
                </p>
                <p className="text-[11px] text-stone-700 dark:text-stone-400 font-medium">
                  {activeSub.paymentPlan === "annual_prepaid"
                    ? "Full year prepaid with extra 10% discount"
                    : "Automated WhatsApp payment link sent 3 days before dispatch"}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                <span className="text-stone-700 dark:text-stone-300 font-bold block">Monthly Amount</span>
                <p className="font-black text-base text-[#8B4513] dark:text-amber-300 font-serif">
                  ₹{activeSub.monthlyPrice}/month
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                  Free Doorstep Delivery Included
                </p>
              </div>
            </div>

            {/* Current Combo Items Breakdown */}
            <div className="p-3.5 rounded-2xl bg-stone-100 dark:bg-stone-900/60 border border-stone-300 dark:border-stone-800 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-stone-800 dark:text-stone-200">Items in next cycle:</span>
              {(activeSub.items || []).map((it: string, i: number) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 font-bold text-stone-900 dark:text-stone-100 shadow-2xs"
                >
                  {it}
                </span>
              ))}
            </div>

            {/* WhatsApp Payment Link & Cycle Action Bar */}
            <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-500/5 p-4 rounded-2xl border border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#25D366]/20 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4 text-[#25D366]" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                    WhatsApp Payment Link & Reminders
                  </h4>
                  <p className="text-[11px] text-stone-700 dark:text-stone-300 font-medium">
                    Payment link is sent 3 days before your delivery on the {getOrdinalSuffix(activeSub.deliveryDay)}.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const wa = getSubscriptionWhatsAppUrl(activeSub);
                    window.open(wa.url, "_blank");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#25D366] hover:bg-[#1EBE5D] text-white flex items-center gap-1.5 shadow-sm cursor-pointer transition-transform hover:scale-105"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Send WhatsApp Payment Link</span>
                </button>
                <a
                  href={`upi://pay?pa=manopavana@ybl&pn=MANOPAVANA&am=${activeSub.monthlyPrice}&cu=INR&tn=MANOPAVANA_Monthly_Subscription_${activeSub.id}`}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#5E3210] hover:bg-[#43230A] text-white flex items-center gap-1.5 shadow-sm cursor-pointer transition-transform hover:scale-105"
                >
                  <CreditCard className="w-3.5 h-3.5 text-amber-300" />
                  <span>Pay ₹{activeSub.monthlyPrice} via PhonePe</span>
                </a>
              </div>
            </div>
          </div>
        ) : null}

        {/* Modal: Edit Monthly Combo Directly in Firestore */}
        {isEditingCombo && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className={`w-full max-w-2xl rounded-3xl p-6 sm:p-8 space-y-6 border shadow-2xl overflow-y-auto max-h-[90vh] ${
                isDark ? "bg-[#1C120B] text-[#FAF4EA] border-[#362114]" : "bg-white text-[#1F120A] border-[#E8DEC8]"
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-[#E08F35]" />
                  <div>
                    <h3 className="font-bold font-serif text-lg text-stone-900 dark:text-stone-100">Edit Your Monthly Oil Combo</h3>
                    <p className="text-xs text-stone-700 dark:text-stone-400 font-medium">
                      Changes update directly in Firestore and take effect on your next cycle.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingCombo(false)}
                  className="p-2 rounded-xl text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode Selector */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditComboMode("preset")}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                    editComboMode === "preset"
                      ? "bg-[#5E3210] text-white border-[#5E3210] shadow-md"
                      : "border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 bg-stone-50 dark:bg-transparent"
                  }`}
                >
                  Choose a Popular Combo
                </button>
                <button
                  type="button"
                  onClick={() => setEditComboMode("custom")}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                    editComboMode === "custom"
                      ? "bg-[#5E3210] text-white border-[#5E3210] shadow-md"
                      : "border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 bg-stone-50 dark:bg-transparent"
                  }`}
                >
                  Build Custom Box
                </button>
              </div>

              {editComboMode === "preset" ? (
                <div className="space-y-3">
                  {currentPresetCombos.map((combo) => {
                    const isSelected = editSelectedPresetId === combo.id;
                    return (
                      <div
                        key={combo.id}
                        onClick={() => setEditSelectedPresetId(combo.id)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-amber-500/10 border-[#E08F35] ring-2 ring-[#E08F35]/30"
                            : "border-stone-200 dark:border-stone-800 hover:border-stone-300"
                        }`}
                      >
                        <div>
                          <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">{combo.name}</h4>
                          <p className="text-xs text-stone-700 dark:text-stone-300 font-medium">{combo.items.join(" + ")}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-extrabold text-[#8B4513] dark:text-amber-300">
                            ₹{combo.monthlyPrice}/mo
                          </span>
                          <span className="block text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                            Save ₹{combo.savings}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-stone-700 dark:text-stone-300 font-medium">
                    Adjust the number of 1L bottles for your next monthly delivery (minimum 2 bottles):
                  </p>
                  {(["groundnut", "coconut", "sesame"] as const).map((oilKey) => {
                    const rate = currentBottleRates[oilKey];
                    const count = editCustomCounts[oilKey];
                    return (
                      <div
                        key={oilKey}
                        className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between"
                      >
                        <div>
                          <h5 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">{rate.name}</h5>
                          <span className="text-[11px] text-[#A85810] dark:text-amber-400 font-bold">
                            Fixed Subscription Price: ₹{rate.subPrice}/L{" "}
                            <span className="text-stone-500 dark:text-stone-400 line-through font-semibold">₹{rate.mrp}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setEditCustomCounts((p) => ({
                                ...p,
                                [oilKey]: Math.max(0, p[oilKey] - 1),
                              }))
                            }
                            className="w-8 h-8 rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 flex items-center justify-center font-bold text-stone-900 dark:text-stone-100 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center font-black text-sm text-stone-900 dark:text-stone-100">{count}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setEditCustomCounts((p) => ({
                                ...p,
                                [oilKey]: p[oilKey] + 1,
                              }))
                            }
                            className="w-8 h-8 rounded-lg bg-[#5E3210] hover:bg-[#43230A] text-white flex items-center justify-center font-bold cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditingCombo(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={handleSaveComboEdit}
                  className="px-6 py-2.5 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-amber-300" />
                  <span>{isSavingEdit ? "Saving in Firestore..." : "Save Updated Combo"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Choose or Build Your Monthly Combo */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#E08F35] text-[#1F120A] flex items-center justify-center font-bold text-xs">
                1
              </span>
              <h2 className="text-lg sm:text-xl font-bold font-serif text-[#1F120A] dark:text-stone-100">
                Step 1: Choose Your Monthly Combo or Build Custom Box
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setShowImageGuide(!showImageGuide)}
              className="text-xs font-bold text-[#A85810] dark:text-[#E08F35] hover:underline flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{showImageGuide ? "Hide Photo Guide" : "How to add custom combo photos?"}</span>
            </button>
          </div>

          {/* Mode Switcher: Preset Combos vs Custom Builder */}
          <div className="flex items-center gap-3 p-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 max-w-md">
            <button
              type="button"
              onClick={() => setComboMode("preset")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                comboMode === "preset"
                  ? "bg-[#5E3210] text-white shadow-md"
                  : "text-stone-800 dark:text-stone-200 hover:text-[#5E3210]"
              }`}
            >
              Curated Popular Combos
            </button>
            <button
              type="button"
              onClick={() => setComboMode("custom")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                comboMode === "custom"
                  ? "bg-[#5E3210] text-white shadow-md"
                  : "text-stone-800 dark:text-stone-200 hover:text-[#5E3210]"
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-amber-300" />
              <span>Build Custom Box</span>
            </button>
          </div>

          {/* Collapsible Photo Guide for Owner/Merchant */}
          {showImageGuide && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-stone-800 dark:text-stone-200 space-y-2 animate-fadeIn font-medium">
              <div className="flex items-center gap-2 font-bold text-[#9A4E0B] dark:text-[#E08F35]">
                <Info className="w-4 h-4" />
                <span>Guide: Custom Photos for Subscription Combos</span>
              </div>
              <p className="leading-relaxed">
                Right now, each combo automatically renders an authentic multi-bottle visual featuring
                our authentic Marachekku bottles (Groundnut, Coconut, Sesame) with exact quantity pills.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-white dark:bg-stone-800/90 border border-amber-500/30 space-y-1 shadow-2xs">
                  <strong className="text-stone-900 dark:text-stone-100 block">
                    Option A: Use Your Own Photoshoot
                  </strong>
                  <p className="text-[11px] text-stone-700 dark:text-stone-300 font-normal">
                    Take a photo of the 2 or 3 bottles together on a clean kitchen counter or studio backdrop.
                    Upload it to your Cloudflare R2 bucket or CMS, then set the <code className="text-[#8B4513] dark:text-amber-300 font-bold">image</code> property in <code className="text-[#8B4513] dark:text-amber-300 font-bold">PRESET_SUBSCRIPTION_COMBOS</code>.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-stone-800/90 border border-amber-500/30 space-y-1 shadow-2xs">
                  <strong className="text-stone-900 dark:text-stone-100 block">
                    Option B: Keep Multi-Bottle Composite
                  </strong>
                  <p className="text-[11px] text-stone-700 dark:text-stone-300 font-normal">
                    The current visual always displays the genuine MANOPAVANA transparent bottles with dark/light
                    theme adaptability and volume tags. It is 100% production-ready!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Render Mode: Preset Combos */}
          {comboMode === "preset" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {currentPresetCombos.map((combo) => {
                const isSelected = selectedPresetId === combo.id;
                return (
                  <div
                    key={combo.id}
                    onClick={() => setSelectedPresetId(combo.id)}
                    className={`relative p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? isDark
                          ? "bg-[#25150C] border-[#E08F35] shadow-lg ring-2 ring-[#E08F35]/30"
                          : "bg-amber-50/90 border-[#E08F35] shadow-lg ring-2 ring-[#E08F35]/30"
                        : isDark
                        ? "bg-[#1C120B] border-[#362114] hover:border-amber-500/30"
                        : "bg-white border-[#E8DEC8] hover:border-amber-400"
                    }`}
                  >
                    {combo.badge && (
                      <span className="absolute -top-3 right-5 px-3 py-0.5 rounded-full bg-[#E08F35] text-[#1F120A] font-black text-[10px] uppercase shadow-xs">
                        {combo.badge}
                      </span>
                    )}

                    <div className="space-y-3">
                      <ComboBottleVisual combo={combo} isDark={isDark} />

                      <div>
                        <h3 className="font-bold text-sm sm:text-base font-serif text-stone-900 dark:text-stone-100">
                          {combo.name}
                        </h3>
                        <p className="text-[11px] text-[#A85810] dark:text-amber-400 font-bold mt-0.5">
                          {combo.kannadaName}
                        </p>
                        <p className="text-xs text-stone-700 dark:text-stone-300 mt-1 leading-relaxed font-normal">
                          {combo.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-1">
                        {combo.items.map((it, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 text-xs text-stone-800 dark:text-stone-200 font-medium"
                          >
                            <Droplet className="w-3 h-3 text-[#E08F35]" />
                            <span>{it}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between mt-4">
                      <div>
                        <span className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold line-through mr-1.5">
                          ₹{combo.mrp}
                        </span>
                        <span className="text-xl font-black font-serif text-[#8B4513] dark:text-amber-300">
                          ₹{combo.monthlyPrice}
                        </span>
                        <span className="text-xs text-stone-700 dark:text-stone-400 font-bold">/mo</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 dark:bg-emerald-900/60 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-300/50">
                        Save ₹{combo.savings} ({discountPercent}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Render Mode: Interactive Custom Combo Builder */
            <div
              className={`p-6 sm:p-8 rounded-3xl border shadow-lg space-y-6 ${
                isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-stone-200 dark:border-stone-800">
                <div>
                  <h3 className="text-lg font-bold font-serif text-stone-900 dark:text-stone-100">
                    Configure Your Monthly Cooking Oil Box
                  </h3>
                  <p className="text-xs text-stone-700 dark:text-stone-300 mt-0.5 font-medium">
                    Choose any combination of our 1L bottles. Prices are permanently locked at {discountPercent}% monthly discount!
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                    Total Volume:
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-[#5E3210] text-amber-100 font-black text-sm">
                    {customCounts.groundnut + customCounts.coconut + customCounts.sesame} Litres
                  </span>
                </div>
              </div>

              {/* Live Multi-Bottle Visual of Custom Box */}
              <div className="max-w-md mx-auto">
                <ComboBottleVisual combo={customComboData} isDark={isDark} />
              </div>

              {/* Bottle Quantity Steppers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["groundnut", "coconut", "sesame"] as const).map((oilKey) => {
                  const rate = currentBottleRates[oilKey];
                  const count = customCounts[oilKey];
                  return (
                    <div
                      key={oilKey}
                      className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3"
                    >
                      <div>
                        <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                          {rate.name}
                        </h4>
                        <span className="text-[10px] text-[#A85810] dark:text-amber-400 font-bold block">
                          {rate.kannadaName}
                        </span>
                        <p className="text-[11px] text-stone-700 dark:text-stone-300 mt-1 line-clamp-2 font-medium">
                          {rate.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-amber-500/20">
                        <div>
                          <span className="text-xs text-stone-500 dark:text-stone-400 font-semibold line-through mr-1">
                            ₹{rate.mrp}
                          </span>
                          <span className="text-base font-extrabold text-[#8B4513] dark:text-amber-300 font-serif">
                            ₹{rate.subPrice}
                          </span>
                          <span className="text-[10px] text-stone-700 dark:text-stone-400 font-bold">/L</span>
                        </div>

                        {/* Stepper Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setCustomCounts((p) => ({
                                ...p,
                                [oilKey]: Math.max(0, p[oilKey] - 1),
                              }))
                            }
                            className="w-8 h-8 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 flex items-center justify-center font-bold text-stone-900 dark:text-stone-100 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-black text-sm text-stone-900 dark:text-amber-100">{count}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomCounts((p) => ({
                                ...p,
                                [oilKey]: p[oilKey] + 1,
                              }))
                            }
                            className="w-8 h-8 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white flex items-center justify-center font-bold cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Box Summary Footer */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    Your Custom Monthly Box:{" "}
                  </span>
                  <span className="text-[#9A4E0B] dark:text-amber-300 font-bold">
                    {customComboData.items.length > 0
                      ? customComboData.items.join(" + ")
                      : "No bottles selected yet"}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-stone-500 dark:text-stone-400 font-semibold line-through">₹{customComboData.mrp}</span>
                  <span className="text-xl font-black font-serif text-[#8B4513] dark:text-amber-300">
                    ₹{customComboData.monthlyPrice}
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-400">/mo</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 dark:bg-emerald-900/60 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-300/50">
                    Save ₹{customComboData.savings}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Interactive Calendar Picker */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#E08F35] text-[#1F120A] flex items-center justify-center font-bold text-xs">
              2
            </span>
            <h2 className="text-lg sm:text-xl font-bold font-serif text-[#1F120A] dark:text-stone-100">
              Step 2: Choose Delivery Start Date on Calendar
            </h2>
          </div>
          <p className="text-xs text-stone-700 dark:text-stone-300 font-medium">
            Select the date you want your first oil delivery. Your order will automatically repeat on
            this exact day every month.
          </p>

          <InteractiveCalendarPicker
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            isDark={isDark}
          />
        </div>

        {/* Step 3: Choose Payment Mode (STRICTLY NO COD) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#E08F35] text-[#1F120A] flex items-center justify-center font-bold text-xs">
              3
            </span>
            <h2 className="text-lg sm:text-xl font-bold font-serif text-[#1F120A] dark:text-stone-100">
              Step 3: Choose Payment Plan
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option 1: Monthly Online UPI via WhatsApp (Best) */}
            <div
              onClick={() => setPaymentPlan("monthly_online")}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer space-y-2 ${
                paymentPlan === "monthly_online"
                  ? isDark
                    ? "bg-[#25150C] border-[#E08F35] ring-2 ring-[#E08F35]/30"
                    : "bg-amber-50/90 border-[#E08F35] ring-2 ring-[#E08F35]/30"
                  : isDark
                  ? "bg-[#1C120B] border-[#362114]"
                  : "bg-white border-[#E8DEC8] hover:border-amber-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>Monthly Online UPI via WhatsApp (Recommended)</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
                  Zero Lock-in
                </span>
              </div>
              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-normal">
                3 days before your delivery date, you receive an automated WhatsApp PhonePe payment link.
                Tap once to approve ₹{chosenCombo.monthlyPrice}; we press your batch and dispatch.
              </p>
            </div>

            {/* Option 2: 12-Month Annual Prepaid */}
            <div
              onClick={() => setPaymentPlan("annual_prepaid")}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer space-y-2 ${
                paymentPlan === "annual_prepaid"
                  ? isDark
                    ? "bg-[#25150C] border-[#E08F35] ring-2 ring-[#E08F35]/30"
                    : "bg-amber-50/90 border-[#E08F35] ring-2 ring-[#E08F35]/30"
                  : isDark
                  ? "bg-[#1C120B] border-[#362114]"
                  : "bg-white border-[#E8DEC8] hover:border-amber-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#E08F35]" />
                  <span>12-Month Annual Prepaid Plan</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-[#A85810] dark:text-[#E08F35]">
                  Extra 10% Off + Free Gift
                </span>
              </div>
              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-normal">
                Pay upfront for 1 year (₹{Math.round(chosenCombo.monthlyPrice * 12 * 0.9)}). Enjoy an
                extra 10% discount plus a complimentary 500ml Coconut Oil bottle shipped in Month 1.
              </p>
            </div>
          </div>

          {/* COD Restriction Notice */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-xs text-amber-950 dark:text-amber-200 font-medium">
            <ShieldCheck className="w-5 h-5 text-[#9A4E0B] dark:text-[#E08F35] shrink-0" />
            <span>
              <strong>Note on Cash on Delivery (COD):</strong> Subscriptions are strictly prepaid or online
              UPI to guarantee freshly pressed authentic wood-churned oils with zero return/cancellation
              waste.
            </span>
          </div>
        </div>

        {/* Subscribe Action CTA */}
        <div
          className={`p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 ${
            isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
          }`}
        >
          <div>
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300">Subscription Summary:</span>
            <h3 className="text-lg font-bold font-serif text-stone-900 dark:text-stone-100">
              {chosenCombo.name} • Delivering {getOrdinalSuffix(deliveryDay)} of Every Month
            </h3>
            <p className="text-xs text-emerald-800 dark:text-emerald-400 font-bold mt-0.5">
              ₹{chosenCombo.monthlyPrice}/month • Starts{" "}
              {selectedDate.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}{" "}
              • Free Doorstep Delivery
            </p>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubscribe}
            className="px-8 py-3.5 rounded-2xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-sm shadow-xl transition-all hover:scale-105 cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{isSubmitting ? "Activating..." : "Confirm & Start Subscription"}</span>
          </button>
        </div>

        {/* Modal: Instant WhatsApp Payment Link Confirmed */}
        {subSuccessModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className={`w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-5 border shadow-2xl animate-fade-in ${
                isDark ? "bg-[#1C120B] text-[#FAF4EA] border-[#362114]" : "bg-white text-[#1F120A] border-[#E8DEC8]"
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold font-serif text-lg text-stone-900 dark:text-stone-100">
                      Subscription Confirmed!
                    </h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                      Saved to Firestore & WhatsApp Link Ready
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubSuccessModal(null)}
                  className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-700 dark:text-stone-300 font-bold">Monthly Plan:</span>
                    <strong className="text-stone-900 dark:text-stone-100">{subSuccessModal.comboName}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-700 dark:text-stone-300 font-bold">Recurring Date:</span>
                    <strong className="text-[#8B4513] dark:text-amber-300 font-black">
                      {subSuccessModal.dayStr} of Every Month
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-700 dark:text-stone-300 font-bold">Monthly Amount:</span>
                    <strong className="text-base font-black text-emerald-700 dark:text-emerald-400">
                      ₹{subSuccessModal.amount}/month
                    </strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-stone-800 dark:text-stone-200">
                  <MessageCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-xs text-stone-900 dark:text-stone-100">
                      WhatsApp Payment Link Dispatched
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      We have launched WhatsApp with your PhonePe payment link. If WhatsApp did not open automatically, tap the green button below!
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => window.open(subSuccessModal.waUrl, "_blank")}
                  className="w-full py-3 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Open WhatsApp Payment Link</span>
                </button>
                <a
                  href={subSuccessModal.upiLink}
                  className="w-full py-3 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer text-center"
                >
                  <CreditCard className="w-4 h-4 text-amber-300" />
                  <span>Pay Now via PhonePe</span>
                </a>
              </div>

              <button
                type="button"
                onClick={() => setSubSuccessModal(null)}
                className="w-full text-center text-[11px] text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 font-semibold cursor-pointer pt-1"
              >
                Done • View My Subscription Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
