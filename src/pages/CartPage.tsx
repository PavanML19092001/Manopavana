import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  Trash2,
  Truck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Minus,
  Plus,
  Tag,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { BUSINESS_CONFIG } from "../constants";
import { isSaleActive, getSaleDeadlineLabel } from "../utils/salePricing";

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    cart,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    regularSubtotal,
    discount,
    discountAmount,
    netAmount,
    shippingFee,
    total,
    freeShippingProgress,
    freeShippingShortfall,
    loyalty,
    loyaltyRemainingText,
    openLoyaltyQuiz,
    cmsConfig,
    address,
    themeMode,
    currentUser,
    setLoginModalOpen,
    showToast,
    appliedCoupon,
    couponError,
    isValidatingCoupon,
    discountLabel,
    applyCouponCode,
    removeAppliedCoupon,
  } = useStore();

  const [couponInput, setCouponInput] = React.useState("");
  const [localCouponError, setLocalCouponError] = React.useState<string | null>(null);

  const isDark = themeMode === "dark";

  if (cart.length === 0) {
    return (
      <div
        className={`w-full min-h-[calc(100vh-80px)] py-20 flex items-center justify-center transition-colors box-border ${
          isDark ? "bg-[#14291D] text-[#FAF3E0]" : "bg-[#FAF3E0] text-[#14291D]"
        }`}
      >
        <div
          className={`max-w-lg w-full mx-4 p-10 rounded-3xl border text-center space-y-6 shadow-sm ${
            isDark ? "bg-[#14291D] border-[#1F3D2B]" : "bg-white border-[#F2E8CC]"
          }`}
        >
          <div
            className={`w-20 h-20 mx-auto rounded-full border-2 flex items-center justify-center ${
              isDark ? "bg-[#14291D] border-[#1F3D2B]" : "bg-[#FAF3E0] border-[#F2E8CC]"
            }`}
          >
            <ShoppingBag className={`w-8 h-8 ${isDark ? "text-amber-400" : "text-[#E0B04A]"}`} />
          </div>
          <div className="space-y-2">
            <h1
              className={`text-2xl font-bold font-serif ${
                isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
              }`}
            >
              Your Bag is Empty
            </h1>
            <p className={`text-xs sm:text-sm ${isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"}`}>
              Experience authentic unrefined wood-pressed oils fresh from our Bengaluru packaging facility.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#1F3D2B] hover:bg-[#1F3D2B] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <span>Explore Wood-Pressed Oils</span>
            <ArrowRight className="w-4 h-4 text-amber-300" />
          </Link>
        </div>
      </div>
    );
  }

  const handleProceedToCheckout = () => {
    if (!currentUser) {
      showToast("Please sign in or create an account to place an order.");
      setLoginModalOpen(true);
      return;
    }
    navigate("/checkout");
  };

  return (
    <div
      className={`w-full min-h-[calc(100vh-80px)] py-8 transition-colors box-border ${
        isDark ? "bg-[#14291D] text-[#FAF3E0]" : "bg-[#FAF3E0] text-[#14291D]"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Page Title & Back */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className={`p-2 rounded-xl border transition-colors ${
                isDark
                  ? "bg-[#14291D] border-[#1F3D2B] text-[#E0B04A] hover:text-white"
                  : "bg-white border-[#F2E8CC] text-[#3F4F45] hover:bg-[#FAF3E0]"
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1
                className={`text-2xl sm:text-3xl font-extrabold font-serif ${
                  isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                }`}
              >
                Shopping Bag
              </h1>
              <p className={`text-xs ${isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"}`}>
                Review your wood-pressed oils before doorstep dispatch
              </p>
            </div>
          </div>

          <button
            onClick={clearCart}
            className="text-xs text-red-600 hover:text-red-700 font-semibold underline cursor-pointer"
          >
            Clear Bag
          </button>
        </div>

        {/* Free Shipping Progress Bar */}
        <div
          className={`p-5 rounded-2xl border shadow-2xs space-y-2.5 ${
            isDark ? "bg-[#14291D] border-[#1F3D2B]" : "bg-white border-[#F2E8CC]"
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#E0B04A]" />
              <span className={`font-bold ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
                {freeShippingProgress >= 100
                  ? "🎉 Congratulations! You have unlocked FREE Doorstep Delivery across India!"
                  : `Add ₹${freeShippingShortfall} more (or add any 2+ bottles) to unlock FREE Doorstep Delivery across India!`}
              </span>
            </div>
            <span
              className={`font-mono text-xs font-bold ${
                isDark ? "text-amber-300" : "text-[#1F3D2B]"
              }`}
            >
              {freeShippingProgress}%
            </span>
          </div>
          <div
            className={`w-full h-2.5 rounded-full overflow-hidden ${
              isDark ? "bg-[#14291D]" : "bg-[#F2E8CC]"
            }`}
          >
            <div
              className="bg-gradient-to-r from-[#E0B04A] to-[#2E7D32] h-full transition-all duration-500 rounded-full"
              style={{ width: `${freeShippingProgress}%` }}
            />
          </div>
        </div>

        {/* Grid: Items List vs Order Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Cart Items */}
          <div className="lg:col-span-7 space-y-4">
            {cart.map((item) => (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-2xl border shadow-2xs transition-all ${
                  isDark ? "bg-[#14291D] border-[#1F3D2B]" : "bg-white border-[#F2E8CC]"
                }`}
              >
                {/* Mobile & Desktop Clean Item Row */}
                <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4">
                  {/* Image & Product Details */}
                  <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                    <img
                      src={item.image}
                      alt={item.title}
                      className={`w-16 h-20 sm:w-20 sm:h-22 object-contain p-1 rounded-xl border shrink-0 ${
                        isDark
                          ? "bg-[#14291D] border-[#1F3D2B]"
                          : "bg-[#FAF3E0] border-[#F2E8CC]"
                      }`}
                    />
                    <div className="space-y-1 min-w-0 flex-1">
                      <h3
                        className={`text-sm sm:text-base font-bold font-serif leading-snug truncate ${
                          isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                        }`}
                      >
                        {item.title}
                      </h3>
                      <p className={`text-xs ${isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"}`}>
                        {item.subtitle} • <span className="font-semibold">{item.variant}</span>
                      </p>
                      <div className="flex items-baseline gap-2 pt-0.5">
                        <span
                          className={`text-sm font-extrabold ${
                            isDark ? "text-amber-300" : "text-[#E0B04A]"
                          }`}
                        >
                          ₹{item.price}
                        </span>
                        {item.regularPrice > item.price && (
                          <span
                            className="text-xs line-through text-[#3F4F45]"
                          >
                            ₹{item.regularPrice}
                          </span>
                        )}
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          (GST Incl.)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Remove Button for Desktop or Top-Right on Mobile */}
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    aria-label={`Remove ${item.title}`}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0 cursor-pointer sm:order-last"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Bottom Row: Quantity Stepper & Line Item Total */}
                <div
                  className={`flex items-center justify-between mt-3 pt-3 border-t sm:mt-4 sm:pt-4 ${
                    isDark ? "border-[#14291D]" : "border-[#F2E8CC]"
                  }`}
                >
                  {/* High-Contrast Stepper Controls */}
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className={`text-[11px] font-semibold mr-1.5 hidden sm:inline ${
                      isDark ? "text-[#3F4F45]" : "text-[#3F4F45]"
                    }`}>
                      Quantity:
                    </span>
                    <div
                      className={`flex items-center rounded-xl p-1 border shadow-2xs ${
                        isDark
                          ? "bg-[#14291D] border-[#1F3D2B]"
                          : "bg-[#FAF3E0] border-[#E0B04A]"
                      }`}
                    >
                      {/* Decrement Button */}
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-black active:scale-95 transition-all cursor-pointer border ${
                          isDark
                            ? "bg-[#1F3D2B] border-[#2D5A3F] text-[#F3D17A] hover:bg-[#1F3D2B]"
                            : "bg-white border-[#E0B04A] text-[#1F3D2B] hover:bg-[#F2E8CC]"
                        }`}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>

                      {/* Quantity Display */}
                      <span
                        className={`w-8 text-center text-xs font-black select-none ${
                          isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                        }`}
                      >
                        {item.quantity}
                      </span>

                      {/* Increment Button */}
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-8 h-8 rounded-lg bg-[#E0B04A] hover:bg-[#F3D17A] text-[#14291D] border border-[#F3D17A] flex items-center justify-center font-black active:scale-95 transition-all cursor-pointer shadow-xs"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>
                  </div>

                  {/* Line Item Total */}
                  <div className="text-right">
                    <span className={`text-[11px] block ${isDark ? "text-[#3F4F45]" : "text-[#3F4F45]"}`}>
                      Subtotal
                    </span>
                    <span
                      className={`text-base sm:text-lg font-black font-serif ${
                        isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                      }`}
                    >
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* 10% Discount / Offer Card */}
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                isSaleActive()
                  ? "bg-[#1F3D2B]/10 border-[#E0B04A]/40"
                  : discount > 0
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : isDark
                  ? "bg-[#14291D] border-[#1F3D2B]"
                  : "bg-amber-50/90 border border-amber-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#E0B04A] shrink-0" />
                <div>
                  <p
                    className={`text-xs font-black ${
                      isSaleActive()
                        ? "text-[#14291D] dark:text-[#F3D17A]"
                        : discount > 0
                        ? "text-emerald-800 dark:text-emerald-400"
                        : isDark
                        ? "text-amber-200"
                        : "text-[#3F4F45]"
                    }`}
                  >
                    {isSaleActive()
                      ? "🎉 10% Discount Applied!"
                      : appliedCoupon
                      ? `🎉 ${appliedCoupon.discountPercent}% Coupon (${appliedCoupon.code}) Applied!`
                      : subtotal >= 1000
                      ? "🎉 10% Discount Unlocked!"
                      : "Get 10% OFF on Orders Above ₹1,000"}
                  </p>
                  <p
                    className={`text-[11px] font-medium ${
                      isDark ? "text-[#FAF3E0]/80" : "text-[#3F4F45]"
                    }`}
                  >
                    {isSaleActive()
                      ? `Flat 10% discount (-₹${discount}) applied sitewide on all items.`
                      : appliedCoupon
                      ? `Flat ${appliedCoupon.discountPercent}% discount (-₹${discount}) applied via coupon ${appliedCoupon.code}. Discounts do not stack (max 10%).`
                      : subtotal >= 1000
                      ? `Flat 10% discount (-₹${discount}) automatically deducted from your total.`
                      : `Add ₹${1000 - subtotal} more to unlock 10% instant savings automatically, or apply a promo code!`}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-black px-3 py-1 rounded-xl shrink-0 border shadow-2xs ${
                discount > 0
                  ? "text-[#14291D] bg-[#E0B04A] border-[#F3D17A]"
                  : "text-stone-700 bg-stone-100 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700"
              }`}>
                {discount > 0 ? "10% APPLIED" : "10% OFFER"}
              </span>
            </div>
          </div>

          {/* Right Column: Price Breakdown & Checkout Action */}
          <div className="lg:col-span-5 space-y-4">
            <div
              className={`rounded-2xl border p-6 shadow-2xs space-y-4 ${
                isDark ? "bg-[#14291D] border-[#1F3D2B]" : "bg-white border-[#F2E8CC]"
              }`}
            >
              <h2
                className={`text-base font-bold font-serif border-b pb-3 ${
                  isDark
                    ? "text-[#FAF3E0] border-[#14291D]"
                    : "text-[#14291D] border-[#F2E8CC]"
                }`}
              >
                Order Summary
              </h2>

              <div className="space-y-2.5 text-xs">
                {regularSubtotal > subtotal && (
                  <div
                    className={`flex items-center justify-between ${
                      isDark ? "text-[#FAF3E0]/70" : "text-[#3F4F45]"
                    }`}
                  >
                    <span>Regular Subtotal</span>
                    <span className="line-through font-semibold">
                      ₹{regularSubtotal}
                    </span>
                  </div>
                )}


                {/* Promo / Instagram Reel Coupon Code Box */}
                <div
                  className={`p-3.5 rounded-xl border space-y-2 ${
                    isDark
                      ? "bg-[#14291D] border-[#1F3D2B]"
                      : "bg-[#FAF3E0]/70 border-[#E0B04A]/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-[#14291D] dark:text-[#FAF3E0]">
                      <Tag className="w-3.5 h-3.5 text-[#E0B04A]" />
                      <span>Have a Promo / Coupon Code?</span>
                    </span>
                    {appliedCoupon && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        Active
                      </span>
                    )}
                  </div>

                  {appliedCoupon ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div className="truncate">
                            <span className="font-mono font-black text-xs">{appliedCoupon.code}</span>
                            <span className="text-[11px] ml-1.5 font-medium">
                              ({appliedCoupon.discountPercent}% Off • 1 use)
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={removeAppliedCoupon}
                          className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-0.5 cursor-pointer shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                      {subtotal >= 1000 && (
                        <p className="text-[10px] text-[#3F4F45] leading-snug">
                          Orders ≥ ₹1,000 already get 10% off automatically (no stacking). You can remove{" "}
                          <strong>{appliedCoupon.code}</strong> to save it for a smaller order!
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value.toUpperCase());
                            setLocalCouponError(null);
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const res = await applyCouponCode(couponInput);
                              if (res.valid) setCouponInput("");
                              else if (res.error) setLocalCouponError(res.error);
                            }
                          }}
                          placeholder="Enter promo code"
                          className="flex-1 px-3 py-2 text-xs font-mono font-bold uppercase rounded-lg bg-white border border-[#E0B04A]/50 text-[#14291D] placeholder-[#3F4F45]/60 focus:outline-none focus:ring-2 focus:ring-[#E0B04A]"
                        />
                        <button
                          type="button"
                          disabled={isValidatingCoupon || !couponInput.trim()}
                          onClick={async () => {
                            const res = await applyCouponCode(couponInput);
                            if (res.valid) setCouponInput("");
                            else if (res.error) setLocalCouponError(res.error);
                          }}
                          className="px-4 py-2 rounded-lg bg-[#1F3D2B] hover:bg-[#14291D] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                        >
                          {isValidatingCoupon ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Wait</span>
                            </>
                          ) : (
                            <span>Apply</span>
                          )}
                        </button>
                      </div>
                      {(localCouponError || couponError) && (
                        <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{localCouponError || couponError}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {discount > 0 && (
                  <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-bold">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#E0B04A]" />
                      <span>{discountLabel || "10% Order Discount"}</span>
                    </span>
                    <span className="font-bold">-₹{discount}</span>
                  </div>
                )}

                                <div
                  className={`flex items-center justify-between ${
                    isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                  }`}
                >
                  <span className="font-medium">Items Subtotal</span>
                  <span
                    className={`font-bold ${
                      isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                    }`}
                  >
                    ₹{subtotal}
                  </span>
                </div>

                <div
                  className={`flex items-center justify-between ${
                    isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>Delivery Fee</span>
                    {shippingFee === 0 && (
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                        FREE
                      </span>
                    )}
                  </div>
                  <span
                    className={`font-bold ${
                      isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                    }`}
                  >
                    {shippingFee === 0 ? "₹0" : `₹${shippingFee}`}
                  </span>
                </div>

                <div
                  className={`pt-3 border-t flex items-center justify-between text-sm ${
                    isDark ? "border-[#14291D]" : "border-[#F2E8CC]"
                  }`}
                >
                  <span
                    className={`font-bold ${
                      isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                    }`}
                  >
                    Total Amount
                  </span>
                  <span
                    className={`text-2xl font-black font-serif ${
                      isDark ? "text-amber-300" : "text-[#E0B04A]"
                    }`}
                  >
                    ₹{total}
                  </span>
                </div>

                <p
                  className={`text-[11px] text-right ${
                    isDark ? "text-[#3F4F45]" : "text-[#3F4F45]"
                  }`}
                >
                  Inclusive of all taxes & GST (GSTIN: {BUSINESS_CONFIG.GSTIN})
                </p>
              </div>

              <button
                type="button"
                onClick={handleProceedToCheckout}
                className="w-full py-4 rounded-xl bg-[#1F3D2B] hover:bg-[#1F3D2B] text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:brightness-110"
              >
                {!currentUser ? (
                  <>
                    <Lock className="w-4 h-4 text-amber-300" />
                    <span>Sign In to Proceed to Checkout</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Delivery & Payment</span>
                    <ArrowRight className="w-4 h-4 text-amber-300" />
                  </>
                )}
              </button>

              <div
                className={`pt-2 text-[11px] space-y-1.5 ${
                  isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Dispatched directly from Peenya 2nd Stage, Bangalore</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>100% Secure Online Payment (UPI, Cards, NetBanking) & Cash on Delivery</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
