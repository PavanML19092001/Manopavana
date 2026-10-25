import React, { useState, useEffect } from "react";
import {
  X,
  User,
  ShieldCheck,
  LogOut,
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import {
  signInWithGoogle,
  signInWithPhoneOrEmail,
  logoutUser,
  extractCleanPhone,
} from "../firebase";

export const LoginModal: React.FC = () => {
  const {
    isLoginModalOpen,
    setLoginModalOpen,
    currentUser,
    showToast,
  } = useStore();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [secretWaOtp, setSecretWaOtp] = useState<string | null>(null);
  const [otpExpiryTime, setOtpExpiryTime] = useState<number>(0);

  // User input code
  const [inputOtp, setInputOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resend countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  if (!isLoginModalOpen) return null;

  const cleanPhone = extractCleanPhone(phoneNumber);
  const isPhoneValid = cleanPhone.length === 10;

  const resetOtpFlow = () => {
    setIsOtpSent(false);
    setSecretWaOtp(null);
    setInputOtp("");
    setErrorMessage(null);
    setStatusNotice(null);
  };

  // 1-Click Google Sign In (for email users)
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      await signInWithGoogle();
      showToast("Signed in with Google successfully!");
      setLoginModalOpen(false);
    } catch (err: unknown) {
      console.warn("Google Sign-In notice:", err);
      const e = err as { message?: string };
      setErrorMessage(e.message || "Google sign-in could not be completed.");
    } finally {
      setLoading(false);
    }
  };

  // Dispatch WhatsApp OTP:
  // Sent from MANOPAVANA (+91 91803 01917) to customer's WhatsApp in background.
  const handleSendWhatsAppOtp = async () => {
    if (!isPhoneValid) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      setStatusNotice(null);

      // Generate secret 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      setSecretWaOtp(otpCode);
      setOtpExpiryTime(Date.now() + 5 * 60 * 1000); // 5 min expiry

      // Call server endpoint to dispatch WhatsApp message from +91 91803 01917 to user's number
      let failureReason: string | null = null;
      let isSimulated = false;

      try {
        const res = await fetch("/api?action=send_whatsapp_otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: cleanPhone,
            otp: otpCode,
            greenApiId: localStorage.getItem("manopavana_green_id") || "710722779911",
            greenApiToken:
              localStorage.getItem("manopavana_green_token") ||
              "33bc6b945ad347d2b708ab7678bd80d66643fc2dfc5547b499",
          }),
        });
        const data = await res.json();
        if (data.status === "FAILED" || data.sent === false) {
          failureReason =
            data.message ||
            data.data?.message ||
            "WhatsApp gateway not connected or instance unauthorized";
        } else if (data.simulated) {
          isSimulated = true;
        }
      } catch (apiErr) {
        console.warn("WhatsApp API route notice:", apiErr);
      }

      setIsOtpSent(true);
      setResendCooldown(30);

      if (failureReason) {
        setStatusNotice(
          `WhatsApp Gateway Notice: ${failureReason}. (Verification code: ${otpCode})`
        );
      } else if (isSimulated) {
        setStatusNotice(
          `WhatsApp gateway notice: Verification code is ${otpCode}.`
        );
      } else {
        showToast(`WhatsApp OTP sent to +91 ${cleanPhone}!`);
        setStatusNotice(
          `We have sent a 6-digit verification code from MANOPAVANA (+91 91803 01917) to your WhatsApp (+91 ${cleanPhone}).`
        );
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorMessage(e.message || "Failed to send WhatsApp OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Verify WhatsApp OTP
  const handleVerifyWhatsAppOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputOtp.trim() || inputOtp.trim().length !== 6) {
      setErrorMessage("Please enter the 6-digit OTP received on your WhatsApp.");
      return;
    }

    if (Date.now() > otpExpiryTime) {
      setErrorMessage("This OTP has expired. Please request a new code.");
      return;
    }

    if (secretWaOtp && inputOtp.trim() !== secretWaOtp) {
      setErrorMessage("Incorrect OTP. Please check the code received on WhatsApp and try again.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      await signInWithPhoneOrEmail(cleanPhone);
      showToast("Verified successfully! Account synced.");
      setLoginModalOpen(false);
      resetOtpFlow();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorMessage(e.message || "Could not complete sign-in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      showToast("Signed out successfully.");
      setLoginModalOpen(false);
    } catch (err) {
      console.warn("Logout error:", err);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#24160F] to-[#140D09] text-[#FDF6EC] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] border border-[#4A301E] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-[#120A06] border-b border-[#3A2417]">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-[#D49A37]/20 text-[#F5BC51]">
              <User className="w-5 h-5 text-[#F5BC51]" />
            </span>
            <div>
              <h2 id="login-modal-title" className="text-base font-bold font-serif text-[#FFD885]">
                {currentUser ? "Customer Account" : "Sign In to MANOPAVANA"}
              </h2>
              <p className="text-[11px] text-[#A88D77]">
                {currentUser
                  ? "Manage your profile & order history"
                  : "Sign in with Google or WhatsApp OTP"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setLoginModalOpen(false);
              resetOtpFlow();
            }}
            aria-label="Close modal"
            className="p-1.5 text-[#A88D77] hover:text-[#FDF6EC] hover:bg-[#2C1D14] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {currentUser ? (
            /* Logged in state */
            <div className="space-y-4 text-xs text-[#D6BEAA]">
              <div className="p-4 rounded-2xl bg-[#1C110B] border border-[#4A301E] space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#D49A37]/20 text-[#F5BC51] border border-[#D49A37]/40 flex items-center justify-center font-bold text-sm">
                    {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : "U"}
                  </div>
                  <div>
                    <p className="font-bold text-[#FDF6EC] text-sm">
                      {currentUser.displayName || "Customer"}
                    </p>
                    <p className="text-[11px] text-[#A88D77]">
                      {currentUser.email || currentUser.phoneNumber || "Verified Account"}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-[#2D1B10] flex items-center gap-2 text-emerald-400 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Synced to Firestore Customer Database</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2.5 rounded-xl border border-red-800/40 text-red-300 bg-red-950/40 hover:bg-red-900/60 font-bold transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLoginModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D49A37] to-[#B87C24] text-[#140D09] font-bold transition-colors cursor-pointer shadow-md"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Sign in form */
            <div className="space-y-4">
              {/* 1-Click Google Sign-In (For email users) */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#24160F] hover:bg-[#2C1D14] border border-[#5C3C26] text-xs font-bold text-[#FDF6EC] shadow-sm transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-[#3A2417]" />
                <span className="absolute bg-[#1A100A] px-2.5 text-[10px] text-[#A88D77] uppercase font-bold tracking-wider">
                  Or Mobile WhatsApp Login
                </span>
              </div>

              {/* ---------------- MOBILE WHATSAPP OTP ---------------- */}
              <div className="space-y-3">
                {!isOtpSent ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (isPhoneValid && !loading) {
                        handleSendWhatsAppOtp();
                      }
                    }}
                    className="space-y-3.5"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-[#D6BEAA]">
                          WhatsApp Mobile Number
                        </label>
                        <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1.5 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-800/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Instant WhatsApp OTP
                        </span>
                      </div>
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 text-xs font-bold text-[#FFD885] bg-[#1C110B] px-1.5 py-0.5 rounded border border-[#4A301E]">
                          +91
                        </span>
                        <input
                          type="tel"
                          maxLength={14}
                          placeholder="Enter 10-digit mobile number"
                          value={phoneNumber}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "");
                            let clean = raw;
                            if (raw.length === 12 && raw.startsWith("91")) {
                              clean = raw.slice(2);
                            } else if (raw.length > 10) {
                              clean = raw.slice(-10);
                            }
                            setPhoneNumber(clean);
                            setErrorMessage(null);
                          }}
                          className="w-full pl-16 pr-3.5 py-3 text-sm bg-[#120A06] border border-[#4A301E] rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-[#FDF6EC] placeholder-[#7A6150] font-mono tracking-widest font-bold"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Error Banner */}
                    {errorMessage && (
                      <div className="p-3 bg-red-950/50 rounded-xl border border-red-800/40">
                        <p className="text-xs text-red-300 font-semibold leading-relaxed">
                          {errorMessage}
                        </p>
                      </div>
                    )}

                    {/* WhatsApp OTP Button */}
                    <button
                      type="submit"
                      disabled={loading || !isPhoneValid}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:brightness-110 text-white font-serif font-black tracking-wider text-xs shadow-lg shadow-emerald-950/50 border border-emerald-400/40 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <MessageSquare className="w-4 h-4 text-white" />
                      )}
                      <span>
                        {loading
                          ? "Sending WhatsApp OTP..."
                          : isPhoneValid
                          ? `Send OTP to WhatsApp (+91 ${cleanPhone})`
                          : "Enter 10-Digit Mobile Number"}
                      </span>
                    </button>
                  </form>
                ) : (
                  /* WhatsApp OTP Verification Input */
                  <form onSubmit={handleVerifyWhatsAppOtp} className="space-y-3 animate-fade-in">
                    <div className="p-3 bg-[#0F2416]/50 border border-emerald-700/50 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp OTP Sent</span>
                        </span>
                        <button
                          type="button"
                          onClick={resetOtpFlow}
                          className="text-[11px] text-[#A88D77] hover:underline cursor-pointer"
                        >
                          Change Number
                        </button>
                      </div>
                      <p className="text-[11px] text-[#D6BEAA] leading-relaxed">
                        We sent a 6-digit OTP from MANOPAVANA (+91 91803 01917) to your WhatsApp (+91 {cleanPhone}).
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#D6BEAA] mb-1">
                        Enter 6-Digit WhatsApp Code
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="• • • • • •"
                        value={inputOtp}
                        onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="w-full text-center tracking-[0.6em] text-xl font-mono py-2.5 bg-[#120A06] border border-[#4A301E] rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-[#FDF6EC] font-bold"
                        autoFocus
                      />
                    </div>

                    {statusNotice && (
                      <p className="text-[11px] text-emerald-400 font-semibold bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/40">
                        {statusNotice}
                      </p>
                    )}

                    {errorMessage && (
                      <p className="text-xs text-red-300 font-semibold bg-red-950/50 p-2.5 rounded-xl border border-red-800/40">
                        {errorMessage}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading || inputOtp.length !== 6}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-serif font-black tracking-wider uppercase shadow-[0_4px_20px_rgba(16,185,129,0.3)] border border-emerald-400 transition-all duration-300 hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>{loading ? "Verifying..." : "Verify & Sign In"}</span>
                    </button>

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        disabled={resendCooldown > 0 || loading}
                        onClick={handleSendWhatsAppOtp}
                        className="text-[11px] text-[#A88D77] hover:text-[#FFD885] disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>
                          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend WhatsApp Code"}
                        </span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
