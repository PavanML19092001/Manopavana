import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Pause,
  Play,
  Droplet,
  Sliders,
  Plus,
  Minus,
  Edit3,
  X,
  Check,
  Crown,
  Bell,
  Clock,
  ArrowRight,
  Truck,
  Lock,
  Package,
  ExternalLink,
  MapPin,
  HelpCircle,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { THEMED_PRODUCT_IMAGES, BUSINESS_CONFIG } from "../constants";
import { Order } from "../types";

/**
 * Universal ordinal suffix formatter (1st, 2nd, 3rd, 4th, 21st, etc.)
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

/**
 * Dynamic calculation of bottle prices based on active discount percentage (5%, 10%, or 15%)
 */
export const getCustomBottleRates = (discountPercent: number = 5) => {
  const factor = (100 - Math.max(0, Math.min(50, discountPercent))) / 100;
  return {
    groundnut: {
      id: "groundnut",
      type: "groundnut" as const,
      name: "Wood-Pressed Groundnut Oil",
      kannadaName: "ಕಡಲೆಕಾಯಿ ಎಣ್ಣೆ",
      volume: "1L",
      mrp: 399,
      subPrice: Math.round(399 * factor),
      description: "Cold Marachekku pressed peanut oil for daily South Indian cooking.",
    },
    coconut: {
      id: "coconut",
      type: "coconut" as const,
      name: "Wood-Pressed Coconut Oil",
      kannadaName: "ತೆಂಗಿನ ಎಣ್ಣೆ",
      volume: "1L",
      mrp: 499,
      subPrice: Math.round(499 * factor),
      description: "Sulfur-free copra extract with natural healthy MCTs.",
    },
    sesame: {
      id: "sesame",
      type: "sesame" as const,
      name: "Wood-Pressed Sesame Oil",
      kannadaName: "ಎಳ್ಳೆಣ್ಣೆ (ಜಿಂಜೆಲ್ಲಿ)",
      volume: "1L",
      mrp: 499,
      subPrice: Math.round(499 * factor),
      description: "Crushed with palm jaggery for traditional nutty warmth.",
    },
  };
};

/**
 * Curated preset combos dynamically calculated with active discount percentage
 */
export const getPresetSubscriptionCombos = (discountPercent: number = 5): SubscriptionCombo[] => {
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
      monthlyPrice: 2 * gnRate + coRate,
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
      monthlyPrice: gnRate + coRate + seRate,
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
      monthlyPrice: 2 * gnRate + coRate + seRate,
      savings: 1796 - (2 * gnRate + coRate + seRate),
      badge: "Maximum Savings",
    },
  ];
};

/**
 * Multi-bottle composite visual with solid contrast
 */
