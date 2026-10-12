import React, { useState, useEffect } from "react";
import { Clock, RefreshCw, XCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useStore } from "../context/StoreContext";
import { updateFirestoreOrderStatus } from "../firebase";
import { sendOrderConfirmationEmail } from "../services/emailService";
import { Order } from "../types";

export const PendingOrderBanner: React.FC = () => {
  const {
    getOrder,
    clearCart,
    addToCart,
    setOrderSuccessRef,
    setPaymentFailedOrder,
    showToast,
    cart,
  } = useStore();

  const [pendingRef, setPendingRef] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState(false);

  // Sync state from localStorage
  const checkPendingOrder = () => {
    try {
      const ref = localStorage.getItem("pending_order_ref");
      const timestampStr = localStorage.getItem("pending_order_timestamp");

      if (!ref || !timestampStr) {
        setPendingRef(null);
        setSecondsRemaining(0);
        return;
      }

      const timestamp = parseInt(timestampStr, 10);
      const elapsedMs = Date.now() - timestamp;
      const totalWindowMs = 10 * 60 * 1000; // 10 minutes

      if (elapsedMs < totalWindowMs) {
        setPendingRef(ref);
        setSecondsRemaining(Math.max(0, Math.floor((totalWindowMs - elapsedMs) / 1000)));
      } else {
        // More than 10 minutes elapsed: EXPIRED LIFECYCLE
        handleExpire(ref);
      }
    } catch {
      setPendingRef(null);
    }
  };

  const handleExpire = async (expiredRef: string) => {
    // 1. Mark order in Firestore as Failed (Expired)
    await updateFirestoreOrderStatus(expiredRef, {
      orderStatus: "Failed (Expired)",
      paymentStatus: "FAILED",
    });

    // 2. Restore items back to active cart if stored
    try {
      const storedData = localStorage.getItem("pending_order_data");
      if (storedData) {
        const orderData: Order = JSON.parse(storedData);
        if (orderData.items && orderData.items.length > 0 && cart.length === 0) {
          orderData.items.forEach((item) => {
            addToCart(
              {
                id: item.id,
                productId: item.productId,
                title: item.title,
                subtitle: item.subtitle,
                variant: item.variant,
                price: item.price,
                regularPrice: item.regularPrice,
                image: item.image,
              },
              item.quantity
            );
          });
        }
      }
    } catch (err) {
      console.warn("Failed to restore expired order items:", err);
    }

    // 3. Clear localStorage keys
    localStorage.removeItem("pending_order_ref");
    localStorage.removeItem("pending_order_timestamp");
    localStorage.removeItem("pending_order_data");

    setPendingRef(null);
    setSecondsRemaining(0);
    showToast("PhonePe payment session expired (10 minutes). Items restored to your bag.");
  };

  useEffect(() => {
    checkPendingOrder();
    const interval = setInterval(() => {
      checkPendingOrder();
    }, 1000);

    return () => clearInterval(interval);
  }, [cart.length]);

  if (!pendingRef || secondsRemaining <= 0) {
    return null;
  }

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const handleVerifyOrResume = async () => {
    setIsVerifying(true);
    try {
      const resp = await fetch(`/api?action=verify_order&orderRef=${encodeURIComponent(pendingRef)}`);
      const data = await resp.json();
      const code = data.code || "";
      const state = data.data?.state || data.paymentStatus || "";

      if (
        data.status === "SUCCESS" ||
        code === "PAYMENT_SUCCESS" ||
        state === "COMPLETED" ||
        state === "SUCCESS"
      ) {
        // Clear pending tracking
        localStorage.removeItem("pending_order_ref");
        localStorage.removeItem("pending_order_timestamp");
        localStorage.removeItem("pending_order_data");
        setPendingRef(null);

        // Update Firestore
        await updateFirestoreOrderStatus(pendingRef, {
          orderStatus: "Placed",
          paymentMode: "PHONEPE_PAID",
          paymentStatus: "COMPLETED",
        });

        // Email confirmation
        const matched = getOrder(pendingRef);
        if (matched) {
          await sendOrderConfirmationEmail({
            ...matched,
            orderStatus: "Placed",
            paymentMode: "PHONEPE_PAID",
            paymentStatus: "COMPLETED",
          });
        }

        clearCart();
        setOrderSuccessRef(pendingRef);
        showToast("Payment verified via PhonePe! Order placed.");
      } else {
        // Not yet completed or cancelled
        let orderObj = getOrder(pendingRef);
        if (!orderObj) {
          try {
            const storedData = localStorage.getItem("pending_order_data");
            if (storedData) orderObj = JSON.parse(storedData);
          } catch {
            // ignore
          }
        }
        if (orderObj) {
          setPaymentFailedOrder(orderObj);
        } else {
          showToast(`PhonePe Status: ${data.reason || "Payment pending or not confirmed yet"}`);
        }
      }
    } catch (e) {
      console.warn("Verify pending order error:", e);
      showToast("Unable to reach payment verification server. Please retry.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancelAndReorder = async () => {
    if (confirm("Are you sure you want to cancel this pending PhonePe payment and restore items to your bag?")) {
      await handleExpire(pendingRef);
      showToast("Pending PhonePe payment cancelled. Cart restored.");
    }
  };

  return (
    <aside
      aria-label="Pending PhonePe Payment Notification"
      className="bg-gradient-to-r from-[#3D2514] via-[#5E3210] to-[#3D2514] border-b-2 border-amber-400/80 text-white shadow-xl sticky top-0 z-40 transition-all animate-fade-in"
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <span className="p-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 shrink-0 animate-pulse">
            <Clock className="w-4 h-4" />
          </span>
          <div>
            <span className="font-bold text-amber-300">
              ⚡ PhonePe Payment In Progress:{" "}
            </span>
            <span className="font-mono text-white/90">Order #{pendingRef}</span>
            <span className="mx-2 text-white/40">|</span>
            <span className="text-amber-200 font-semibold">
              Time Left:{" "}
              <span className="font-mono font-bold bg-black/40 px-2 py-0.5 rounded text-amber-300 border border-amber-400/30">
                {timeFormatted}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <button
            type="button"
            disabled={isVerifying}
            onClick={handleVerifyOrResume}
            className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#3D2514] font-black text-[11px] shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin" : ""}`} />
            <span>{isVerifying ? "Verifying..." : "Check Status / Resume"}</span>
          </button>

          <button
            type="button"
            onClick={handleCancelAndReorder}
            className="px-3 py-1.5 rounded-lg bg-black/30 hover:bg-black/50 text-stone-200 border border-white/20 hover:text-white text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
