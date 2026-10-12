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
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { BUSINESS_CONFIG } from "../constants";

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    cart,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    discount,
    shippingFee,
    total,
    freeShippingProgress,
    freeShippingShortfall,
    loyalty,
    loyaltyRemainingText,
    openLoyaltyQuiz,
    cmsConfig,
    address,
    setFlipkartModalOpen,
    themeMode,
  } = useStore();

  const isDark = themeMode === "dark";

  if (cart.length === 0) {
    return (
      <div
        className={`w-full min-h-[calc(100vh-80px)] py-20 flex items-center justify-center transition-colors box-border ${
          isDark ? "bg-[#140D09] text-[#FAF4EA]" : "bg-[#FAF6F0] text-[#23150C]"
        }`}
      >
        <div
          className={`max-w-lg w-full mx-4 p-10 rounded-3xl border text-center space-y-6 shadow-sm ${
            isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
          }`}
        >
          <div
            className={`w-20 h-20 mx-auto rounded-full border-2 flex items-center justify-center ${
              isDark ? "bg-[#150D07] border-[#362114]" : "bg-[#FAF6EE] border-[#E8DEC8]"
            }`}
          >
            <ShoppingBag className={`w-8 h-8 ${isDark ? "text-amber-400" : "text-[#C8751B]"}`} />
          </div>
          <div className="space-y-2">
            <h1
              className={`text-2xl font-bold font-serif ${
                isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
              }`}
            >
              Your Bag is Empty
            </h1>
            <p className={`text-xs sm:text-sm ${isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"}`}>
              Experience authentic unrefined wood-pressed oils fresh from our Bengaluru packaging facility.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <span>Explore Wood-Pressed Oils</span>
            <ArrowRight className="w-4 h-4 text-amber-300" />
          </Link>
        </div>
      </div>
    );
  }

  const handleProceedToCheckout = () => {
    if (!address.pincode.trim().startsWith("560")) {
      setFlipkartModalOpen(true);
      return;
    }
    navigate("/checkout");
  };

  return (
    <div
      className={`w-full min-h-[calc(100vh-80px)] py-8 transition-colors box-border ${
        isDark ? "bg-[#140D09] text-[#FAF4EA]" : "bg-[#FAF6F0] text-[#23150C]"
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
                  ? "bg-[#1C120B] border-[#362114] text-[#D6C4B0] hover:text-white"
                  : "bg-white border-[#E8DEC8] text-[#5A402D] hover:bg-[#FAF6EE]"
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1
                className={`text-2xl sm:text-3xl font-extrabold font-serif ${
                  isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                }`}
              >
                Shopping Bag
              </h1>
              <p className={`text-xs ${isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"}`}>
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
            isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#E08F35]" />
              <span className={`font-bold ${isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}`}>
                {freeShippingProgress >= 100
                  ? "🎉 Congratulations! You have unlocked FREE Doorstep Delivery across Bangalore!"
                  : `Add ₹${freeShippingShortfall} more to unlock FREE Doorstep Delivery (Threshold: ₹${cmsConfig.freeShippingThreshold})`}
              </span>
            </div>
            <span
              className={`font-mono text-xs font-bold ${
                isDark ? "text-amber-300" : "text-[#5E3210]"
              }`}
            >
              {freeShippingProgress}%
            </span>
          </div>
          <div
            className={`w-full h-2.5 rounded-full overflow-hidden ${
              isDark ? "bg-[#150D07]" : "bg-[#EFE9DF]"
            }`}
          >
            <div
              className="bg-gradient-to-r from-[#E08F35] to-[#2E7D32] h-full transition-all duration-500 rounded-full"
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
                className={`p-4 sm:p-5 rounded-2xl border shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
                }`}
              >
                <div className="flex items-center gap-4">
                  <img
                    src={item.image}
                    alt={item.title}
                    className={`w-16 h-20 object-contain p-1 rounded-xl border shrink-0 ${
                      isDark
                        ? "bg-[#150D07] border-[#362114]"
                        : "bg-[#FAF6EE] border-[#E8DEC8]"
                    }`}
                  />
                  <div className="space-y-1">
                    <h3
                      className={`text-sm font-bold font-serif ${
                        isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                      }`}
                    >
                      {item.title}
                    </h3>
                    <p className={`text-xs ${isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"}`}>
                      {item.subtitle} • {item.variant}
                    </p>
                    <div className="flex items-baseline gap-2 pt-0.5">
                      <span
                        className={`text-sm font-extrabold ${
                          isDark ? "text-amber-300" : "text-[#C8751B]"
                        }`}
                      >
                        ₹{item.price}
                      </span>
                      {item.regularPrice > item.price && (
                        <span
                          className={`text-xs line-through ${
                            isDark ? "text-[#8C7A6B]" : "text-[#8C7A6B]"
                          }`}
                        >
                          ₹{item.regularPrice}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quantity Stepper & Subtotal */}
                <div
                  className={`flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 ${
                    isDark ? "border-[#2D1B10]" : "border-[#FAF6EE]"
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 p-1 rounded-xl border ${
                      isDark
                        ? "bg-[#150D07] border-[#362114]"
                        : "bg-[#FAF6EE] border-[#E5DAC8]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, -1)}
                      className={`w-7 h-7 rounded-lg border text-xs font-bold flex items-center justify-center cursor-pointer ${
                        isDark
                          ? "bg-[#25150C] border-[#4D2E1A] text-[#FAF4EA] hover:bg-[#361E10]"
                          : "bg-white border-[#DDD1BE] text-[#5A381E] hover:bg-[#F3EDE2]"
                      }`}
                    >
                      -
                    </button>
                    <span
                      className={`text-xs font-bold px-1.5 ${
                        isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                      }`}
                    >
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, 1)}
                      className={`w-7 h-7 rounded-lg border text-xs font-bold flex items-center justify-center cursor-pointer ${
                        isDark
                          ? "bg-[#25150C] border-[#4D2E1A] text-[#FAF4EA] hover:bg-[#361E10]"
                          : "bg-white border-[#DDD1BE] text-[#5A381E] hover:bg-[#F3EDE2]"
                      }`}
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-base font-black font-serif ${
                        isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                      }`}
                    >
                      ₹{item.price * item.quantity}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    aria-label="Remove item"
                    className="p-1.5 text-[#8C7A6B] hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Bottle QR Loyalty Discount Card */}
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                isDark
                  ? "bg-[#1C120B] border-[#362114]"
                  : "bg-amber-50 border border-amber-200/80"
              }`}
            >
              <div className="flex items-center gap-3">
                <QrCode className="w-5 h-5 text-[#E08F35] shrink-0" />
                <div>
                  <p
                    className={`text-xs font-bold ${
                      isDark ? "text-amber-200" : "text-[#5A381E]"
                    }`}
                  >
                    {loyalty.isActive
                      ? "10% Bottle QR Loyalty Program Active"
                      : "Have an empty MANOPAVANA bottle at home?"}
                  </p>
                  <p
                    className={`text-[11px] ${
                      isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"
                    }`}
                  >
                    {loyalty.isActive
                      ? `Enjoy 10% off repeat orders (${loyaltyRemainingText})`
                      : "Verify your bottle tagline to unlock 10% repeat order discount!"}
                  </p>
                </div>
              </div>
              {!loyalty.isActive ? (
                <button
                  type="button"
                  onClick={() => openLoyaltyQuiz()}
                  className="px-3.5 py-1.5 rounded-xl bg-[#5E3210] text-white font-bold text-xs hover:bg-[#43230A] transition-colors shrink-0 cursor-pointer"
                >
                  Scan & Save
                </button>
              ) : (
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                  Applied
                </span>
              )}
            </div>
          </div>

          {/* Right Column: Price Breakdown & Checkout Action */}
          <div className="lg:col-span-5 space-y-4">
            <div
              className={`rounded-2xl border p-6 shadow-2xs space-y-4 ${
                isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
              }`}
            >
              <h2
                className={`text-base font-bold font-serif border-b pb-3 ${
                  isDark
                    ? "text-[#FAF4EA] border-[#2D1B10]"
                    : "text-[#23150C] border-[#EFE8DC]"
                }`}
              >
                Order Summary
              </h2>

              <div className="space-y-2.5 text-xs">
                <div
                  className={`flex items-center justify-between ${
                    isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"
                  }`}
                >
                  <span>Items Subtotal</span>
                  <span
                    className={`font-bold ${
                      isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                    }`}
                  >
                    ₹{subtotal}
                  </span>
                </div>

                {loyalty.isActive && (
                  <div className="flex items-center justify-between text-emerald-600 font-medium">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Bottle Loyalty Discount (10%)</span>
                    </span>
                    <span className="font-bold">-₹{discount}</span>
                  </div>
                )}

                <div
                  className={`flex items-center justify-between ${
                    isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>Bangalore Delivery Fee</span>
                    {shippingFee === 0 && (
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                        FREE
                      </span>
                    )}
                  </div>
                  <span
                    className={`font-bold ${
                      isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                    }`}
                  >
                    {shippingFee === 0 ? "₹0" : `₹${shippingFee}`}
                  </span>
                </div>

                <div
                  className={`pt-3 border-t flex items-center justify-between text-sm ${
                    isDark ? "border-[#2D1B10]" : "border-[#EFE8DC]"
                  }`}
                >
                  <span
                    className={`font-bold ${
                      isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                    }`}
                  >
                    Total Amount
                  </span>
                  <span
                    className={`text-2xl font-black font-serif ${
                      isDark ? "text-amber-300" : "text-[#C8751B]"
                    }`}
                  >
                    ₹{total}
                  </span>
                </div>

                <p
                  className={`text-[11px] text-right ${
                    isDark ? "text-[#A8907E]" : "text-[#7A5E48]"
                  }`}
                >
                  Inclusive of all taxes & GST (GSTIN: {BUSINESS_CONFIG.GSTIN})
                </p>
              </div>

              <button
                type="button"
                onClick={handleProceedToCheckout}
                className="w-full py-4 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to Delivery & Payment</span>
                <ArrowRight className="w-4 h-4 text-amber-300" />
              </button>

              <div
                className={`pt-2 text-[11px] space-y-1.5 ${
                  isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Dispatched directly from Peenya 2nd Stage, Bangalore</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>100% Secure Payment via PhonePe Official Gateway</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
