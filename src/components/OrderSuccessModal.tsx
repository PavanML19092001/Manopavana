import React from "react";
import { CheckCircle2, PackageCheck, Truck, ArrowRight, X } from "lucide-react";
import { useStore } from "../context/StoreContext";
import { useNavigate } from "react-router-dom";

export const OrderSuccessModal: React.FC = () => {
  const { orderSuccessRef, setOrderSuccessRef, getOrder } = useStore();
  const navigate = useNavigate();

  if (!orderSuccessRef) return null;

  const order = getOrder(orderSuccessRef);

  const handleTrack = () => {
    const ref = orderSuccessRef;
    setOrderSuccessRef(null);
    navigate(`/account?order=${ref}`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#24160F] to-[#140D09] text-[#FDF6EC] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] border-2 border-emerald-500/60 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#120A06] border-b border-[#3A2417]">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </span>
            <div>
              <h2 id="success-modal-title" className="text-base font-bold font-serif text-emerald-300">
                Payment Confirmed!
              </h2>
              <p className="text-[11px] text-[#A88D77]">
                Order #{orderSuccessRef} Placed Successfully
              </p>
            </div>
          </div>
          <button
            onClick={() => setOrderSuccessRef(null)}
            aria-label="Close modal"
            className="p-1.5 text-[#A88D77] hover:text-[#FDF6EC] hover:bg-[#2C1D14] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-[#D6BEAA]">
          <div className="p-4 rounded-2xl bg-[#1C110B] border border-[#4A301E] space-y-2">
            <div className="flex items-center justify-between font-bold text-[#FDF6EC]">
              <span>Payment Mode:</span>
              <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 font-mono">
                PHONEPE_PAID
              </span>
            </div>
            {order && (
              <>
                <div className="flex items-center justify-between text-[#A88D77]">
                  <span>Total Amount Paid:</span>
                  <span className="font-extrabold text-[#FFD885] font-serif text-sm">₹{order.total}</span>
                </div>
                <div className="flex items-center justify-between text-[#A88D77]">
                  <span>Delivering to:</span>
                  <span className="truncate max-w-[180px] text-[#FDF6EC]">{order.shippingAddress.addressLine1}</span>
                </div>
              </>
            )}
          </div>

          <div className="p-3 rounded-xl bg-[#1C110B] border border-[#4A301E] flex items-start gap-2.5 text-[11px] text-[#D6BEAA]">
            <Truck className="w-4 h-4 text-[#F5BC51] shrink-0 mt-0.5" />
            <span>
              Your order has been forwarded to our Bengaluru facility (Peenya 2nd Stage). Dispatch tracking will be shared via WhatsApp.
            </span>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleTrack}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#D49A37] via-[#F5BC51] to-[#BF7E16] text-[#140D09] font-serif font-black tracking-wider uppercase shadow-[0_4px_20px_rgba(212,154,55,0.35)] border border-[#FFD885] transition-all flex items-center justify-center gap-2 cursor-pointer hover:brightness-110"
            >
              <PackageCheck className="w-4 h-4 text-[#140D09]" />
              <span>Track Live Dispatch Status</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setOrderSuccessRef(null)}
              className="text-xs text-[#A88D77] hover:text-[#FDF6EC] text-center pt-1 cursor-pointer transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
