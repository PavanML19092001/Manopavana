import React, { useState, useEffect } from "react";
import { QrCode, X, Sparkles, AlertTriangle, ShieldCheck, HelpCircle, Clock, Lock } from "lucide-react";
import confetti from "canvas-confetti";
import { useStore } from "../context/StoreContext";
import { MEDIA_ASSETS, PRODUCTS } from "../constants";

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000; // 48 hours (2 days)

interface AttemptData {
  attemptsLeft: number;
  lockedUntil: number | null;
}

export const LoyaltyQuizModal: React.FC = () => {
  const {
    isQuizModalOpen,
    closeLoyaltyQuiz,
    quizProduct,
    activateLoyalty,
    loyalty,
    loyaltyRemainingText,
  } = useStore();

  const initialOil: "groundnut" | "coconut" | "sesame" =
    quizProduct?.id === "coconut" || quizProduct?.id === "sesame"
      ? quizProduct.id
      : "groundnut";

  const [activeTabOil, setActiveTabOil] = useState<"groundnut" | "coconut" | "sesame">(initialOil);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  // Track 2 chances and 2-day cooldown
  const [attemptData, setAttemptData] = useState<AttemptData>(() => {
    try {
      const raw = localStorage.getItem("manopavana_loyalty_attempts");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.lockedUntil) {
          if (Date.now() >= parsed.lockedUntil) {
            // 2 days have elapsed! Re-enable again with 2 chances
            const fresh: AttemptData = { attemptsLeft: 2, lockedUntil: null };
            localStorage.setItem("manopavana_loyalty_attempts", JSON.stringify(fresh));
            return fresh;
          } else {
            return {
              attemptsLeft: 0,
              lockedUntil: parsed.lockedUntil,
            };
          }
        }
        return {
          attemptsLeft: typeof parsed.attemptsLeft === "number" ? parsed.attemptsLeft : 2,
          lockedUntil: null,
        };
      }
    } catch {
      // fallback
    }
    return { attemptsLeft: 2, lockedUntil: null };
  });

  const [timeRemainingText, setTimeRemainingText] = useState("");
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Live timer for 2-day cooldown
  useEffect(() => {
    if (!attemptData.lockedUntil) {
      setTimeRemainingText("");
      return;
    }

    const checkLockout = () => {
      if (!attemptData.lockedUntil) return;
      const diff = attemptData.lockedUntil - Date.now();
      if (diff <= 0) {
        // Cooldown completed: re-enable and restore 2 chances
        const restored: AttemptData = { attemptsLeft: 2, lockedUntil: null };
        setAttemptData(restored);
        setTimeRemainingText("");
        setErrorFeedback(null);
        try {
          localStorage.setItem("manopavana_loyalty_attempts", JSON.stringify(restored));
        } catch {}
      } else {
        const totalMinutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        if (hours >= 24) {
          const days = Math.floor(hours / 24);
          const remHours = hours % 24;
          setTimeRemainingText(`${days}d ${remHours}h ${minutes}m`);
        } else {
          setTimeRemainingText(`${hours}h ${minutes}m ${seconds}s`);
        }
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, [attemptData.lockedUntil]);

  if (!isQuizModalOpen) return null;

  const isLocked = Boolean(attemptData.lockedUntil && attemptData.lockedUntil > Date.now());
  const attemptsLeft = isLocked ? 0 : attemptData.attemptsLeft;

  const currentProduct = PRODUCTS.find((p) => p.id === activeTabOil) || PRODUCTS[0];
  const { quiz } = currentProduct;

  const handleSelectOption = (opt: string) => {
    if (isLocked || attemptsLeft <= 0 || isSuccess) return;
    setSelectedOption(opt);
    setErrorFeedback(null);
  };

  const handleVerify = () => {
    if (isLocked || attemptsLeft <= 0) return;

    if (!selectedOption) {
      setErrorFeedback("Please select an answer from the options below.");
      return;
    }

    if (selectedOption === quiz.correctAnswer) {
      setIsSuccess(true);
      setErrorFeedback(null);
      activateLoyalty(currentProduct.id);

      // Reset attempts to 2 on success
      const successState: AttemptData = { attemptsLeft: 2, lockedUntil: null };
      setAttemptData(successState);
      try {
        localStorage.setItem("manopavana_loyalty_attempts", JSON.stringify(successState));
      } catch {}

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#E0B04A", "#F5B853", "#1F3D2B", "#2E7D32"],
      });

      setTimeout(() => {
        closeLoyaltyQuiz();
        setIsSuccess(false);
      }, 2600);
    } else {
      const nextAttempts = attemptsLeft - 1;
      if (nextAttempts > 0) {
        const nextState: AttemptData = { attemptsLeft: nextAttempts, lockedUntil: null };
        setAttemptData(nextState);
        try {
          localStorage.setItem("manopavana_loyalty_attempts", JSON.stringify(nextState));
        } catch {}
        setErrorFeedback(
          `Incorrect label phrase. Look at the text printed directly under the oil name on your bottle. (${nextAttempts} attempt remaining)`
        );
      } else {
        // 2 chances are over: Lock for 2 days
        const lockUntil = Date.now() + TWO_DAYS_MS;
        const lockedState: AttemptData = { attemptsLeft: 0, lockedUntil: lockUntil };
        setAttemptData(lockedState);
        try {
          localStorage.setItem("manopavana_loyalty_attempts", JSON.stringify(lockedState));
        } catch {}
        setErrorFeedback(
          "2 chances have been used. Verification will be enabled again after 2 days (48 hours), and 2 fresh chances will be given."
        );
      }
    }
  };

  const handleResetForOil = (oilId: "groundnut" | "coconut" | "sesame") => {
    setActiveTabOil(oilId);
    setSelectedOption(null);
    if (!isLocked) {
      setErrorFeedback(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-xl bg-gradient-to-b from-[#24160F] to-[#14291D] text-[#FAF3E0] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] border border-[#2D5A3F] overflow-hidden flex flex-col max-h-[92vh] animate-modal-pop">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-[#14291D] border-b border-[#1F3D2B]">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-[#E0B04A]/20 text-[#F3D17A]">
              <QrCode className="w-5 h-5 text-[#F3D17A]" />
            </span>
            <div>
              <h2 id="quiz-modal-title" className="text-lg font-bold font-serif text-[#F3D17A]">
                Bottle QR Loyalty Verification
              </h2>
              <p className="text-xs text-[#3F4F45]">
                Returning customer? Verify your bottle for an instant 10% discount for 7 days
              </p>
            </div>
          </div>
          <button
            onClick={closeLoyaltyQuiz}
            aria-label="Close bottle QR loyalty verification modal"
            className="p-2 text-[#3F4F45] hover:text-[#FAF3E0] hover:bg-[#2C1D14] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-5">
          {/* Active status banner */}
          {loyalty.isActive && (
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-200">
                    10% Loyalty Discount Already Active!
                  </p>
                  <p className="text-[11px] text-emerald-300/80">
                    Valid for all products: {loyaltyRemainingText}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-emerald-600 text-white rounded-lg">
                Applied
              </span>
            </div>
          )}

          {/* 3 Step Visual Explainer (ENLARGED HIGH-VISIBILITY IMAGES) */}
          <div className="grid grid-cols-3 gap-3 p-3.5 bg-[#14291D] rounded-2xl border border-[#1F3D2B]">
            <div className="flex flex-col items-center text-center p-2 rounded-xl bg-[#1F3D2B]/60 border border-[#1F3D2B]/50">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-md border-2 border-[#5A3820] bg-[#120904] flex items-center justify-center p-1 mb-2">
                <img
                  src={MEDIA_ASSETS.loyaltySteps.step1}
                  alt="Step 1: Check your bottle QR"
                  className="w-full h-full object-contain hover:scale-105 transition-transform"
                />
              </div>
              <span className="text-xs font-bold text-[#FAF3E0]">1. Check Bottle</span>
              <span className="text-[10px] text-[#3F4F45]">Locate front label</span>
            </div>
            <div className="flex flex-col items-center text-center p-2 rounded-xl bg-[#1F3D2B]/60 border border-[#1F3D2B]/50">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-md border-2 border-[#5A3820] bg-[#120904] flex items-center justify-center p-1 mb-2">
                <img
                  src={MEDIA_ASSETS.loyaltySteps.step2}
                  alt="Step 2: Scan QR"
                  className="w-full h-full object-contain hover:scale-105 transition-transform"
                />
              </div>
              <span className="text-xs font-bold text-[#FAF3E0]">2. Scan QR</span>
              <span className="text-[10px] text-[#3F4F45]">Scan label QR code</span>
            </div>
            <div className="flex flex-col items-center text-center p-2 rounded-xl bg-[#1F3D2B]/60 border border-[#1F3D2B]/50">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-md border-2 border-[#5A3820] bg-[#120904] flex items-center justify-center p-1 mb-2">
                <img
                  src={MEDIA_ASSETS.loyaltySteps.step3}
                  alt="Step 3: Enjoy 10% off"
                  className="w-full h-full object-contain hover:scale-105 transition-transform"
                />
              </div>
              <span className="text-xs font-bold text-[#FAF3E0]">3. 10% Off 7 Days</span>
              <span className="text-[10px] text-[#3F4F45]">Auto-applied at cart</span>
            </div>
          </div>

          {/* 2-Day Lockout Notice when 2 attempts exhausted */}
          {isLocked && (
            <div className="p-4 bg-amber-950/40 border border-amber-600/50 rounded-2xl text-amber-200 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <Clock className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-amber-300">
                    2 Chances Used • Re-enables in {timeRemainingText}
                  </h4>
                  <p className="text-[11px] text-amber-200/80">
                    Your 2 chances to claim the 10% loyalty discount have been used. Verification will automatically be re-enabled after 2 days (48 hours) and 2 new chances will be granted.
                  </p>
                </div>
              </div>
              <div className="pt-1 flex items-center justify-between text-[10px] text-amber-300/70 border-t border-amber-800/40">
                <span>Cooldown duration: 48 Hours</span>
                <span className="text-amber-400 font-medium">Automatic re-activation</span>
              </div>
            </div>
          )}

          {/* Oil Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-[#E0B04A] mb-2">
              Select the bottle you are verifying:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRODUCTS.filter((prod) => prod.id === "groundnut" || prod.id === "coconut" || prod.id === "sesame").map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => handleResetForOil(prod.id as "groundnut" | "coconut" | "sesame")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    activeTabOil === prod.id
                      ? "bg-gradient-to-r from-[#E0B04A] to-[#B87C24] text-[#14291D] border-[#F3D17A] font-bold shadow-md"
                      : "bg-[#14291D] text-[#E0B04A] border-[#2D5A3F] hover:border-[#E0B04A]"
                  }`}
                >
                  <span className="truncate max-w-full">
                    {prod.id === "groundnut" ? "Groundnut" : prod.id === "coconut" ? "Coconut" : "Sesame"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Question Box */}
          <div className="p-4 bg-[#14291D] rounded-2xl border border-[#2D5A3F] space-y-3">
            <div className="flex items-start gap-2.5">
              <HelpCircle className="w-5 h-5 text-[#F3D17A] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#F3D17A]">
                  Security Verification Question:
                </p>
                <p className="text-xs text-[#E0B04A] font-medium mt-0.5">
                  {quiz.question}
                </p>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2 pt-1">
              {quiz.options.map((opt, idx) => {
                const isSelected = selectedOption === opt;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isLocked || attemptsLeft <= 0 || isSuccess}
                    onClick={() => handleSelectOption(opt)}
                    className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-between cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      isSelected
                        ? "bg-[#14291D] border-[#E0B04A] text-[#F3D17A] ring-1 ring-[#E0B04A]"
                        : "bg-[#14291D] border-[#1F3D2B] text-[#E0B04A] hover:border-[#5C3C26]"
                    }`}
                  >
                    <span>{opt}</span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-2 ${
                        isSelected
                          ? "border-[#E0B04A] bg-[#E0B04A]"
                          : "border-[#2D5A3F] bg-[#14291D]"
                      }`}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#14291D]" />}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Feedback / Error */}
            {errorFeedback && (
              <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-800/40 rounded-xl text-red-200 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span>{errorFeedback}</span>
              </div>
            )}

            {isSuccess && (
              <div className="flex items-start gap-2 p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-emerald-200 text-xs">
                <Sparkles className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5 animate-spin" />
                <span className="font-bold">
                  Verified successfully! 10% Loyalty discount activated for the next 7 days.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#14291D] border-t border-[#1F3D2B]">
          {isLocked ? (
            <span className="text-[11px] text-amber-300 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Re-enables in <strong>{timeRemainingText}</strong> (2 fresh chances)</span>
            </span>
          ) : (
            <span className="text-[11px] text-[#3F4F45]">
              Chances remaining: <strong className="text-[#F3D17A]">{attemptsLeft} / 2</strong>
            </span>
          )}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={closeLoyaltyQuiz}
              className="px-4 py-2 text-xs font-medium text-[#3F4F45] hover:text-[#FAF3E0] rounded-xl cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              disabled={isLocked || attemptsLeft <= 0 || isSuccess}
              onClick={handleVerify}
              className="px-5 py-2.5 text-xs font-bold font-serif uppercase tracking-wider text-[#14291D] bg-gradient-to-r from-[#E0B04A] via-[#F3D17A] to-[#BF7E16] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-[0_4px_20px_rgba(212,154,55,0.35)] border border-[#F3D17A] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-[#14291D]" />
                  <span>Locked (48h)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#14291D]" />
                  <span>Verify & Unlock 10%</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
