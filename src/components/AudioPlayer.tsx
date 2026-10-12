import React from "react";
import { Volume2, VolumeX, Sparkles } from "lucide-react";
import { useStore } from "../context/StoreContext";

export const AudioPlayer: React.FC = () => {
  const { isPlayingAudio, toggleAudio } = useStore();

  return (
    <aside
      aria-label="Artisanal Ambience Player"
      className="fixed bottom-5 right-5 z-40 group"
    >
      <button
        onClick={toggleAudio}
        aria-label={isPlayingAudio ? "Pause Artisanal Ambience Sound" : "Play Artisanal Ambience Sound"}
        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-xl transition-all duration-300 border ${
          isPlayingAudio
            ? "bg-[#3D2514] text-[#F3E7D3] border-[#D4A373]/50 ring-2 ring-[#D4A373]/30 scale-105"
            : "bg-white/95 text-[#5A402D] border-[#E8DEC8] hover:border-[#D4A373] hover:shadow-2xl backdrop-blur-md"
        }`}
      >
        <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-[#E08F35]/20 text-[#C8751B]">
          {isPlayingAudio ? (
            <Volume2 className="w-3.5 h-3.5 text-[#E08F35] animate-pulse" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-[#8C7A6B]" />
          )}
        </span>

        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold tracking-wide">
              {isPlayingAudio ? "🔊 Marada Gaana Beats" : "🔇 Pressing Ambience"}
            </span>
            {isPlayingAudio && (
              <span className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 h-full bg-[#E08F35] animate-[bounce_0.8s_infinite]" />
                <span className="w-0.5 h-2 bg-[#E08F35] animate-[bounce_0.6s_infinite_0.2s]" />
                <span className="w-0.5 h-3 bg-[#E08F35] animate-[bounce_0.9s_infinite_0.4s]" />
              </span>
            )}
          </div>
          <span className="text-[10px] text-amber-700 font-medium">
            {isPlayingAudio ? "Traditional wood press rhythm" : "Click to experience sounds"}
          </span>
        </div>

        <Sparkles className={`w-3 h-3 text-[#E08F35] ${isPlayingAudio ? "opacity-100 animate-spin" : "opacity-0 group-hover:opacity-75"}`} />
      </button>
    </aside>
  );
};
