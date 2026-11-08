import React, { useState } from "react";
import {
  X,
  User,
  ShieldCheck,
  LogOut,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { signInWithGoogle, logoutUser } from "../firebase";

export const LoginModal: React.FC = () => {
  const {
    isLoginModalOpen,
    setLoginModalOpen,
    currentUser,
    showToast,
  } = useStore();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isLoginModalOpen) return null;

  // 1-Click Google Sign In (Universal for all customers)
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      await signInWithGoogle();
      showToast("Signed in with Google successfully! Welcome to MANOPAVANA.");
      setLoginModalOpen(false);
    } catch (err: unknown) {
      console.warn("Google Sign-In error:", err);
      const e = err as { message?: string; code?: string };
      if (e.code === "auth/popup-closed-by-user") {
        setErrorMessage("Sign-in cancelled. Please click 'Continue with Google' again.");
      } else if (e.code === "auth/network-request-failed") {
        setErrorMessage("Network issue. Please check your internet connection.");
      } else {
        setErrorMessage(e.message || "Google sign-in could not be completed. Please try again.");
      }
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
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#24160F] to-[#14291D] text-[#FAF3E0] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] border border-[#2D5A3F] overflow-hidden flex flex-col animate-modal-pop">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-[#14291D] border-b border-[#1F3D2B]">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-[#E0B04A]/20 text-[#F3D17A]">
              <User className="w-5 h-5 text-[#F3D17A]" />
            </span>
            <div>
              <h2 id="login-modal-title" className="text-base font-bold font-serif text-[#F3D17A]">
                {currentUser ? "Customer Account" : "Sign In to MANOPAVANA"}
              </h2>
              <p className="text-[11px] text-[#3F4F45]">
                {currentUser
                  ? "Manage your profile & order history"
                  : "1-Click Sign-in with Google"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setLoginModalOpen(false)}
            aria-label="Close modal"
            className="p-1.5 text-[#3F4F45] hover:text-[#FAF3E0] hover:bg-[#2C1D14] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {currentUser ? (
            /* Logged in state */
            <div className="space-y-4 text-xs text-[#E0B04A]">
              <div className="p-4 rounded-2xl bg-[#14291D] border border-[#2D5A3F] space-y-3">
                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || "User"}
                      className="w-11 h-11 rounded-full border-2 border-[#E0B04A] object-cover"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-[#E0B04A]/20 text-[#F3D17A] border border-[#E0B04A]/40 flex items-center justify-center font-bold text-base">
                      {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : "U"}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-[#FAF3E0] text-sm">
                      {currentUser.displayName || "Customer"}
                    </p>
                    <p className="text-[11px] text-[#3F4F45] font-mono">
                      {currentUser.email || "Verified Account"}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#14291D] flex items-center gap-2 text-emerald-400 font-semibold text-[11px]">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Google Account Verified • Order History Synced</span>
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
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#E0B04A] to-[#B87C24] text-[#14291D] font-bold transition-colors cursor-pointer shadow-md"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Sign in form */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#14291D] border border-[#2D5A3F] space-y-2 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#E0B04A]/15 border border-[#E0B04A]/30 flex items-center justify-center text-[#F3D17A]">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-sm text-[#FAF3E0] pt-1">
                  Pure Wood-Pressed Oils, Direct to Your Doorstep
                </h3>
                <p className="text-[11px] text-[#3F4F45] leading-relaxed">
                  Sign in with your Google account to track your orders, save delivery addresses, and enjoy seamless shopping.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-950/50 rounded-xl border border-red-800/40">
                  <p className="text-xs text-red-300 font-semibold leading-relaxed">
                    {errorMessage}
                  </p>
                </div>
              )}

              {/* 1-Click Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3.5 px-5 rounded-2xl bg-white hover:bg-stone-100 text-stone-900 font-bold text-sm shadow-xl transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 hover:scale-[1.01]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-stone-400 border-t-stone-900 rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                )}
                <span>{loading ? "Signing in..." : "Continue with Google"}</span>
              </button>

              <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-[#3F4F45]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>100% Secure • Instant 1-Click Access</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
