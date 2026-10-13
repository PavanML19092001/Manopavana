import React, { useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { AudioPlayer } from "./components/AudioPlayer";
import { LocationModal } from "./components/LocationModal";
import { LoyaltyQuizModal } from "./components/LoyaltyQuizModal";
import { LoginModal } from "./components/LoginModal";
import { PaymentFailedModal } from "./components/PaymentFailedModal";
import { OrderSuccessModal } from "./components/OrderSuccessModal";
import { HomePage } from "./pages/HomePage";
import { ProductPage } from "./pages/ProductPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { AccountPage } from "./pages/AccountPage";
import { AdminPage } from "./pages/AdminPage";
import { useStore } from "./context/StoreContext";
import { PendingOrderBanner } from "./components/PendingOrderBanner";
import { updateFirestoreOrderStatus } from "./firebase";
import { sendOrderConfirmationEmail } from "./services/emailService";
import { Sparkles } from "lucide-react";

// Automatically scrolls to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("ErrorBoundary captured error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6 bg-[#FAF6F0] text-[#24140A] text-center">
          <div className="max-w-md p-6 bg-white rounded-2xl shadow-xl border border-[#D49A37]/40 space-y-4">
            <h2 className="text-lg font-bold font-serif text-[#5E3210]">Something interrupted this view</h2>
            <p className="text-xs text-[#7A5E48]">The page has been safely preserved. Click below to continue.</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-5 py-2.5 rounded-xl bg-[#5E3210] text-white text-xs font-bold hover:bg-[#43230A] transition-colors cursor-pointer shadow-md"
            >
              Continue / Refresh
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const {
    currentUser,
    toastMessage,
    getOrder,
    clearCart,
    clearBuyNow,
    setOrderSuccessRef,
    setPaymentFailedOrder,
    showToast,
    cart,
    subtotal,
    discount,
    shippingFee,
    total,
    address,
    themeMode,
  } = useStore();

  // REAL PAYMENT RETURN & VERIFICATION ROUTE HANDLER
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderRef = params.get("orderRef");
    if (!orderRef) return;

    // Clean up URL parameters immediately using replaceState
    window.history.replaceState({}, document.title, window.location.pathname);

    const targetRef = orderRef;

    async function verifyReturn(ref: string) {
      try {
        const resp = await fetch(`/api?action=verify_order&orderRef=${encodeURIComponent(ref)}`);
        const data = await resp.json();
        const code = data.code || "";
        const state = data.data?.state || data.paymentStatus || "";

        if (
          data.status === "SUCCESS" ||
          code === "PAYMENT_SUCCESS" ||
          state === "COMPLETED" ||
          state === "SUCCESS"
        ) {
          // 1. Retrieve matched order data before clearing storage
          let matched = getOrder(ref);
          if (!matched) {
            try {
              const pendingRaw = localStorage.getItem("pending_order_data");
              if (pendingRaw) matched = JSON.parse(pendingRaw);
            } catch {
              // ignore
            }
          }

          // Clear pending order tracking keys from localStorage
          localStorage.removeItem("pending_order_ref");
          localStorage.removeItem("pending_order_timestamp");
          localStorage.removeItem("pending_order_data");

          // 2. Update Firestore order document to PHONEPE_PAID and Placed
          await updateFirestoreOrderStatus(ref, {
            orderStatus: "Placed",
            paymentMode: "PHONEPE_PAID",
            paymentStatus: "COMPLETED",
          });

          // 3. Dispatch EmailJS confirmation alert
          if (matched) {
            await sendOrderConfirmationEmail({
              ...matched,
              orderStatus: "Placed",
              paymentMode: "PHONEPE_PAID",
              paymentStatus: "COMPLETED",
            });
          }

          // 4. If direct Buy Now, clear only buyNowItem so bag items remain safe
          if (matched?.isBuyNow) {
            clearBuyNow();
          } else {
            clearCart();
            clearBuyNow();
          }
          setOrderSuccessRef(ref);
          showToast("Payment verified online! Order placed.");
        } else {
          // FAILED / PENDING / DECLINED / USER_CANCELLED
          await updateFirestoreOrderStatus(ref, {
            orderStatus: "Payment Incomplete",
            paymentStatus: "FAILED",
          });

          let matched = getOrder(ref);
          if (!matched) {
            try {
              const pendingRaw = localStorage.getItem("pending_order_data");
              if (pendingRaw) matched = JSON.parse(pendingRaw);
            } catch {
              // ignore
            }
          }

          if (matched) {
            setPaymentFailedOrder(matched);
          } else {
            const fallbackOrder = {
              id: ref,
              orderRef: ref,
              date: "Just now",
              timestamp: Date.now(),
              timestampMs: Date.now(),
              items: [...cart],
              subtotal,
              discount,
              shippingFee,
              total,
              paymentMethod: "phonepe" as const,
              paymentMode: "PHONEPE",
              paymentStatus: "FAILED",
              orderStatus: "Payment Incomplete" as const,
              shippingAddress: address,
            };
            setPaymentFailedOrder(fallbackOrder);
          }
        }
      } catch (err) {
        console.warn("Payment verification error:", err);
        let matched = getOrder(ref);
        if (!matched) {
          try {
            const pendingRaw = localStorage.getItem("pending_order_data");
            if (pendingRaw) matched = JSON.parse(pendingRaw);
          } catch {
            // ignore
          }
        }
        if (matched) {
          setPaymentFailedOrder(matched);
        }
      }
    }

    verifyReturn(targetRef);
  }, []);

  return (
    <div
      className={`w-full max-w-full overflow-x-hidden min-h-screen flex flex-col font-['Outfit',sans-serif] box-border transition-colors duration-200 ${
        themeMode === "dark"
          ? "bg-[#140D09] text-[#FDF6EC]"
          : themeMode === "light"
          ? "bg-[#FAF7F2] text-[#24140A]"
          : "bg-[#FAF6F0] text-[#24140A]"
      }`}
    >
      <ScrollToTop />
      <PendingOrderBanner />
      <Navbar />

      <ErrorBoundary>
        <main className="w-full max-w-full overflow-x-hidden flex-1 box-border">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route
              path="/admin"
              element={
                currentUser?.email === "manopavana@gmail.com" ? (
                  <AdminPage />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
          </Routes>
        </main>

        <Footer />
        <AudioPlayer />
        <LocationModal />
        <LoyaltyQuizModal />
        <LoginModal />
        <PaymentFailedModal />
        <OrderSuccessModal />
      </ErrorBoundary>

      {/* Floating Global Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#1C110B]/95 text-[#FDF6EC] text-xs font-semibold shadow-2xl border border-[#D49A37]/50 backdrop-blur-md animate-bounce">
          <Sparkles className="w-4 h-4 text-[#F5BC51] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
