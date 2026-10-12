import React, { useState } from "react";
import {
  X,
  User,
  Phone,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import {
  signInWithGoogle,
  signInWithPhoneOrEmail,
  logoutUser,
} from "../firebase";

export const LoginModal: React.FC = () => {
  const {
    isLoginModalOpen,
    setLoginModalOpen,
    currentUser,
    showToast,
  } = useStore();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isLoginModalOpen) return null;

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

  const handlePhoneOrEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage("Please enter your 10-digit mobile number or email address.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      await signInWithPhoneOrEmail(identifier, password || "manopavana_pass");
      showToast("Signed in successfully!");
      setLoginModalOpen(false);
    } catch (err: unknown) {
      console.warn("Sign-In notice:", err);
      const e = err as { message?: string };
      setErrorMessage(e.message || "Failed to sign in. Please verify your credentials.");
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
                {currentUser ? "Manage your profile & order history" : "1-Click Sign-in with Google or Phone Number"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setLoginModalOpen(false)}
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
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                  Or Phone / Email
                </span>
              </div>

              <form onSubmit={handlePhoneOrEmailSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#D6BEAA] mb-1">
                    Mobile Number or Email
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. 9180301917 or you@gmail.com"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-[#120A06] border border-[#4A301E] rounded-xl focus:outline-none focus:border-[#D49A37] focus:ring-1 focus:ring-[#D49A37]/50 text-[#FDF6EC] placeholder-[#7A6150]"
                    />
                  </div>
                  <span className="text-[10px] text-[#A88D77] block mt-1">
                    10-digit mobile numbers are automatically mapped to verified phone accounts.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#D6BEAA] mb-1">
                    Password (Optional / Default: manopavana_pass)
                  </label>
                  <input
                    type="password"
                    placeholder="Enter password or leave blank for instant login"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[#120A06] border border-[#4A301E] rounded-xl focus:outline-none focus:border-[#D49A37] focus:ring-1 focus:ring-[#D49A37]/50 text-[#FDF6EC] placeholder-[#7A6150]"
                  />
                </div>

                {errorMessage && (
                  <p className="text-xs text-red-300 font-semibold bg-red-950/50 p-2.5 rounded-xl border border-red-800/40">
                    {errorMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D49A37] via-[#F5BC51] to-[#BF7E16] text-[#140D09] font-serif font-black tracking-wider uppercase shadow-[0_4px_20px_rgba(212,154,55,0.35)] border border-[#FFD885] transition-all duration-300 hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{loading ? "Signing in..." : "Continue to Account"}</span>
                  <ArrowRight className="w-4 h-4 text-[#140D09]" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
