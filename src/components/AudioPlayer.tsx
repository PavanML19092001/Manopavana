import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Volume2, VolumeX, Sparkles, X, Play } from "lucide-react";
import { useStore } from "../context/StoreContext";

export const AudioPlayer: React.FC = () => {
  const location = useLocation();
  const { isPlayingAudio, toggleAudio, themeMode, cartCount } = useStore();
  const isDark = themeMode === "dark";

  // When cart has items, FreeShippingNudge is displayed on bottom of screen
  const isNudgeActive =
    cartCount > 0 &&
    location.pathname !== "/cart" &&
    location.pathname !== "/checkout";

  // Consent prompt banner state (only shown once per session if user hasn't played or dismissed)
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("manopavana_audio_prompt_dismissed");
    if (!dismissed && !isPlayingAudio) {
      // Show subtle invitation after 2.5 seconds
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isPlayingAudio]);

  const handleDismissPrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPrompt(false);
    sessionStorage.setItem("manopavana_audio_prompt_dismissed", "true");
  };

  const handleAcceptPrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPrompt(false);
    sessionStorage.setItem("manopavana_audio_prompt_dismissed", "true");
    if (!isPlayingAudio) {
      toggleAudio();
    }
  };

  return (
    <div
      aria-label="Artisanal Ambience Player"
      className={`fixed ${
        isNudgeActive ? "bottom-[142px]" : "bottom-20"
      } sm:bottom-6 right-3.5 sm:right-6 z-50 flex flex-col items-end gap-2 transition-all duration-300 pointer-events-auto`}
    >
      {/* Polite Consent / Invitation Prompt */}
      {showPrompt && !isPlayingAudio && (
        <div
          className={`max-w-[270px] sm:max-w-xs p-3 rounded-2xl border shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-300 relative ${
            isDark
              ? "bg-[#1F120A] text-[#FAF4EA] border-[#E08F35]/40 shadow-black/60"
              : "bg-white text-[#1F120A] border-[#E8DEC8] shadow-amber-900/15"
          }`}
        >
          <button
            type="button"
            onClick={handleDismissPrompt}
            className="absolute top-2 right-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-0.5 cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-start gap-2.5 pr-4">
            <span className="text-base shrink-0 mt-0.5">🪵</span>
            <div className="space-y-1">
              <p className="text-[11px] font-bold leading-snug">
                Experience the authentic sound of our wooden Marachekku mill?
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAcceptPrompt}
                  className="px-2.5 py-1 rounded-lg bg-[#5E3210] hover:bg-[#43230A] text-white text-[10px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Play Beats</span>
                </button>
                <button
                  type="button"
                  onClick={handleDismissPrompt}
                  className="text-[10px] font-semibold text-stone-500 hover:underline cursor-pointer"
                >
                  No thanks
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Floating Sound / Mute Toggle Button (Visible on Both Mobile & Desktop) */}
      <button
        type="button"
        onClick={toggleAudio}
        aria-label={isPlayingAudio ? "Mute Ambience Sound" : "Play Ambience Sound"}
        className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full shadow-xl transition-all duration-300 border cursor-pointer ${
          isPlayingAudio
            ? "bg-[#3D2514] text-[#F3E7D3] border-[#D4A373]/60 ring-2 ring-[#D4A373]/30 scale-105"
            : isDark
            ? "bg-[#1C120B]/95 text-[#FAF4EA] border-[#362114] hover:border-[#E08F35] backdrop-blur-md"
            : "bg-white/95 text-[#1F120A] border-[#E8DEC8] hover:border-[#D4A373] hover:shadow-2xl backdrop-blur-md"
        }`}
      >
        <span
          className={`relative flex items-center justify-center w-6 h-6 rounded-full ${
            isPlayingAudio ? "bg-[#E08F35]/25 text-[#E08F35]" : "bg-stone-200 dark:bg-stone-800 text-stone-500"
          }`}
        >
          {isPlayingAudio ? (
            <Volume2 className="w-3.5 h-3.5 text-[#E08F35] animate-pulse" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
          )}
        </span>

        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold tracking-wide">
              {isPlayingAudio ? "Mute Beats" : "Play Sound"}
            </span>
            {isPlayingAudio && (
              <span className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 h-full bg-[#E08F35] animate-[bounce_0.8s_infinite]" />
                <span className="w-0.5 h-2 bg-[#E08F35] animate-[bounce_0.6s_infinite_0.2s]" />
                <span className="w-0.5 h-3 bg-[#E08F35] animate-[bounce_0.9s_infinite_0.4s]" />
              </span>
            )}
          </div>
          <span className="text-[9px] text-amber-700 dark:text-amber-300 font-semibold hidden sm:inline">
            {isPlayingAudio ? "Traditional Marada Gaana" : "Wood press rhythm"}
          </span>
        </div>

        {isPlayingAudio && (
          <Sparkles className="w-3 h-3 text-[#E08F35] opacity-80 animate-spin hidden sm:inline" />
        )}
      </button>
    </div>
  );
};
