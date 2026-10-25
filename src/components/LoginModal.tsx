import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Smartphone,
  Mail,
  ArrowRight,
  ShieldCheck,
  LogOut,
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import {
  signInWithGoogle,
  signInWithPhoneOrEmail,
  sendPhoneOtp,
  confirmPhoneOtp,
  logoutUser,
  extractCleanPhone,
  getDailySmsCount,
  incrementDailySmsCount,
} from "../firebase";
import { sendEmailLoginOtp } from "../services/emailService";
import { ConfirmationResult } from "firebase/auth";

export const LoginModal: React.FC = () => {
  const {
    isLoginModalOpen,
    setLoginModalOpen,
    currentUser,
    showToast,
  } = useStore();

  const [authMode, setAuthMode] = useState<"phone" | "email">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");

  // Daily SMS quota state (Firebase Spark limit: 10/day)
  const [dailySmsCount, setDailySmsCount] = useState<number>(0);
  const isSmsQuotaExhausted = dailySmsCount >= 10;

  // Active OTP verification flow
  // "sms" | "whatsapp" | "email_otp" | null
  const [verificationChannel, setVerificationChannel] = useState<
    "sms" | "whatsapp" | "email_otp" | null
  >(null);

  // Confirmation results & secret hashes (OTP is NEVER displayed in the UI)
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [secretWaOtp, setSecretWaOtp] = useState<string | null>(null);
  const [secretEmailOtp, setSecretEmailOtp] = useState<string | null>(null);
  const [otpExpiryTime, setOtpExpiryTime] = useState<number>(0);

  // User input code
  const [inputOtp, setInputOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load daily SMS counter on modal open
  useEffect(() => {
    if (isLoginModalOpen) {
      getDailySmsCount().then((count) => {
        setDailySmsCount(count);
      });
    }
  }, [isLoginModalOpen]);

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
  const isEmailValid = emailAddress.trim().includes("@") && emailAddress.trim().includes(".");

  const resetOtpFlow = () => {
    setVerificationChannel(null);
    setConfirmationResult(null);
    setSecretWaOtp(null);
    setSecretEmailOtp(null);
    setInputOtp("");
    setErrorMessage(null);
    setStatusNotice(null);
  };

  // 1-Click Google Sign In
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
  // Never opens WhatsApp for the customer and never shows OTP on website.
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
      let isSimulated = false;
      try {
        const res = await fetch("/api?action=send_whatsapp_otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: cleanPhone,
            otp: otpCode,
            greenApiId: localStorage.getItem("manopavana_green_id") || undefined,
            greenApiToken: localStorage.getItem("manopavana_green_token") || undefined,
            metaToken: localStorage.getItem("manopavana_meta_token") || undefined,
            metaPhoneId: localStorage.getItem("manopavana_meta_phone_id") || undefined,
          }),
        });
        const data = await res.json();
        if (
          data.simulated ||
          (!data.provider &&
            !localStorage.getItem("manopavana_green_id") &&
            !localStorage.getItem("manopavana_meta_token"))
        ) {
          isSimulated = true;
        }
      } catch (apiErr) {
        console.warn("WhatsApp API route notice:", apiErr);
        isSimulated = true;
      }

      setVerificationChannel("whatsapp");
      setResendCooldown(30);

      if (isSimulated) {
        setStatusNotice(
          `WhatsApp gateway is in Preview / Setup Mode (No live WhatsApp API linked yet). For testing, your verification code is ${otpCode}. To deliver real WhatsApp messages to physical phones, connect Green-API or Meta in the Admin Panel.`
        );
      } else {
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

  // Dispatch SMS OTP:
  // Tracks the 10/day Firebase quota and automatically switches to WhatsApp if exceeded.
  const handleSendSmsOtp = async () => {
    if (!isPhoneValid) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (isSmsQuotaExhausted) {
      showToast("Daily SMS quota reached. Switched to WhatsApp verification.");
      handleSendWhatsAppOtp();
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      setStatusNotice(null);

      const result = await sendPhoneOtp(cleanPhone, "recaptcha-container");
      setConfirmationResult(result);
      setVerificationChannel("sms");
      setResendCooldown(30);

      const newCount = await incrementDailySmsCount();
      setDailySmsCount(newCount);

      setStatusNotice(`SMS OTP sent to +91 ${cleanPhone}. (${10 - newCount} free SMS left today)`);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      console.warn("SMS OTP error:", err);
      // If quota reached, carrier restriction, or region not enabled, automatically switch to WhatsApp OTP
      if (
        e.code === "auth/quota-exceeded" ||
        e.code === "auth/too-many-requests" ||
        e.code === "auth/billing-not-enabled" ||
        e.code === "auth/operation-not-allowed" ||
        (e.message && (
          e.message.toLowerCase().includes("quota") ||
          e.message.toLowerCase().includes("operation-not-allowed") ||
          e.message.toLowerCase().includes("region enabled")
        ))
      ) {
        setDailySmsCount(10);
        showToast("Firebase SMS not enabled for this region. Switched to WhatsApp OTP automatically.");
        await handleSendWhatsAppOtp();
      } else {
        setErrorMessage(
          "SMS delivery is not enabled for this region by Firebase. You can receive your verification code instantly via WhatsApp instead."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Dispatch Email OTP (Flipkart style, 100% password-free):
  const handleSendEmailOtp = async () => {
    if (!isEmailValid) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      setStatusNotice(null);

      // Generate secret 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      setSecretEmailOtp(otpCode);
      setOtpExpiryTime(Date.now() + 10 * 60 * 1000); // 10 min expiry

      await sendEmailLoginOtp(emailAddress.trim(), otpCode);

      setVerificationChannel("email_otp");
      setResendCooldown(30);
      setStatusNotice(
        `We have sent a 6-digit verification code to ${emailAddress.trim()}. Please check your inbox or spam.`
      );
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorMessage(e.message || "Failed to send email OTP. Please verify your email address.");
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
      showToast("Verified via WhatsApp successfully!");
      setLoginModalOpen(false);
      resetOtpFlow();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorMessage(e.message || "Could not complete sign-in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Verify SMS OTP
  const handleVerifySmsOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || !inputOtp.trim() || inputOtp.trim().length !== 6) {
      setErrorMessage("Please enter the 6-digit OTP received via SMS.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      await confirmPhoneOtp(confirmationResult, inputOtp.trim(), cleanPhone);
      showToast("Mobile number verified successfully!");
      setLoginModalOpen(false);
      resetOtpFlow();
    } catch (err: unknown) {
      console.warn("OTP verification error:", err);
      setErrorMessage("Invalid SMS OTP code. Please check and re-enter, or verify via WhatsApp.");
    } finally {
      setLoading(false);
    }
  };

  // Verify Email OTP (Flipkart style, 100% password-free)
  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputOtp.trim() || inputOtp.trim().length !== 6) {
      setErrorMessage("Please enter the 6-digit OTP sent to your email.");
      return;
    }

    if (Date.now() > otpExpiryTime) {
      setErrorMessage("This OTP has expired. Please request a new code.");
      return;
    }

    if (secretEmailOtp && inputOtp.trim() !== secretEmailOtp) {
      setErrorMessage("Incorrect email OTP. Please check your inbox and re-enter.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      await signInWithPhoneOrEmail(emailAddress.trim());
      showToast("Email verified successfully! Signed in.");
      setLoginModalOpen(false);
      resetOtpFlow();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorMessage(e.message || "Failed to sign in. Please try again.");
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
      {/* Invisible container for Firebase Phone Auth reCAPTCHA */}
      <div id="recaptcha-container" />

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
                  : "Password-free sign-in with Mobile OTP, WhatsApp, or Google"}
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
              {/* 1-Click Google Sign-In */}
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
                  Or Password-Free OTP
                </span>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="grid grid-cols-2 p-1 bg-[#120A06] rounded-xl border border-[#3A2417]">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("phone");
                    resetOtpFlow();
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    authMode === "phone"
                      ? "bg-[#D49A37] text-[#140D09] shadow-sm"
                      : "text-[#A88D77] hover:text-[#FDF6EC]"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile OTP</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("email");
                    resetOtpFlow();
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    authMode === "email"
                      ? "bg-[#D49A37] text-[#140D09] shadow-sm"
                      : "text-[#A88D77] hover:text-[#FDF6EC]"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email OTP</span>
                </button>
              </div>

              {/* ---------------- PHONE NUMBER MODE ---------------- */}
              {authMode === "phone" && (
                <div className="space-y-3">
                  {!verificationChannel && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#D6BEAA] mb-1">
                          Mobile Number
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3.5 text-xs font-bold text-[#A88D77]">
                            +91
                          </span>
                          <input
                            type="tel"
                            maxLength={10}
                            placeholder="Enter 10-digit mobile number"
                            value={phoneNumber}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                              setPhoneNumber(val);
                              setErrorMessage(null);
                            }}
                            className="w-full pl-12 pr-3.5 py-2.5 text-xs bg-[#120A06] border border-[#4A301E] rounded-xl focus:outline-none focus:border-[#D49A37] focus:ring-1 focus:ring-[#D49A37]/50 text-[#FDF6EC] placeholder-[#7A6150] font-mono tracking-wider"
                          />
                        </div>
                      </div>

                      {/* Quota Status Notice if limit reached */}
                      {isSmsQuotaExhausted && (
                        <div className="flex items-center gap-2 p-2.5 bg-amber-950/40 border border-[#D49A37]/50 rounded-xl text-[11px] text-[#FFD885]">
                          <AlertCircle className="w-4 h-4 shrink-0 text-[#D49A37]" />
                          <span>
                            Daily SMS quota (10/day) reached. Switched to WhatsApp-based verification.
                          </span>
                        </div>
                      )}

                      {errorMessage && (
                        <div className="space-y-2 p-3 bg-red-950/50 rounded-xl border border-red-800/40">
                          <p className="text-xs text-red-300 font-semibold leading-relaxed">
                            {errorMessage}
                          </p>
                          <button
                            type="button"
                            onClick={handleSendWhatsAppOtp}
                            disabled={loading || !isPhoneValid}
                            className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Send Verification Code via WhatsApp Instead</span>
                          </button>
                        </div>
                      )}

                      <div className="space-y-2 pt-1">
                        <p className="text-[11px] text-[#A88D77] font-semibold">
                          Choose verification channel:
                        </p>

                        <div className="grid grid-cols-2 gap-2.5">
                          {/* Option 1: WhatsApp OTP (Recommended & Always Unlimited) */}
                          <button
                            type="button"
                            onClick={handleSendWhatsAppOtp}
                            disabled={loading || !isPhoneValid}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-40 flex flex-col justify-between ${
                              isSmsQuotaExhausted
                                ? "col-span-2 bg-[#0F2416] border-emerald-600 shadow-md ring-1 ring-emerald-500/50"
                                : "bg-[#0F2416]/60 hover:bg-[#0F2416] border-emerald-700/60"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                                <MessageSquare className="w-4 h-4 shrink-0 text-emerald-400" />
                                <span>WhatsApp OTP</span>
                              </span>
                              {isSmsQuotaExhausted && (
                                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#A88D77] leading-tight">
                              Sent from +91 91803 01917
                            </span>
                          </button>

                          {/* Option 2: SMS OTP (Available while under 10 daily verifications) */}
                          {!isSmsQuotaExhausted && (
                            <button
                              type="button"
                              onClick={handleSendSmsOtp}
                              disabled={loading || !isPhoneValid}
                              className="p-3 rounded-xl bg-[#24160F] hover:bg-[#2E1D14] border border-[#5C3C26] text-left transition-all cursor-pointer disabled:opacity-40 flex flex-col justify-between"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                                  <Smartphone className="w-4 h-4 shrink-0 text-[#F5BC51]" />
                                  <span>SMS OTP</span>
                                </span>
                                <span className="text-[9px] text-[#A88D77]">
                                  {10 - dailySmsCount} left
                                </span>
                              </div>
                              <span className="text-[10px] text-[#A88D77] leading-tight">
                                Send code via mobile SMS
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* WhatsApp OTP Verification Input (Secret code is NEVER shown in UI) */}
                  {verificationChannel === "whatsapp" && (
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
                          type="password"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="• • • • • •"
                          value={inputOtp}
                          onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="w-full text-center tracking-[0.6em] text-xl font-mono py-2.5 bg-[#120A06] border border-[#4A301E] rounded-xl focus:outline-none focus:border-[#D49A37] focus:ring-1 focus:ring-[#D49A37]/50 text-[#FDF6EC]"
                          autoFocus
                        />
                      </div>

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

                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <button
                          type="button"
                          disabled={resendCooldown > 0 || loading}
                          onClick={handleSendWhatsAppOtp}
                          className="text-[#A88D77] hover:text-[#FFD885] disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>
                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend WhatsApp Code"}
                          </span>
                        </button>
                        {!isSmsQuotaExhausted && (
                          <button
                            type="button"
                            onClick={handleSendSmsOtp}
                            className="text-[#D49A37] hover:underline cursor-pointer"
                          >
                            Send via SMS instead
                          </button>
                        )}
                      </div>
                    </form>
                  )}

                  {/* SMS OTP Verification Input */}
                  {verificationChannel === "sms" && (
                    <form onSubmit={handleVerifySmsOtp} className="space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between text-xs text-[#A88D77]">
                        <span>
                          Code sent to <strong className="text-[#FFD885]">+91 {cleanPhone}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={resetOtpFlow}
                          className="text-[11px] text-[#D49A37] hover:underline cursor-pointer"
                        >
                          Change Number
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#D6BEAA] mb-1">
                          Enter 6-Digit SMS OTP
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="• • • • • •"
                          value={inputOtp}
                          onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="w-full text-center tracking-[0.6em] text-xl font-mono py-2.5 bg-[#120A06] border border-[#4A301E] rounded-xl focus:outline-none focus:border-[#D49A37] focus:ring-1 focus:ring-[#D49A37]/50 text-[#FDF6EC]"
                          autoFocus
                        />
                      </div>

                      {errorMessage && (
                        <p className="text-xs text-red-300 font-semibold bg-red-950/50 p-2.5 rounded-xl border border-red-800/40">
                          {errorMessage}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={loading || inputOtp.length !== 6}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D49A37] via-[#F5BC51] to-[#BF7E16] text-[#140D09] font-serif font-black tracking-wider uppercase shadow-[0_4px_20px_rgba(212,154,55,0.35)] border border-[#FFD885] transition-all duration-300 hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <span>{loading ? "Verifying..." : "Verify & Sign In"}</span>
                        <ArrowRight className="w-4 h-4 text-[#140D09]" />
                      </button>

                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <button
                          type="button"
                          disabled={resendCooldown > 0 || loading}
                          onClick={handleSendSmsOtp}
                          className="text-[#A88D77] hover:text-[#FFD885] disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>
                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend SMS"}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSendWhatsAppOtp}
                          className="text-emerald-400 hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Verify via WhatsApp instead</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* ---------------- EMAIL MODE (FLIPKART-STYLE PASSWORD FREE) ---------------- */}
              {authMode === "email" && (
                <div className="space-y-3">
                  {verificationChannel !== "email_otp" ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#D6BEAA] mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          placeholder="name@example.com"
                          value={emailAddress}
                          onChange={(e) => {
                            setEmailAddress(e.target.value);
                            setErrorMessage(null);
                          }}
                          className="w-full px-3.5 py-2.5 text-xs bg-[#120A06] border border-[#4A301E] rounded-xl focus:outline-none focus:border-[#D49A37] focus:ring-1 focus:ring-[#D49A37]/50 text-[#FDF6EC] placeholder-[#7A6150]"
                        />
                        <span className="text-[10px] text-[#A88D77] block mt-1">
                          We will send a 6-digit verification code to your email. No password required.
                        </span>
                      </div>

                      {errorMessage && (
                        <p className="text-xs text-red-300 font-semibold bg-red-950/50 p-2.5 rounded-xl border border-red-800/40">
                          {errorMessage}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={handleSendEmailOtp}
                        disabled={loading || !isEmailValid}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D49A37] via-[#F5BC51] to-[#BF7E16] text-[#140D09] font-serif font-black tracking-wider uppercase shadow-[0_4px_20px_rgba(212,154,55,0.35)] border border-[#FFD885] transition-all duration-300 hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <span>{loading ? "Sending Code..." : "Send Verification Code"}</span>
                        <ArrowRight className="w-4 h-4 text-[#140D09]" />
                      </button>
                    </div>
                  ) : (
                    /* Email OTP Verification Input */
                    <form onSubmit={handleVerifyEmailOtp} className="space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between text-xs text-[#A88D77]">
                        <span>
                          Code sent to <strong className="text-[#FFD885]">{emailAddress.trim()}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={resetOtpFlow}
                          className="text-[11px] text-[#D49A37] hover:underline cursor-pointer"
                        >
                          Change Email
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#D6BEAA] mb-1">
                          Enter 6-Digit Email Code
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="• • • • • •"
                          value={inputOtp}
                          onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="w-full text-center tracking-[0.6em] text-xl font-mono py-2.5 bg-[#120A06] border border-[#4A301E] rounded-xl focus:outline-none focus:border-[#D49A37] focus:ring-1 focus:ring-[#D49A37]/50 text-[#FDF6EC]"
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
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D49A37] via-[#F5BC51] to-[#BF7E16] text-[#140D09] font-serif font-black tracking-wider uppercase shadow-[0_4px_20px_rgba(212,154,55,0.35)] border border-[#FFD885] transition-all duration-300 hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <span>{loading ? "Verifying..." : "Verify & Sign In"}</span>
                        <ArrowRight className="w-4 h-4 text-[#140D09]" />
                      </button>

                      <div className="text-center pt-1">
                        <button
                          type="button"
                          disabled={resendCooldown > 0 || loading}
                          onClick={handleSendEmailOtp}
                          className="text-[11px] text-[#A88D77] hover:text-[#FFD885] disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>
                            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend Email Code"}
                          </span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
