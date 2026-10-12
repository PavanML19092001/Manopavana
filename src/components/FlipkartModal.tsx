import React from "react";
import { ExternalLink, X, MapPin, Truck, AlertTriangle, ShieldCheck } from "lucide-react";
import { useStore } from "../context/StoreContext";

export const FlipkartModal: React.FC = () => {
  const { isFlipkartModalOpen, setFlipkartModalOpen, setLocationModalOpen, address } = useStore();

  if (!isFlipkartModalOpen) return null;

  const flipkartUrl = "https://www.flipkart.com/search?q=MANOPAVANA";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="flipkart-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#24160F] to-[#140D09] text-[#FDF6EC] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] border border-[#4A301E] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#120A06] border-b border-[#3A2417]">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-[#D49A37]/20 text-[#F5BC51]">
              <AlertTriangle className="w-5 h-5 text-[#F5BC51]" />
            </span>
            <div>
              <h2 id="flipkart-modal-title" className="text-base font-bold font-serif text-[#FFD885]">
                Pan-India Delivery via Flipkart
              </h2>
              <p className="text-[11px] text-[#A88D77]">
                Destination Pincode: <strong className="text-[#FFD885] font-mono">{address.pincode || "Outside 560xxx"}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => setFlipkartModalOpen(false)}
            aria-label="Close modal"
            className="p-1.5 text-[#A88D77] hover:text-[#FDF6EC] hover:bg-[#2C1D14] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-[#D6BEAA]">
          <div className="p-4 rounded-2xl bg-[#1C110B] border border-[#3A2417] space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#FFD885] text-sm">
              <Truck className="w-4 h-4 text-[#F5BC51]" />
              <span>Direct Doorstep vs Pan-India Route</span>
            </div>
            <p className="text-[#D6BEAA] leading-relaxed text-[11px]">
              Direct doorstep dispatch from our Peenya facility is exclusively operated within Bengaluru pin codes (<strong>560xxx</strong>).
            </p>
            <p className="text-[#D6BEAA] leading-relaxed text-[11px]">
              For all locations outside Bengaluru, authentic <strong>MANOPAVANA</strong> cold-pressed oils are fulfilled across India via our official <strong>Flipkart Store</strong> with Flipkart Assured transit and courier tracking!
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#1C110B] border border-[#4A301E] flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-[11px] text-[#D6BEAA]">
              100% Genuine batch guaranteed with intact tamper-proof seal and Flipkart Assured delivery.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <a
              href={flipkartUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-[#2874F0] hover:bg-[#1C5BC4] text-white font-black text-xs text-center shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Order on Official Flipkart Store</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={() => {
                setFlipkartModalOpen(false);
                setLocationModalOpen(true);
              }}
              className="w-full py-3 px-4 rounded-xl bg-[#1C110B] hover:bg-[#2C1D14] border border-[#5C3C26] text-[#FFD885] font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-[#F5BC51]" />
              <span>Change to Bengaluru (560xxx)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
