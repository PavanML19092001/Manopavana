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
  Edit2,
  Trash2,
  Plus,
} from "lucide-react";
import { useStore, LabeledAddress } from "../context/StoreContext";
import { BUSINESS_CONFIG, INDIAN_STATES_DISTRICTS } from "../constants";
import { extractCleanPhone, isSyntheticAccount } from "../firebase";
import { OrderStatus, Order } from "../types";
import { LiveOrderTracker } from "../components/LiveOrderTracker";

export const AccountPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetRef = searchParams.get("order");
  const tabParam = searchParams.get("tab");

  const {
    orders,
    address,
    savedAddresses,
    selectSavedAddress,
    saveNewAddress,
    updateSavedAddress,
    deleteSavedAddress,
    updateAddress,
    loyalty,
    loyaltyRemainingText,
    openLoyaltyQuiz,
    showToast,
    currentUser,
    customerProfile,
    saveProfile,
    setLoginModalOpen,
    logoutUser,
    themeMode,
  } = useStore();

  const isDark = themeMode === "dark";

  const visibleOrders = React.useMemo(() => {
    const seen = new Set<string>();
    const res: Order[] = [];
    const userUid = currentUser?.uid;
    const primaryUid = customerProfile?.primaryUid;
    const userPhone = customerProfile?.phone || (currentUser?.phoneNumber ? extractCleanPhone(currentUser.phoneNumber) : "");
    const phoneUid = userPhone ? `phone_${userPhone}` : undefined;
    const allowedUids = new Set([userUid, primaryUid, phoneUid].filter(Boolean) as string[]);

    if (allowedUids.size === 0 && !userPhone) return [];

    for (const o of orders) {
      const orderPhone = extractCleanPhone(o.customerPhone || o.shippingAddress?.phone || "");
      const isMine =
        (o.customerUid && allowedUids.has(o.customerUid)) ||
        ((o as any).firebaseUid && allowedUids.has((o as any).firebaseUid)) ||
        (userPhone && orderPhone && orderPhone === userPhone);

      if (isMine) {
        const key = o.orderRef || o.id;
        if (key && !seen.has(key)) {
          seen.add(key);
          res.push(o);
        }
      }
    }
    return res;
  }, [orders, currentUser, customerProfile?.primaryUid, customerProfile?.phone]);

  const [searchQuery, setSearchQuery] = useState(targetRef || "");
  const [selectedOrderRef, setSelectedOrderRef] = useState<string>(
    targetRef || (visibleOrders[0]?.orderRef || "")
  );

  // Sync selected order with URL parameter or default to latest order
  useEffect(() => {
    if (targetRef) {
      setSelectedOrderRef(targetRef);
    } else if (visibleOrders.length > 0 && !selectedOrderRef) {
      setSelectedOrderRef(visibleOrders[0].orderRef);
    }
  }, [targetRef, visibleOrders]);

  const handleSelectOrder = (orderRef: string) => {
    setSelectedOrderRef(orderRef);
    setSearchParams({ order: orderRef });
  };

  // Resolved human-friendly display name (zero machine ID leak)
  const resolvedDisplayName =
    (customerProfile?.name &&
      !customerProfile.name.toLowerCase().startsWith("user_") &&
      customerProfile.name !== "Customer" &&
      customerProfile.name !== "Valued Customer" &&
      customerProfile.name !== "Google Customer"
      ? customerProfile.name
      : "") ||
    (currentUser?.displayName &&
      !currentUser.displayName.toLowerCase().startsWith("user_") &&
      currentUser.displayName !== "Customer" &&
      currentUser.displayName !== "Google Customer"
      ? currentUser.displayName
      : "") ||
    (address.fullName && !address.fullName.toLowerCase().startsWith("user_")
      ? address.fullName
      : "");

  // Profile fields for editing
  const [name, setName] = useState(resolvedDisplayName);
  const [phone, setPhone] = useState(customerProfile?.phone || address.phone || "");
  const [addressLine, setAddressLine] = useState(address.addressLine1);
  const [landmark, setLandmark] = useState(address.landmark);
  const [stateName, setStateName] = useState(address.state || "Karnataka");
  const [district, setDistrict] = useState(address.district || "Bengaluru Urban");
  const [pincode, setPincode] = useState(address.pincode || "560058");
  const [addressLabel, setAddressLabel] = useState<"Home" | "Work" | "Other">("Home");
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);

  useEffect(() => {
    if (
      customerProfile?.name &&
      !customerProfile.name.toLowerCase().startsWith("user_") &&
      customerProfile.name !== "Customer"
    ) {
      setName(customerProfile.name);
    } else if (address?.fullName && !name) {
      setName(address.fullName);
    }

    if (customerProfile?.phone) {
      setPhone(customerProfile.phone);
    } else if (address?.phone && !phone) {
      setPhone(address.phone);
    }

    if (address?.addressLine1) setAddressLine(address.addressLine1);
    if (address?.landmark) setLandmark(address.landmark);
  }, [customerProfile, address]);

  useEffect(() => {
    if (tabParam === "profile" || tabParam === "addresses") {
      const el = document.getElementById("profile-card");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (tabParam === "orders") {
      const el = document.getElementById("orders-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [tabParam]);

  const activeOrder =
    visibleOrders.find((o) => o.orderRef === selectedOrderRef || o.id === selectedOrderRef) ||
    visibleOrders[0] ||
    null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    updateAddress({
      fullName: name,
      phone,
      addressLine1: addressLine,
      landmark,
    });
    if (saveProfile) {
      await saveProfile({
        name,
        phone,
      });
    }
    showToast("Profile details updated & synced across the store!");
  };

  const handleSignOut = async () => {
    await logoutUser();
    navigate("/", { replace: true });
  };

  if (!currentUser && visibleOrders.length === 0 && !targetRef) {
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
            <h1 className={`text-2xl font-bold font-serif ${isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"}`}>
              Sign In to Track Orders
            </h1>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? "text-[#D8C8B8]" : "text-[#5C4230]"}`}>
              Order history and live shipment tracking are exclusive to your personal account. Please sign in or register to access your orders.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setLoginModalOpen(true)}
            className="w-full py-3.5 rounded-2xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:brightness-110"
          >
            <LogIn className="w-4 h-4 text-amber-300" />
            <span>Sign In / Create Account</span>
          </button>

          <div className="pt-2">
            <Link to="/" className={`text-xs font-semibold hover:underline ${isDark ? "text-amber-400" : "text-[#5E3210]"}`}>
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
            <h1 className={`text-2xl sm:text-3xl font-extrabold font-serif ${isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"}`}>
              My Account & Order Tracking
            </h1>
            <p className={`text-xs ${isDark ? "text-[#D8C8B8]" : "text-[#5C4230]"}`}>
              Real-time Firestore sync • Peenya facility dispatch status
              {currentUser && ` • Signed in as ${resolvedDisplayName || "Valued Customer"}${phone ? ` (+91 ${phone})` : ""}`}
            </p>
          </div>

          {/* Quick Search & Top-Right Sign Out */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? "text-[#A89482]" : "text-[#7A5E48]"}`} />
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
                  if (match) handleSelectOrder(match.orderRef);
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
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border border-red-200 text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-2xs"
                title="Sign Out of Account"
              >
                <LogOut className="w-3.5 h-3.5 text-red-600" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Live Order Tracking Timeline */}
          <div id="orders-section" className="lg:col-span-8 space-y-6">
            {activeOrder ? (
              <LiveOrderTracker order={activeOrder} themeMode={themeMode} />
            ) : (
              <div
                className={`p-10 rounded-3xl border text-center space-y-4 ${
                  isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
                }`}
              >
                <ShoppingBag className="w-12 h-12 text-[#C8BAA8] mx-auto" />
                <div className="space-y-1">
                  <h3 className={`font-bold text-sm font-serif ${isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"}`}>
                    No Active Orders Displayed
                  </h3>
                  <p className={`text-xs max-w-md mx-auto ${isDark ? "text-[#D8C8B8]" : "text-[#6A523E]"}`}>
                    Orders placed by your account will appear here with real-time shipment updates once you place an order.
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

            {/* Past Orders List with Click-to-Switch Fix */}
            {visibleOrders.length > 0 && (
              <div
                className={`rounded-2xl border p-6 shadow-2xs space-y-4 ${
                  isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
                }`}
              >
                <h3 className={`text-sm font-bold font-serif ${isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"}`}>
                  All Orders ({visibleOrders.length})
                </h3>
                <div className="space-y-3">
                  {visibleOrders.map((ord) => {
                    const isCancelled = (ord.orderStatus as string) === "Cancelled";
                    const isSelected = selectedOrderRef === ord.orderRef || selectedOrderRef === ord.id;
                    return (
                      <div
                        key={ord.orderRef}
                        onClick={() => handleSelectOrder(ord.orderRef)}
                        className={`p-3.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? "bg-amber-500/10 border-[#E08F35] ring-2 ring-[#E08F35]/50 shadow-xs"
                            : isDark
                            ? "bg-[#150D07] border-[#362114] hover:border-[#4D2E1A]"
                            : "bg-[#FAF7F2] border-[#E8DEC8] hover:border-[#DDD1BE]"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"}`}>
                              #{ord.orderRef}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${
                                isCancelled
                                  ? "bg-red-500/10 text-red-600 border-red-500/30"
                                  : isDark
                                  ? "bg-[#1C120B] border-[#3D2514] text-amber-200"
                                  : "bg-white border-[#DDD1BE] text-[#5A381E]"
                              }`}
                            >
                              {ord.orderStatus}
                            </span>
                          </div>
                          <p className={`text-[11px] mt-0.5 ${isDark ? "text-[#A89482]" : "text-[#7A5E48]"}`}>
                            {ord.date} • {ord.items.length} item{ord.items.length === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-[#E08F35] block text-sm">
                            ₹{ord.total}
                          </span>
                          <span
                            className={`text-[10px] font-bold ${
                              isCancelled
                                ? "text-red-500 font-semibold"
                                : ord.paymentStatus === "FAILED"
                                ? "text-red-600 font-semibold"
                                : "text-emerald-500"
                            }`}
                          >
                            {isCancelled ? "CANCELLED" : ord.paymentStatus || "COMPLETED"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Profile & Loyalty Card */}
          <div className="lg:col-span-4 space-y-6">
            {/* Bottle QR Loyalty Card */}
            <div
              className={`rounded-2xl p-5 shadow-sm space-y-3 ${
                isDark ? "bg-[#1C120B] border border-[#362114] text-white" : "bg-[#25150C] text-white"
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
                isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
              }`}
            >
              <div
                className={`flex items-center justify-between border-b pb-3 ${
                  isDark ? "border-[#2D1B10]" : "border-[#EFE8DC]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#E08F35]" />
                  <h3 className={`text-sm font-bold font-serif ${isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"}`}>
                    Customer Profile & Address
                  </h3>
                </div>
                {currentUser && (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-colors cursor-pointer"
                    title="Sign Out of Account"
                  >
                    <LogOut className="w-3 h-3 text-red-600" />
                    <span>Logout</span>
                  </button>
                )}
              </div>

              <div className="space-y-4 text-xs">
                {/* 1. Profile Information */}
                <form onSubmit={handleUpdateProfile} className="space-y-3">
                  <div>
                    <label className={`block font-semibold mb-1 ${isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"}`}>
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
                    <label className={`block font-semibold mb-1 ${isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"}`}>
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

                  <div className="pt-1">
                    <button
                      type="submit"
                      className="w-full py-2 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold transition-colors cursor-pointer shadow-sm text-xs"
                    >
                      Update Profile
                    </button>
                  </div>
                </form>

                {/* 2. Saved Delivery Addresses */}
                <div className={`pt-4 border-t ${isDark ? "border-[#2D1B10]" : "border-[#EFE8DC]"} space-y-3`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#E08F35]" />
                      <h4 className={`font-bold font-serif ${isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"}`}>
                        Saved Delivery Addresses
                      </h4>
                    </div>
                    {!isAddingNewAddress && !editingAddressId && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewAddress(true);
                          setEditingAddressId(null);
                          setAddressLine("");
                          setLandmark("");
                        }}
                        className="flex items-center gap-1 text-[11px] font-bold text-amber-500 hover:text-amber-600 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add New</span>
                      </button>
                    )}
                  </div>

                  {/* List of Address Cards */}
                  {savedAddresses && savedAddresses.length > 0 && !editingAddressId && !isAddingNewAddress && (
                    <div className="space-y-2.5">
                      {savedAddresses.map((addr) => (
                        <div
                          key={addr.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isDark
                              ? "bg-[#150D07] border-[#362114]"
                              : "bg-[#FAF7F2] border-[#E8DEC8]"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E08F35]/20 text-[#E08F35]">
                                {addr.label}
                              </span>
                              <span className="font-bold text-[#FAF4EA] truncate max-w-[120px]">
                                {addr.fullName || name}
                              </span>
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                title="Edit Address"
                                onClick={() => {
                                  setEditingAddressId(addr.id);
                                  setIsAddingNewAddress(false);
                                  setAddressLabel(addr.label);
                                  setAddressLine(addr.addressLine1 || "");
                                  setLandmark(addr.landmark || "");
                                  setPincode(addr.pincode || "560058");
                                  setDistrict(addr.district || "Bengaluru Urban");
                                  setStateName(addr.state || "Karnataka");
                                }}
                                className="p-1 rounded-md text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 cursor-pointer transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Delete Address"
                                onClick={() => {
                                  if (window.confirm(`Delete "${addr.label}" address?`)) {
                                    deleteSavedAddress(addr.id);
                                  }
                                }}
                                className="p-1 rounded-md text-red-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="font-mono text-[10px] text-[#A88D77] mb-0.5">{addr.phone || phone}</p>
                          <p className="text-[11px] text-stone-400 line-clamp-2">
                            {addr.addressLine1}, {addr.district || addr.city} - {addr.pincode}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline Address Edit / Add Form */}
                  {(editingAddressId || isAddingNewAddress) && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!addressLine.trim() || !pincode.trim()) {
                          showToast("Please fill in address and pincode");
                          return;
                        }
                        const isBLR =
                          pincode.startsWith("560") ||
                          district.toLowerCase().includes("bengaluru") ||
                          district.toLowerCase().includes("bangalore");

                        if (editingAddressId) {
                          updateSavedAddress(editingAddressId, {
                            fullName: name,
                            phone,
                            addressLine1: addressLine,
                            landmark,
                            state: stateName,
                            district,
                            pincode,
                            city: isBLR ? "Bengaluru" : district,
                            label: addressLabel,
                            isBangalore: isBLR,
                          });
                          setEditingAddressId(null);
                        } else {
                          saveNewAddress({
                            fullName: name,
                            phone,
                            addressLine1: addressLine,
                            landmark,
                            state: stateName,
                            district,
                            pincode,
                            city: isBLR ? "Bengaluru" : district,
                            label: addressLabel,
                            isBangalore: isBLR,
                          });
                          setIsAddingNewAddress(false);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border space-y-3 ${
                        isDark ? "bg-[#180E08] border-[#4A301E]" : "bg-white border-[#DDD1BE]"
                      }`}
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-stone-200 dark:border-stone-800">
                        <span className="font-bold text-xs text-amber-500">
                          {editingAddressId ? `Editing "${addressLabel}" Address` : "Add New Delivery Address"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAddressId(null);
                            setIsAddingNewAddress(false);
                          }}
                          className="text-[11px] text-stone-400 hover:underline cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      {/* Label Selector */}
                      <div>
                        <label className={`block font-semibold mb-1 ${isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"}`}>
                          Label
                        </label>
                        <div className="flex gap-2">
                          {(["Home", "Work", "Other"] as const).map((lbl) => (
                            <button
                              key={lbl}
                              type="button"
                              onClick={() => setAddressLabel(lbl)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                                addressLabel === lbl
                                  ? "bg-[#5E3210] text-white"
                                  : isDark
                                  ? "bg-[#150D07] text-[#A88D77] border border-[#362114]"
                                  : "bg-[#FAF7F2] text-[#5C402D] border border-[#DDD1BE]"
                              }`}
                            >
                              {lbl}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className={`block font-semibold mb-1 ${isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"}`}>
                          Street Address *
                        </label>
                        <input
                          type="text"
                          required
                          value={addressLine}
                          onChange={(e) => setAddressLine(e.target.value)}
                          placeholder="House/Flat No, Street, Layout"
                          className={`w-full px-3 py-1.5 rounded-xl text-xs ${
                            isDark
                              ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                              : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                          }`}
                        />
                      </div>

                      <div>
                        <label className={`block font-semibold mb-1 ${isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"}`}>
                          Landmark
                        </label>
                        <input
                          type="text"
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                          placeholder="Near Water Tank / Landmark"
                          className={`w-full px-3 py-1.5 rounded-xl text-xs ${
                            isDark
                              ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                              : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                          }`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={`block font-semibold mb-1 ${isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"}`}>
                            District
                          </label>
                          <input
                            type="text"
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                            placeholder="District"
                            className={`w-full px-3 py-1.5 rounded-xl text-xs ${
                              isDark
                                ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                                : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                            }`}
                          />
                        </div>
                        <div>
                          <label className={`block font-semibold mb-1 ${isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"}`}>
                            Pincode *
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            required
                            value={pincode}
                            onChange={(e) => setPincode(e.target.value)}
                            placeholder="560058"
                            className={`w-full px-3 py-1.5 rounded-xl text-xs ${
                              isDark
                                ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                                : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="submit"
                          className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                        >
                          {editingAddressId ? "Update Address In-Place" : "Save Address"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAddressId(null);
                            setIsAddingNewAddress(false);
                          }}
                          className={`px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                            isDark ? "border-[#362114] text-[#A88D77]" : "border-[#DDD1BE] text-[#5C402D]"
                          }`}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {currentUser?.email === "manopavana@gmail.com" && (
                  <div className={`pt-3 border-t ${isDark ? "border-[#2D1B10]" : "border-[#EFE8DC]"}`}>
                    <Link
                      to="/admin"
                      className="w-full py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-[#E08F35] border border-[#E08F35]/40 font-bold flex items-center justify-center gap-2 transition-colors text-xs"
                    >
                      <ShieldAlert className="w-4 h-4 text-[#E08F35]" />
                      <span>Open Admin Storefront CMS & Dispatch Hub</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};