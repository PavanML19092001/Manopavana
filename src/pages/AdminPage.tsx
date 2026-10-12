import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import {
  Lock,
  ShieldAlert,
  Settings,
  MapPin,
  ExternalLink,
  MessageCircle,
  Save,
  CheckCircle2,
  Truck,
  RotateCcw,
  Sparkles,
  Image,
  Video,
  Type,
  Phone,
  Package,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { BUSINESS_CONFIG } from "../constants";
import { OrderStatus } from "../types";

export const AdminPage: React.FC = () => {
  const {
    currentUser,
    isAdminAuthenticated,
    authenticateAdmin,
    logoutAdmin,
    cmsConfig,
    updateCMSConfig,
    orders,
    updateOrderStatus,
    showToast,
    themeMode,
  } = useStore();

  const isDark = themeMode === "dark";

  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  // Editable config state
  const [ticker, setTicker] = useState(cmsConfig.announcementTicker);
  const [headline, setHeadline] = useState(cmsConfig.heroHeadline);
  const [subhead, setSubhead] = useState(cmsConfig.heroSubhead);
  const [tagline, setTagline] = useState(cmsConfig.brandTagline || "Pure by nature, trusted for life");
  const [logoUrl, setLogoUrl] = useState(cmsConfig.brandLogoUrl || "");
  const [videoUrl, setVideoUrl] = useState(cmsConfig.chekkuVideoUrl || "");
  const [threshold, setThreshold] = useState(cmsConfig.freeShippingThreshold);
  const [stdFee, setStdFee] = useState(cmsConfig.standardShippingFee);

  // Price overrides
  const [prices, setPrices] = useState(cmsConfig.prices);
  const [stock, setStock] = useState(cmsConfig.stock);

  // Keep state in sync with real-time Firestore updates
  useEffect(() => {
    setTicker(cmsConfig.announcementTicker);
    setHeadline(cmsConfig.heroHeadline);
    setSubhead(cmsConfig.heroSubhead);
    setTagline(cmsConfig.brandTagline || "Pure by nature, trusted for life");
    setLogoUrl(cmsConfig.brandLogoUrl || "");
    setVideoUrl(cmsConfig.chekkuVideoUrl || "");
    setThreshold(cmsConfig.freeShippingThreshold);
    setStdFee(cmsConfig.standardShippingFee);
    setPrices(cmsConfig.prices);
    setStock(cmsConfig.stock);
  }, [cmsConfig]);

  // STRICT ACCESS SECURITY GATE
  // If not logged in as manopavana@gmail.com, immediately redirect to Home page
  if (!currentUser || currentUser.email !== "manopavana@gmail.com") {
    return <Navigate to="/" replace />;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = authenticateAdmin(pinInput);
    if (!ok) {
      setPinError(true);
    } else {
      setPinError(false);
      showToast("Admin session unlocked!");
    }
  };

  const handleSaveStorefront = (e: React.FormEvent) => {
    e.preventDefault();
    updateCMSConfig((prev) => ({
      ...prev,
      announcementTicker: ticker,
      heroHeadline: headline,
      heroSubhead: subhead,
      brandTagline: tagline,
      brandLogoUrl: logoUrl,
      chekkuVideoUrl: videoUrl,
      freeShippingThreshold: Number(threshold),
      standardShippingFee: Number(stdFee),
      prices,
      stock,
    }));
    showToast("Storefront copy, branding & prices saved to Firestore live!");
  };

  const handleToggleStock = (key: keyof typeof stock) => {
    setStock((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // If logged in as manopavana@gmail.com, require PIN 1234
  if (!isAdminAuthenticated) {
    return (
      <div
        className={`w-full min-h-[calc(100vh-80px)] py-20 flex items-center justify-center transition-colors px-4 box-border ${
          isDark ? "bg-[#140D09] text-[#FAF4EA]" : "bg-[#FAF7F2] text-[#24140A]"
        }`}
      >
        <div className="w-full max-w-md mx-auto text-center">
          <div
            className={`p-8 rounded-3xl border shadow-xl space-y-6 ${
              isDark
                ? "bg-[#1C120B] border-[#362114]"
                : "bg-white border-[#E8DEC8]"
            }`}
          >
            <div
              className={`w-16 h-16 mx-auto rounded-full border flex items-center justify-center ${
                isDark
                  ? "bg-[#150D07] border-[#362114]"
                  : "bg-[#FAF6EE] border-[#DDD1BE]"
              }`}
            >
              <Lock className="w-8 h-8 text-[#E08F35]" />
            </div>

            <div className="space-y-1">
              <h1
                className={`text-xl font-bold font-serif ${
                  isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                }`}
              >
                MANOPAVANA Administrator Gate
              </h1>
              <p
                className={`text-xs ${
                  isDark ? "text-[#D8C8B8]" : "text-[#5C4230]"
                }`}
              >
                Logged in as{" "}
                <span
                  className={`font-semibold ${
                    isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                  }`}
                >
                  {currentUser.email}
                </span>
                . Enter PIN to unlock live CMS & dispatch hub.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="Enter 4-digit PIN (1234)"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  className={`w-full text-center tracking-widest text-lg font-mono font-bold px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 transition-colors ${
                    isDark
                      ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA] placeholder-[#8A7665]"
                      : "bg-[#FAF7F2] border border-[#DDD1BE] text-[#1F120A] placeholder-[#8A7665]"
                  }`}
                />
                {pinError && (
                  <p className="text-xs text-red-500 font-semibold mt-1.5">
                    Invalid PIN. Enter secret administrator PIN (1234).
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Unlock Administration Portal
              </button>
            </form>

            <p
              className={`text-[11px] ${
                isDark ? "text-[#A89482]" : "text-[#7A5E48]"
              }`}
            >
              Authorized Facility: Peenya 2nd Stage, Bangalore
            </p>
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
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 box-border">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#3D2514] text-white p-6 rounded-3xl shadow-lg">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-[#E08F35]/20 text-[#E08F35]">
            <ShieldAlert className="w-6 h-6 text-[#E08F35]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-serif">
                MANOPAVANA Live Storefront CMS & Dispatch Hub
              </h1>
              <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                <Sparkles className="w-3 h-3" />
                Live Two-Way Sync
              </span>
            </div>
            <p className="text-xs text-[#D6C4B0] mt-0.5">
              Admin: {currentUser.email} • Facility: {BUSINESS_CONFIG.FACILITY_ADDRESS}
            </p>
          </div>
        </div>

        <button
          onClick={logoutAdmin}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold transition-colors cursor-pointer shrink-0"
        >
          Lock / Logout
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Storefront Copy, Branding, Shipping & Price Toggler */}
        <div className="lg:col-span-6 space-y-6">
          <div
            className={`rounded-2xl border p-6 shadow-2xs space-y-5 ${
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
                <Settings className="w-4 h-4 text-[#E08F35]" />
                <h2
                  className={`text-sm font-bold font-serif ${
                    isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                  }`}
                >
                  Global Branding, Copy & Pricing
                </h2>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  isDark
                    ? "bg-[#150D07] border-[#362114] text-[#A89482]"
                    : "bg-[#FAF6EE] border-[#E8DEC8] text-[#6A523E]"
                }`}
              >
                settings/store_config
              </span>
            </div>

            <form onSubmit={handleSaveStorefront} className="space-y-4 text-xs">
              {/* Top Announcement Ticker */}
              <div>
                <label
                  className={`block font-semibold mb-1 ${
                    isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"
                  }`}
                >
                  Announcement Bar Ticker Text
                </label>
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 transition-colors ${
                    isDark
                      ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                      : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                  }`}
                />
              </div>

              {/* Brand Tagline */}
              <div>
                <label
                  className={`block font-semibold mb-1 flex items-center gap-1.5 ${
                    isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"
                  }`}
                >
                  <Type className="w-3.5 h-3.5 text-[#E08F35]" />
                  Brand Tagline (Under MANOPAVANA logo)
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Pure by nature, trusted for life"
                  className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 transition-colors ${
                    isDark
                      ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                      : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                  }`}
                />
              </div>

              {/* Logo URL */}
              <div>
                <label
                  className={`block font-semibold mb-1 flex items-center gap-1.5 ${
                    isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"
                  }`}
                >
                  <Image className="w-3.5 h-3.5 text-[#E08F35]" />
                  Brand Logo Image URL
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className={`w-full px-3.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 font-mono text-[11px] transition-colors ${
                    isDark
                      ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                      : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                  }`}
                />
              </div>

              {/* Hero Video URL */}
              <div>
                <label
                  className={`block font-semibold mb-1 flex items-center gap-1.5 ${
                    isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"
                  }`}
                >
                  <Video className="w-3.5 h-3.5 text-[#E08F35]" />
                  Background Chekku Video URL (Hero section)
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://..."
                  className={`w-full px-3.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 font-mono text-[11px] transition-colors ${
                    isDark
                      ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                      : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                  }`}
                />
              </div>

              {/* Hero Headline */}
              <div>
                <label
                  className={`block font-semibold mb-1 ${
                    isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"
                  }`}
                >
                  Hero Headline
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 transition-colors ${
                    isDark
                      ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                      : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                  }`}
                />
              </div>

              {/* Hero Subhead */}
              <div>
                <label
                  className={`block font-semibold mb-1 ${
                    isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"
                  }`}
                >
                  Hero Subhead Paragraph
                </label>
                <textarea
                  rows={3}
                  value={subhead}
                  onChange={(e) => setSubhead(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 transition-colors ${
                    isDark
                      ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                      : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                  }`}
                />
              </div>

              {/* Shipping Controls */}
              <div
                className={`grid grid-cols-2 gap-4 pt-2 border-t ${
                  isDark ? "border-[#2D1B10]" : "border-[#EFE8DC]"
                }`}
              >
                <div>
                  <label
                    className={`block font-semibold mb-1 ${
                      isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"
                    }`}
                  >
                    Free Delivery Threshold (₹)
                  </label>
                  <input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className={`w-full px-3.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 transition-colors ${
                      isDark
                        ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                        : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`block font-semibold mb-1 ${
                      isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"
                    }`}
                  >
                    Standard Delivery Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={stdFee}
                    onChange={(e) => setStdFee(Number(e.target.value))}
                    className={`w-full px-3.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 transition-colors ${
                      isDark
                        ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                        : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                    }`}
                  />
                </div>
              </div>

              {/* Price & Stock toggles */}
              <div
                className={`pt-3 border-t space-y-3 ${
                  isDark ? "border-[#2D1B10]" : "border-[#EFE8DC]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3
                    className={`font-bold ${
                      isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                    }`}
                  >
                    Catalog Pricing & Live Stock Control
                  </h3>
                  <span
                    className={`text-[10px] ${
                      isDark ? "text-[#A89482]" : "text-[#7A5E48]"
                    }`}
                  >
                    Click badge to toggle stock
                  </span>
                </div>

                <div className="space-y-2">
                  {[
                    { key: "groundnut1L", name: "Groundnut Oil 1L", priceKey: "groundnut1L" },
                    { key: "groundnut500ml", name: "Groundnut Oil 500ml", priceKey: "groundnut500ml" },
                    { key: "coconut1L", name: "Coconut Oil 1L", priceKey: "coconut1L" },
                    { key: "coconut500ml", name: "Coconut Oil 500ml", priceKey: "coconut500ml" },
                    { key: "sesame1L", name: "Sesame Oil 1L", priceKey: "sesame1L" },
                    { key: "sesame500ml", name: "Sesame Oil 500ml", priceKey: "sesame500ml" },
                    { key: "combo3L", name: "3L Trio Essential Box", priceKey: "combo3L" },
                    { key: "combo1_5L", name: "1.5L Trio Starter Box", priceKey: "combo1_5L" },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                        isDark
                          ? "bg-[#150D07] border-[#362114]"
                          : "bg-[#FAF6EE] border-[#E5DAC8]"
                      }`}
                    >
                      <span
                        className={`font-semibold ${
                          isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                        }`}
                      >
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={isDark ? "text-[#A89482]" : "text-[#7A5E48]"}>
                          ₹
                        </span>
                        <input
                          type="number"
                          value={prices[item.priceKey as keyof typeof prices]}
                          onChange={(e) =>
                            setPrices({ ...prices, [item.priceKey]: Number(e.target.value) })
                          }
                          className={`w-20 px-2 py-1 rounded-lg text-right font-bold ${
                            isDark
                              ? "bg-[#1C120B] border border-[#3A2417] text-[#E08F35]"
                              : "bg-white border border-[#DDD1BE] text-[#5E3210]"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => handleToggleStock(item.key as keyof typeof stock)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors shadow-2xs ${
                            stock[item.key as keyof typeof stock]
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-red-600 hover:bg-red-700 text-white"
                          }`}
                        >
                          {stock[item.key as keyof typeof stock] ? "In Stock" : "Sold Out"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4 text-amber-300" />
                <span>Save Live CMS Changes (Propagate Everywhere)</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right: Live Incoming Orders & Direct Google Maps Route */}
        <div className="lg:col-span-6 space-y-4">
          <div
            className={`rounded-2xl border p-6 shadow-2xs space-y-4 ${
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
                <Truck className="w-4 h-4 text-[#E08F35]" />
                <h2
                  className={`text-sm font-bold font-serif ${
                    isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                  }`}
                >
                  Live Orders & Delivery Dispatch Queue ({orders.length})
                </h2>
              </div>
              <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Real-Time Firestore
              </span>
            </div>

            {orders.length === 0 ? (
              <div
                className={`p-8 text-center space-y-2 ${
                  isDark ? "text-[#A89482]" : "text-[#6A523E]"
                }`}
              >
                <Package className="w-8 h-8 mx-auto text-[#DDD1BE]" />
                <p className="text-xs font-semibold">No customer orders placed yet</p>
                <p className="text-[11px] opacity-80">
                  New orders will automatically appear here in real time as customers complete checkout.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[750px] overflow-y-auto pr-1">
                {orders.map((ord) => {
                  const mapsQuery = ord.shippingAddress.lat && ord.shippingAddress.lng
                    ? `${ord.shippingAddress.lat},${ord.shippingAddress.lng}`
                    : encodeURIComponent(
                        `${ord.shippingAddress.addressLine1}, ${
                          ord.shippingAddress.district || ord.shippingAddress.city || "Bengaluru"
                        } ${ord.shippingAddress.pincode}`
                      );
                  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

                  const cleanPhone = (ord.shippingAddress.phone || "").replace(/\D/g, "").slice(-10);
                  const waText = encodeURIComponent(
                    `Hi ${ord.shippingAddress.fullName || "Customer"}, your MANOPAVANA order #${
                      ord.orderRef
                    } is currently: ${ord.orderStatus}. Tracking: ${window.location.origin}/account?order=${
                      ord.orderRef
                    }`
                  );
                  const waUrl = `https://wa.me/91${cleanPhone}?text=${waText}`;

                  return (
                    <div
                      key={ord.orderRef}
                      className={`p-4 rounded-2xl border space-y-3 shadow-2xs ${
                        isDark
                          ? "bg-[#150D07] border-[#362114]"
                          : "bg-[#FAF7F2] border-[#E8DEC8]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 text-xs">
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
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                isDark
                                  ? "bg-[#1C120B] border-[#3D2514] text-[#E08F35]"
                                  : "bg-white border-[#DDD1BE] text-[#5E3210]"
                              }`}
                            >
                              ₹{ord.total}
                            </span>
                            <span
                              className={`text-[10px] ${
                                isDark ? "text-[#A89482]" : "text-[#7A5E48]"
                              }`}
                            >
                              {ord.paymentMethod?.toUpperCase()}
                            </span>
                          </div>
                          <p
                            className={`text-[11px] mt-0.5 ${
                              isDark ? "text-[#D8C8B8]" : "text-[#6A523E]"
                            }`}
                          >
                            {ord.shippingAddress.fullName || "Customer"} • {ord.shippingAddress.phone}
                          </p>
                        </div>

                        {/* Status Selector with all 6 statuses */}
                        <select
                          value={ord.orderStatus}
                          onChange={(e) =>
                            updateOrderStatus(ord.id, e.target.value as OrderStatus)
                          }
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold focus:ring-1 focus:ring-[#E08F35] ${
                            isDark
                              ? "bg-[#1C120B] border border-[#3D2514] text-amber-200"
                              : "bg-white border border-[#DDD1BE] text-[#5E3210]"
                          }`}
                        >
                          <option value="Placed">Placed</option>
                          <option value="Payment Incomplete">Payment Incomplete</option>
                          <option value="Packed">Packed</option>
                          <option value="Dispatched">Dispatched</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Failed (Expired)">Failed (Expired)</option>
                        </select>
                      </div>

                      {/* Items Ordered Summary */}
                      <div
                        className={`text-[11px] p-2.5 rounded-xl border space-y-1 ${
                          isDark
                            ? "bg-[#1C120B] border-[#362114] text-[#D8C8B8]"
                            : "bg-white border-[#EFE8DC] text-[#4A3220]"
                        }`}
                      >
                        <span
                          className={`font-semibold block ${
                            isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                          }`}
                        >
                          Ordered Items ({ord.items.length}):
                        </span>
                        <ul className="list-disc list-inside space-y-0.5">
                          {ord.items.map((it, idx) => (
                            <li key={idx}>
                              {it.title} ({it.variant}) × {it.quantity} — ₹{it.price * it.quantity}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Delivery Address */}
                      <div
                        className={`text-[11px] p-2.5 rounded-xl border ${
                          isDark
                            ? "bg-[#1C120B] border-[#362114] text-[#D8C8B8]"
                            : "bg-white border-[#EFE8DC] text-[#4A3220]"
                        }`}
                      >
                        <span
                          className={`font-semibold block ${
                            isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                          }`}
                        >
                          Delivery Drop Address:
                        </span>
                        <span>
                          {ord.shippingAddress.addressLine1}
                          {ord.shippingAddress.landmark ? `, Near ${ord.shippingAddress.landmark}` : ""}
                          , {ord.shippingAddress.district || ord.shippingAddress.city} -{" "}
                          {ord.shippingAddress.pincode}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                            isDark
                              ? "bg-[#1C120B] border-[#362114] text-amber-200 hover:border-[#E08F35]"
                              : "bg-white border-[#DDD1BE] hover:border-[#E08F35] text-[#5E3210]"
                          }`}
                        >
                          <MapPin className="w-3.5 h-3.5 text-[#E08F35]" />
                          <span>1-Click Google Maps Pin</span>
                          <ExternalLink className="w-3 h-3 text-[#A69788]" />
                        </a>

                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp Dispatch</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};
