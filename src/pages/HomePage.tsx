import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Droplets,
  Flame,
  ArrowRight,
  ShoppingBag,
  Star,
  ChevronDown,
  Clock,
  QrCode,
  PackageCheck,
  Search,
  Truck,
  Leaf,
  MapPin,
  Trash2,
  PlusCircle,
  MessageSquarePlus,
  Lock,
  Plus,
  Minus,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import {
  PRODUCTS,
  COMBOS,
  BENCHMARK_COMPARISONS,
  BENCHMARK_DISCLAIMER,
  PACKAGING_FEATURES,
  FAQS,
  CUSTOMER_REVIEWS,
  MEDIA_ASSETS,
  BUSINESS_CONFIG,
  THEMED_PRODUCT_IMAGES,
} from "../constants";
import { BottleVolume, Product } from "../types";

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    cart,
    addToCart,
    startBuyNow,
    updateQuantity,
    openLoyaltyQuiz,
    cmsConfig,
    products,
    combos,
    loyalty,
    setLocationModalOpen,
    address,
    reviews,
    submitReview,
    deleteReview,
    currentUser,
    setLoginModalOpen,
    themeMode,
  } = useStore();

  const isDark = themeMode === "dark";

  const [selectedVariants, setSelectedVariants] = useState<Record<string, BottleVolume>>({
    groundnut: "1L",
    coconut: "1L",
    sesame: "1L",
  });
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Review Submission State
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [revName, setRevName] = useState("");
  const [revLocality, setRevLocality] = useState("");
  const [revRating, setRevRating] = useState(5);
  const [revProduct, setRevProduct] = useState("Wood-Pressed Groundnut Oil");
  const [revComment, setRevComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // PIN-protected Review Deletion State
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [deletePinInput, setDeletePinInput] = useState("");
  const [deletePinError, setDeletePinError] = useState(false);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revName.trim() || !revComment.trim()) return;

    setIsSubmittingReview(true);
    await submitReview({
      name: revName.trim(),
      locality: revLocality.trim() || "Bengaluru",
      city: "Bengaluru",
      rating: revRating,
      product: revProduct,
      comment: revComment.trim(),
      date: "Just now",
      verified: true,
    });
    setIsSubmittingReview(false);
    setIsReviewFormOpen(false);
    setRevName("");
    setRevLocality("");
    setRevComment("");
  };

  const handleConfirmDeleteReview = async () => {
    if (!deletingReviewId) return;
    const ok = await deleteReview(deletingReviewId, deletePinInput);
    if (ok) {
      setDeletingReviewId(null);
      setDeletePinInput("");
      setDeletePinError(false);
    } else {
      setDeletePinError(true);
    }
  };

  const handleVariantChange = (productId: string, variant: BottleVolume) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [productId]: variant,
    }));
  };

  const filteredProducts = products;

  const handleQuickAdd = (product: Product) => {
    const variant = selectedVariants[product.id] || "1L";
    const price = product.prices[variant];
    const mrp = product.mrp[variant];
    addToCart({
      id: `${product.id}-${variant}`,
      productId: product.id,
      title: product.name,
      subtitle: `Marachekku Pure • ${variant}`,
      variant,
      price,
      regularPrice: mrp,
      image: THEMED_PRODUCT_IMAGES[product.id]?.light || product.images[0] || product.labelImage,
    });
  };

  const handleBuyNow = (product: Product) => {
    const variant = selectedVariants[product.id] || "1L";
    const price = product.prices[variant];
    const mrp = product.mrp[variant];
    const image = THEMED_PRODUCT_IMAGES[product.id]?.light || product.images[0] || product.labelImage;
    startBuyNow(
      {
        id: `${product.id}-${variant}`,
        productId: product.id,
        title: product.name,
        subtitle: `Marachekku Pure • ${variant}`,
        variant,
        price,
        regularPrice: mrp,
        image,
      },
      1
    );
    navigate("/checkout?mode=buynow");
  };

  const handleAddCombo = (combo: (typeof COMBOS)[0]) => {
    addToCart({
      id: combo.id,
      productId: combo.id,
      isCombo: true,
      title: combo.name,
      subtitle: combo.volumeLabel,
      variant: combo.id === "combo-3l" ? "3L Trio" : "1.5L Trio",
      price: loyalty.isActive ? combo.loyaltyPrice : combo.regularPrice,
      regularPrice: combo.mrp,
      image: combo.image,
    });
  };

  const handleBuyNowCombo = (combo: (typeof COMBOS)[0]) => {
    startBuyNow(
      {
        id: combo.id,
        productId: combo.id,
        isCombo: true,
        title: combo.name,
        subtitle: combo.volumeLabel,
        variant: combo.id === "combo-3l" ? "3L Trio" : "1.5L Trio",
        price: loyalty.isActive ? combo.loyaltyPrice : combo.regularPrice,
        regularPrice: combo.mrp,
        image: combo.image,
      },
      1
    );
    navigate("/checkout?mode=buynow");
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden flex flex-col box-border">
      {/* 1. HERO SECTION (SPLIT-SCREEN 2-COLUMN LAYOUT) */}
      <section
        className={`relative w-full max-w-full overflow-hidden py-12 sm:py-16 lg:py-20 border-b transition-colors box-border ${
          isDark
            ? "bg-[#140D09] text-[#FAF4EA] border-[#2D1B10]"
            : "bg-[#FAF7F2] text-[#1F120A] border-[#E8DEC8]"
        }`}
      >
        {/* Subtle background ambient golden illumination */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-[#E08F35]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 box-border">
          <div className="w-full max-w-full grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            {/* LEFT COLUMN: HERO VIDEO FRAME */}
            <div className="order-1 lg:order-1 w-full flex justify-center">
              <div className="relative w-full aspect-video rounded-3xl overflow-hidden border-2 border-[#D4A373] shadow-[0_0_45px_rgba(224,143,53,0.35)] bg-[#1A0E07] group">
                {/* Golden aura glow overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[#E08F35]/20 via-transparent to-amber-400/10 pointer-events-none z-10" />

                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster={MEDIA_ASSETS.heroFallbackImage}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = "none";
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = "block";
                  }}
                >
                  <source src={cmsConfig.chekkuVideoUrl || MEDIA_ASSETS.heroVideo} type="video/mp4" />
                </video>

                {/* Fallback image if video cannot be played */}
                <img
                  src={MEDIA_ASSETS.heroFallbackImage}
                  alt="MANOPAVANA Artisanal Wood-Pressed Oils"
                  className="hidden w-full h-full object-cover"
                />

                {/* Bottom subtle gradient for contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none z-10" />

                {/* Floating royal seal badge at the bottom */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full bg-[#2A170C]/90 border border-[#D4A373] backdrop-blur-md shadow-xl flex items-center gap-2 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-[#E08F35] animate-ping" />
                  <span className="text-[10px] sm:text-xs font-black tracking-widest text-[#F5DEB3] uppercase font-serif">
                    TRADITIONAL WOOD PRESSED OILS
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: HERO EDITORIAL TEXT */}
            <div className="order-2 lg:order-2 flex flex-col items-center lg:items-start text-center lg:text-left space-y-5">
              {/* Top Action Button */}
              <div>
                <a
                  href="#catalog"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#5E3210] hover:bg-[#43230A] text-white font-black text-xs uppercase tracking-wider shadow-lg hover:shadow-xl transition-all cursor-pointer group"
                >
                  <span>Explore The Collection →</span>
                </a>
              </div>

              {/* Heritage Tag */}
              <div
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold tracking-wider uppercase shadow-xs ${
                  isDark
                    ? "bg-[#1E130B] border-[#3D2514] text-[#F5BC51]"
                    : "bg-amber-100/80 border-amber-300 text-[#7A4B1A]"
                }`}
              >
                <span>⚜️ GOOD FOOD STARTS HERE</span>
              </div>

              {/* Main Title */}
              <h1
                className={`text-3xl sm:text-4xl lg:text-5xl font-black font-serif tracking-tight leading-tight ${
                  isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                }`}
              >
                {cmsConfig.heroHeadline || "Unrefined by Nature, Bottled Fresh"}
              </h1>

              {/* Subtitle */}
              <p
                className={`text-sm sm:text-base font-normal leading-relaxed max-w-xl ${
                  isDark ? "text-[#D8C8B8]" : "text-[#4A3423]"
                }`}
              >
                {cmsConfig.heroSubhead ||
                  "Sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore facility. Free from chemical solvents, and sealed fresh into food-grade bottles to preserve natural aroma and wholesome nutrients."}
              </p>

              {/* 3 Highlight Badges in a horizontal row */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-1">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                    isDark
                      ? "bg-[#1C120B] border-[#3A2417] text-amber-200"
                      : "bg-white border-[#E0D4C0] text-[#3D2514] shadow-2xs"
                  }`}
                >
                  <span>🪵 Marachekku Pressing</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                    isDark
                      ? "bg-[#1C120B] border-[#3A2417] text-amber-200"
                      : "bg-white border-[#E0D4C0] text-[#3D2514] shadow-2xs"
                  }`}
                >
                  <span>☀️ Natural Sedimentation</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                    isDark
                      ? "bg-[#1C120B] border-[#3A2417] text-amber-200"
                      : "bg-white border-[#E0D4C0] text-[#3D2514] shadow-2xs"
                  }`}
                >
                  <span>🏷️ Direct Bangalore Delivery</span>
                </div>
              </div>

              {/* Live Dispatch Location Quick Line */}
              <div
                className={`pt-3 border-t flex items-center gap-2 text-xs ${
                  isDark
                    ? "border-[#2D1B10] text-[#D8C8B8]"
                    : "border-[#E8DEC8] text-[#5C402D]"
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-[#E08F35] shrink-0" />
                <span>
                  Dispatched fresh from Peenya 2nd Stage, Bangalore to{" "}
                  <button
                    onClick={() => setLocationModalOpen(true)}
                    className="text-[#E08F35] underline font-semibold hover:text-[#C8751B] cursor-pointer"
                  >
                    {address.city} ({address.pincode})
                  </button>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CORE ARTISANAL OILS CATALOG */}
      <section
        id="catalog"
        className={`w-full max-w-full py-16 sm:py-20 border-b transition-colors box-border ${
          isDark
            ? "bg-[#140D09] border-[#2D1B10] text-[#FAF4EA]"
            : "bg-[#FAF7F2] border-[#E8DEC8] text-[#1F120A]"
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 box-border">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-[#B86B14] uppercase">
                <Droplets className="w-4 h-4 text-[#E08F35]" />
                <span>Marachekku Wood-Pressed Collection</span>
              </div>
              <h2
                className={`text-3xl sm:text-4xl font-extrabold font-serif mt-1 ${
                  isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                }`}
              >
                Pure Unrefined Cooking Oils
              </h2>
              <p
                className={`text-xs sm:text-sm max-w-xl mt-1.5 ${
                  isDark ? "text-[#D8C8B8]" : "text-[#4A3423]"
                }`}
              >
                Cold-pressed below 45°C in wooden Wagai pestles, settled naturally through cotton muslin cloth, and packed fresh in Bengaluru.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-2 shadow-2xs ${
                isDark
                  ? "bg-[#1E130B] border-[#3D2514] text-amber-200"
                  : "bg-amber-100/70 border-amber-200/80 text-[#7A4B1A]"
              }`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                <span>Peenya Facility Dispatched</span>
              </span>
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="w-full max-w-full grid grid-cols-1 md:grid-cols-3 gap-8">
            {filteredProducts.map((product) => {
              const currentVolume = selectedVariants[product.id] || "1L";
              const price = product.prices[currentVolume];
              const mrp = product.mrp[currentVolume];
              const inStock = product.inStock[currentVolume];
              const cartItemId = `${product.id}-${currentVolume}`;
              const cartItem = cart.find((item) => item.id === cartItemId);
              const themedImg = THEMED_PRODUCT_IMAGES[product.id];
              const productImgSrc = isDark
                ? themedImg?.dark || product.images[0] || product.labelImage
                : themedImg?.light || product.images[0] || product.labelImage;

              return (
                <div
                  key={product.id}
                  className={`group rounded-3xl border transition-all duration-300 flex flex-col overflow-hidden shadow-xs hover:shadow-xl ${
                    isDark
                      ? "bg-[#1C120B] border-[#362114] hover:border-[#D49A37]"
                      : "bg-white border-[#E5DACB] hover:border-[#D49A37]"
                  }`}
                >
                  {/* Product Image Header: Video Studio Background in dark theme, clean natural cream in light theme */}
                  <div
                    className={`relative aspect-square p-6 rounded-t-3xl flex items-center justify-center overflow-hidden border-b transition-all duration-300 ${
                      isDark
                        ? "bg-[#0D0704] border-[#362114]"
                        : "bg-[#FAF6EE] border-[#E5DACB]"
                    }`}
                  >
                    {isDark && (
                      <>
                        {/* Background image matching Engineered for Daily Cooking section video */}
                        <img
                          src={MEDIA_ASSETS.videoStudioBg}
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none transition-transform duration-700 group-hover:scale-105"
                        />

                        {/* Ambient warm golden spotlight halo directly behind bottle */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(224,143,53,0.32),rgba(160,80,15,0.14)_45%,transparent_72%)] pointer-events-none" />

                        {/* Pedestal surface contact highlight line matching 360 video */}
                        <div className="absolute bottom-[28%] inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent pointer-events-none" />

                        {/* Soft ground pedestal base shadow */}
                        <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/75 via-black/35 to-transparent pointer-events-none" />
                      </>
                    )}

                    <Link
                      to={`/product/${product.id}`}
                      className="block relative z-10 w-full h-full flex items-center justify-center"
                    >
                      <img
                        src={productImgSrc}
                        alt={product.name}
                        className={`max-h-full max-w-full object-contain mx-auto group-hover:scale-105 transition-all duration-300 ${
                          isDark
                            ? "filter drop-shadow-[0_16px_28px_rgba(0,0,0,0.8)] drop-shadow-[0_0_18px_rgba(224,143,53,0.36)]"
                            : "drop-shadow-md"
                        }`}
                      />
                    </Link>

                    {/* Top Badge: Extraction / Quality */}
                    <div
                      className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs z-20 border backdrop-blur-xs flex items-center gap-1 ${
                        isDark
                          ? "bg-[#1A0E07]/90 border-[#D4A373]/50 text-amber-200"
                          : "bg-white/95 border-[#D4A373]/40 text-[#6B4423]"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isDark ? "bg-amber-400" : "bg-amber-600"} animate-pulse`} />
                      <span>{product.smokePoint}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      {/* Kannada name */}
                      <div className="text-[11px] text-[#B86B14] font-semibold">
                        <span>{product.kannadaName}</span>
                      </div>

                      <Link to={`/product/${product.id}`}>
                        <h3
                          className={`text-lg font-bold font-serif hover:text-[#E08F35] transition-colors leading-snug ${
                            isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                          }`}
                        >
                          {product.name}
                        </h3>
                      </Link>

                      <p
                        className={`text-xs line-clamp-2 leading-relaxed ${
                          isDark ? "text-[#D8C8B8]" : "text-[#4A3423]"
                        }`}
                      >
                        {product.shortDescription}
                      </p>

                      {/* Features Tags */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                            isDark
                              ? "bg-amber-950/40 text-amber-200 border-amber-800/40"
                              : "bg-amber-50 text-amber-900 border-amber-200"
                          }`}
                        >
                          {product.features.aroma}
                        </span>
                        {product.features.texture && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                              isDark
                                ? "bg-stone-900 text-stone-200 border-stone-800"
                                : "bg-stone-100 text-stone-800 border-stone-200"
                            }`}
                          >
                            {product.features.texture}
                          </span>
                        )}
                        {product.features.cooking && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                              isDark
                                ? "bg-emerald-950/40 text-emerald-200 border-emerald-800/40"
                                : "bg-emerald-50 text-emerald-900 border-emerald-200"
                            }`}
                          >
                            {product.features.cooking}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Volume Selector (1L vs 500ml) */}
                    <div
                      className={`space-y-3 pt-2 border-t ${
                        isDark ? "border-[#2A180E]" : "border-[#EFE8DC]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[11px] font-semibold ${
                            isDark ? "text-[#A8907E]" : "text-[#7A5E48]"
                          }`}
                        >
                          Select Volume:
                        </span>
                        <div
                          className={`flex items-center gap-1.5 p-1 rounded-xl border ${
                            isDark
                              ? "bg-[#140D07] border-[#362114]"
                              : "bg-[#FAF6EE] border-[#E5DAC8]"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleVariantChange(product.id, "1L")}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              currentVolume === "1L"
                                ? "bg-[#5E3210] text-white shadow-xs"
                                : isDark
                                ? "text-[#D6C4B0] hover:text-white"
                                : "text-[#5C402D] hover:text-[#23150C]"
                            }`}
                          >
                            1 Litre
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVariantChange(product.id, "500ml")}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              currentVolume === "500ml"
                                ? "bg-[#5E3210] text-white shadow-xs"
                                : isDark
                                ? "text-[#D6C4B0] hover:text-white"
                                : "text-[#5C402D] hover:text-[#23150C]"
                            }`}
                          >
                            500 ml
                          </button>
                        </div>
                      </div>

                      {/* Honest Pricing */}
                      <div className="pt-1 flex items-baseline justify-between">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span
                              className={`text-2xl font-black font-serif ${
                                isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                              }`}
                            >
                              ₹{price}
                            </span>
                            <span
                              className={`text-[11px] font-medium ${
                                isDark ? "text-[#A89482]" : "text-[#6A523E]"
                              }`}
                            >
                              (Inclusive of GST)
                            </span>
                          </div>
                        </div>
                        <Link
                          to={`/product/${product.id}`}
                          className="text-xs font-bold text-[#B86B14] hover:text-[#E08F35] transition-colors"
                        >
                          Details →
                        </Link>
                      </div>

                      {/* Dual Action: Add to Bag (with Stepper) + Buy Now */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {/* Add to Bag OR Stepper */}
                        {cartItem ? (
                          <div
                            className={`flex items-center justify-between border-2 border-[#5E3210] rounded-xl px-2 py-1.5 ${
                              isDark ? "bg-[#140D07]" : "bg-[#FAF6EE]"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => updateQuantity(cartItemId, -1)}
                              className={`w-7 h-7 rounded-lg border font-black flex items-center justify-center transition-colors cursor-pointer ${
                                isDark
                                  ? "bg-[#25150C] border-[#4D2E1A] text-[#FAF4EA] hover:bg-[#361E10]"
                                  : "bg-white border-[#DDD1BE] text-[#5E3210] hover:bg-[#F3EDE2]"
                              }`}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span
                              className={`text-xs font-black px-1 ${
                                isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                              }`}
                            >
                              {cartItem.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(cartItemId, 1)}
                              className="w-7 h-7 rounded-lg bg-[#5E3210] text-white font-black flex items-center justify-center hover:bg-[#43230A] transition-colors cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!inStock}
                            onClick={() => handleQuickAdd(product)}
                            className={`py-2.5 px-3 rounded-xl border-2 border-[#5E3210] disabled:opacity-50 text-[#5E3210] font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              isDark
                                ? "bg-[#25150C] hover:bg-[#361E10] text-amber-200"
                                : "bg-white hover:bg-[#FAF6EE]"
                            }`}
                          >
                            <ShoppingBag className="w-3.5 h-3.5 text-[#5E3210]" />
                            <span>Add to Bag</span>
                          </button>
                        )}

                        {/* Buy Now Button */}
                        <button
                          type="button"
                          disabled={!inStock}
                          onClick={() => handleBuyNow(product)}
                          className="py-2.5 px-3 rounded-xl bg-[#5E3210] hover:bg-[#43230A] disabled:opacity-50 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>Buy Now</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. FUNCTIONAL BOTTLE PACKAGING SHOWCASE */}
      <section
        id="packaging"
        className={`w-full max-w-full py-16 sm:py-20 border-b transition-colors box-border ${
          isDark
            ? "bg-[#140D09] border-[#2D1B10] text-[#FAF4EA]"
            : "bg-[#FAF7F2] border-[#E8DEC8] text-[#1F120A]"
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 box-border">
          <div
            className={`w-full max-w-full border rounded-3xl p-6 sm:p-10 lg:p-12 shadow-sm box-border ${
              isDark
                ? "bg-[#1C120B] border-[#362114]"
                : "bg-white border-[#E5DACB]"
            }`}
          >
            <div className="w-full max-w-full grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Left 360 Video / Bottle preview */}
              <div className="w-full max-w-full lg:col-span-5 relative flex justify-center">
                <div className="relative w-full max-w-sm aspect-[4/5] rounded-2xl overflow-hidden bg-[#1A0E07] shadow-xl border border-[#D4A373]/50">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full max-w-full object-cover"
                  >
                    <source src={MEDIA_ASSETS.bottle360Video} type="video/mp4" />
                  </video>
                  <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[11px] font-bold text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>360° Kitchen Engineered</span>
                  </div>
                </div>
              </div>

              {/* Right Features */}
              <div className="w-full max-w-full lg:col-span-7 space-y-6">
                <div className="space-y-2">
                  <span className="text-xs font-bold tracking-widest text-[#B86B14] uppercase">
                    {PACKAGING_FEATURES.tag}
                  </span>
                  <h2
                    className={`text-2xl sm:text-3xl font-extrabold font-serif ${
                      isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                    }`}
                  >
                    {PACKAGING_FEATURES.heading}
                  </h2>
                  <p
                    className={`text-sm ${
                      isDark ? "text-[#D8C8B8]" : "text-[#4A3423]"
                    }`}
                  >
                    {PACKAGING_FEATURES.subhead}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 pt-2">
                  {PACKAGING_FEATURES.items.map((feat, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border shadow-xs flex items-start gap-4 transition-colors ${
                        isDark
                          ? "bg-[#150D07] border-[#2E1B10] text-[#FAF4EA] hover:border-[#D49A37]"
                          : "bg-[#FAF7F2] border-[#E8DFC8] text-[#1F120A] hover:border-[#D49A37]"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-[#B86B14] flex items-center justify-center shrink-0 font-bold text-sm">
                        0{idx + 1}
                      </div>
                      <div>
                        <h4
                          className={`text-sm font-bold ${
                            isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                          }`}
                        >
                          {feat.title}
                        </h4>
                        <p
                          className={`text-xs mt-1 leading-relaxed ${
                            isDark ? "text-[#D8C8B8]" : "text-[#4A3423]"
                          }`}
                        >
                          {feat.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottle QR Loyalty Verification CTA */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => openLoyaltyQuiz()}
                    className="px-5 py-2.5 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 text-amber-300" />
                    <span>Bottle QR Verification Quiz</span>
                  </button>
                  <span
                    className={`text-xs ${
                      isDark ? "text-[#A89482]" : "text-[#6A523E]"
                    }`}
                  >
                    Have a bottle? Scan & verify for 10% repeat reorder discount
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. VALUE COMBOS (TRIO SETS) - JEWEL BOX OF THE BLEND */}
      <section
        id="combos"
        className={`w-full max-w-full py-16 sm:py-20 border-b transition-colors box-border ${
          isDark
            ? "bg-[#140D09] border-[#2D1B10]"
            : "bg-[#FAF6F0] border-[#E8DEC8]"
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 box-border">
          <div className="w-full max-w-full bg-gradient-to-br from-[#2D1B10] via-[#21140C] to-[#170D07] text-white rounded-3xl p-6 sm:p-10 lg:p-12 shadow-2xl relative overflow-hidden border border-[#D49A37]/35 box-border">
            {/* Subtle Ambient pattern */}
            <div className="absolute right-0 top-0 w-96 h-96 bg-[#E08F35]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-8 w-full max-w-full">
              <div className="max-w-2xl space-y-2">
                <span className="text-xs font-bold tracking-widest text-[#E08F35] uppercase flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Value Kitchen Boxes
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold font-serif text-white">
                  South India 3-Oil Trio Sets
                </h2>
                <p className="text-sm text-[#D6C4B0]">
                  Equip your home with authentic cold-pressed Groundnut, Coconut, and Sesame oils in one single boxed delivery with free shipping.
                </p>
              </div>

              {/* Combo Section Banner Image */}
              <div className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-black/40">
                <img
                  src="https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/combo-all-labels.jpg"
                  alt="MANOPAVANA Complete 3-Oil Essential Trio Box"
                  className="w-full max-h-[340px] object-cover object-center"
                />
              </div>

              <div className="w-full max-w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
                {combos.map((combo) => (
                  <div
                    key={combo.id}
                    className="w-full max-w-full bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all flex flex-col justify-between space-y-5 box-border"
                  >
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="px-3 py-1 rounded-full bg-[#E08F35] text-[#29170C] text-xs font-black">
                          {combo.id === "combo-3l" ? "Best Family Value • 3 Litres" : "Starter Box • 1.5 Litres"}
                        </span>
                        <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5" />
                          Free Bengaluru Delivery
                        </span>
                      </div>

                      <h3 className="text-xl font-bold font-serif text-white">
                        {combo.heading}
                      </h3>

                      <p className="text-xs text-[#D6C4B0] leading-relaxed">
                        {combo.description}
                      </p>

                      <div className="space-y-2 pt-2">
                        {combo.bullets.map((b, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-[#E8DFD5]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#E08F35] shrink-0 mt-0.5" />
                            <span>{b}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Price & CTA */}
                    <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black font-serif text-[#E08F35]">
                            ₹{loyalty.isActive ? combo.loyaltyPrice : combo.regularPrice}
                          </span>
                          <span className="text-xs text-[#D6C4B0] font-semibold">
                            (Inclusive of GST)
                          </span>
                        </div>
                        {loyalty.isActive ? (
                          <span className="text-[11px] text-amber-300 font-bold">
                            🎉 10% Loyalty discount applied!
                          </span>
                        ) : (
                          <span className="text-[11px] text-emerald-400 font-medium">
                            Repeat reorder QR unlocks ₹{combo.loyaltyPrice}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddCombo(combo)}
                          className="px-4 py-2.5 rounded-xl border-2 border-[#E08F35] text-[#E08F35] hover:bg-[#E08F35]/10 font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-[#E08F35]" />
                          <span>Add to Bag</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBuyNowCombo(combo)}
                          className="px-5 py-2.5 rounded-xl bg-[#E08F35] hover:bg-[#F59E0B] text-[#29170C] font-black text-xs shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Buy Now</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CULINARY PAIRINGS & GASTRONOMY SHOWCASE */}
      <section
        className={`w-full max-w-full py-16 sm:py-20 border-b transition-colors box-border ${
          isDark
            ? "bg-[#140D09] border-[#2D1B10] text-[#FAF4EA]"
            : "bg-[#FAF6F0] border-[#E8DEC8] text-[#23150C]"
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 box-border">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold tracking-widest text-[#C8751B] uppercase">
              Good Food Starts Here
            </span>
            <h2
              className={`text-3xl sm:text-4xl font-extrabold font-serif ${
                isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
              }`}
            >
              Culinary Artistry & South Indian Traditions
            </h2>
            <p
              className={`text-xs sm:text-sm ${
                isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"
              }`}
            >
              Each cold-pressed oil has its authentic place in traditional South Indian recipes and everyday wholesome home cooking.
            </p>
          </div>

          <div className="w-full max-w-full grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: Groundnut Oil */}
            <div
              className={`w-full max-w-full rounded-3xl border overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col box-border ${
                isDark
                  ? "bg-[#1C120B] border-[#362114] hover:border-[#D49A37]"
                  : "bg-white border-[#E8DEC8] hover:border-[#D49A37]"
              }`}
            >
              <div
                className={`w-full aspect-[4/5] sm:aspect-[3/4] overflow-hidden relative flex items-center justify-center p-3 ${
                  isDark ? "bg-[#150D07]" : "bg-[#FAF6EE]"
                }`}
              >
                <img
                  src="https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/label-groundnut.jpg"
                  alt="Groundnut Oil: Crispy Dosas & Everyday Tiffin"
                  className="w-full h-full max-h-full max-w-full object-contain hover:scale-105 transition-transform duration-500 drop-shadow-md"
                />
              </div>
              <div className="p-6 space-y-2 flex-1 flex flex-col justify-start">
                <span className="text-[11px] font-bold text-[#C8751B] uppercase tracking-wider">
                  Wood-Pressed Groundnut Oil
                </span>
                <h4
                  className={`text-lg font-bold font-serif ${
                    isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                  }`}
                >
                  Crispy Dosas & Everyday Tiffin
                </h4>
                <p
                  className={`text-xs leading-relaxed ${
                    isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"
                  }`}
                >
                  Perfect for daily cooking, golden crisp dosas, stir-fries, and shallow frying with an authentic rich nutty aroma.
                </p>
              </div>
            </div>

            {/* Card 2: Coconut Oil */}
            <div
              className={`w-full max-w-full rounded-3xl border overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col box-border ${
                isDark
                  ? "bg-[#1C120B] border-[#362114] hover:border-[#D49A37]"
                  : "bg-white border-[#E8DEC8] hover:border-[#D49A37]"
              }`}
            >
              <div
                className={`w-full aspect-[4/5] sm:aspect-[3/4] overflow-hidden relative flex items-center justify-center p-3 ${
                  isDark ? "bg-[#150D07]" : "bg-[#FAF6EE]"
                }`}
              >
                <img
                  src="https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/label-coconut.jpg"
                  alt="Coconut Oil: Coastal Curries & Rice Dishes"
                  className="w-full h-full max-h-full max-w-full object-contain hover:scale-105 transition-transform duration-500 drop-shadow-md"
                />
              </div>
              <div className="p-6 space-y-2 flex-1 flex flex-col justify-start">
                <span className="text-[11px] font-bold text-[#C8751B] uppercase tracking-wider">
                  Wood-Pressed Coconut Oil
                </span>
                <h4
                  className={`text-lg font-bold font-serif ${
                    isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                  }`}
                >
                  Coastal Curries & Rice Dishes
                </h4>
                <p
                  className={`text-xs leading-relaxed ${
                    isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"
                  }`}
                >
                  Unrefined aroma tailored for authentic Kerala avial, vegetable stew, aromatic coconut rice, and coastal gravies.
                </p>
              </div>
            </div>

            {/* Card 3: Sesame Oil */}
            <div
              className={`w-full max-w-full rounded-3xl border overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col box-border ${
                isDark
                  ? "bg-[#1C120B] border-[#362114] hover:border-[#D49A37]"
                  : "bg-white border-[#E8DEC8] hover:border-[#D49A37]"
              }`}
            >
              <div
                className={`w-full aspect-[4/5] sm:aspect-[3/4] overflow-hidden relative flex items-center justify-center p-3 ${
                  isDark ? "bg-[#150D07]" : "bg-[#FAF6EE]"
                }`}
              >
                <img
                  src="https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/label-sesame.jpg"
                  alt="Sesame Oil: Tempering, Puliogare & Podis"
                  className="w-full h-full max-h-full max-w-full object-contain hover:scale-105 transition-transform duration-500 drop-shadow-md"
                />
              </div>
              <div className="p-6 space-y-2 flex-1 flex flex-col justify-start">
                <span className="text-[11px] font-bold text-[#C8751B] uppercase tracking-wider">
                  Wood-Pressed Sesame Oil
                </span>
                <h4
                  className={`text-lg font-bold font-serif ${
                    isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                  }`}
                >
                  Tempering, Puliogare & Podis
                </h4>
                <p
                  className={`text-xs leading-relaxed ${
                    isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"
                  }`}
                >
                  Traditional choice for authentic tamarind rice (Puliogare), idli podi mix, fragrant rasam tadka, and daily wellness.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. EXTRACTION BENCHMARK TABLE */}
      <section
        className={`w-full max-w-full py-16 sm:py-20 border-b transition-colors box-border ${
          isDark
            ? "bg-[#140D09] border-[#2D1B10] text-[#FAF4EA]"
            : "bg-[#FAF6F0] border-[#E8DEC8] text-[#23150C]"
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 box-border">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold tracking-widest text-[#C8751B] uppercase">
              Artisanal Standards
            </span>
            <h2
              className={`text-3xl font-extrabold font-serif ${
                isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
              }`}
            >
              Wood-Pressed vs Commercial Refined Oils
            </h2>
            <p
              className={`text-xs sm:text-sm ${
                isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"
              }`}
            >
              Understand the biological difference between traditional Marachekku extraction and solvent refining.
            </p>
          </div>

          <div
            className={`w-full max-w-full rounded-3xl border shadow-sm overflow-hidden box-border ${
              isDark
                ? "bg-[#1C120B] border-[#362114]"
                : "bg-white border-[#E8DEC8]"
            }`}
          >
            <div className="w-full max-w-full overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead
                  className={`font-bold uppercase tracking-wider border-b ${
                    isDark
                      ? "bg-[#25150C] text-[#FAF4EA] border-[#3D2514]"
                      : "bg-[#F5EDE1] text-[#23150C] border-[#E3D4C0]"
                  }`}
                >
                  <tr>
                    <th className="py-4 px-6">Quality Factor</th>
                    <th
                      className={`py-4 px-6 ${
                        isDark ? "text-[#A8907E]" : "text-[#7A5E48]"
                      }`}
                    >
                      Commercial Refined Oil
                    </th>
                    <th
                      className={`py-4 px-6 font-black ${
                        isDark
                          ? "bg-amber-950/40 text-amber-300"
                          : "bg-amber-100/70 text-[#5E3210]"
                      }`}
                    >
                      MANOPAVANA Wood-Pressed
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y ${
                    isDark ? "divide-[#2D1B10]" : "divide-[#EFE8DC]"
                  }`}
                >
                  {BENCHMARK_COMPARISONS.map((row, idx) => (
                    <tr
                      key={idx}
                      className={
                        isDark
                          ? "hover:bg-amber-950/20 transition-colors"
                          : "hover:bg-amber-50/20 transition-colors"
                      }
                    >
                      <td
                        className={`py-4 px-6 font-bold ${
                          isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                        }`}
                      >
                        {row.metric}
                      </td>
                      <td
                        className={`py-4 px-6 ${
                          isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"
                        }`}
                      >
                        {row.commercial}
                      </td>
                      <td
                        className={`py-4 px-6 font-semibold ${
                          isDark
                            ? "bg-amber-950/30 text-amber-200"
                            : "bg-amber-50/50 text-[#5E3210]"
                        }`}
                      >
                        {row.manopavana}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              className={`p-4 border-t text-[11px] italic leading-relaxed ${
                isDark
                  ? "bg-[#150D07] border-[#2D1B10] text-[#A8907E]"
                  : "bg-[#FAF7F2] border-[#E8DEC8] text-[#7A5E48]"
              }`}
            >
              {BENCHMARK_DISCLAIMER}
            </div>
          </div>
        </div>
      </section>

      {/* 7. VERIFIED BENGALURU CUSTOMER REVIEWS */}
      <section
        className={`w-full max-w-full py-16 sm:py-20 border-b transition-colors box-border ${
          isDark
            ? "bg-[#140D09] border-[#2D1B10] text-[#FAF4EA]"
            : "bg-[#FAF6F0] border-[#E8DEC8] text-[#23150C]"
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 box-border">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold tracking-widest text-[#C8751B] uppercase">
                Real Customer Voices
              </span>
              <h2
                className={`text-3xl font-extrabold font-serif ${
                  isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                }`}
              >
                Trusted Across Bengaluru Kitchens
              </h2>
              <p
                className={`text-xs sm:text-sm ${
                  isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"
                }`}
              >
                Live community feedback from home cooks who made the switch to unrefined cold-pressed oils.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsReviewFormOpen(!isReviewFormOpen)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs shadow-md transition-all self-start sm:self-auto cursor-pointer"
            >
              <MessageSquarePlus className="w-4 h-4 text-amber-300" />
              <span>{isReviewFormOpen ? "Cancel Form" : "Write a Customer Review"}</span>
            </button>
          </div>

          {/* Collapsible Review Submission Form */}
          {isReviewFormOpen && (
            <div
              className={`w-full max-w-full rounded-3xl border-2 border-[#E08F35]/40 p-6 sm:p-8 shadow-lg space-y-4 animate-fade-in box-border ${
                isDark ? "bg-[#1C120B]" : "bg-white"
              }`}
            >
              <div
                className={`border-b pb-3 ${
                  isDark ? "border-[#2D1B10]" : "border-[#EFE8DC]"
                }`}
              >
                <h3
                  className={`text-base font-bold font-serif ${
                    isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                  }`}
                >
                  Share Your Experience
                </h3>
                <p
                  className={`text-xs ${
                    isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"
                  }`}
                >
                  Your review will be verified and published to the live community feed.
                </p>
              </div>

              <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block font-semibold mb-1 ${
                        isDark ? "text-[#FAF4EA]" : "text-[#3D2514]"
                      }`}
                    >
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ananya Rao"
                      value={revName}
                      onChange={(e) => setRevName(e.target.value)}
                      className={`w-full px-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 ${
                        isDark
                          ? "bg-[#150D07] border-[#362114] text-[#FAF4EA]"
                          : "bg-[#FAF7F2] border-[#DDD1BE] text-[#23150C]"
                      }`}
                    />
                  </div>

                  <div>
                    <label
                      className={`block font-semibold mb-1 ${
                        isDark ? "text-[#FAF4EA]" : "text-[#3D2514]"
                      }`}
                    >
                      Locality / Neighborhood (Bengaluru) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Malleswaram, Jayanagar"
                      value={revLocality}
                      onChange={(e) => setRevLocality(e.target.value)}
                      className={`w-full px-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 ${
                        isDark
                          ? "bg-[#150D07] border-[#362114] text-[#FAF4EA]"
                          : "bg-[#FAF7F2] border-[#DDD1BE] text-[#23150C]"
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block font-semibold mb-1 ${
                        isDark ? "text-[#FAF4EA]" : "text-[#3D2514]"
                      }`}
                    >
                      Oil / Product Reviewed
                    </label>
                    <select
                      value={revProduct}
                      onChange={(e) => setRevProduct(e.target.value)}
                      className={`w-full px-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 ${
                        isDark
                          ? "bg-[#150D07] border-[#362114] text-[#FAF4EA]"
                          : "bg-[#FAF7F2] border-[#DDD1BE] text-[#23150C]"
                      }`}
                    >
                      <option value="Wood-Pressed Groundnut Oil">Wood-Pressed Groundnut Oil</option>
                      <option value="Wood-Pressed Coconut Oil">Wood-Pressed Coconut Oil</option>
                      <option value="Wood-Pressed Sesame Oil">Wood-Pressed Sesame Oil</option>
                      <option value="Complete 3-Oil Essential Box (3L Trio)">Complete 3-Oil Essential Box (3L Trio)</option>
                      <option value="Complete 3-Oil Starter Box (1.5L Trio)">Complete 3-Oil Starter Box (1.5L Trio)</option>
                    </select>
                  </div>

                  <div>
                    <label
                      className={`block font-semibold mb-1 ${
                        isDark ? "text-[#FAF4EA]" : "text-[#3D2514]"
                      }`}
                    >
                      Rating (1-5 Stars)
                    </label>
                    <div className="flex items-center gap-2 pt-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRevRating(star)}
                          className="cursor-pointer"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= revRating
                                ? "text-amber-500 fill-amber-500"
                                : "text-gray-300"
                            }`}
                          />
                        </button>
                      ))}
                      <span className="font-bold text-xs text-[#C8751B] ml-2">
                        {revRating} Star{revRating > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    className={`block font-semibold mb-1 ${
                      isDark ? "text-[#FAF4EA]" : "text-[#3D2514]"
                    }`}
                  >
                    Your Review / Cooking Note *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Share details about the aroma, frying performance, or packaging..."
                    value={revComment}
                    onChange={(e) => setRevComment(e.target.value)}
                    className={`w-full px-3.5 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 ${
                      isDark
                        ? "bg-[#150D07] border-[#362114] text-[#FAF4EA]"
                        : "bg-[#FAF7F2] border-[#DDD1BE] text-[#23150C]"
                    }`}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsReviewFormOpen(false)}
                    className={`px-4 py-2 font-medium ${
                      isDark ? "text-[#D6C4B0] hover:text-white" : "text-[#5C402D] hover:text-[#23150C]"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="px-6 py-2.5 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingReview ? "Submitting to Firestore..." : "Publish Review"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Reviews Cards Grid */}
          <div className="w-full max-w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className={`group relative rounded-2xl border p-5 flex flex-col justify-between space-y-4 shadow-2xs hover:shadow-md transition-shadow box-border ${
                  isDark
                    ? "bg-[#1C120B] border-[#362114]"
                    : "bg-white border-[#E8DEC8]"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>

                    {/* PIN-Protected Deletion Trigger */}
                    <button
                      type="button"
                      onClick={() => {
                        setDeletingReviewId(rev.id);
                        setDeletePinInput("");
                        setDeletePinError(false);
                      }}
                      title="Delete Review (Requires Admin PIN 1917)"
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#C8BAA8] hover:text-red-600 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p
                    className={`text-xs leading-relaxed italic ${
                      isDark ? "text-[#D6C4B0]" : "text-[#4A3525]"
                    }`}
                  >
                    "{rev.comment}"
                  </p>
                </div>

                <div
                  className={`pt-3 border-t space-y-1 ${
                    isDark ? "border-[#2D1B10]" : "border-[#EFE8DC]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                      }`}
                    >
                      {rev.name}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">
                      ✓ Verified
                    </span>
                  </div>
                  <div
                    className={`flex items-center justify-between text-[11px] ${
                      isDark ? "text-[#A8907E]" : "text-[#7A5E48]"
                    }`}
                  >
                    <span>{rev.locality}, {rev.city}</span>
                    <span>{rev.date}</span>
                  </div>
                  <div className="text-[10px] text-[#C8751B] font-semibold truncate pt-0.5">
                    {rev.product}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* PIN-Protected Review Deletion Modal (PIN 1917) */}
          {deletingReviewId && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            >
              <div
                className={`relative w-full max-w-sm rounded-3xl shadow-2xl border p-6 space-y-4 ${
                  isDark
                    ? "bg-[#1C120B] border-[#362114] text-[#FAF4EA]"
                    : "bg-[#FCFAF7] border-[#E9DFD0] text-[#23150C]"
                }`}
              >
                <div className="flex items-center gap-2.5 text-[#C8751B]">
                  <Lock className="w-5 h-5 text-[#E08F35]" />
                  <h3
                    className={`text-sm font-bold font-serif ${
                      isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                    }`}
                  >
                    Admin Review Deletion Gate
                  </h3>
                </div>
                <p
                  className={`text-xs ${
                    isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"
                  }`}
                >
                  Deleting customer reviews from Firestore requires the authorized facility PIN (1917).
                </p>

                <div>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="Enter 4-digit PIN (1917)"
                    value={deletePinInput}
                    onChange={(e) => {
                      setDeletePinInput(e.target.value);
                      setDeletePinError(false);
                    }}
                    className={`w-full text-center tracking-widest text-base font-mono font-bold px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 ${
                      isDark
                        ? "bg-[#150D07] border-[#362114] text-[#FAF4EA]"
                        : "bg-white border-[#DDD1BE] text-[#23150C]"
                    }`}
                  />
                  {deletePinError && (
                    <p className="text-[11px] text-red-500 font-bold mt-1 text-center">
                      Incorrect PIN. Use: 1917
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeletingReviewId(null)}
                    className={`px-3.5 py-1.5 text-xs font-semibold ${
                      isDark ? "text-[#D6C4B0] hover:text-white" : "text-[#5C402D] hover:text-[#23150C]"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteReview}
                    className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    Verify PIN & Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 8. FAQS KNOWLEDGE BASE */}
      <section
        className={`w-full max-w-full py-16 sm:py-24 transition-colors box-border ${
          isDark
            ? "bg-[#140D09] text-[#FAF4EA]"
            : "bg-[#FAF6F0] text-[#23150C]"
        }`}
      >
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 box-border">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold tracking-widest text-[#C8751B] uppercase">
              Frequently Asked Questions
            </span>
            <h2
              className={`text-3xl font-extrabold font-serif ${
                isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
              }`}
            >
              Everything About Our Oils & Dispatch
            </h2>
          </div>

          <div className="space-y-3.5">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className={`border rounded-2xl overflow-hidden transition-all shadow-2xs ${
                    isDark
                      ? "bg-[#1C120B] border-[#362114]"
                      : "bg-white border-[#E8DEC8]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span
                      className={`text-sm font-bold ${
                        isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                      }`}
                    >
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#A8907E] transition-transform ${
                        isOpen ? "rotate-180 text-[#E08F35]" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div
                      className={`px-5 pb-5 pt-1 text-xs leading-relaxed border-t ${
                        isDark
                          ? "text-[#D6C4B0] border-[#2A180E]"
                          : "text-[#4A3525] border-[#FAF6EE]"
                      }`}
                    >
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
