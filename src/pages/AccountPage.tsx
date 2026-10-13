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
  Lock,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { BUSINESS_CONFIG } from "../constants";
import { OrderStatus, Order } from "../types";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { LiveOrderTracker } from "../components/LiveOrderTracker";

const ORDER_STEPS: OrderStatus[] = ["Placed", "Packed", "Dispatched", "Delivered"];

export const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetRef = searchParams.get("order");
  const tabParam = searchParams.get("tab");

  const {
    orders,
    getOrder,
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

  const visibleOrders = React.useMemo(() => {
    return orders.filter(
      (o) => (o.orderStatus as string) !== "Replaced by COD"
    );
  }, [orders]);

  const [guestLookedUpOrder, setGuestLookedUpOrder] = useState<Order | null>(null);
  const [lookupInputRef, setLookupInputRef] = useState(targetRef || "");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

  const [searchQuery, setSearchQuery] = useState(targetRef || "");
  const [selectedOrderRef, setSelectedOrderRef] = useState<string>(
    targetRef || (visibleOrders[0]?.orderRef || "")
  );

  // If order param passed in URL, load it
  useEffect(() => {
    if (targetRef) {
      setSelectedOrderRef(targetRef);
      const existing = getOrder(targetRef);
      if (existing) {
        setGuestLookedUpOrder(existing);
      } else {
        // Fetch from Firestore
        getDoc(doc(db, "orders", targetRef))
          .then((snap) => {
            if (snap.exists()) {
              setGuestLookedUpOrder(snap.data() as Order);
            }
          })
          .catch(() => {});
      }
    }
  }, [targetRef, getOrder]);

  const handleLookupOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRef = lookupInputRef.trim();
    if (!cleanRef) {
      setLookupError("Please enter your Order Reference (e.g. MV-123456)");
      return;
    }
    setLookupLoading(true);
    setLookupError("");

    try {
      const match = getOrder(cleanRef);
      if (match) {
        setGuestLookedUpOrder(match);
        setSelectedOrderRef(match.orderRef);
        showToast(`Tracking Order #${match.orderRef}`);
        setLookupLoading(false);
        return;
      }

      const snap = await getDoc(doc(db, "orders", cleanRef));
      if (snap.exists()) {
        const ordData = snap.data() as Order;
        setGuestLookedUpOrder(ordData);
        setSelectedOrderRef(ordData.orderRef);
        showToast(`Tracking Order #${ordData.orderRef}`);
      } else {
        setLookupError(`Order #${cleanRef} was not found. Please verify reference.`);
      }
    } catch {
      setLookupError("Could not retrieve order. Please check reference.");
    } finally {
      setLookupLoading(false);
    }
  };

  // Profile fields for editing
  const [name, setName] = useState(currentUser?.displayName || address.fullName);
  const [phone, setPhone] = useState(address.phone);
  const [addressLine, setAddressLine] = useState(address.addressLine1);
  const [landmark, setLandmark] = useState(address.landmark);

  // Auto-sync profile inputs when global address changes anywhere
  useEffect(() => {
    if (address) {
      if (address.fullName) setName(address.fullName);
      if (address.phone) setPhone(address.phone);
      if (address.addressLine1) setAddressLine(address.addressLine1);
      if (address.landmark) setLandmark(address.landmark);
    }
  }, [address]);

  useEffect(() => {
    if (currentUser?.displayName && !name) {
      setName(currentUser.displayName);
    }
  }, [currentUser]);

  useEffect(() => {
    if (targetRef) {
      setSelectedOrderRef(targetRef);
    } else if (visibleOrders.length > 0 && !selectedOrderRef) {
      setSelectedOrderRef(visibleOrders[0].orderRef);
    }
  }, [targetRef, visibleOrders]);

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

  const activeOrder =
    (guestLookedUpOrder && (guestLookedUpOrder.orderRef === selectedOrderRef || guestLookedUpOrder.id === selectedOrderRef) ? guestLookedUpOrder : null) ||
    visibleOrders.find((o) => o.orderRef === selectedOrderRef || o.id === selectedOrderRef) ||
    guestLookedUpOrder ||
    visibleOrders[0];

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

  // MANDATORY AUTHENTICATION GATE:
  // If user is not logged in, require them to log in to access orders and tracking
  if (!currentUser) {
    return (
      <div
        className={`w-full min-h-[calc(100vh-80px)] py-16 flex items-center justify-center transition-colors box-border ${
          isDark ? "bg-[#140D09] text-[#FAF4EA]" : "bg-[#FAF7F2] text-[#24140A]"
        }`}
      >
        <div
          className={`max-w-md w-full mx-4 p-8 sm:p-10 rounded-3xl border text-center space-y-6 shadow-xl ${
            isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
          }`}
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#E08F35]">
            <Lock className="w-8 h-8 text-[#E08F35]" />
          </div>
          <div className="space-y-2">
            <h1
              className={`text-2xl font-bold font-serif ${
                isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
              }`}
            >
              Sign In to Track Orders
            </h1>
            <p
              className={`text-xs sm:text-sm leading-relaxed ${
                isDark ? "text-[#D8C8B8]" : "text-[#5C4230]"
              }`}
            >
              Your order history, live parcel tracking, and invoices are private to your account. Please log in or register with your phone number or Google account to view and track your orders.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLoginModalOpen(true)}
            className="w-full py-3.5 rounded-2xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4 text-amber-300" />
            <span>Sign In / Create Account</span>
          </button>
          <div className="pt-2">
            <Link
              to="/"
              className={`text-xs font-semibold hover:underline ${
                isDark ? "text-amber-400" : "text-[#5E3210]"
              }`}
            >
              ← Back to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            {/* Quick Guest / Direct Tracking Lookup */}
            <div
              className={`p-5 rounded-3xl border shadow-sm space-y-3 ${
                isDark ? "bg-[#1A1009] border-[#3B2516]" : "bg-white border-[#E8DFC8]"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#E08F35]" />
                  <span className="font-bold text-xs">Direct Order Tracker (In-Website)</span>
                </div>
                <span className={`text-[11px] ${isDark ? "text-[#A89482]" : "text-[#7A5E48]"}`}>
                  Real-time visual tracking directly on our website
                </span>
              </div>

              <form onSubmit={handleLookupOrder} className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  placeholder="Enter Order Reference (e.g. MV-123456)..."
                  value={lookupInputRef}
                  onChange={(e) => setLookupInputRef(e.target.value)}
                  className={`flex-1 px-4 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 transition-colors ${
                    isDark
                      ? "bg-[#140D07] border border-[#362114] text-[#FAF4EA] placeholder-[#8A7665]"
                      : "bg-[#FAF7F2] border border-[#DDD1BE] text-[#1F120A] placeholder-[#8A7665]"
                  }`}
                />
                <button
                  type="submit"
                  disabled={lookupLoading}
                  className="px-5 py-2.5 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white text-xs font-bold transition-all cursor-pointer shrink-0 disabled:opacity-50 shadow-sm"
                >
                  {lookupLoading ? "Locating..." : "Track Order"}
                </button>
              </form>
              {lookupError && (
                <p className="text-[11px] text-red-500 font-semibold">{lookupError}</p>
              )}
            </div>

            {/* Active Order Live Tracker */}
            {activeOrder ? (
              <LiveOrderTracker order={activeOrder} themeMode={themeMode} />
            ) : (
              <div
                className={`p-10 rounded-3xl border text-center space-y-4 ${
                  isDark
                    ? "bg-[#1C120B] border-[#362114]"
                    : "bg-white border-[#E8DEC8]"
                }`}
              >
                <ShoppingBag className="w-12 h-12 text-[#C8BAA8] mx-auto" />
                <div className="space-y-1">
                  <h3
                    className={`font-bold text-sm font-serif ${
                      isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                    }`}
                  >
                    No Active Orders Displayed
                  </h3>
                  <p
                    className={`text-xs max-w-md mx-auto ${
                      isDark ? "text-[#D8C8B8]" : "text-[#6A523E]"
                    }`}
                  >
                    Orders placed by you will be visible here. Enter your Order Reference number above to track your order, or sign in to access past orders.
                  </p>
                </div>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs shadow-sm transition-all"
                >
                  <span>Browse Pure Cold-Pressed Oils</span>
                </Link>
              </div>
            )}

          {/* Past Orders List */}
          {visibleOrders.length > 0 && (
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
                All Orders ({visibleOrders.length})
              </h3>
              <div className="space-y-3">
                {visibleOrders.map((ord) => (
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