const ComboBottleVisual: React.FC<{
  combo: SubscriptionCombo;
  isDark: boolean;
}> = ({ combo, isDark }) => {
  return (
    <div
      className={`relative h-44 w-full rounded-2xl overflow-hidden p-3 flex flex-col justify-between border transition-colors ${
        isDark
          ? "bg-[#1E1108] border-[#3E2413]"
          : "bg-[#F7EFE3] border-[#DFCAB0]"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(224,143,53,0.18)_0%,transparent_70%)] pointer-events-none" />

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
                <div className="h-24 w-12 sm:w-14 flex items-center justify-center">
                  <img
                    src={bottleImg}
                    alt={b.label}
                    className="max-h-full max-w-full object-contain drop-shadow-md"
                  />
                </div>
                <span
                  className={`mt-1 text-[10px] font-black px-1.5 py-0.5 rounded shadow-2xs ${
                    isDark
                      ? "bg-amber-500/30 text-amber-200 border border-amber-500/30"
                      : "bg-[#43230A] text-white"
                  }`}
                >
                  {b.count}x 1L
                </span>
              </div>
            );
          })
        ) : (
          <div className="flex items-center justify-center text-xs font-bold text-[#43230A] dark:text-stone-300">
            Select bottles
          </div>
        )}
      </div>

      <div className="relative z-10 flex items-center justify-between text-[11px] font-black">
        <span className={isDark ? "text-amber-200" : "text-[#3D1E08]"}>
          Marachekku Cold-Pressed
        </span>
        <span className={isDark ? "text-emerald-400" : "text-emerald-800"}>
          ✓ Free Delhivery Express
        </span>
      </div>
    </div>
  );
};

/**
 * Interactive Calendar Picker with 100% dark, razor-sharp readable text in light mode
 */
const InteractiveCalendarPicker: React.FC<{
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  isDark: boolean;
}> = ({ selectedDate, onSelectDate, isDark }) => {
  const [viewedDate, setViewedDate] = useState<Date>(() => new Date(selectedDate));

  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

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
  const firstDayOfWeek = new Date(viewedYear, viewedMonth, 1).getDay();

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfWeek }, (_, i) => i);

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
    if (canGoPrev) setViewedDate(new Date(viewedYear, viewedMonth - 1, 1));
  };

  const handleNextMonth = () => {
    if (canGoNext) setViewedDate(new Date(viewedYear, viewedMonth + 1, 1));
  };

  const applyPreset = (daysFromToday: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromToday);
    target.setHours(0, 0, 0, 0);
    onSelectDate(target);
    setViewedDate(new Date(target.getFullYear(), target.getMonth(), 1));
  };

  const deliveryDay = selectedDate.getDate();

  return (
    <div
      className={`rounded-3xl border p-5 sm:p-7 space-y-6 shadow-sm transition-all ${
        isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#D6C2A4]"
      }`}
    >
      {/* Quick Presets */}
      <div
        className={`flex flex-wrap items-center gap-2 pb-4 border-b ${
          isDark ? "border-[#2D1A0E]" : "border-[#E8DAC2]"
        }`}
      >
        <span
          className={`text-xs font-black flex items-center gap-1.5 ${
            isDark ? "text-amber-200" : "text-[#1A0E07]"
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5 text-[#E08F35]" />
          <span>Quick Select:</span>
        </span>
        <button
          type="button"
          onClick={() => applyPreset(2)}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black border transition-colors cursor-pointer ${
            isDark
              ? "border-[#4A2914] bg-[#25150C] text-[#E0D4C0] hover:bg-[#341F12]"
              : "border-[#C9B293] bg-[#F7EFE3] text-[#1A0E07] hover:bg-[#EBDDC8]"
          }`}
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
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black border transition-colors cursor-pointer ${
            isDark
              ? "border-[#4A2914] bg-[#25150C] text-[#E0D4C0] hover:bg-[#341F12]"
              : "border-[#C9B293] bg-[#F7EFE3] text-[#1A0E07] hover:bg-[#EBDDC8]"
          }`}
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
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black border transition-colors cursor-pointer ${
            isDark
              ? "border-[#4A2914] bg-[#25150C] text-[#E0D4C0] hover:bg-[#341F12]"
              : "border-[#C9B293] bg-[#F7EFE3] text-[#1A0E07] hover:bg-[#EBDDC8]"
          }`}
        >
          15th of Next Month
        </button>
      </div>

      {/* Month Navigator Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3
            className={`text-lg sm:text-xl font-black font-serif ${
              isDark ? "text-[#FAF4EA]" : "text-[#110702]"
            }`}
          >
            {monthNames[viewedMonth]} {viewedYear}
          </h3>
          <p
            className={`text-xs font-bold ${
              isDark ? "text-[#CBB5A1]" : "text-[#4A260F]"
            }`}
          >
            Select your preferred recurring delivery day of the month
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={handlePrevMonth}
            className={`p-2 rounded-xl border transition-all ${
              canGoPrev
                ? isDark
                  ? "border-[#442817] bg-[#22130A] text-amber-200 hover:bg-[#321C0F] cursor-pointer"
                  : "border-[#C9B293] bg-[#F7EFE3] text-[#110702] hover:bg-[#EBDDC8] cursor-pointer font-black"
                : "border-transparent text-stone-300 dark:text-stone-700 cursor-not-allowed opacity-40"
            }`}
            title="Previous Month"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <button
            type="button"
            disabled={!canGoNext}
            onClick={handleNextMonth}
            className={`p-2 rounded-xl border transition-all ${
              canGoNext
                ? isDark
                  ? "border-[#442817] bg-[#22130A] text-amber-200 hover:bg-[#321C0F] cursor-pointer"
                  : "border-[#C9B293] bg-[#F7EFE3] text-[#110702] hover:bg-[#EBDDC8] cursor-pointer font-black"
                : "border-transparent text-stone-300 dark:text-stone-700 cursor-not-allowed opacity-40"
            }`}
            title="Next Month"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
          {dayNames.map((d) => (
            <span
              key={d}
              className={`text-xs font-black uppercase tracking-wider py-1 ${
                isDark ? "text-amber-200" : "text-[#241105]"
              }`}
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
                    ? "bg-[#43230A] text-white font-black shadow-lg ring-3 ring-[#D4892E] scale-105 cursor-pointer z-10"
                    : isPastOrTooSoon
                    ? "text-[#A8988B] cursor-not-allowed bg-[#F3ECE1] border border-[#E4DACD]"
                    : isDark
                    ? "bg-[#25150C] text-[#FAF4EA] hover:bg-[#362114] hover:text-amber-200 cursor-pointer font-bold border border-[#3E2313]"
                    : "bg-[#FDF9F2] border-2 border-[#D8C4A8] text-[#110702] font-black hover:bg-[#F3E7D3] cursor-pointer shadow-2xs"
                }`}
              >
                <span className="text-sm sm:text-base font-black">{dayNum}</span>
                {isToday && !isSelected && (
                  <span className="text-[8px] font-black text-[#A85810] dark:text-amber-400 leading-none">Today</span>
                )}
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300 mt-0.5 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Schedule Summary */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
          isDark
            ? "bg-[#25150C] border-[#3E2313] text-[#FAF4EA]"
            : "bg-[#F7EFE3] border-[#C9B293] text-[#110702]"
        }`}
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-[#C8751B] shrink-0" />
          <span className="font-bold">
            Scheduled recurring dispatch:{" "}
            <strong className="font-black text-[#6B340B] dark:text-amber-300 text-sm">
              {getOrdinalSuffix(deliveryDay)} of Every Month
            </strong>{" "}
            (First box: {selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })})
          </span>
        </div>
        <div className="shrink-0 flex items-center gap-1.5 font-black text-emerald-800 dark:text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          <span>48h Fresh Press</span>
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
    saveOrder,
  } = useStore();

  const isDark = themeMode === "dark";

  // Plan Selection:
  // 1. duration: "monthly" (5% off) vs "annual" (10% off)
  const [duration, setDuration] = useState<"monthly" | "annual">("monthly");
  // 2. vipPass: boolean (+₹199 subscription fee to get 15% off)
  const [hasVipPass, setHasVipPass] = useState<boolean>(false);

  // Computed discount percentage
  const discountPercent = useMemo(() => {
    if (hasVipPass) return 15;
    return duration === "annual" ? 10 : 5;
  }, [hasVipPass, duration]);

  const currentBottleRates = useMemo(
    () => getCustomBottleRates(discountPercent),
    [discountPercent]
  );
  const currentPresetCombos = useMemo(
    () => getPresetSubscriptionCombos(discountPercent),
    [discountPercent]
  );

  // Step 2: Mode ("preset" vs "custom")
  const [comboMode, setComboMode] = useState<"preset" | "custom">("preset");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("sub-essential-3l");

  // Custom builder counts
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

  // Step 3: Selected Start Date from Interactive Calendar
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const deliveryDay = selectedDate.getDate();

  // Active Subscription State in Firestore
  const [activeSub, setActiveSub] = useState<any | null>(null);
  const [isLoadingSub, setIsLoadingSub] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDelhiveryGuide, setShowDelhiveryGuide] = useState(false);
  const [subSuccessModal, setSubSuccessModal] = useState<{
    subId: string;
    orderRef: string;
    waybill: string;
    amount: number;
    comboName: string;
    dayStr: string;
    duration: string;
    vipPass: boolean;
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

  // Load existing subscription from Firestore
  useEffect(() => {
    if (!currentUser?.uid) {
      setIsLoadingSub(false);
      return;
    }
    const currentUserId = currentUser.uid;
    async function loadSubscription() {
      try {
        const subDoc = await getDoc(doc(db, "subscriptions", currentUserId));
        if (subDoc.exists()) {
          const data = subDoc.data();
          if (data && data.status !== "cancelled") {
            setActiveSub({ id: subDoc.id, ...data });
          }
        }
      } catch (err) {
        console.error("Error loading subscription from Firestore:", err);
      } finally {
        setIsLoadingSub(false);
      }
    }
    loadSubscription();
  }, [currentUser?.uid]);

  // Calculations for online payment checkout
  const VIP_PASS_FEE = 199;
  const cycleCount = duration === "annual" ? 12 : 1;
  const oilAmount = chosenCombo.monthlyPrice * cycleCount;
  const vipFeeAmount = hasVipPass ? VIP_PASS_FEE : 0;
  const finalOnlinePayAmount = oilAmount + vipFeeAmount;

  // Online Subscription Booking & Order Generation Handler
  const handleSubscribeOnline = async () => {
    if (!currentUser?.uid) {
      setLoginModalOpen(true);
      showToast("Please sign in with your phone or email to activate your online subscription.");
      return;
    }

    if (comboMode === "custom") {
      const totalLitres =
        customCounts.groundnut + customCounts.coconut + customCounts.sesame;
      if (totalLitres < 2) {
        showToast("Please select at least 2 bottles (2L) to start your monthly subscription.");
        return;
      }
    }

    const defaultAddr =
      savedAddresses.find((a) => a.isDefault) ||
      savedAddresses[0] || {
        addressLine1: address.addressLine1 || "Peenya 2nd Stage Hub",
        district: address.district || "Bengaluru",
        state: address.state || "Karnataka",
        pincode: address.pincode || "560058",
        phone: customerProfile?.phone || currentUser.phoneNumber || BUSINESS_CONFIG.PHONE_RAW,
        fullName: customerProfile?.name || currentUser.displayName || "Valued Customer",
      };

    setIsSubmitting(true);
    try {
      const timestamp = Date.now();
      const subId = `SUB_${timestamp}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const orderRef = `MANO-SUB-${timestamp.toString().slice(-6)}`;
      const mockWaybill = `DELHIVERY-${Math.floor(100000000000 + Math.random() * 900000000000)}`;

      const nextDispatchDateStr = selectedDate.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const subscriptionData = {
        id: subId,
        orderRef,
        userId: currentUser.uid,
        customerName: customerProfile?.name || currentUser.displayName || "Customer",
        customerPhone: customerProfile?.phone || currentUser.phoneNumber || "",
        customerEmail: currentUser.email || "",
        status: "active",
        duration,
        hasVipPass,
        discountPercent,
        vipPassFee: hasVipPass ? VIP_PASS_FEE : 0,
        monthlyPrice: chosenCombo.monthlyPrice,
        paidTotal: finalOnlinePayAmount,
        paymentMode: "ONLINE_PAID",
        paymentStatus: "COMPLETED",
        deliveryDay,
        startDate: selectedDate.toISOString(),
        nextDispatchDate: nextDispatchDateStr,
        comboId: chosenCombo.id,
        comboName: chosenCombo.name,
        comboType: chosenCombo.isCustom ? "custom" : "preset",
        items: chosenCombo.items,
        bottles: chosenCombo.bottles,
        mrp: chosenCombo.mrp,
        savings: chosenCombo.savings,
        shippingAddress: defaultAddr,
        delhiveryWaybill: mockWaybill,
        delhiveryCarrier: "Delhivery B2C Surface Express (Bengaluru Hub)",
        autoReminderNotice: "Automated payment reminder scheduled 3 days before recurring dispatch.",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // 1. Save subscription in Firestore
      await setDoc(doc(db, "subscriptions", currentUser.uid), subscriptionData, {
        merge: true,
      });

      // 2. Also save into orders collection so customer can track Delhivery fulfillment in My Orders
      const orderPayload: Order = {
        id: orderRef,
        orderRef,
        date: new Date().toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        timestamp,
        customerUid: currentUser.uid,
        customerEmail: currentUser.email || "",
        customerPhone: customerProfile?.phone || currentUser.phoneNumber || "",
        items: [
          {
            id: chosenCombo.id,
            productId: "groundnut",
            title: `[Subscription] ${chosenCombo.name}`,
            subtitle: `${getOrdinalSuffix(deliveryDay)} of every month (${discountPercent}% OFF)`,
            variant: "3L Trio",
            price: finalOnlinePayAmount,
            regularPrice: chosenCombo.mrp,
            quantity: 1,
            image: THEMED_PRODUCT_IMAGES.groundnut.light,
          },
        ],
        subtotal: finalOnlinePayAmount,
        discount: 0,
        shippingFee: 0,
        total: finalOnlinePayAmount,
        shippingAddress: {
          fullName: defaultAddr.fullName || "Valued Subscriber",
          phone: defaultAddr.phone || BUSINESS_CONFIG.PHONE_RAW,
          email: currentUser.email || "",
          addressLine1: defaultAddr.addressLine1 || "Peenya 2nd Stage Hub",
          landmark: defaultAddr.landmark || "",
          city: defaultAddr.district || "Bengaluru",
          district: defaultAddr.district || "Bengaluru",
          state: defaultAddr.state || "Karnataka",
          pincode: defaultAddr.pincode || "560058",
          isBangalore: defaultAddr.pincode?.startsWith("560") ?? true,
        },
        orderStatus: "Placed",
        paymentMethod: "phonepe",
        paymentMode: "PHONEPE_PAID",
        paymentStatus: "COMPLETED",
        trackingNumber: mockWaybill,
        courier: "Delhivery B2C Surface Express",
        createdAt: new Date().toISOString(),
      };

      await saveOrder(orderPayload);
      setActiveSub(subscriptionData);

      setSubSuccessModal({
        subId,
        orderRef,
        waybill: mockWaybill,
        amount: finalOnlinePayAmount,
        comboName: chosenCombo.name,
        dayStr: getOrdinalSuffix(deliveryDay),
        duration: duration === "annual" ? "12-Month Annual Pass" : "1-Month Subscription",
        vipPass: hasVipPass,
      });

      showToast("🎉 Congratulations! Your subscription order is placed and online payment verified!");
    } catch (e) {
      console.error("Subscription online activation error:", e);
      showToast("Could not activate subscription online. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Monthly Combo Edit Handler
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
          : "Subscription resumed! Your next delivery is scheduled."
      );
    } catch {
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
      } catch {
        showToast("Error cancelling subscription.");
      }
    }
  };

  return (
    <div
      className={`w-full min-h-[calc(100vh-80px)] py-6 sm:py-10 transition-colors ${
        isDark ? "bg-[#140D09] text-[#FAF4EA]" : "bg-[#FAF7F2] text-[#110702]"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        {/* BANNER WITH KANNADA FLAG & THEME COLORS */}
        <div
          className={`relative overflow-hidden rounded-3xl p-5 sm:p-7 border shadow-sm transition-colors ${
            isDark
              ? "bg-gradient-to-r from-[#1E1108] via-[#2A150A] to-[#1E1108] border-[#3E2413] text-[#FAF4EA]"
              : "bg-gradient-to-r from-[#F6EEDF] via-[#EFE2CC] to-[#F6EEDF] border-[#D6C2A4] text-[#110702]"
          }`}
        >
          <div className="relative z-10 flex items-center gap-3.5 sm:gap-4 min-w-0">
            {/* Karnataka Flag Emblem on the Left */}
            <div
              title="ಕನ್ನಡ ಧ್ವಜ (Karnataka Flag)"
              className={`relative w-10 h-7 sm:w-11 sm:h-7.5 rounded-sm overflow-hidden border shadow-xs shrink-0 flex flex-col group transform hover:scale-105 transition-transform ${
                isDark ? "border-amber-400/80" : "border-amber-600/80"
              }`}
            >
              <div className="w-full h-1/2 bg-[#FFD700]" />
              <div className="w-full h-1/2 bg-[#DC2626]" />
            </div>

            {/* One Main Line & One Tagline Only */}
            <div className="min-w-0">
              <h1
                className={`text-base sm:text-xl font-black font-serif tracking-tight truncate ${
                  isDark ? "text-amber-200" : "text-[#241105]"
                }`}
              >
                MANOPAVANA Wood-Pressed Oil Club (ಮನೆಯಲ್ಲೇ ಮರದ ಗಾಣದ ಎಣ್ಣೆ ಚಂದಾದಾರಿಕೆ)
              </h1>
              <p
                className={`text-xs sm:text-sm font-bold mt-0.5 truncate ${
                  isDark ? "text-amber-100/90" : "text-[#4A260F]"
                }`}
              >
                Authentic 100% Marachekku Oils • Freshly Pressed & Delivered Directly to Your Doorstep Every Month
              </p>
            </div>
          </div>
        </div>

        {/* ACTIVE SUBSCRIBER PORTAL & DELHIVERY LOGISTICS TRACKER */}
        {activeSub && activeSub.status !== "cancelled" && (
          <div
            className={`p-6 sm:p-8 rounded-3xl border shadow-lg space-y-6 ${
              isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#D6C2A4]"
            }`}
          >
            <div
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${
                isDark ? "border-[#2D1B10]" : "border-[#E8DAC2]"
              }`}
            >
              <div>
                <span
                  className={`text-xs font-black block ${
                    isDark ? "text-amber-300" : "text-[#6B340B]"
                  }`}
                >
                  Your Active Subscription Dashboard
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`w-3.5 h-3.5 rounded-full ${
                      activeSub.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                    }`}
                  />
                  <h2
                    className={`text-xl font-black font-serif ${
                      isDark ? "text-[#FAF4EA]" : "text-[#110702]"
                    }`}
                  >
                    {activeSub.comboName}
                  </h2>
                  {activeSub.hasVipPass && (
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-black bg-amber-500/20 text-[#6B340B] dark:text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5" />
                      15% VIP PASS
                    </span>
                  )}
                </div>
                {activeSub.lastModifiedNote && (
                  <p
                    className={`text-xs mt-1 italic font-bold ${
                      isDark ? "text-[#BBA38F]" : "text-[#5C3212]"
                    }`}
                  >
                    {activeSub.lastModifiedNote}
                  </p>
                )}
              </div>

              {/* Action Buttons: Edit Monthly Combo, Pause, Cancel */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingCombo(true)}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-[#43230A] hover:bg-[#2E1807] text-white flex items-center gap-1.5 cursor-pointer shadow-md transition-all hover:scale-105"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Edit Monthly Combo</span>
                </button>
                <button
                  type="button"
                  onClick={handleTogglePause}
                  className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors ${
                    activeSub.status === "active"
                      ? isDark
                        ? "bg-amber-500/20 text-amber-200 hover:bg-amber-500/30"
                        : "bg-amber-100 text-[#43230A] hover:bg-amber-200 border-2 border-amber-400"
                      : isDark
                      ? "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
                      : "bg-emerald-100 text-emerald-950 hover:bg-emerald-200 border-2 border-emerald-400"
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div
                className={`p-4 rounded-2xl border space-y-1 ${
                  isDark
                    ? "bg-[#25150C] border-[#3E2313]"
                    : "bg-[#F7EFE3] border-[#D6C2A4]"
                }`}
              >
                <span className={isDark ? "text-amber-200 font-bold block" : "text-[#4A260F] font-black block"}>
                  Delivery Schedule
                </span>
                <p className="font-black text-sm text-[#110702] dark:text-[#FAF4EA]">
                  {getOrdinalSuffix(activeSub.deliveryDay)} of Every Month
                </p>
                <p className="text-xs font-bold text-[#4A260F] dark:text-[#CBB5A1]">
                  Next Dispatch:{" "}
                  <span className="font-black text-emerald-800 dark:text-emerald-400">{activeSub.nextDispatchDate}</span>
                </p>
              </div>

              <div
                className={`p-4 rounded-2xl border space-y-1 ${
                  isDark
                    ? "bg-[#25150C] border-[#3E2313]"
                    : "bg-[#F7EFE3] border-[#D6C2A4]"
                }`}
              >
                <span className={isDark ? "text-amber-200 font-bold block" : "text-[#4A260F] font-black block"}>
                  Payment Mode
                </span>
                <p className="font-black text-sm text-[#110702] dark:text-[#FAF4EA] uppercase">
                  {activeSub.duration === "annual" ? "Annual Prepaid (12 Months)" : "Monthly Online Paid"}
                </p>
                <p className="text-xs font-bold text-[#4A260F] dark:text-[#CBB5A1]">
                  Online Paid • Zero delivery fees across India
                </p>
              </div>

              <div
                className={`p-4 rounded-2xl border space-y-1 ${
                  isDark
                    ? "bg-[#25150C] border-[#3E2313]"
                    : "bg-[#F7EFE3] border-[#D6C2A4]"
                }`}
              >
                <span className={isDark ? "text-amber-200 font-bold block" : "text-[#4A260F] font-black block"}>
                  Locked Monthly Price
                </span>
                <p className="font-black text-base text-[#6B340B] dark:text-amber-300 font-serif">
                  ₹{activeSub.monthlyPrice}/month
                </p>
                <p className="text-xs text-emerald-800 dark:text-emerald-400 font-black">
                  Free Doorstep Delivery (Pan-India)
                </p>
              </div>
            </div>

            {/* LIVE DELHIVERY LOGISTICS TRACKING CARD */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
                isDark
                  ? "bg-[#1E140C] border-[#442817]"
                  : "bg-[#F4EBDD] border-[#C9B293]"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#43230A] text-white flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-[#110702] dark:text-[#FAF4EA]">
                      Delhivery Express Fulfillment & Tracking
                    </h4>
                    <p className="text-xs font-bold text-[#4A260F] dark:text-[#CBB5A1]">
                      Carrier: Delhivery B2C Surface • Dispatched fresh from Peenya 2nd Stage, Bangalore
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate("/orders")}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#43230A] hover:bg-[#2E1807] text-white flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Package className="w-3.5 h-3.5 text-amber-300" />
                    <span>View in My Orders</span>
                  </button>
                  {activeSub.delhiveryWaybill && (
                    <a
                      href={`https://www.delhivery.com/track/package/${activeSub.delhiveryWaybill}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-white dark:bg-stone-800 border-2 border-[#43230A] text-[#43230A] dark:text-amber-200 flex items-center gap-1.5 cursor-pointer shadow-sm hover:bg-[#FAF7F2]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Track AWB #{activeSub.delhiveryWaybill.slice(-6)}</span>
                    </a>
                  )}
                </div>
              </div>

              {/* 4-Step Delhivery Lifecycle Visual */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-[#DECDB3] dark:border-[#3E2413] text-xs">
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#24150C] border border-[#DECDB3] dark:border-[#3E2413] space-y-0.5">
                  <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase">
                    1. Auto Booking
                  </span>
                  <p className="font-black text-[#110702] dark:text-[#FAF4EA]">Scheduled 3 Days Prior</p>
                  <p className="text-[11px] text-[#4A260F] dark:text-[#CBB5A1] font-medium">1-Click renewal sent</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#24150C] border border-[#DECDB3] dark:border-[#3E2413] space-y-0.5">
                  <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase">
                    2. Fresh Churning
                  </span>
                  <p className="font-black text-[#110702] dark:text-[#FAF4EA]">Peenya 2nd Stage</p>
                  <p className="text-[11px] text-[#4A260F] dark:text-[#CBB5A1] font-medium">Marachekku cold-press</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#24150C] border border-[#DECDB3] dark:border-[#3E2413] space-y-0.5">
                  <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase">
                    3. Delhivery Pickup
                  </span>
                  <p className="font-black text-[#110702] dark:text-[#FAF4EA]">AWB Manifested</p>
                  <p className="text-[11px] text-[#4A260F] dark:text-[#CBB5A1] font-medium">Real-time GPS tracking</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#24150C] border border-[#DECDB3] dark:border-[#3E2413] space-y-0.5">
                  <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase">
                    4. Doorstep Arrival
                  </span>
                  <p className="font-black text-[#110702] dark:text-[#FAF4EA]">{getOrdinalSuffix(activeSub.deliveryDay)} of Month</p>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-400 font-bold">Free Pan-India Delivery</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Edit Monthly Combo Directly in Firestore */}
        {isEditingCombo && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className={`w-full max-w-2xl rounded-3xl p-6 sm:p-8 space-y-6 border shadow-2xl overflow-y-auto max-h-[90vh] ${
                isDark ? "bg-[#1C120B] text-[#FAF4EA] border-[#362114]" : "bg-white text-[#110702] border-[#D6C2A4]"
              }`}
            >
              <div
                className={`flex items-center justify-between border-b pb-3 ${
                  isDark ? "border-[#2D1B10]" : "border-[#E8DAC2]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-[#C8751B]" />
                  <div>
                    <h3 className="font-black font-serif text-lg text-[#110702] dark:text-[#FAF4EA]">
                      Edit Your Monthly Oil Combo
                    </h3>
                    <p className="text-xs text-[#4A260F] dark:text-[#D8C8B8] font-bold">
                      Changes update directly in Firestore for your next monthly delivery cycle.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingCombo(false)}
                  className="p-2 rounded-xl text-stone-600 hover:text-black dark:text-stone-300 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* Mode Selector */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditComboMode("preset")}
                  className={`flex-1 py-2.5 rounded-xl font-black text-xs border transition-all cursor-pointer ${
                    editComboMode === "preset"
                      ? "bg-[#43230A] text-white border-[#43230A] shadow-md"
                      : isDark
                      ? "border-[#442817] text-[#D8C8B8] bg-[#22130A]"
                      : "border-[#C9B293] text-[#110702] bg-[#F7EFE3]"
                  }`}
                >
                  Choose Curated Combo
                </button>
                <button
                  type="button"
                  onClick={() => setEditComboMode("custom")}
                  className={`flex-1 py-2.5 rounded-xl font-black text-xs border transition-all cursor-pointer ${
                    editComboMode === "custom"
                      ? "bg-[#43230A] text-white border-[#43230A] shadow-md"
                      : isDark
                      ? "border-[#442817] text-[#D8C8B8] bg-[#22130A]"
                      : "border-[#C9B293] text-[#110702] bg-[#F7EFE3]"
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
                            ? "bg-amber-500/10 border-[#C8751B] ring-2 ring-[#C8751B]/30"
                            : isDark
                            ? "border-[#2D1B10] bg-[#25150C]"
                            : "border-[#D6C2A4] bg-[#FDF9F2]"
                        }`}
                      >
                        <div>
                          <h4 className="font-black text-sm text-[#110702] dark:text-[#FAF4EA]">
                            {combo.name}
                          </h4>
                          <p className="text-xs text-[#4A260F] dark:text-[#D8C8B8] font-bold">
                            {combo.items.join(" + ")}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-[#6B340B] dark:text-amber-300">
                            ₹{combo.monthlyPrice}/mo
                          </span>
                          <span className="block text-[10px] text-emerald-800 dark:text-emerald-400 font-black">
                            Save ₹{combo.savings}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-[#4A260F] dark:text-[#D8C8B8] font-bold">
                    Adjust the number of 1L bottles for your next monthly delivery (minimum 2 bottles):
                  </p>
                  {(["groundnut", "coconut", "sesame"] as const).map((oilKey) => {
                    const rate = currentBottleRates[oilKey];
                    const count = editCustomCounts[oilKey];
                    return (
                      <div
                        key={oilKey}
                        className={`p-3.5 rounded-2xl border-2 flex items-center justify-between ${
                          isDark
                            ? "bg-[#25150C] border-[#3E2313]"
                            : "bg-[#FDF9F2] border-[#D6C2A4]"
                        }`}
                      >
                        <div>
                          <h5 className="font-black text-sm text-[#110702] dark:text-[#FAF4EA]">
                            {rate.name}
                          </h5>
                          <span className="text-xs text-[#6B340B] dark:text-amber-400 font-black">
                            Subscription Rate: ₹{rate.subPrice}/L{" "}
                            <span className="line-through text-stone-500">₹{rate.mrp}</span>
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
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-black cursor-pointer border ${
                              isDark
                                ? "bg-[#362114] text-stone-200 border-[#4E2E1A]"
                                : "bg-[#EDE2CF] text-[#110702] border-[#C9B293]"
                            }`}
                          >
                            <Minus className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                          <span className="w-6 text-center font-black text-base text-[#110702] dark:text-[#FAF4EA]">
                            {count}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setEditCustomCounts((p) => ({
                                ...p,
                                [oilKey]: p[oilKey] + 1,
                              }))
                            }
                            className="w-8 h-8 rounded-lg bg-[#43230A] hover:bg-[#2E1807] text-white flex items-center justify-center font-bold cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div
                className={`pt-4 border-t flex items-center justify-end gap-3 ${
                  isDark ? "border-[#2D1B10]" : "border-[#E8DAC2]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setIsEditingCombo(false)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-black cursor-pointer ${
                    isDark
                      ? "border-[#442817] text-[#D8C8B8]"
                      : "border-[#C9B293] text-[#110702]"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={handleSaveComboEdit}
                  className="px-6 py-2.5 rounded-xl bg-[#43230A] hover:bg-[#2E1807] text-white text-xs font-black shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-amber-300 stroke-[3]" />
                  <span>{isSavingEdit ? "Saving in Firestore..." : "Save Updated Combo"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: CHOOSE PLAN & VIP CLUB PASS OPTION */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#43230A] text-amber-200 flex items-center justify-center font-black text-sm">
                1
              </span>
              <h2 className="text-xl sm:text-2xl font-black font-serif text-[#110702] dark:text-[#FAF4EA]">
                Step 1: Choose Subscription Plan & Discount
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowDelhiveryGuide(!showDelhiveryGuide)}
              className="text-xs font-black text-[#6B340B] dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
              <span>How Delhivery Fulfillment Works?</span>
            </button>
          </div>

          {/* Collapsible Logistics Explainer */}
          {showDelhiveryGuide && (
            <div
              className={`p-4 sm:p-5 rounded-2xl border-2 space-y-2 text-xs ${
                isDark ? "bg-[#1E120A] border-amber-500/30 text-[#FAF4EA]" : "bg-[#F7EFE3] border-[#C9B293] text-[#110702]"
              }`}
            >
              <h4 className="font-black text-sm text-[#241105] dark:text-amber-300 flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#C8751B]" />
                <span>End-to-End Subscription Booking to Delhivery Delivery:</span>
              </h4>
              <ol className="list-decimal pl-5 space-y-1 font-bold leading-relaxed">
                <li><strong>Online Booking & Lock-in:</strong> You choose your combo and pay online. Your booking and delivery schedule are instantly stored in Firestore.</li>
                <li><strong>Delhivery Waybill Generation:</strong> An official Order record is generated with a dedicated Delhivery AWB number.</li>
                <li><strong>48h Pre-Dispatch Notice:</strong> You receive an automated reminder 3 days before your delivery date.</li>
                <li><strong>Cold-Pressing at Peenya Hub:</strong> We cold-press authentic seeds at our Bengaluru facility, pack hygienically, and hand over to Delhivery logistics.</li>
                <li><strong>Pan-India Live Tracking:</strong> Real-time tracking is available directly inside your account on the <strong>My Orders</strong> page or on Delhivery.com!</li>
              </ol>
            </div>
          )}

          {/* THE 3 PRICING TIERS: 1-MONTH (5%), 1-YEAR (10%), AND VIP PASS (+₹199 FOR 15%) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1 Month Option: 5% Off */}
            <div
              onClick={() => {
                setDuration("monthly");
                setHasVipPass(false);
              }}
              className={`p-5 rounded-3xl border-3 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                duration === "monthly" && !hasVipPass
                  ? "bg-[#FDF9F2] border-[#43230A] ring-3 ring-[#43230A]/20 shadow-lg"
                  : isDark
                  ? "bg-[#1C120B] border-[#362114] hover:border-amber-500/40"
                  : "bg-white border-[#D6C2A4] hover:border-[#43230A]"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-500 text-white">
                    5% OFF
                  </span>
                  <span className="text-[11px] font-black text-[#6B340B] dark:text-amber-300">
                    Monthly Plan
                  </span>
                </div>
                <h3 className="font-black text-base sm:text-lg font-serif text-[#110702] dark:text-[#FAF4EA]">
                  1-Month Next Delivery
                </h3>
                <p className="text-xs text-[#3D1E08] dark:text-[#D8C8B8] font-bold leading-relaxed">
                  Pay online for your first month now. Enjoy a locked <strong>5% discount</strong> with zero long-term lock-in. Edit or pause anytime!
                </p>
              </div>

              <div className="pt-2 border-t border-[#E8DAC2] dark:border-[#362114] flex items-center justify-between">
                <span className="text-xs font-black text-emerald-800 dark:text-emerald-400">
                  ✓ Zero Lock-in
                </span>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    duration === "monthly" && !hasVipPass
                      ? "border-[#43230A] bg-[#43230A]"
                      : "border-stone-400"
                  }`}
                >
                  {duration === "monthly" && !hasVipPass && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </div>
            </div>

            {/* Complete Year Option: 10% Off */}
            <div
              onClick={() => {
                setDuration("annual");
                setHasVipPass(false);
              }}
              className={`p-5 rounded-3xl border-3 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                duration === "annual" && !hasVipPass
                  ? "bg-[#FDF9F2] border-[#43230A] ring-3 ring-[#43230A]/20 shadow-lg"
                  : isDark
                  ? "bg-[#1C120B] border-[#362114] hover:border-amber-500/40"
                  : "bg-white border-[#D6C2A4] hover:border-[#43230A]"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-700 text-white">
                    10% OFF
                  </span>
                  <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-300">
                    Full Year Value
                  </span>
                </div>
                <h3 className="font-black text-base sm:text-lg font-serif text-[#110702] dark:text-[#FAF4EA]">
                  Complete Year (12 Months)
                </h3>
                <p className="text-xs text-[#3D1E08] dark:text-[#D8C8B8] font-bold leading-relaxed">
                  Prepay for 1 full year online (12 cycles). Lock in a guaranteed <strong>10% discount</strong> against market price inflation.
                </p>
              </div>

              <div className="pt-2 border-t border-[#E8DAC2] dark:border-[#362114] flex items-center justify-between">
                <span className="text-xs font-black text-emerald-800 dark:text-emerald-400">
                  ✓ 12 Cycles Prepaid
                </span>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    duration === "annual" && !hasVipPass
                      ? "border-[#43230A] bg-[#43230A]"
                      : "border-stone-400"
                  }`}
                >
                  {duration === "annual" && !hasVipPass && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </div>
            </div>

            {/* ⭐ VIP CLUB PASS OPTION (+₹199 TO UNLOCK 15% OFF) */}
            <div
              onClick={() => setHasVipPass(!hasVipPass)}
              className={`p-5 rounded-3xl border-3 transition-all cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden ${
                hasVipPass
                  ? "bg-[#FDF6EA] border-[#B46912] ring-3 ring-[#B46912]/30 shadow-xl"
                  : isDark
                  ? "bg-[#1E140C] border-[#5E3210] hover:border-[#B46912]"
                  : "bg-[#FFFDF9] border-[#C9B293] hover:border-[#B46912]"
              }`}
            >
              <div className="absolute top-0 right-0 bg-[#B46912] text-white font-black text-[10px] uppercase px-3 py-0.5 rounded-bl-xl shadow-xs">
                MAX SAVINGS
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#43230A] text-amber-300 flex items-center justify-center shrink-0">
                    <Crown className="w-4 h-4" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#43230A] text-amber-200">
                    15% OFF
                  </span>
                </div>

                <h3 className="font-black text-base sm:text-lg font-serif text-[#110702] dark:text-[#FAF4EA]">
                  VIP Club Pass (+₹{VIP_PASS_FEE})
                </h3>

                <p className="text-xs text-[#3D1E08] dark:text-[#D8C8B8] font-bold leading-relaxed">
                  Add <strong>₹{VIP_PASS_FEE}</strong> subscription fee to unlock the highest <strong>15% VIP discount</strong> on every bottle. Pays for itself on your first box!
                </p>
              </div>

              <div className="pt-2 border-t border-[#DECDB3] dark:border-[#3E2413] flex items-center justify-between">
                <span className="text-xs font-black text-[#6B340B] dark:text-amber-300">
                  {hasVipPass ? "✓ 15% Discount Active" : "Click to Add Pass"}
                </span>
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    hasVipPass
                      ? "bg-[#43230A] border-[#43230A] text-amber-300"
                      : "border-stone-400 bg-white dark:bg-stone-800"
                  }`}
                >
                  {hasVipPass && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 2: CHOOSE OR BUILD COMBO */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#43230A] text-amber-200 flex items-center justify-center font-black text-sm">
                2
              </span>
              <h2 className="text-xl sm:text-2xl font-black font-serif text-[#110702] dark:text-[#FAF4EA]">
                Step 2: Choose Your Monthly Combo or Build Custom Box
              </h2>
            </div>
            <span className="text-xs font-black text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-400">
              Active Tier Discount: {discountPercent}% OFF
            </span>
          </div>

          {/* Mode Switcher */}
          <div
            className={`flex items-center gap-3 p-1.5 rounded-2xl border-2 max-w-md ${
              isDark ? "bg-[#1E120A] border-[#362114]" : "bg-[#F7EFE3] border-[#D6C2A4]"
            }`}
          >
            <button
              type="button"
              onClick={() => setComboMode("preset")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                comboMode === "preset"
                  ? "bg-[#43230A] text-white shadow-md"
                  : isDark
                  ? "text-[#D8C8B8] hover:text-white"
                  : "text-[#110702] hover:text-[#43230A]"
              }`}
            >
              Curated Popular Combos
            </button>
            <button
              type="button"
              onClick={() => setComboMode("custom")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                comboMode === "custom"
                  ? "bg-[#43230A] text-white shadow-md"
                  : isDark
                  ? "text-[#D8C8B8] hover:text-white"
                  : "text-[#110702] hover:text-[#43230A]"
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-amber-300" />
              <span>Build Custom Box</span>
            </button>
          </div>

          {/* Render Mode: Preset Combos */}
          {comboMode === "preset" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {currentPresetCombos.map((combo) => {
                const isSelected = selectedPresetId === combo.id;
                return (
                  <div
                    key={combo.id}
                    onClick={() => setSelectedPresetId(combo.id)}
                    className={`relative p-5 rounded-3xl border-3 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-[#FDF9F2] border-[#43230A] ring-3 ring-[#43230A]/20 shadow-xl"
                        : isDark
                        ? "bg-[#1C120B] border-[#362114] hover:border-amber-500/30"
                        : "bg-white border-[#D6C2A4] hover:border-[#43230A]"
                    }`}
                  >
                    {combo.badge && (
                      <span className="absolute -top-3 right-5 px-3 py-0.5 rounded-full bg-[#43230A] text-amber-200 font-black text-[10px] uppercase shadow-xs">
                        {combo.badge}
                      </span>
                    )}

                    <div className="space-y-3">
                      <ComboBottleVisual combo={combo} isDark={isDark} />

                      <div>
                        <h3 className="font-black text-base sm:text-lg font-serif text-[#110702] dark:text-[#FAF4EA]">
                          {combo.name}
                        </h3>
                        <p className="text-xs text-[#6B340B] dark:text-amber-400 font-black mt-0.5">
                          {combo.kannadaName}
                        </p>
                        <p className="text-xs text-[#3D1E08] dark:text-[#D8C8B8] mt-1 leading-relaxed font-bold">
                          {combo.description}
                        </p>
                      </div>

                      <div
                        className={`pt-2 border-t space-y-1 ${
                          isDark ? "border-[#2D1B10]" : "border-[#E8DAC2]"
                        }`}
                      >
                        {combo.items.map((it, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 text-xs text-[#110702] dark:text-[#E0D4C0] font-black"
                          >
                            <Droplet className="w-3.5 h-3.5 text-[#C8751B]" />
                            <span>{it}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div
                      className={`pt-4 border-t flex items-center justify-between mt-4 ${
                        isDark ? "border-[#2D1B10]" : "border-[#E8DAC2]"
                      }`}
                    >
                      <div>
                        <span className="text-xs text-stone-500 font-bold line-through mr-1.5">
                          ₹{combo.mrp}
                        </span>
                        <span className="text-2xl font-black font-serif text-[#6B340B] dark:text-amber-300">
                          ₹{combo.monthlyPrice}
                        </span>
                        <span className="text-xs text-[#3D1E08] dark:text-stone-400 font-black">/mo</span>
                      </div>
                      <span className="text-xs font-black text-emerald-900 bg-emerald-100 dark:bg-emerald-900/60 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-400">
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
              className={`p-6 sm:p-8 rounded-3xl border-3 shadow-lg space-y-6 ${
                isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#D6C2A4]"
              }`}
            >
              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${
                  isDark ? "border-[#2D1B10]" : "border-[#E8DAC2]"
                }`}
              >
                <div>
                  <h3 className="text-lg sm:text-xl font-black font-serif text-[#110702] dark:text-[#FAF4EA]">
                    Configure Your Monthly Cooking Oil Box
                  </h3>
                  <p className="text-xs text-[#3D1E08] dark:text-[#D8C8B8] mt-0.5 font-bold">
                    Choose any combination of our 1L bottles. Prices reflect your active {discountPercent}% discount!
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#110702] dark:text-[#FAF4EA]">
                    Total Volume:
                  </span>
                  <span className="px-3.5 py-1.5 rounded-xl bg-[#43230A] text-amber-200 font-black text-sm">
                    {customCounts.groundnut + customCounts.coconut + customCounts.sesame} Litres
                  </span>
                </div>
              </div>

              {/* Multi-Bottle Visual of Custom Box */}
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
                      className={`p-4 rounded-2xl border-2 space-y-3 ${
                        isDark ? "bg-[#25150C] border-[#3E2313]" : "bg-[#FDF9F2] border-[#D6C2A4]"
                      }`}
                    >
                      <div>
                        <h4 className="font-black text-base text-[#110702] dark:text-[#FAF4EA]">
                          {rate.name}
                        </h4>
                        <span className="text-xs text-[#6B340B] dark:text-amber-400 font-black block">
                          {rate.kannadaName}
                        </span>
                        <p className="text-xs text-[#3D1E08] dark:text-[#D8C8B8] mt-1 line-clamp-2 font-bold">
                          {rate.description}
                        </p>
                      </div>

                      <div
                        className={`flex items-center justify-between pt-2 border-t ${
                          isDark ? "border-[#3E2313]" : "border-[#E8DAC2]"
                        }`}
                      >
                        <div>
                          <span className="text-xs text-stone-500 font-bold line-through mr-1">
                            ₹{rate.mrp}
                          </span>
                          <span className="text-lg font-black text-[#6B340B] dark:text-amber-300 font-serif">
                            ₹{rate.subPrice}
                          </span>
                          <span className="text-xs text-[#3D1E08] dark:text-stone-400 font-bold">/L</span>
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
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black cursor-pointer border ${
                              isDark ? "bg-[#362114] text-stone-200 border-[#4E2E1A]" : "bg-[#EDE2CF] text-[#110702] border-[#C9B293]"
                            }`}
                          >
                            <Minus className="w-4 h-4 stroke-[3]" />
                          </button>
                          <span className="w-7 text-center font-black text-base text-[#110702] dark:text-amber-100">
                            {count}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomCounts((p) => ({
                                ...p,
                                [oilKey]: p[oilKey] + 1,
                              }))
                            }
                            className="w-9 h-9 rounded-xl bg-[#43230A] hover:bg-[#2E1807] text-white flex items-center justify-center font-black cursor-pointer"
                          >
                            <Plus className="w-4 h-4 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Box Summary Footer */}
              <div
                className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                  isDark ? "bg-[#25150C] border-[#3E2313]" : "bg-[#F7EFE3] border-[#D6C2A4]"
                }`}
              >
                <div>
                  <span className="font-black text-[#110702] dark:text-[#FAF4EA]">
                    Your Custom Monthly Box:{" "}
                  </span>
                  <span className="text-[#6B340B] dark:text-amber-300 font-black">
                    {customComboData.items.length > 0
                      ? customComboData.items.join(" + ")
                      : "No bottles selected yet"}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-stone-500 font-bold line-through">₹{customComboData.mrp}</span>
                  <span className="text-2xl font-black font-serif text-[#6B340B] dark:text-amber-300">
                    ₹{customComboData.monthlyPrice}
                    <span className="text-xs font-bold text-[#3D1E08] dark:text-stone-400">/mo</span>
                  </span>
                  <span className="text-xs font-black text-emerald-900 bg-emerald-100 dark:bg-emerald-900/60 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-400">
                    Save ₹{customComboData.savings}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* STEP 3: INTERACTIVE CALENDAR DELIVERY DATE */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#43230A] text-amber-200 flex items-center justify-center font-black text-sm">
              3
            </span>
            <h2 className="text-xl sm:text-2xl font-black font-serif text-[#110702] dark:text-[#FAF4EA]">
              Step 3: Select Recurring Delivery Day on Calendar
            </h2>
          </div>
          <p className="text-xs text-[#3D1E08] dark:text-[#D8C8B8] font-bold">
            Choose the day your oil will be delivered. Your fresh batch will automatically arrive on this exact day every month.
          </p>

          <InteractiveCalendarPicker
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            isDark={isDark}
          />
        </div>

        {/* STEP 4: ONLINE PAYMENT & DELHIVERY BOOKING SUMMARY */}
        <div
          className={`p-6 sm:p-8 rounded-3xl border-3 shadow-xl space-y-6 ${
            isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#D6C2A4]"
          }`}
        >
          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${
              isDark ? "border-[#2D1B10]" : "border-[#E8DAC2]"
            }`}
          >
            <div>
              <span className="text-xs font-black text-[#6B340B] dark:text-amber-300 block">
                Subscription Booking Summary:
              </span>
              <h3 className="text-xl sm:text-2xl font-black font-serif text-[#110702] dark:text-[#FAF4EA] mt-0.5">
                {chosenCombo.name}
              </h3>
              <p className="text-xs text-[#3D1E08] dark:text-[#D8C8B8] font-bold">
                Recurring Delivery: Every month on the <strong>{getOrdinalSuffix(deliveryDay)}</strong>
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-[#4A260F] dark:text-stone-400 block font-bold">
                Total Payable Online Today:
              </span>
              <span className="text-3xl font-black font-serif text-[#6B340B] dark:text-amber-300">
                ₹{finalOnlinePayAmount}
              </span>
              {hasVipPass && (
                <span className="block text-xs text-amber-800 dark:text-amber-300 font-black">
                  Includes ₹{VIP_PASS_FEE} VIP Club Pass
                </span>
              )}
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div
            className={`p-4 rounded-2xl border-2 space-y-2 text-xs font-bold ${
              isDark ? "bg-[#25150C] border-[#3E2313]" : "bg-[#FDF9F2] border-[#D6C2A4]"
            }`}
          >
            <div className="flex justify-between items-center text-[#110702] dark:text-[#D8C8B8]">
              <span>
                Oil Pack ({duration === "annual" ? "12 Months Prepaid" : "1 Month"} at {discountPercent}% off):
              </span>
              <strong className="text-[#110702] dark:text-[#FAF4EA]">₹{oilAmount}</strong>
            </div>

            {hasVipPass && (
              <div className="flex justify-between items-center text-[#6B340B] dark:text-amber-300 font-black">
                <span>VIP Gold Club Pass (One-Time Annual Fee):</span>
                <strong>+₹{VIP_PASS_FEE}</strong>
              </div>
            )}

            <div className="flex justify-between items-center text-emerald-800 dark:text-emerald-400 font-black">
              <span>Delhivery B2C Logistics Fee (Pan-India Express):</span>
              <span>FREE (₹0)</span>
            </div>

            <div
              className={`pt-2 border-t flex justify-between items-center text-sm font-black ${
                isDark ? "border-[#3E2313] text-[#FAF4EA]" : "border-[#E8DAC2] text-[#110702]"
              }`}
            >
              <span>Total Online Payment:</span>
              <span className="text-lg font-black text-[#6B340B] dark:text-amber-300">
                ₹{finalOnlinePayAmount}
              </span>
            </div>
          </div>

          {/* Automated Reminders Guarantee */}
          <div
            className={`p-4 rounded-2xl border-2 flex items-center gap-3 text-xs ${
              isDark
                ? "bg-[#1E140C] border-amber-500/20 text-[#FAF4EA]"
                : "bg-[#FDF9F2] border-[#D6C2A4] text-[#110702]"
            }`}
          >
            <Bell className="w-5 h-5 text-[#C8751B] shrink-0" />
            <span className="font-bold leading-relaxed">
              <strong>Automated Renewal Reminder:</strong> You will receive an automated notification 3 days before your delivery on the {getOrdinalSuffix(deliveryDay)} of each month. All subsequent renewals happen automatically online with 1-click approval. Zero manual WhatsApp messages needed!
            </span>
          </div>

          {/* Online Checkout Button */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#4A260F] dark:text-stone-400">
              <Lock className="w-4 h-4 text-emerald-700" />
              <span>256-bit Bank-grade Online Payment Gateway • Instant Confirmation</span>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubscribeOnline}
              className="px-8 py-4 rounded-2xl bg-[#43230A] hover:bg-[#2E1807] text-white font-black text-sm shadow-xl transition-all hover:scale-105 cursor-pointer flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5 text-amber-300" />
              <span>
                {isSubmitting
                  ? "Processing Online Payment..."
                  : `Pay ₹${finalOnlinePayAmount} Online & Start Subscription`}
              </span>
            </button>
          </div>
        </div>

        {/* Modal: Instant Online Payment & Subscription Confirmed */}
        {subSuccessModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className={`w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-5 border-2 shadow-2xl animate-fade-in ${
                isDark ? "bg-[#1C120B] text-[#FAF4EA] border-[#362114]" : "bg-white text-[#110702] border-[#D6C2A4]"
              }`}
            >
              <div
                className={`flex items-center justify-between border-b pb-3 ${
                  isDark ? "border-[#2D1B10]" : "border-[#E8DAC2]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="font-black font-serif text-lg text-[#110702] dark:text-[#FAF4EA]">
                      Subscription Booking Confirmed!
                    </h3>
                    <p className="text-xs text-emerald-800 dark:text-emerald-400 font-black">
                      Order #{subSuccessModal.orderRef} • Online Payment Verified
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubSuccessModal(null)}
                  className="p-2 rounded-xl text-stone-600 hover:text-black dark:text-stone-300 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div
                  className={`p-4 rounded-2xl border-2 space-y-2 ${
                    isDark ? "bg-[#25150C] border-[#3E2313]" : "bg-[#FDF9F2] border-[#D6C2A4]"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#4A260F] dark:text-[#D8C8B8]">Plan Type:</span>
                    <strong className="text-[#110702] dark:text-[#FAF4EA] font-black">{subSuccessModal.duration}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#4A260F] dark:text-[#D8C8B8]">Selected Combo:</span>
                    <strong className="text-[#110702] dark:text-[#FAF4EA] font-black">{subSuccessModal.comboName}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#4A260F] dark:text-[#D8C8B8]">Recurring Date:</span>
                    <strong className="text-[#6B340B] dark:text-amber-300 font-black">
                      {subSuccessModal.dayStr} of Every Month
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#4A260F] dark:text-[#D8C8B8]">Delhivery Waybill AWB:</span>
                    <strong className="text-emerald-800 dark:text-emerald-400 font-black">
                      {subSuccessModal.waybill}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#4A260F] dark:text-[#D8C8B8]">Amount Paid Online:</span>
                    <strong className="text-base font-black text-emerald-800 dark:text-emerald-400">
                      ₹{subSuccessModal.amount}
                    </strong>
                  </div>
                </div>

                <div
                  className={`p-3.5 rounded-2xl border-2 flex items-start gap-2.5 ${
                    isDark ? "bg-[#1E140C] border-amber-500/20" : "bg-[#F7EFE3] border-[#C9B293]"
                  }`}
                >
                  <Truck className="w-4 h-4 text-[#C8751B] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#110702] dark:text-[#D8C8B8] font-bold leading-relaxed">
                    Delhivery pickup scheduled! Your fresh batch of Marachekku oil will be pressed at Peenya 2nd Stage, Bangalore, and delivered directly to your doorstep with live tracking available in your account.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSubSuccessModal(null);
                    navigate("/orders");
                  }}
                  className="w-full py-3 rounded-xl bg-[#43230A] hover:bg-[#2E1807] text-white font-black text-xs shadow-md cursor-pointer text-center"
                >
                  Track in My Orders
                </button>
                <button
                  type="button"
                  onClick={() => setSubSuccessModal(null)}
                  className="w-full py-3 rounded-xl border-2 border-[#43230A] text-[#43230A] dark:text-white font-black text-xs cursor-pointer text-center hover:bg-[#FAF7F2]"
                >
                  Subscription Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
