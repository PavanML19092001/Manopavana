import React, { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import {
  User,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  QrCode,
  ShieldCheck,
  Search,
  MessageCircle,
  ExternalLink,
  Phone,
  LogIn,
  ShoppingBag,
  ShieldAlert,
  LogOut,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { BUSINESS_CONFIG } from "../constants";
import { OrderStatus } from "../types";

const ORDER_STEPS: OrderStatus[] = ["Placed", "Packed", "Dispatched", "Delivered"];

export const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetRef = searchParams.get("order");
  const tabParam = searchParams.get("tab");

  const {
    orders,
    address,
    updateAddress,
    loyalty,
    loyaltyRemainingText,
    openLoyaltyQuiz,
    showToast,
    currentUser,
    setLoginModalOpen,
    logoutUser,
    themeMode,
  } = useStore();

  const isDark = themeMode === "dark";

  const [searchQuery, setSearchQuery] = useState(targetRef || "");
  const [selectedOrderRef, setSelectedOrderRef] = useState<string>(
    targetRef || (orders[0]?.orderRef || "")
  );

  // Profile fields for editing
  const [name, setName] = useState(currentUser?.displayName || address.fullName);
  const [phone, setPhone] = useState(address.phone);
  const [addressLine, setAddressLine] = useState(address.addressLine1);
  const [landmark, setLandmark] = useState(address.landmark);

  useEffect(() => {
    if (targetRef) {
      setSelectedOrderRef(targetRef);
    } else if (orders.length > 0 && !selectedOrderRef) {
      setSelectedOrderRef(orders[0].orderRef);
    }
  }, [targetRef, orders]);

  // Auto-scroll when navigating with ?tab=profile, ?tab=addresses, or ?tab=orders
  useEffect(() => {
    if (tabParam === "profile" || tabParam === "addresses") {
      const el = document.getElementById("profile-card");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else if (tabParam === "orders") {
      const el = document.getElementById("orders-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [tabParam]);

  const activeOrder = orders.find(
    (o) => o.orderRef === selectedOrderRef || o.id === selectedOrderRef
  ) || orders[0];

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateAddress({
      fullName: name,
      phone,
      addressLine1: addressLine,
      landmark,
    });
    showToast("Profile details updated & synced across the store!");
  };

  const getStepIndex = (status: OrderStatus) => {
    const idx = ORDER_STEPS.indexOf(status);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div
      className={`w-full min-h-[calc(100vh-80px)] py-8 transition-colors box-border ${
        isDark ? "bg-[#140D09] text-[#FAF4EA]" : "bg-[#FAF7F2] text-[#24140A]"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1
              className={`text-2xl sm:text-3xl font-extrabold font-serif ${
                isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
              }`}
            >
              My Account & Order Tracking
            </h1>
            <p className={`text-xs ${isDark ? "text-[#D8C8B8]" : "text-[#5C4230]"}`}>
              Real-time Firestore sync • Peenya facility dispatch status
              {currentUser && ` • Signed in as ${currentUser.displayName || currentUser.email}`}
            </p>
          </div>

          {/* Quick Search & Top-Right Sign Out */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search
                className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                  isDark ? "text-[#A89482]" : "text-[#7A5E48]"
                }`}
              />
              <input
                type="text"
                placeholder="Search Order Ref (e.g. MV-123456)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  const match = orders.find(
                    (o) =>
                      o.orderRef.toLowerCase().includes(e.target.value.toLowerCase()) ||
                      o.id.toLowerCase().includes(e.target.value.toLowerCase())
                  );
                  if (match) setSelectedOrderRef(match.orderRef);
                }}
                className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 transition-colors ${
                  isDark
                    ? "bg-[#1C120B] border border-[#3A2417] text-[#FAF4EA] placeholder-[#8A7665]"
                    : "bg-white border border-[#DDD1BE] text-[#1F120A] placeholder-[#8A7665]"
                }`}
              />
            </div>

            {currentUser && (
              <button
                type="button"
                onClick={async () => {
                  await logoutUser();
                  navigate("/");
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border border-red-200 text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-2xs"
                title="Sign Out of Account"
              >
                <LogOut className="w-3.5 h-3.5 text-red-600" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Guest Banner if not signed in */}
        {!currentUser && (
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
              isDark
                ? "bg-[#1E130B] border-[#3D2514] text-amber-200"
                : "bg-amber-50/80 border-amber-200 text-[#5A381E]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LogIn className="w-5 h-5 text-[#E08F35] shrink-0" />
              <div>
                <p className="font-bold">Sign in with Google or Phone to sync all Firestore orders</p>
                <p className={`text-[11px] ${isDark ? "text-[#D8C8B8]" : "text-[#7A5E48]"}`}>
                  Access past invoices and live delivery tracking timelines on any device.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLoginModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs"
            >
              Sign In with 1-Click
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Live Order Tracking Timeline */}
          <div id="orders-section" className="lg:col-span-8 space-y-6">
            {activeOrder ? (
              <div
                className={`rounded-2xl border p-6 shadow-2xs space-y-6 ${
                  isDark
                    ? "bg-[#1C120B] border-[#362114]"
                    : "bg-white border-[#E8DEC8]"
                }`}
              >
                <div
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${
                    isDark ? "border-[#2D1B10]" : "border-[#EFE8DC]"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-base font-bold font-serif ${
                          isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                        }`}
                      >
                        Order #{activeOrder.orderRef}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          activeOrder.paymentStatus === "COMPLETED" ||
                          (activeOrder.paymentStatus as string) === "PHONEPE_PAID"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {activeOrder.paymentMethod === "cod"
                          ? "Cash on Delivery"
                          : activeOrder.paymentStatus === "COMPLETED" || (activeOrder.paymentStatus as string) === "PHONEPE_PAID"
                          ? "Online Paid"
                          : "Online Pending"}
                      </span>
                    </div>
                    <p
                      className={`text-xs mt-0.5 ${
                        isDark ? "text-[#D8C8B8]" : "text-[#6A523E]"
                      }`}
                    >
                      Placed: {activeOrder.date} • Total: ₹{activeOrder.total}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span
                      className={`text-xs font-semibold block ${
                        isDark ? "text-[#A89482]" : "text-[#7A5E48]"
                      }`}
                    >
                      Tracking ID
                    </span>
                    <span className="text-xs font-mono font-bold text-[#E08F35]">
                      {activeOrder.trackingNumber || "MV-BLR-Pending"}
                    </span>
                  </div>
                </div>

                {/* 4-Step Visual Progress Bar */}
                <div className="py-4">
                  <div className="relative flex items-center justify-between">
                    {/* Progress Line */}
                    <div
                      className={`absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 z-0 ${
                        isDark ? "bg-[#2D1B10]" : "bg-[#EFE9DF]"
                      }`}
                    />
                    <div
                      className="absolute top-1/2 left-0 -translate-y-1/2 h-1 bg-[#E08F35] z-0 transition-all duration-500"
                      style={{
                        width: `${(getStepIndex(activeOrder.orderStatus) / (ORDER_STEPS.length - 1)) * 100}%`,
                      }}
                    />

                    {ORDER_STEPS.map((step, idx) => {
                      const currentIdx = getStepIndex(activeOrder.orderStatus);
                      const isPassed = idx <= currentIdx;
                      const isCurrent = idx === currentIdx;

                      return (
                        <div
                          key={step}
                          className="relative z-10 flex flex-col items-center group"
                        >
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-sm ${
                              isPassed
                                ? "bg-[#5E3210] text-amber-300 ring-4 ring-[#FAF6EE]"
                                : isDark
                                ? "bg-[#150D07] text-[#8C7A6B] border-2 border-[#3D2514]"
                                : "bg-white text-[#8C7A6B] border-2 border-[#DDD1BE]"
                            } ${isCurrent ? "scale-110 ring-[#E08F35]/50 ring-4" : ""}`}
                          >
                            {isPassed ? (
                              <CheckCircle2 className="w-5 h-5 text-amber-300" />
                            ) : (
                              <span>0{idx + 1}</span>
                            )}
                          </div>
                          <span
                            className={`text-xs font-bold mt-2 ${
                              isCurrent
                                ? "text-[#E08F35]"
                                : isPassed
                                ? isDark
                                  ? "text-[#FAF4EA]"
                                  : "text-[#1F120A]"
                                : isDark
                                ? "text-[#8C7A6B]"
                                : "text-[#8C7A6B]"
                            }`}
                          >
                            {step}
                          </span>
                          <span
                            className={`text-[10px] ${
                              isDark ? "text-[#A89482]" : "text-[#7A5E48]"
                            }`}
                          >
                            {step === "Placed"
                              ? "Confirmed"
                              : step === "Packed"
                              ? "Peenya Facility"
                              : step === "Dispatched"
                              ? "In Transit"
                              : "At Doorstep"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              {/* Dispatch Logistics Detail */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
                  isDark
                    ? "bg-[#160D07] border-[#362114]"
                    : "bg-[#FAF6EE] border-[#E8DEC8]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-[#E08F35] shrink-0" />
                  <div>
                    <span
                      className={`font-bold block ${
                        isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                      }`}
                    >
                      Carrier: {activeOrder.courier || "MANOPAVANA Peenya Express"}
                    </span>
                    <span
                      className={`text-[11px] ${
                        isDark ? "text-[#D8C8B8]" : "text-[#6A523E]"
                      }`}
                    >
                      Delivering to: {activeOrder.shippingAddress.addressLine1},{" "}
                      {activeOrder.shippingAddress.city} - {activeOrder.shippingAddress.pincode}
                    </span>
                  </div>
                </div>

                <a
                  href={`https://wa.me/${BUSINESS_CONFIG.PHONE_RAW}?text=Hi%20MANOPAVANA,%20regarding%20my%20order%20${activeOrder.orderRef}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Updates</span>
                </a>
              </div>

              {/* Order Items List */}
              <div className="space-y-3 pt-2">
                <h4
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isDark ? "text-[#D8C8B8]" : "text-[#6A523E]"
                  }`}
                >
                  Order Items Breakdown
                </h4>
                <div
                  className={`divide-y ${
                    isDark ? "divide-[#2D1B10]" : "divide-[#EFE8DC]"
                  }`}
                >
                  {activeOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="py-3 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.title}
                          className={`w-10 h-10 object-contain p-1 rounded-lg ${
                            isDark ? "bg-[#150D07]" : "bg-[#FAF6EE]"
                          }`}
                        />
                        <div>
                          <p
                            className={`font-bold ${
                              isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                            }`}
                          >
                            {item.title}
                          </p>
                          <p
                            className={`text-[11px] ${
                              isDark ? "text-[#A89482]" : "text-[#7A5E48]"
                            }`}
                          >
                            {item.variant} x {item.quantity}
                          </p>
                        </div>
                      </div>
                      <span className="font-black text-[#E08F35]">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`p-10 rounded-2xl border text-center space-y-4 ${
                isDark
                  ? "bg-[#1C120B] border-[#362114]"
                  : "bg-white border-[#E8DEC8]"
              }`}
            >
              <ShoppingBag className="w-10 h-10 text-[#C8BAA8] mx-auto" />
              <div className="space-y-1">
                <h3
                  className={`font-bold text-sm ${
                    isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                  }`}
                >
                  No Orders Yet
                </h3>
                <p
                  className={`text-xs ${
                    isDark ? "text-[#D8C8B8]" : "text-[#6A523E]"
                  }`}
                >
                  Your placed orders with live Firestore tracking will appear here.
                </p>
              </div>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs shadow-sm transition-all"
              >
                <span>Browse Cold-Pressed Oils</span>
              </Link>
            </div>
          )}

          {/* Past Orders List */}
          {orders.length > 0 && (
            <div
              className={`rounded-2xl border p-6 shadow-2xs space-y-4 ${
                isDark
                  ? "bg-[#1C120B] border-[#362114]"
                  : "bg-white border-[#E8DEC8]"
              }`}
            >
              <h3
                className={`text-sm font-bold font-serif ${
                  isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                }`}
              >
                All Orders ({orders.length})
              </h3>
              <div className="space-y-3">
                {orders.map((ord) => (
                  <div
                    key={ord.orderRef}
                    onClick={() => setSelectedOrderRef(ord.orderRef)}
                    className={`p-3.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                      selectedOrderRef === ord.orderRef
                        ? "bg-amber-500/10 border-[#E08F35] ring-1 ring-[#E08F35]"
                        : isDark
                        ? "bg-[#150D07] border-[#362114] hover:border-[#4D2E1A]"
                        : "bg-[#FAF7F2] border-[#E8DEC8] hover:border-[#DDD1BE]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold ${
                            isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                          }`}
                        >
                          #{ord.orderRef}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded border ${
                            isDark
                              ? "bg-[#1C120B] border-[#3D2514] text-amber-200"
                              : "bg-white border-[#DDD1BE] text-[#5A381E]"
                          }`}
                        >
                          {ord.orderStatus}
                        </span>
                      </div>
                      <p
                        className={`text-[11px] mt-0.5 ${
                          isDark ? "text-[#A89482]" : "text-[#7A5E48]"
                        }`}
                      >
                        {ord.date} • {ord.items.length} items
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-[#E08F35] block">
                        ₹{ord.total}
                      </span>
                      <span className="text-[10px] text-emerald-500 font-bold">
                        {ord.paymentStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Profile & Loyalty Card */}
        <div className="lg:col-span-4 space-y-6">
          {/* Bottle QR Loyalty Card */}
          <div
            className={`rounded-2xl p-5 shadow-sm space-y-3 ${
              isDark
                ? "bg-[#1C120B] border border-[#362114] text-white"
                : "bg-[#25150C] text-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-[#E08F35]" />
                Loyalty Reorder Program
              </span>
              {loyalty.isActive && (
                <span className="text-[10px] font-black bg-emerald-600 px-2 py-0.5 rounded-full text-white">
                  Active
                </span>
              )}
            </div>

            <p className="text-xs text-[#D6C4B0] leading-relaxed">
              {loyalty.isActive
                ? `10% discount applied to your account. ${loyaltyRemainingText}`
                : "Own a previous MANOPAVANA bottle? Verify the front label to unlock 10% off for 7 days."}
            </p>

            <button
              type="button"
              onClick={() => openLoyaltyQuiz()}
              className="w-full py-2.5 rounded-xl bg-[#E08F35] hover:bg-[#F59E0B] text-[#29170C] font-black text-xs transition-colors cursor-pointer"
            >
              {loyalty.isActive ? "Scan Another Bottle" : "Scan Bottle QR (10% Off)"}
            </button>
          </div>

          {/* Profile & Default Delivery Address */}
          <div
            id="profile-card"
            className={`rounded-2xl border p-5 shadow-2xs space-y-4 ${
              isDark
                ? "bg-[#1C120B] border-[#362114]"
                : "bg-white border-[#E8DEC8]"
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-3 ${
                isDark ? "border-[#2D1B10]" : "border-[#EFE8DC]"
              }`}
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#E08F35]" />
                <h3
                  className={`text-sm font-bold font-serif ${
                    isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                  }`}
                >
                  Customer Profile & Address
                </h3>
              </div>
              {currentUser && (
                <button
                  type="button"
                  onClick={async () => {
                    await logoutUser();
                    navigate("/");
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-colors cursor-pointer"
                  title="Sign Out of Account"
                >
                  <LogOut className="w-3 h-3 text-red-600" />
                  <span>Logout</span>
                </button>
              )}
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-3 text-xs">
              <div>
                <label
                  className={`block font-semibold mb-1 ${
                    isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"
                  }`}
                >
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Manoj Kumar"
                  className={`w-full px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 transition-colors ${
                    isDark
                      ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA] placeholder-[#8A7665]"
                      : "bg-white border border-[#DDD1BE] text-[#1F120A] placeholder-[#8A7665]"
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block font-semibold mb-1 ${
                    isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"
                  }`}
                >
                  WhatsApp Contact
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9180301917"
                  className={`w-full px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 transition-colors ${
                    isDark
                      ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA] placeholder-[#8A7665]"
                      : "bg-white border border-[#DDD1BE] text-[#1F120A] placeholder-[#8A7665]"
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block font-semibold mb-1 ${
                    isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"
                  }`}
                >
                  Primary Street Address
                </label>
                <input
                  type="text"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="118, Raghavendra Layout, Thigalarapalya"
                  className={`w-full px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 transition-colors ${
                    isDark
                      ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA] placeholder-[#8A7665]"
                      : "bg-white border border-[#DDD1BE] text-[#1F120A] placeholder-[#8A7665]"
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block font-semibold mb-1 ${
                    isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"
                  }`}
                >
                  Landmark
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="Near Water Tank"
                  className={`w-full px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 transition-colors ${
                    isDark
                      ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA] placeholder-[#8A7665]"
                      : "bg-white border border-[#DDD1BE] text-[#1F120A] placeholder-[#8A7665]"
                  }`}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold transition-colors cursor-pointer shadow-sm"
                >
                  Save & Sync Address
                </button>
              </div>

              {currentUser?.email === "manopavana@gmail.com" && (
                <div
                  className={`pt-3 border-t ${
                    isDark ? "border-[#2D1B10]" : "border-[#EFE8DC]"
                  }`}
                >
                  <Link
                    to="/admin"
                    className="w-full py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-[#E08F35] border border-[#E08F35]/40 font-bold flex items-center justify-center gap-2 transition-colors text-xs"
                  >
                    <ShieldAlert className="w-4 h-4 text-[#E08F35]" />
                    <span>Open Admin Storefront CMS & Dispatch Hub</span>
                  </Link>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};
