import React, { useState, useEffect } from "react";
import { AlertCircle, RefreshCw, Banknote, X, Clock, ShoppingBag } from "lucide-react";
import { useStore } from "../context/StoreContext";
import { useNavigate } from "react-router-dom";

export const PaymentFailedModal: React.FC = () => {
  const {
    paymentFailedOrder,
    setPaymentFailedOrder,
    loadOrderToCartAndRetry,
    switchOrderToCOD,
    markOrderAsExpired,
  } = useStore();

  const navigate = useNavigate();
  const [minutesRemaining, setMinutesRemaining] = useState<number>(10);
  const [isProcessingCod, setIsProcessingCod] = useState(false);

  useEffect(() => {
    if (!paymentFailedOrder) return;

    const calcTime = () => {
      const timestamp = paymentFailedOrder.timestampMs || paymentFailedOrder.timestamp || Date.now();
      const elapsedMinutes = (Date.now() - timestamp) / 60000;
      const remaining = Math.max(0, Math.ceil(10 - elapsedMinutes));
      setMinutesRemaining(remaining);

      if (remaining <= 0 && paymentFailedOrder.orderStatus !== "Failed (Expired)") {
        markOrderAsExpired(paymentFailedOrder.orderRef);
      }
    };

    calcTime();
    const interval = setInterval(calcTime, 10000);
    return () => clearInterval(interval);
  }, [paymentFailedOrder, markOrderAsExpired]);

  if (!paymentFailedOrder) return null;

  const isExpired = minutesRemaining <= 0;

  const handleRetry = () => {
    const order = paymentFailedOrder;
    setPaymentFailedOrder(null);
    loadOrderToCartAndRetry(order);
    navigate("/checkout");
  };

  const handleCOD = async () => {
    try {
      setIsProcessingCod(true);
      await switchOrderToCOD(paymentFailedOrder.orderRef);
      setPaymentFailedOrder(null);
      navigate(`/account?order=${paymentFailedOrder.orderRef}`);
    } finally {
      setIsProcessingCod(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="failed-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#24160F] to-[#140D09] text-[#FDF6EC] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] border-2 border-red-500/50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-[#120A06] border-b border-[#3A2417]">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-red-950/60 text-red-400 border border-red-800/40">
              <AlertCircle className="w-6 h-6" />
            </span>
            <div>
              <h2 id="failed-modal-title" className="text-base font-bold font-serif text-red-300">
                PhonePe Payment Incomplete
              </h2>
              <p className="text-[11px] text-[#A88D77]">
                Order Ref: <span className="font-mono font-bold text-[#FFD885]">{paymentFailedOrder.orderRef}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setPaymentFailedOrder(null)}
            aria-label="Close modal"
            className="p-1.5 text-[#A88D77] hover:text-[#FDF6EC] hover:bg-[#2C1D14] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-[#D6BEAA]">
          {/* 10-Minute Lifecycle Warning Pill */}
          {!isExpired ? (
            <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/40 flex items-center gap-3 text-amber-200">
              <Clock className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
              <div>
                <p className="font-bold text-xs text-[#FFD885]">
                  ⚠️ Payment Incomplete: You have {minutesRemaining} min{minutesRemaining === 1 ? "" : "s"} left to complete payment
                </p>
                <p className="text-[11px] text-[#D6BEAA] mt-0.5">
                  Your selected artisanal oils are temporarily reserved for 10 minutes.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-[#1C110B] border border-[#3A2417] flex items-center gap-3 text-stone-300">
              <Clock className="w-5 h-5 text-stone-400 shrink-0" />
              <div>
                <p className="font-bold text-xs text-red-300">
                  ❌ Payment window expired (10 mins passed). Order marked as Failed.
                </p>
                <p className="text-[11px] text-[#A88D77] mt-0.5">
                  Reserved inventory has been released. Please re-add items to your bag.
                </p>
              </div>
            </div>
          )}

          {/* Items Summary */}
          <div className="p-3.5 rounded-2xl bg-[#1C110B] border border-[#4A301E] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#FFD885]">
              <span>Items in this Order ({paymentFailedOrder.items.length})</span>
              <span>Total: ₹{paymentFailedOrder.total}</span>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {paymentFailedOrder.items.map((i) => (
                <div key={i.id} className="flex items-center justify-between text-[11px] text-[#A88D77]">
                  <span className="truncate max-w-[220px]">
                    {i.title} ({i.variant}) x {i.quantity}
                  </span>
                  <span className="font-bold text-[#FDF6EC]">₹{i.price * i.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-[#A88D77] leading-relaxed">
            The PhonePe transaction was cancelled or not confirmed by your bank. You can instantly retry with a fresh PhonePe checkout session, or switch this order directly to Cash on Delivery.
          </p>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2.5">
            {!isExpired ? (
              <>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#D49A37] via-[#F5BC51] to-[#BF7E16] text-[#140D09] font-serif font-black tracking-wider uppercase shadow-[0_4px_20px_rgba(212,154,55,0.35)] border border-[#FFD885] transition-all flex items-center justify-center gap-2 cursor-pointer hover:brightness-110"
                >
                  <RefreshCw className="w-4 h-4 text-[#140D09]" />
                  <span>⚡ Retry Payment with PhonePe</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessingCod}
                  onClick={handleCOD}
                  className="w-full py-3 px-4 rounded-xl bg-[#1C110B] hover:bg-[#2C1D14] border-2 border-emerald-700/80 text-emerald-300 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  <span>{isProcessingCod ? "Switching..." : "💵 Switch to Cash on Delivery (COD)"}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPaymentFailedOrder(null);
                  loadOrderToCartAndRetry(paymentFailedOrder);
                  navigate("/cart");
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#D49A37] to-[#B87C24] text-[#140D09] font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-[#140D09]" />
                <span>Re-Add Items to Active Bag</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setPaymentFailedOrder(null)}
              className="text-xs text-[#A88D77] hover:text-[#FDF6EC] text-center pt-1 cursor-pointer transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
