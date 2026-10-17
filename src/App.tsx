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
import { FreeShippingNudge } from "./components/FreeShippingNudge";
import { HomePage } from "./pages/HomePage";
import { ProductPage } from "./pages/ProductPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { AccountPage } from "./pages/AccountPage";
import { AdminPage } from "./pages/AdminPage";
import { useStore } from "./context/StoreContext";
import { Order } from "./types";
import { PendingOrderBanner } from "./components/PendingOrderBanner";
import { updateFirestoreOrderStatus, getOrderFromFirestore } from "./firebase";
import { sendOrderConfirmationEmail } from "./services/emailService";
import { Sparkles, LogOut, Home, RefreshCw } from "lucide-react";

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

  handleEmergencyReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      indexedDB.deleteDatabase("firebaseLocalStorageDb");
    } catch {
      // ignore
    }
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6 bg-[#FAF6F0] text-[#24140A] text-center">
          <div className="max-w-md w-full p-8 bg-white rounded-3xl shadow-xl border border-[#D49A37]/40 space-y-5">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#E08F35]">
              <RefreshCw className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold font-serif text-[#5E3210]">
                Something interrupted this view
              </h2>
              <p className="text-xs text-[#7A5E48]">
                A data format error occurred while rendering this section.
              </p>
              {this.state.error?.message && (
                <p className="text-[10px] font-mono text-red-600 bg-red-50 p-2 rounded-lg border border-red-200 break-all text-left">
                  {this.state.error.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="w-full py-2.5 rounded-xl bg-[#5E3210] text-white text-xs font-bold hover:bg-[#43230A] transition-colors cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Refreshing View</span>
              </button>

              <button
                type="button"
                onClick={this.handleEmergencyReset}
                className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5 text-red-600" />
                <span>Emergency Sign Out & Return Home</span>
              </button>
            </div>
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
    isPreviewStorefront,
    togglePreviewStorefront,
    logoutUser,
    logoutAdmin,
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
        let matched: Order | null | undefined = await getOrderFromFirestore(ref);
        if (!matched) {
          matched = getOrder(ref) || null;
        }
        if (!matched) {
          try {
            const pendingRaw = localStorage.getItem("pending_order_data");
            if (pendingRaw) matched = JSON.parse(pendingRaw);
          } catch {
            // ignore
          }
        }

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
          localStorage.removeItem("pending_order_ref");
          localStorage.removeItem("pending_order_timestamp");
          localStorage.removeItem("pending_order_data");

          await updateFirestoreOrderStatus(ref, {
            orderStatus: "Placed",
            paymentMode: "PHONEPE_PAID",
            paymentStatus: "COMPLETED",
          });

          if (matched) {
            await sendOrderConfirmationEmail({
              ...matched,
              orderStatus: "Placed",
              paymentMode: "PHONEPE_PAID",
              paymentStatus: "COMPLETED",
            });
          }

          if (matched?.isBuyNow) {
            clearBuyNow();
          } else {
            clearCart();
            clearBuyNow();
          }
          setOrderSuccessRef(ref);
          showToast("Payment verified online! Order placed.");
        } else {
          await updateFirestoreOrderStatus(ref, {
            orderStatus: "Payment Incomplete",
            paymentStatus: "FAILED",
          });

          if (matched && matched.items && matched.items.length > 0) {
            setPaymentFailedOrder(matched);
          } else {
            const fallbackItems = cart.length > 0 ? [...cart] : [];
            const fallbackSubtotal = fallbackItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
            const fallbackTotal = Math.max(0, fallbackSubtotal - (discount || 0) + (shippingFee || 0));

            const fallbackOrder = {
              id: ref,
              orderRef: ref,
              date: "Just now",
              timestamp: Date.now(),
              timestampMs: Date.now(),
              items: fallbackItems,
              subtotal: fallbackSubtotal,
              discount: discount || 0,
              shippingFee: shippingFee || 0,
              total: fallbackTotal,
              paymentMethod: "phonepe" as const,
              paymentMode: "PHONEPE",
              paymentStatus: "FAILED",
              orderStatus: "Payment Incomplete" as const,
              shippingAddress: address,
            };
            if (fallbackOrder.items.length > 0) {
              setPaymentFailedOrder(fallbackOrder);
            }
          }
        }
      } catch (err) {
        console.warn("Payment verification error:", err);
        let matched: Order | null | undefined = await getOrderFromFirestore(ref);
        if (!matched) matched = getOrder(ref) || null;
        if (matched && matched.items && matched.items.length > 0) {
          setPaymentFailedOrder(matched);
        }
      }
    }

    verifyReturn(targetRef);
  }, []);

  const isStoreAdmin = currentUser?.email?.toLowerCase().trim() === "manopavana@gmail.com";

  // Dedicated Admin Header with Escape & Logout Options
  if (isStoreAdmin && !isPreviewStorefront) {
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

        {/* Global Admin Navigation Bar to prevent ever getting trapped */}
        <header className="bg-[#2D1B10] text-[#FDF6EC] px-4 py-2.5 text-xs flex items-center justify-between border-b border-[#D49A37]/40 sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-amber-200">MANOPAVANA Master Admin Portal</span>
            <span className="text-[#C4B29E] hidden md:inline">({currentUser?.email})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => togglePreviewStorefront(true)}
              className="px-3 py-1.5 rounded-xl bg-[#E08F35] hover:bg-[#c97a26] text-[#1F120A] text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Preview Storefront</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                await logoutUser();
                logoutAdmin();
                window.location.href = "/";
              }}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        <ErrorBoundary>
          <main className="flex-1">
            <AdminPage />
          </main>
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

      {/* Admin Customer Storefront Preview Sticky Top Bar */}
      {isStoreAdmin && isPreviewStorefront && (
        <div className="bg-[#2D1B10] text-[#FDF6EC] px-4 py-2.5 text-xs flex items-center justify-between border-b border-[#D49A37]/40 sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">Storefront Customer Preview</span>
            <span className="text-[#C4B29E] hidden md:inline">
              (Viewing storefront as customer • Logged in as {currentUser?.email})
            </span>
          </div>
          <button
            type="button"
            onClick={() => togglePreviewStorefront(false)}
            className="px-3.5 py-1.5 rounded-xl bg-[#E08F35] hover:bg-[#c97a26] text-[#1F120A] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow"
          >
            <span>⚙️ Return to Master CMS</span>
          </button>
        </div>
      )}

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
                isStoreAdmin ? (
                  <AdminPage />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
          </Routes>
        </main>
      </ErrorBoundary>

      <Footer />
      <AudioPlayer />
      <FreeShippingNudge />
      <ErrorBoundary>
        <LocationModal />
      </ErrorBoundary>
      <LoyaltyQuizModal />
      <LoginModal />
      <PaymentFailedModal />
      <OrderSuccessModal />

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