import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  MapPin,
  QrCode,
  User,
  ShieldAlert,
  Sparkles,
  Search,
  X,
  Plus,
  LogOut,
  Package,
  Sun,
  Moon,
  Palette,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { MEDIA_ASSETS, BUSINESS_CONFIG } from "../constants";

export const Navbar: React.FC = () => {
  const {
    cartCount,
    address,
    setLocationModalOpen,
    loyalty,
    loyaltyRemainingText,
    openLoyaltyQuiz,
    cmsConfig,
    currentUser,
    setLoginModalOpen,
    addToCart,
    products,
    combos,
    logoutUser,
    themeMode,
    setThemeMode,
  } = useStore();

  const isLight = themeMode === "light";
  const isDark = themeMode === "dark";

  const navigate = useNavigate();

  // Search Bar State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLDivElement | null>(null);
  const desktopSearchRef = useRef<HTMLDivElement | null>(null);

  // User Profile Dropdown State
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const mobileUserMenuRef = useRef<HTMLDivElement | null>(null);
  const desktopUserMenuRef = useRef<HTMLDivElement | null>(null);

  // Close search & profile dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;

      // Handle search outside click
      const clickedMobileSearch =
        mobileSearchRef.current && mobileSearchRef.current.contains(target);
      const clickedDesktopSearch =
        desktopSearchRef.current && desktopSearchRef.current.contains(target);
      if (!clickedMobileSearch && !clickedDesktopSearch) {
        setIsSearchOpen(false);
      }

      // Handle user profile menu outside click
      const clickedMobileUser =
        mobileUserMenuRef.current && mobileUserMenuRef.current.contains(target);
      const clickedDesktopUser =
        desktopUserMenuRef.current && desktopUserMenuRef.current.contains(target);
      if (!clickedMobileUser && !clickedDesktopUser) {
        setIsUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchResults = searchQuery.trim()
    ? [
        ...products.filter((p) => {
          const q = searchQuery.toLowerCase();
          return (
            p.name.toLowerCase().includes(q) ||
            p.searchKeywords.toLowerCase().includes(q) ||
            p.shortDescription.toLowerCase().includes(q)
          );
        }).map((p) => ({
          id: p.id,
          title: p.name,
          subtitle: "1 Litre Bottle",
          price: p.prices["1L"],
          regularPrice: p.mrp["1L"],
          variant: "1L" as const,
          image: p.images[0] || p.labelImage,
          url: `/product/${p.id}`,
        })),
        ...combos.filter((c) => {
          const q = searchQuery.toLowerCase();
          return (
            c.name.toLowerCase().includes(q) ||
            c.searchKeywords.toLowerCase().includes(q)
          );
        }).map((c) => ({
          id: c.id,
          title: c.name,
          subtitle: c.volumeLabel,
          price: loyalty.isActive ? c.loyaltyPrice : c.regularPrice,
          regularPrice: c.mrp,
          variant: (c.id === "combo-3l" ? "3L Trio" : "1.5L Trio") as any,
          image: c.image,
          url: "/#combos",
        })),
      ]
    : [];

  return (
    <header
      className={`w-full max-w-full sticky top-0 z-40 transition-colors box-border ${
        isLight
          ? "bg-white/95 text-[#1F120A] border-b border-[#E5DACB] shadow-sm backdrop-blur-md"
          : isDark
          ? "bg-gradient-to-b from-[#180E08] via-[#120A05] to-[#0D0703] text-[#FAF4EA] border-b border-[#3D2517] shadow-2xl backdrop-blur-md"
          : "bg-gradient-to-b from-[#25150C] via-[#1B0F08] to-[#140C07] text-[#FAF4EA] border-b border-[#D4A373]/30 shadow-2xl backdrop-blur-md"
      }`}
    >
      {/* 3. COMPACT TOP ANNOUNCEMENT TICKER */}
      <div
        className={`py-1 px-2 text-[11px] font-bold border-b tracking-wide text-center truncate flex items-center justify-center gap-2 box-border transition-colors ${
          isLight
            ? "bg-[#4D2811] text-[#FFE8BD] border-[#653517]"
            : isDark
            ? "bg-[#0A0503] text-[#F5BC51] border-[#2A160C]"
            : "bg-[#0D0603] text-[#F5BC51] border-[#3D2212]"
        }`}
      >
        <Sparkles className="w-3.5 h-3.5 text-[#E08F35] shrink-0 animate-pulse" />
        <span className="truncate">{cmsConfig.announcementTicker}</span>
        <button
          onClick={() => openLoyaltyQuiz()}
          className="hidden md:inline-flex items-center gap-1 ml-2 text-[10px] bg-[#E08F35] text-[#140D09] font-black px-2 py-0.5 rounded-full hover:bg-amber-300 transition-colors cursor-pointer"
        >
          Scan Bottle for 10% Off →
        </button>
      </div>

      {/* 2. STREAMLINED 2-ROW MOBILE HEADER (md:hidden) */}
      <div className="md:hidden w-full flex flex-col">
        {/* ROW 1: BRAND CLUSTER (LEFT) + ACTION CLUSTER (RIGHT) */}
        <div className="flex items-center justify-between w-full px-3.5 py-2.5">
          {/* Left: Brand Link */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div
              className={`w-10 h-10 rounded-none p-1 flex items-center justify-center shrink-0 border-2 transition-all shadow-xs ${
                isLight
                  ? "border-[#1F120A] bg-white"
                  : "border-[#E5DACB] bg-white shadow-sm"
              }`}
            >
              <img
                src={cmsConfig.brandLogoUrl || MEDIA_ASSETS.logo}
                alt="MANOPAVANA Artisanal Oils Logo"
                className="w-full h-full object-contain block"
              />
            </div>
            <div className="flex flex-col">
              <span
                className={`text-lg font-black tracking-wider font-serif leading-none ${
                  isLight ? "text-[#1F120A]" : "text-[#FAF4EA]"
                }`}
              >
                {BUSINESS_CONFIG.BRAND_NAME}
              </span>
              <span
                className={`text-[10px] font-semibold tracking-wide mt-0.5 leading-tight block ${
                  isLight ? "text-[#B86B14]" : "text-[#E08F35]"
                }`}
              >
                {cmsConfig.brandTagline || "Pure by nature, trusted for life"}
              </span>
            </div>
          </Link>

          {/* Right: Action Icons Cluster */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Theme Toggle (Blend / Light / Dark) */}
            <button
              type="button"
              onClick={() => {
                const nextMode = themeMode === "blend" ? "light" : themeMode === "light" ? "dark" : "blend";
                setThemeMode(nextMode);
              }}
              aria-label="Toggle theme mode"
              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer flex items-center justify-center ${
                isLight
                  ? "bg-[#F3EBE0] border-[#DDD0BF] text-[#78461E] hover:border-[#B86B14]"
                  : "bg-[#2D1B10] border-[#5A3820] text-[#E08F35] hover:border-[#E08F35]"
              }`}
              title={`Theme Mode: ${themeMode.toUpperCase()}`}
            >
              {themeMode === "blend" ? (
                <Palette className="w-4 h-4 text-[#D49A37]" />
              ) : themeMode === "light" ? (
                <Sun className="w-4 h-4 text-[#B86B14]" />
              ) : (
                <Moon className="w-4 h-4 text-[#F5BC51]" />
              )}
            </button>

            {/* 1. Location Trigger */}
            <button
              onClick={() => setLocationModalOpen(true)}
              aria-label="Delivery Location"
              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                isLight
                  ? "bg-[#F3EBE0] border-[#DDD0BF] text-[#78461E] hover:border-[#B86B14]"
                  : "bg-[#2D1B10] border-[#5A3820] text-[#E08F35] hover:border-[#E08F35]"
              }`}
            >
              <MapPin className="w-4 h-4" />
            </button>

            {/* 2. Account / Login with Anchor Dropdown */}
            <div ref={mobileUserMenuRef} className="relative">
              <button
                onClick={() => {
                  if (currentUser) {
                    setIsUserDropdownOpen((prev) => !prev);
                  } else {
                    setLoginModalOpen(true);
                  }
                }}
                aria-label="Account Login or Profile"
                className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                  currentUser
                    ? isLight
                      ? "bg-[#EFE4D4] border-[#B86B14] text-[#1F120A] shadow-xs"
                      : "bg-[#3D2514] border-[#E08F35] text-[#FAF4EA] shadow-xs"
                    : isLight
                    ? "bg-[#F3EBE0] border-[#DDD0BF] text-[#78461E] hover:border-[#B86B14]"
                    : "bg-[#2D1B10] border-[#5A3820] text-[#FAF4EA] hover:border-[#E08F35]"
                }`}
              >
                <User className={`w-4 h-4 ${isLight ? "text-[#B86B14]" : "text-[#E08F35]"}`} />
              </button>

              {/* Mobile User Profile Dropdown */}
              {currentUser && isUserDropdownOpen && (
                <div
                  className={`absolute right-0 top-full mt-2 w-64 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in divide-y border ${
                    isLight
                      ? "bg-white border-[#DDD0BF] divide-[#EFE8DC] text-[#1F120A]"
                      : "bg-[#1B0F08] border-[#4D2E1A] divide-[#2D1B10] text-[#FAF4EA]"
                  }`}
                >
                  {/* Greeting Banner */}
                  <div className={`px-4 py-3 ${isLight ? "bg-[#FAF6EE]" : "bg-[#120904]"}`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#E08F35]/20 border border-[#E08F35]/40 flex items-center justify-center text-[#E08F35] font-black text-xs shrink-0">
                        {(currentUser.displayName || currentUser.email || "C").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold truncate ${isLight ? "text-[#1F120A]" : "text-[#FAF4EA]"}`}>
                          Hello, {currentUser.displayName || currentUser.email?.split("@")[0] || "Customer"}
                        </p>
                        <p className={`text-[10px] truncate ${isLight ? "text-[#7A5538]" : "text-[#D4A373]"}`}>
                          {currentUser.email || "Active Session"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="py-1 text-xs">
                    <Link
                      to="/account?tab=profile"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className={`flex items-center gap-2.5 px-4 py-2.5 transition-colors ${
                        isLight
                          ? "text-[#3D2514] hover:bg-[#FAF6EE] hover:text-[#B86B14]"
                          : "text-[#FAF4EA] hover:bg-[#25150C] hover:text-[#E08F35]"
                      }`}
                    >
                      <User className="w-4 h-4 text-[#D4A373]" />
                      <span>👤 My Profile</span>
                    </Link>

                    <Link
                      to="/account?tab=orders"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className={`flex items-center gap-2.5 px-4 py-2.5 transition-colors ${
                        isLight
                          ? "text-[#3D2514] hover:bg-[#FAF6EE] hover:text-[#B86B14]"
                          : "text-[#FAF4EA] hover:bg-[#25150C] hover:text-[#E08F35]"
                      }`}
                    >
                      <Package className="w-4 h-4 text-[#D4A373]" />
                      <span>📦 My Orders</span>
                    </Link>

                    <Link
                      to="/account?tab=addresses"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className={`flex items-center gap-2.5 px-4 py-2.5 transition-colors ${
                        isLight
                          ? "text-[#3D2514] hover:bg-[#FAF6EE] hover:text-[#B86B14]"
                          : "text-[#FAF4EA] hover:bg-[#25150C] hover:text-[#E08F35]"
                      }`}
                    >
                      <MapPin className="w-4 h-4 text-[#D4A373]" />
                      <span>📍 Delivery Address</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        openLoyaltyQuiz();
                      }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 transition-colors text-left cursor-pointer ${
                        isLight
                          ? "text-[#3D2514] hover:bg-[#FAF6EE] hover:text-[#B86B14]"
                          : "text-[#FAF4EA] hover:bg-[#25150C] hover:text-[#E08F35]"
                      }`}
                    >
                      <QrCode className="w-4 h-4 text-[#E08F35]" />
                      <span>🏷️ 10% Loyalty QR</span>
                    </button>

                    {currentUser.email === "manopavana@gmail.com" && (
                      <Link
                        to="/admin"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className={`flex items-center gap-2.5 px-4 py-2.5 transition-colors ${
                          isLight ? "text-amber-700 hover:bg-[#FAF6EE]" : "text-amber-300 hover:bg-[#25150C]"
                        }`}
                      >
                        <ShieldAlert className="w-4 h-4 text-[#E08F35]" />
                        <span>🛡️ Admin CMS Portal</span>
                      </Link>
                    )}
                  </div>

                  {/* Red/Danger Logout Button */}
                  <div className={`p-2 ${isLight ? "bg-[#FAF6EE]" : "bg-[#120904]"}`}>
                    <button
                      type="button"
                      onClick={async () => {
                        setIsUserDropdownOpen(false);
                        await logoutUser();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-600" />
                      <span>🚪 Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Cart Trigger */}
            <button
              onClick={() => navigate("/cart")}
              aria-label="Shopping Cart"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#D49A37] to-[#B87C24] text-[#140D09] font-black text-xs shadow-md border border-[#F5BC51] cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#140D09]" />
              <span>Bag</span>
              <span className="bg-[#140D09] text-[#F5BC51] text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {cartCount}
              </span>
            </button>

            {/* Secret Admin CMS link for manopavana@gmail.com */}
            {currentUser?.email === "manopavana@gmail.com" && (
              <Link
                to="/admin"
                aria-label="Admin Portal"
                className={`p-1 transition-colors ${
                  isLight ? "text-[#8C5D38] hover:text-[#1F120A]" : "text-[#D4A373] hover:text-[#FAF4EA]"
                }`}
                title="Admin CMS Portal"
              >
                <ShieldAlert className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>

        {/* ROW 2: SLEEK COMPACT SEARCH INPUT (LIGHT THEMED) */}
        <div className="px-3.5 pb-2.5 pt-0.5 w-full">
          <div ref={mobileSearchRef} className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#7A5538]" />
            <input
              type="text"
              placeholder="Search wood-pressed groundnut, coconut, sesame oil..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="w-full h-9 pl-9 pr-8 text-xs rounded-full bg-white text-[#1F120A] placeholder-[#8A7665] border border-[#D8C7B5] hover:border-[#C8751B] focus:border-[#C8751B] focus:outline-none focus:ring-2 focus:ring-[#C8751B]/25 shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A7665] hover:text-[#1F120A]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Autocomplete Dropdown on Mobile */}
            {isSearchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl shadow-2xl border border-[#DDD0BF] overflow-hidden z-50 divide-y divide-[#EFE8DC] bg-white text-[#1F120A]">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-[#FAF6EE] text-[#7A4B1A]">
                  Matching Artisanal Oils ({searchResults.length})
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 hover:bg-[#FAF6EE] transition-colors flex items-center justify-between gap-2"
                    >
                      <Link
                        to={item.url}
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center gap-2.5 flex-1 min-w-0"
                      >
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-9 h-9 object-contain rounded-md bg-[#FAF6EE] p-0.5 border border-[#DDD0BF] shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate text-[#1F120A]">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-[#7A5538]">
                            {item.subtitle} • ₹{item.price}
                          </p>
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          addToCart({
                            id: `${item.id}-${item.variant}`,
                            productId: item.id,
                            title: item.title,
                            subtitle: item.subtitle,
                            variant: item.variant,
                            price: item.price,
                            regularPrice: item.regularPrice,
                            image: item.image,
                          });
                          setIsSearchOpen(false);
                        }}
                        className="px-2 py-1 rounded-md bg-[#E08F35] hover:bg-[#F5BC51] text-[#140D09] font-black text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DESKTOP HEADER (hidden md:flex) */}
      <div className="hidden md:flex w-full max-w-7xl mx-auto px-6 lg:px-8 py-3 items-center justify-between gap-4">
        {/* Left: Brand Link */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group">
          <div
            className={`w-11 h-11 rounded-none p-1 flex items-center justify-center shrink-0 border-2 transition-all shadow-xs group-hover:scale-105 ${
              isLight
                ? "border-[#1F120A] bg-white"
                : "border-[#E5DACB] bg-white shadow-sm"
            }`}
          >
            <img
              src={cmsConfig.brandLogoUrl || MEDIA_ASSETS.logo}
              alt="MANOPAVANA Artisanal Oils Logo"
              className="w-full h-full object-contain block"
            />
          </div>
          <div className="flex flex-col">
            <span className={`text-xl lg:text-2xl font-black tracking-wider ${isLight ? "text-[#1F120A]" : "text-[#FAF4EA]"} font-serif leading-none`}>
              {BUSINESS_CONFIG.BRAND_NAME}
            </span>
            <span className="text-xs text-[#E08F35] font-semibold tracking-wide mt-0.5 leading-tight block">
              {cmsConfig.brandTagline || "Pure by nature, trusted for life"}
            </span>
          </div>
        </Link>

        {/* Middle: Desktop Search Input (LIGHT THEMED) */}
        <div ref={desktopSearchRef} className="relative flex-1 max-w-md lg:max-w-lg mx-4">
          <Search className="w-4 h-4 text-[#7A5538] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search wood-pressed groundnut, coconut, sesame oil..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            className="w-full h-10 pl-10 pr-9 text-xs rounded-full bg-white text-[#1F120A] placeholder-[#8A705B] border border-[#D8C7B5] hover:border-[#C8751B] focus:border-[#C8751B] focus:outline-none focus:ring-2 focus:ring-[#C8751B]/25 shadow-sm transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A705B] hover:text-[#1F120A] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Autocomplete Dropdown on Desktop (LIGHT THEMED) */}
          {isSearchOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-[#DDD0BF] overflow-hidden z-50 divide-y divide-[#EFE8DC]">
              <div className="px-4 py-2.5 bg-[#FAF6EE] text-[10px] font-bold text-[#7A4B1A] uppercase tracking-wider flex items-center justify-between">
                <span>Matching Artisanal Oils ({searchResults.length})</span>
                <span className="text-[9px] text-[#A89482] font-normal">Pure Cold-Pressed</span>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 hover:bg-[#FAF6EE] transition-colors flex items-center justify-between gap-3 text-[#1F120A]"
                  >
                    <Link
                      to={item.url}
                      onClick={() => setIsSearchOpen(false)}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-10 h-10 object-contain rounded-lg bg-[#FAF6EE] p-0.5 border border-[#DDD0BF] shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1F120A] truncate">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-[#7A5538]">
                          {item.subtitle} • ₹{item.price}
                        </p>
                      </div>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        addToCart({
                          id: `${item.id}-${item.variant}`,
                          productId: item.id,
                          title: item.title,
                          subtitle: item.subtitle,
                          variant: item.variant,
                          price: item.price,
                          regularPrice: item.regularPrice,
                          image: item.image,
                        });
                        setIsSearchOpen(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#E08F35] hover:bg-[#F5BC51] text-[#140D09] font-black text-xs flex items-center gap-1 shrink-0 cursor-pointer shadow-sm transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions Cluster */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Location Trigger */}
          <button
            onClick={() => setLocationModalOpen(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
              isLight
                ? "bg-[#FAF6EE] border-[#DDD0BF] text-[#7A4B1A] hover:border-[#C8751B]"
                : "bg-[#2D1B10] border-[#5A3820] text-[#E08F35] hover:border-[#E08F35]"
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-[#E08F35]" />
            <div className="text-left flex flex-col leading-tight">
              <span className={`text-[9px] font-semibold uppercase ${isLight ? "text-[#8C5D30]" : "text-[#D4A373]"}`}>
                Bengaluru
              </span>
              <span className={`font-bold truncate max-w-[110px] ${isLight ? "text-[#1F120A]" : "text-[#FAF4EA]"}`}>
                {address.pincode ? `${address.city} (${address.pincode})` : "Set Location"}
              </span>
            </div>
          </button>

          {/* Bottle Loyalty QR */}
          <button
            onClick={() => openLoyaltyQuiz()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
              loyalty.isActive
                ? isLight
                  ? "bg-amber-100/90 text-[#7A4B1A] border-[#D49A37] shadow-xs"
                  : "bg-[#2D1B10] text-[#F5BC51] border-[#E08F35] shadow-xs"
                : isLight
                ? "bg-[#FAF6EE] text-[#7A5538] border-[#DDD0BF] hover:border-[#C8751B]"
                : "bg-[#2D1B10] text-[#D4A373] border-[#5A3820] hover:border-[#E08F35]"
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-[#E08F35]" />
            <span>
              {loyalty.isActive ? `10% Off (${loyaltyRemainingText || "Active"})` : "Bottle QR 10% Off"}
            </span>
          </button>

          {/* Theme Selector (Blend / Light / Dark) */}
          <div className={`flex items-center ${
            isLight ? "bg-[#FAF6EE] border-[#DDD0BF]" : "bg-[#24150C] border-[#5A3820]"
          } border rounded-lg p-0.5 text-[11px] font-bold`}>
            <button
              type="button"
              onClick={() => setThemeMode("blend")}
              className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                themeMode === "blend"
                  ? "bg-[#D49A37] text-[#140D09] shadow-xs"
                  : isLight
                  ? "text-[#7A5538] hover:text-[#1F120A]"
                  : "text-[#D4A373] hover:text-[#FAF4EA]"
              }`}
              title="Harmonious Blend: Signature mixture of dark hero/combos & warm linen catalog"
            >
              <Palette className="w-3 h-3" />
              <span className="hidden lg:inline">Blend</span>
            </button>
            <button
              type="button"
              onClick={() => setThemeMode("light")}
              className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                themeMode === "light"
                  ? "bg-[#D49A37] text-[#140D09] shadow-xs"
                  : isLight
                  ? "text-[#7A5538] hover:text-[#1F120A]"
                  : "text-[#D4A373] hover:text-[#FAF4EA]"
              }`}
              title="Warm Light: Crisp ivory & cream parchment"
            >
              <Sun className="w-3 h-3" />
              <span className="hidden lg:inline">Light</span>
            </button>
            <button
              type="button"
              onClick={() => setThemeMode("dark")}
              className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                themeMode === "dark"
                  ? "bg-[#D49A37] text-[#140D09] shadow-xs"
                  : isLight
                  ? "text-[#7A5538] hover:text-[#1F120A]"
                  : "text-[#D4A373] hover:text-[#FAF4EA]"
              }`}
              title="Teakwood Dark: Midnight teakwood luxury"
            >
              <Moon className="w-3 h-3" />
              <span className="hidden lg:inline">Dark</span>
            </button>
          </div>

          {/* Account / Login with Anchor Dropdown */}
          <div ref={desktopUserMenuRef} className="relative">
            <button
              onClick={() => {
                if (currentUser) {
                  setIsUserDropdownOpen((prev) => !prev);
                } else {
                  setLoginModalOpen(true);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                currentUser
                  ? isLight
                    ? "bg-[#F3EDE2] border-[#C8751B] text-[#1F120A] shadow-xs"
                    : "bg-[#3D2514] border-[#E08F35] text-[#FAF4EA] shadow-xs"
                  : isLight
                  ? "bg-[#FAF6EE] border-[#DDD0BF] text-[#1F120A] hover:border-[#C8751B]"
                  : "bg-[#2D1B10] border-[#5A3820] text-[#FAF4EA] hover:border-[#E08F35]"
              }`}
            >
              <User className="w-3.5 h-3.5 text-[#E08F35]" />
              <span>
                {currentUser ? currentUser.displayName?.split(" ")[0] || "Account" : "Sign In"}
              </span>
            </button>

            {/* Desktop User Profile Dropdown */}
            {currentUser && isUserDropdownOpen && (
              <div className={`absolute right-0 top-full mt-2 w-72 ${
                isLight
                  ? "bg-[#FCFAF7] border-[#DDD0BF] divide-[#EFE8DC]"
                  : "bg-[#1B0F08] border-[#4D2E1A] divide-[#2D1B10]"
              } border rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in divide-y`}>
                {/* Greeting Banner */}
                <div className={`px-4 py-3 ${isLight ? "bg-[#F5EDE1]" : "bg-[#120904]"}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#E08F35]/20 border border-[#E08F35]/40 flex items-center justify-center text-[#E08F35] font-black text-xs shrink-0">
                      {(currentUser.displayName || currentUser.email || "C").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold truncate ${isLight ? "text-[#1F120A]" : "text-[#FAF4EA]"}`}>
                        Hello, {currentUser.displayName || currentUser.email?.split("@")[0] || "Customer"}
                      </p>
                      <p className={`text-[10px] truncate ${isLight ? "text-[#7A5538]" : "text-[#D4A373]"}`}>
                        {currentUser.email || "Active Session"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Navigation Links */}
                <div className="py-1 text-xs">
                  <Link
                    to="/account?tab=profile"
                    onClick={() => setIsUserDropdownOpen(false)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 ${
                      isLight ? "text-[#24140A] hover:bg-[#F3EDE2] hover:text-[#C8751B]" : "text-[#FAF4EA] hover:bg-[#25150C] hover:text-[#E08F35]"
                    } transition-colors`}
                  >
                    <User className={`w-4 h-4 ${isLight ? "text-[#7A5538]" : "text-[#D4A373]"}`} />
                    <span>👤 My Profile</span>
                  </Link>

                  <Link
                    to="/account?tab=orders"
                    onClick={() => setIsUserDropdownOpen(false)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 ${
                      isLight ? "text-[#24140A] hover:bg-[#F3EDE2] hover:text-[#C8751B]" : "text-[#FAF4EA] hover:bg-[#25150C] hover:text-[#E08F35]"
                    } transition-colors`}
                  >
                    <Package className={`w-4 h-4 ${isLight ? "text-[#7A5538]" : "text-[#D4A373]"}`} />
                    <span>📦 My Orders</span>
                  </Link>

                  <Link
                    to="/account?tab=addresses"
                    onClick={() => setIsUserDropdownOpen(false)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 ${
                      isLight ? "text-[#24140A] hover:bg-[#F3EDE2] hover:text-[#C8751B]" : "text-[#FAF4EA] hover:bg-[#25150C] hover:text-[#E08F35]"
                    } transition-colors`}
                  >
                    <MapPin className={`w-4 h-4 ${isLight ? "text-[#7A5538]" : "text-[#D4A373]"}`} />
                    <span>📍 Delivery Address</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      openLoyaltyQuiz();
                    }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 ${
                      isLight ? "text-[#24140A] hover:bg-[#F3EDE2] hover:text-[#C8751B]" : "text-[#FAF4EA] hover:bg-[#25150C] hover:text-[#E08F35]"
                    } transition-colors text-left cursor-pointer`}
                  >
                    <QrCode className="w-4 h-4 text-[#E08F35]" />
                    <span>🏷️ 10% Loyalty QR</span>
                  </button>

                  {currentUser.email === "manopavana@gmail.com" && (
                    <Link
                      to="/admin"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className={`flex items-center gap-2.5 px-4 py-2.5 ${
                        isLight ? "text-amber-800 hover:bg-[#F3EDE2]" : "text-amber-300 hover:bg-[#25150C]"
                      } transition-colors font-semibold`}
                    >
                      <ShieldAlert className="w-4 h-4 text-[#E08F35]" />
                      <span>🛡️ Admin CMS Portal</span>
                    </Link>
                  )}
                </div>

                {/* Logout Button */}
                <div className={`p-2 ${isLight ? "bg-[#F5EDE1]" : "bg-[#120904]"}`}>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsUserDropdownOpen(false);
                      await logoutUser();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-700" />
                    <span>🚪 Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cart Trigger */}
          <button
            onClick={() => navigate("/cart")}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#D49A37] to-[#B87C24] text-[#140D09] font-black text-xs shadow-md border border-[#F5BC51] hover:brightness-105 transition-all cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-[#140D09]" />
            <span>Bag</span>
            <span className="bg-[#140D09] text-[#F5BC51] text-[10px] px-2 py-0.5 rounded-full font-bold">
              {cartCount}
            </span>
          </button>

          {/* Secret Admin CMS link strictly for manopavana@gmail.com */}
          {currentUser?.email === "manopavana@gmail.com" && (
            <Link
              to="/admin"
              aria-label="Admin Portal"
              className="p-1.5 text-[#D4A373] hover:text-[#FAF4EA] transition-colors"
              title="Admin CMS Portal"
            >
              <ShieldAlert className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
