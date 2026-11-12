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
  Calendar,
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
import { FESTIVE_CONFIG, isFestiveActive } from "../config/festiveConfig";
import { getSalePrice, getSaleSavings, isSaleActive, getSaleDeadlineLabel } from "../utils/salePricing";

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
    showToast,
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
    const regularPrice = product.prices[variant];
    const price = getSalePrice(regularPrice);
    const sku = product.sku?.[variant] || (product.id === "dispenser" ? (variant === "1L" ? "MP-DISP-1L-001" : "MP-DISP-500ML-001") : undefined);
    const subtitle = product.id === "dispenser"
      ? (variant === "1L" ? "1 L (Full Kitchen Size)" : "500 ml (Compact Counter Size)")
      : `Marachekku Pure • ${variant}`;
    addToCart({
      id: `${product.id}-${variant}`,
      productId: product.id,
      title: product.name,
      subtitle,
      variant,
      price,
      regularPrice,
      image: THEMED_PRODUCT_IMAGES[product.id]?.light || product.images[0] || product.labelImage,
      sku,
    });
    showToast(`Added ${product.name} (${variant}) to your bag`);
  };

  const handleBuyNow = (product: Product) => {
    const variant = selectedVariants[product.id] || "1L";
    const regularPrice = product.prices[variant];
    const price = getSalePrice(regularPrice);
    const sku = product.sku?.[variant] || (product.id === "dispenser" ? (variant === "1L" ? "MP-DISP-1L-001" : "MP-DISP-500ML-001") : undefined);
    const subtitle = product.id === "dispenser"
      ? (variant === "1L" ? "1 L (Full Kitchen Size)" : "500 ml (Compact Counter Size)")
      : `Marachekku Pure • ${variant}`;
    const image = THEMED_PRODUCT_IMAGES[product.id]?.light || product.images[0] || product.labelImage;
    startBuyNow(
      {
        id: `${product.id}-${variant}`,
        productId: product.id,
        title: product.name,
        subtitle,
        variant,
        price,
        regularPrice,
        image,
        sku,
      },
      1
    );
    navigate("/checkout?mode=buynow");
  };

  const handleAddCombo = (combo: (typeof COMBOS)[0]) => {
    const regularPrice = combo.regularPrice;
    const price = getSalePrice(regularPrice);
    const comboImg =
      combo.image ||
      (combo.id === "combo-3l"
        ? "/assets/aistudio/283108387_1794145171256125_bf92e08a.jpg"
        : "/assets/aistudio/1003513490_1794145169189153_45f26b2d.jpg");
    addToCart({
      id: combo.id,
      productId: combo.id,
      isCombo: true,
      title: combo.name,
      subtitle: combo.volumeLabel,
      variant: combo.id === "combo-3l" ? "3L Trio" : "1.5L Trio",
      price,
      regularPrice,
      image: comboImg,
    });
  };

  const handleBuyNowCombo = (combo: (typeof COMBOS)[0]) => {
    const regularPrice = combo.regularPrice;
    const price = getSalePrice(regularPrice);
    const comboImg =
      combo.image ||
      (combo.id === "combo-3l"
        ? "/assets/aistudio/283108387_1794145171256125_bf92e08a.jpg"
        : "/assets/aistudio/1003513490_1794145169189153_45f26b2d.jpg");
    startBuyNow(
      {
        id: combo.id,
        productId: combo.id,
        isCombo: true,
        title: combo.name,
        subtitle: combo.volumeLabel,
        variant: combo.id === "combo-3l" ? "3L Trio" : "1.5L Trio",
        price,
        regularPrice,
        image: comboImg,
      },
      1
    );
    navigate("/checkout?mode=buynow");
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden flex flex-col box-border">
      {/* STOREFRONT HERO SECTION WITH VIDEO (RESTORED TO PRE-DIWALI STATE) */}
      <section className="w-full bg-[#14291D] border-b border-[#E0B04A]/40 overflow-hidden relative">
        <div className="relative w-full aspect-[1376/768] sm:aspect-[16/9] max-h-[620px] overflow-hidden bg-[#14291D] flex items-center justify-center">
          {cmsConfig.mainBannerMediaType === "image" && cmsConfig.mainBannerImageUrl ? (
            <img
              src={cmsConfig.mainBannerImageUrl}
              alt={cmsConfig.brandName || "MANOPAVANA Wood-Pressed Oils"}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <video
              autoPlay
              loop
              muted
              playsInline
              poster={cmsConfig.mainBannerImageUrl || cmsConfig.heroFallbackImage || MEDIA_ASSETS.heroFallbackImage}
              className="w-full h-full object-cover object-center"
            >
              <source
                src={cmsConfig.mainBannerVideoUrl || cmsConfig.chekkuVideoUrl || MEDIA_ASSETS.heroVideo}
                type="video/mp4"
              />
            </video>
          )}
        </div>
      </section>

      {/* 3. EDITORIAL BRAND SECTION ("Unrefined by Nature, Bottled Fresh") */}
      <section
        className="relative w-full max-w-full overflow-hidden py-8 sm:py-12 border-b transition-colors box-border bg-[#FAF3E0] text-[#14291D] border-[#F2E8CC]"
      >
        {/* Subtle background ambient golden illumination */}
        <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#E0B04A]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 box-border text-center space-y-5">
          {/* Top Heritage Tag */}
          <div className="flex justify-center">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold tracking-wider uppercase shadow-xs bg-[#F2E8CC] border-[#E0B04A]/50 text-[#14291D]"
            >
              <span>{cmsConfig.heroEyebrow || "⚜️ GOOD FOOD STARTS HERE"}</span>
            </div>
          </div>

          {/* Main Title ("Unrefined by Nature, Bottled Fresh") */}
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-black font-serif tracking-tight leading-tight text-[#14291D]"
          >
            {cmsConfig.heroHeadline || BUSINESS_CONFIG.HERO_HEADLINE}
          </h1>

          {/* Subtitle Narrative */}
          <p
            className="text-sm sm:text-base font-normal leading-relaxed max-w-2xl mx-auto text-[#2D4536]"
          >
            {cmsConfig.heroSubhead || BUSINESS_CONFIG.HERO_SUBHEAD}
          </p>

          {/* Highlight Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            {(cmsConfig.heroHighlights || BUSINESS_CONFIG.HERO_HIGHLIGHTS).map((hl, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold bg-white border-[#E0B04A]/40 text-[#1F3D2B] shadow-2xs"
              >
                <span>{hl}</span>
              </div>
            ))}
          </div>

          {/* Live Dispatch Location Quick Line & CTA */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#catalog"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1F3D2B] hover:bg-[#14291D] text-white font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <span>{cmsConfig.heroCtaPrimaryText || "Explore The Collection →"}</span>
            </a>

            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium shadow-2xs transition-colors bg-white border-[#E0B04A]/30 text-[#14291D]"
            >
              <MapPin className="w-3.5 h-3.5 text-[#E0B04A] shrink-0" />
              <span>
                Dispatched fresh from Peenya 2nd Stage, Bangalore to{" "}
                <button
                  onClick={() => setLocationModalOpen(true)}
                  className="text-[#E0B04A] underline font-bold hover:text-[#C8962E] cursor-pointer"
                >
                  {address.city} ({address.pincode})
                </button>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CORE ARTISANAL OILS CATALOG */}
      <section
        id="catalog"
        className={`w-full max-w-full pt-8 pb-14 sm:pt-10 sm:pb-16 border-b transition-colors box-border ${
          isDark
            ? "bg-[#14291D] border-[#14291D] text-[#FAF3E0]"
            : "bg-[#FAF3E0] border-[#F2E8CC] text-[#14291D]"
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 box-border">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-[#B86B14] uppercase">
                <Droplets className="w-4 h-4 text-[#E0B04A]" />
                <span>Marachekku Wood-Pressed Collection</span>
              </div>
              <h2
                className={`text-3xl sm:text-4xl font-extrabold font-serif mt-1 ${
                  isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                }`}
              >
                Pure Unrefined Cooking Oils
              </h2>
              <p
                className={`text-xs sm:text-sm max-w-xl mt-1.5 ${
                  isDark ? "text-[#E0B04A]" : "text-[#4A3423]"
                }`}
              >
                Cold-pressed below 45°C in wooden Wagai pestles, settled naturally through cotton muslin cloth, and packed fresh in Bengaluru.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-2 shadow-2xs ${
                isDark
                  ? "bg-[#1E130B] border-[#1F3D2B] text-amber-200"
                  : "bg-amber-100/70 border-amber-200/80 text-[#7A4B1A]"
              }`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                <span>Peenya Facility Dispatched</span>
              </span>
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="w-full max-w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {filteredProducts.map((product) => {
              const currentVolume = selectedVariants[product.id] || "1L";
              const regularPrice = product.prices[currentVolume];
              const price = getSalePrice(regularPrice);
              const mrp = product.mrp[currentVolume];
              const inStock = product.inStock[currentVolume];
              const savings = getSaleSavings(regularPrice);
              const isSale = isSaleActive();
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
                      ? "bg-[#14291D] border-[#1F3D2B] hover:border-[#E0B04A]"
                      : "bg-white border-[#E5DACB] hover:border-[#E0B04A]"
                  }`}
                >
                  {/* Product Image Header: Video Studio Background in dark theme, clean natural cream in light theme */}
                  <div
                    className={`relative aspect-square p-6 rounded-t-3xl flex items-center justify-center overflow-hidden border-b transition-all duration-300 ${
                      isDark
                        ? "bg-[#0D0704] border-[#1F3D2B]"
                        : "bg-[#FAF3E0] border-[#E5DACB]"
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
                          ? "bg-[#14291D]/90 border-[#E0B04A]/50 text-amber-200"
                          : "bg-white/95 border-[#E0B04A]/40 text-[#6B4423]"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isDark ? "bg-amber-400" : "bg-amber-600"} animate-pulse`} />
                      <span>{product.badge || product.smokePoint}</span>
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
                          className={`text-lg font-bold font-serif hover:text-[#E0B04A] transition-colors leading-snug ${
                            isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                          }`}
                        >
                          {product.name}
                        </h3>
                      </Link>

                      <p
                        className={`text-xs line-clamp-2 leading-relaxed ${
                          isDark ? "text-[#E0B04A]" : "text-[#4A3423]"
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
                        isDark ? "border-[#2A180E]" : "border-[#F2E8CC]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[11px] font-semibold ${
                            isDark ? "text-[#3F4F45]" : "text-[#3F4F45]"
                          }`}
                        >
                          Select Volume:
                        </span>
                        <div
                          className={`flex items-center gap-1.5 p-1 rounded-xl border ${
                            isDark
                              ? "bg-[#14291D] border-[#1F3D2B]"
                              : "bg-[#FAF3E0] border-[#E5DAC8]"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleVariantChange(product.id, "1L")}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              currentVolume === "1L"
                                ? "bg-[#1F3D2B] text-white shadow-xs"
                                : isDark
                                ? "text-[#E0B04A] hover:text-white"
                                : "text-[#3F4F45] hover:text-[#14291D]"
                            }`}
                          >
                            1 Litre
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVariantChange(product.id, "500ml")}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              currentVolume === "500ml"
                                ? "bg-[#1F3D2B] text-white shadow-xs"
                                : isDark
                                ? "text-[#E0B04A] hover:text-white"
                                : "text-[#3F4F45] hover:text-[#14291D]"
                            }`}
                          >
                            500 ml
                          </button>
                        </div>
                      </div>

                      {/* Honest Pricing */}
                      <div className="pt-1 flex flex-col space-y-1">
                        <div className="flex items-baseline justify-between">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span
                              className={`text-2xl font-black font-serif ${
                                isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                              }`}
                            >
                              ₹{price}
                            </span>
                            {isSale && savings > 0 ? (
                              <span className="text-xs sm:text-sm line-through text-[#4A5A50] font-semibold">
                                ₹{regularPrice}
                              </span>
                            ) : mrp > price && (
                              <span className="text-xs sm:text-sm line-through text-[#4A5A50] font-semibold">
                                ₹{mrp}
                              </span>
                            )}
                            <span
                              className={`text-[11px] font-medium ${
                                isDark ? "text-[#FAF3E0]/70" : "text-[#3F4F45]"
                              }`}
                            >
                              (Inclusive of GST)
                            </span>
                          </div>
                          <Link
                            to={`/product/${product.id}`}
                            className="text-xs font-bold text-[#1F3D2B] dark:text-[#F3D17A] hover:underline transition-colors shrink-0"
                          >
                            Details →
                          </Link>
                        </div>
                        {isSale && savings > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-[#E0B04A] text-[#14291D] font-black text-[10px] uppercase tracking-wide shadow-2xs">
                              10% OFF
                            </span>
                            <span className="text-[11px] font-bold text-[#14291D] dark:text-[#F3D17A]">
                              Save ₹{savings}
                            </span>
                            <span className="text-[10px] text-[#3F4F45] dark:text-[#FAF3E0]/70">
                              • {getSaleDeadlineLabel()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Dual Action: Add to Bag (with Stepper) + Buy Now */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {/* Add to Bag OR Stepper */}
                        {cartItem ? (
                          <div
                            className={`flex items-center justify-between border-2 rounded-xl px-2 py-1.5 shadow-2xs ${
                              isDark
                                ? "bg-[#14291D] border-[#E0B04A]"
                                : "bg-[#FAF3E0] border-[#E0B04A]"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => updateQuantity(cartItemId, -1)}
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center font-black active:scale-95 transition-all cursor-pointer shadow-xs ${
                                isDark
                                  ? "bg-[#1F3D2B] border-[#5A3820] text-[#F3D17A] hover:bg-[#1F3D2B]"
                                  : "bg-white border-[#D8C7B5] text-[#7A4B1A] hover:bg-[#F3EBE0]"
                              }`}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-4 h-4 stroke-[3] text-[#E0B04A]" />
                            </button>
                            <span
                              className={`text-xs sm:text-sm font-black px-1 ${
                                isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                              }`}
                            >
                              {cartItem.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(cartItemId, 1)}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#E0B04A] hover:bg-[#F3D17A] text-[#14291D] border border-[#F3D17A] flex items-center justify-center font-black active:scale-95 transition-all cursor-pointer shadow-xs"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-4 h-4 stroke-[3] text-[#14291D]" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!inStock}
                            onClick={() => handleQuickAdd(product)}
                            className={`py-2.5 px-3 rounded-xl border-2 border-[#1F3D2B] disabled:opacity-50 text-[#1F3D2B] font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              isDark
                                ? "bg-[#1F3D2B] hover:bg-[#1F3D2B] text-amber-200"
                                : "bg-white hover:bg-[#FAF3E0]"
                            }`}
                          >
                            <ShoppingBag className="w-3.5 h-3.5 text-[#1F3D2B]" />
                            <span>Add to Bag</span>
                          </button>
                        )}

                        {/* Buy Now Button */}
                        <button
                          type="button"
                          disabled={!inStock}
                          onClick={() => handleBuyNow(product)}
                          className="py-2.5 px-3 rounded-xl bg-[#1F3D2B] hover:bg-[#1F3D2B] disabled:opacity-50 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
            ? "bg-[#14291D] border-[#14291D] text-[#FAF3E0]"
            : "bg-[#FAF3E0] border-[#F2E8CC] text-[#14291D]"
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 box-border">
          <div
            className={`w-full max-w-full border rounded-3xl p-6 sm:p-10 lg:p-12 shadow-sm box-border ${
              isDark
                ? "bg-[#14291D] border-[#1F3D2B]"
                : "bg-white border-[#E5DACB]"
            }`}
          >
            <div className="w-full max-w-full grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Left 360 Video / Bottle preview */}
              <div className="w-full max-w-full lg:col-span-5 relative flex justify-center">
                <div className="relative w-full max-w-sm aspect-[4/5] rounded-2xl overflow-hidden bg-[#14291D] shadow-xl border border-[#E0B04A]/50">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full max-w-full object-cover"
                  >
                    <source src={cmsConfig.packagingFeatures?.bottle360Video || MEDIA_ASSETS.bottle360Video} type="video/mp4" />
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
                    {cmsConfig.packagingFeatures?.tag || PACKAGING_FEATURES.tag}
                  </span>
                  <h2
                    className={`text-2xl sm:text-3xl font-extrabold font-serif ${
                      isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                    }`}
                  >
                    {cmsConfig.packagingFeatures?.heading || PACKAGING_FEATURES.heading}
                  </h2>
                  <p
                    className={`text-sm ${
                      isDark ? "text-[#E0B04A]" : "text-[#4A3423]"
                    }`}
                  >
                    {cmsConfig.packagingFeatures?.subhead || PACKAGING_FEATURES.subhead}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 pt-2">
                  {(cmsConfig.packagingFeatures?.items || PACKAGING_FEATURES.items).map((feat, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border shadow-xs flex items-start gap-4 transition-colors ${
                        isDark
                          ? "bg-[#14291D] border-[#2E1B10] text-[#FAF3E0] hover:border-[#E0B04A]"
                          : "bg-[#FAF3E0] border-[#E8DFC8] text-[#14291D] hover:border-[#E0B04A]"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-[#B86B14] flex items-center justify-center shrink-0 font-bold text-sm">
                        0{idx + 1}
                      </div>
                      <div>
                        <h4
                          className={`text-sm font-bold ${
                            isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                          }`}
                        >
                          {feat.title}
                        </h4>
                        <p
                          className={`text-xs mt-1 leading-relaxed ${
                            isDark ? "text-[#E0B04A]" : "text-[#4A3423]"
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
                    className="px-5 py-2.5 rounded-xl bg-[#1F3D2B] hover:bg-[#1F3D2B] text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
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
            ? "bg-[#14291D] border-[#14291D]"
            : "bg-[#FAF3E0] border-[#F2E8CC]"
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 box-border">
          <div className="w-full max-w-full bg-gradient-to-br from-[#14291D] via-[#14291D] to-[#14291D] text-white rounded-3xl p-6 sm:p-10 lg:p-12 shadow-2xl relative overflow-hidden border border-[#E0B04A]/35 box-border">
            {/* Subtle Ambient pattern */}
            <div className="absolute right-0 top-0 w-96 h-96 bg-[#E0B04A]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-8 w-full max-w-full">
              <div className="max-w-2xl space-y-2">
                <span className="text-xs font-bold tracking-widest text-[#E0B04A] uppercase flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Value Kitchen Boxes
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold font-serif text-white">
                  South India 3-Oil Trio Sets
                </h2>
                <p className="text-sm text-[#E0B04A]">
                  Equip your home with authentic cold-pressed Groundnut, Coconut, and Sesame oils in one single boxed delivery with free shipping.
                </p>
              </div>

              {/* Combo Section Banner Image */}
              <div className="w-full max-w-4xl mx-auto rounded-3xl overflow-hidden bg-[#14291D] border border-[#1F3D2B] p-4 flex items-center justify-center">
                <img
                  src={cmsConfig.comboBannerImage || MEDIA_ASSETS.comboBanner}
                  alt="MANOPAVANA Complete 3-Oil Essential Trio Box"
                  className="w-full h-auto max-h-[480px] object-contain block mx-auto"
                />
              </div>

              <div className="w-full max-w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
                {combos.map((combo) => {
                  const comboCartItem = cart.find((i) => i.id === combo.id);
                  const regularPrice = combo.regularPrice;
                  const saleActive = isSaleActive();
                  const festiveActive = isFestiveActive();
                  const price = saleActive ? getSalePrice(regularPrice) : (loyalty.isActive ? combo.loyaltyPrice : regularPrice);
                  const savings = saleActive ? getSaleSavings(regularPrice) : (regularPrice - price);
                  const displayImg =
                    combo.image ||
                    (combo.id === "combo-3l"
                      ? "/assets/aistudio/283108387_1794145171256125_bf92e08a.jpg"
                      : "/assets/aistudio/1003513490_1794145169189153_45f26b2d.jpg");

                  return (
                    <div
                      key={combo.id}
                      className="w-full max-w-full bg-[#14291D]/80 border border-[#E0B04A]/30 rounded-2xl p-6 flex flex-col justify-between space-y-5 box-border shadow-xl relative overflow-hidden"
                    >
                      {/* Festive Top Ribbon */}
                      {festiveActive && (
                        <div className="flex items-center justify-between pb-2 border-b border-[#E0B04A]/25">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E0B04A] text-[#14291D] text-xs font-black uppercase tracking-wider shadow-xs">
                            <span role="img" aria-label="Diya">🪔</span>
                            <span>{FESTIVE_CONFIG.ribbonText}</span>
                          </span>
                          <span className="text-xs text-[#F3D17A] font-bold">
                            {FESTIVE_CONFIG.badgeText}
                          </span>
                        </div>
                      )}

                      {/* Combo Photo with Strict Attachment Mapping */}
                      <div className="relative w-full h-56 sm:h-64 rounded-xl overflow-hidden bg-[#14291D] border border-[#E0B04A]/25">
                        <img
                          src={displayImg}
                          alt={combo.name}
                          className="w-full h-full object-cover object-center"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="px-3 py-0.5 rounded-full bg-[#1F3D2B] border border-[#E0B04A]/40 text-[#F3D17A] text-xs font-bold">
                            {combo.id === "combo-3l" ? "Best Family Value • 3 Litres" : "Starter Box • 1.5 Litres"}
                          </span>
                        </div>

                        <h3 className="text-xl sm:text-2xl font-bold font-serif text-[#FAF3E0] flex items-center gap-2">
                          {festiveActive && <span role="img" aria-label="Diya">🪔</span>}
                          <span>{combo.heading}</span>
                        </h3>

                        {festiveActive ? (
                          <p className="text-xs sm:text-sm text-[#F3D17A] font-semibold flex items-center gap-1">
                            <span>{FESTIVE_CONFIG.subtext}</span>
                            <span className="text-xs font-bold text-[#E8DFD5]">• 10% festive discount applied</span>
                          </p>
                        ) : (
                          <p className="text-xs text-[#FAF3E0] leading-relaxed">
                            {combo.description}
                          </p>
                        )}

                        <div className="space-y-2 pt-1">
                          {combo.bullets.map((b, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-[#FAF3E0]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#E0B04A] shrink-0 mt-0.5" />
                              <span>{b}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Price & CTA */}
                      <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="flex items-baseline gap-2">
                            {saleActive ? (
                              <>
                                <span className="text-sm sm:text-base font-bold text-[#8C9B90] line-through">
                                  ₹{regularPrice}
                                </span>
                                <span className="text-2xl sm:text-3xl font-black font-serif text-[#F3D17A]">
                                  ₹{price}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-[#E0B04A] text-[#14291D] text-[11px] font-black uppercase">
                                  10% OFF
                                </span>
                              </>
                            ) : (
                              <span className="text-3xl font-black font-serif text-[#F3D17A]">
                                ₹{price}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-[#FAF3E0] font-medium">
                              (Inclusive of GST)
                            </span>
                            {saleActive && (
                              <span className="text-[11px] text-[#F3D17A] font-bold">
                                • Save ₹{savings}
                              </span>
                            )}
                          </div>
                          {festiveActive && (
                            <span className="text-[11px] text-[#F3D17A] font-bold block mt-1">
                              🪔 {FESTIVE_CONFIG.badgeText}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {comboCartItem ? (
                            <div className="flex items-center gap-1.5 border-2 border-[#E0B04A] rounded-xl p-1 bg-[#14291D] shadow-xs">
                              <button
                                type="button"
                                onClick={() => updateQuantity(combo.id, -1)}
                                className="w-8 h-8 rounded-lg border border-[#E0B04A]/60 bg-[#1F3D2B] text-[#F3D17A] font-black flex items-center justify-center hover:bg-[#14291D] cursor-pointer shadow-xs"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-4 h-4 stroke-[3] text-[#F3D17A]" />
                              </button>
                              <span className="text-xs sm:text-sm font-black px-2 text-[#FAF3E0]">
                                {comboCartItem.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(combo.id, 1)}
                                className="w-8 h-8 rounded-lg bg-[#E0B04A] text-[#14291D] border border-[#F3D17A] font-black flex items-center justify-center hover:bg-[#F3D17A] cursor-pointer shadow-xs"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-4 h-4 stroke-[3] text-[#14291D]" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddCombo(combo)}
                              className="px-4 py-2.5 rounded-xl border-2 border-[#E0B04A] text-[#FAF3E0] hover:bg-[#E0B04A]/20 font-black text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <ShoppingBag className="w-3.5 h-3.5 text-[#E0B04A]" />
                              <span>Add to Bag</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleBuyNowCombo(combo)}
                            className="px-5 py-2.5 rounded-xl bg-[#E0B04A] hover:bg-[#C8962E] text-[#14291D] font-black text-xs shadow-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>{festiveActive ? FESTIVE_CONFIG.giftButtonText : "Buy Now"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4B. INSTANT SAVINGS ON ORDERS ABOVE ₹1,000 & FREE NATIONWIDE SHIPPING */}
      <section
        id="savings-banner"
        className={`w-full max-w-full py-12 sm:py-16 border-b transition-colors box-border relative overflow-hidden ${
          isDark
            ? "bg-gradient-to-b from-[#14291D] via-[#14291D] to-[#14291D] border-[#14291D] text-[#FAF3E0]"
            : "bg-gradient-to-b from-[#FAF3E0] via-[#FAF3E0] to-[#F2E8CC] border-[#F2E8CC] text-[#14291D]"
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 box-border">
          <div
            className={`rounded-3xl border p-6 sm:p-10 relative overflow-hidden transition-all shadow-md ${
              isDark
                ? "bg-[#14291D] border-amber-500/30 shadow-amber-950/30"
                : "bg-white border-[#F2E8CC] shadow-stone-200/50"
            }`}
          >
            {/* Ambient gold glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="space-y-4 max-w-2xl text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/15 text-[#E0B04A] border border-[#E0B04A]/30 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-[#E0B04A]" />
                  <span>MANOPAVANA KITCHEN VALUE • ಆಕರ್ಷಕ ರಿಯಾಯಿತಿ</span>
                </div>

                <h2
                  className={`text-2xl sm:text-3xl lg:text-4xl font-black font-serif tracking-tight leading-tight ${
                    isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                  }`}
                >
                  Flat 10% Instant OFF on Orders Above ₹1,000
                </h2>

                <p
                  className={`text-xs sm:text-sm leading-relaxed ${
                    isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"
                  }`}
                >
                  Stock your home with authentic cold-pressed cooking oils. Any order reaching ₹1,000 automatically receives a 10% discount at checkout — no coupon code or subscription lock-in needed. Plus, enjoy completely Free Doorstep Delivery across India on all orders above ₹500!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div
                    className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                      isDark
                        ? "bg-[#160E08] border-[#1F3D2B]"
                        : "bg-[#FAF3E0] border-[#F2E8CC]"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold">Automatic 10% in Cart</span>
                  </div>

                  <div
                    className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                      isDark
                        ? "bg-[#160E08] border-[#1F3D2B]"
                        : "bg-[#FAF3E0] border-[#F2E8CC]"
                    }`}
                  >
                    <Truck className="w-4 h-4 text-[#E0B04A] shrink-0" />
                    <span className="text-xs font-bold">Free Pan-India Delivery</span>
                  </div>

                  <div
                    className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                      isDark
                        ? "bg-[#160E08] border-[#1F3D2B]"
                        : "bg-[#FAF3E0] border-[#F2E8CC]"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-xs font-bold">100% Marachekku Pure</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 w-full sm:w-auto">
                <a
                  href="#combos"
                  className="px-6 py-3.5 rounded-xl bg-[#E0B04A] hover:bg-[#b06514] text-white text-xs font-black uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-center"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Explore Value Combos</span>
                </a>
                <a
                  href="#catalog"
                  className={`px-6 py-3.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all text-center ${
                    isDark
                      ? "border-[#4A2E1D] hover:bg-[#2C1A10] text-[#FAF3E0]"
                      : "border-[#E0B04A] hover:bg-[#FAF3E0] text-[#14291D]"
                  }`}
                >
                  <span>Shop Single Bottles</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CULINARY PAIRINGS & GASTRONOMY SHOWCASE */}
      <section
        className={`w-full max-w-full py-16 sm:py-20 border-b transition-colors box-border ${
          isDark
            ? "bg-[#14291D] border-[#14291D] text-[#FAF3E0]"
            : "bg-[#FAF3E0] border-[#F2E8CC] text-[#14291D]"
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 box-border">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold tracking-widest text-[#E0B04A] uppercase">
              Good Food Starts Here
            </span>
            <h2
              className={`text-3xl sm:text-4xl font-extrabold font-serif ${
                isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
              }`}
            >
              Culinary Artistry & South Indian Traditions
            </h2>
            <p
              className={`text-xs sm:text-sm ${
                isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"
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
                  ? "bg-[#14291D] border-[#1F3D2B] hover:border-[#E0B04A]"
                  : "bg-white border-[#F2E8CC] hover:border-[#E0B04A]"
              }`}
            >
              <div
                className={`w-full aspect-[4/5] sm:aspect-[3/4] overflow-hidden relative flex items-center justify-center p-3 ${
                  isDark ? "bg-[#14291D]" : "bg-[#FAF3E0]"
                }`}
              >
                <img
                  src="https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/label-groundnut.jpg"
                  alt="Groundnut Oil: Crispy Dosas & Everyday Tiffin"
                  className="w-full h-full max-h-full max-w-full object-contain hover:scale-105 transition-transform duration-500 drop-shadow-md"
                />
              </div>
              <div className="p-6 space-y-2 flex-1 flex flex-col justify-start">
                <span className="text-[11px] font-bold text-[#E0B04A] uppercase tracking-wider">
                  Wood-Pressed Groundnut Oil
                </span>
                <h4
                  className={`text-lg font-bold font-serif ${
                    isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                  }`}
                >
                  Crispy Dosas & Everyday Tiffin
                </h4>
                <p
                  className={`text-xs leading-relaxed ${
                    isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"
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
                  ? "bg-[#14291D] border-[#1F3D2B] hover:border-[#E0B04A]"
                  : "bg-white border-[#F2E8CC] hover:border-[#E0B04A]"
              }`}
            >
              <div
                className={`w-full aspect-[4/5] sm:aspect-[3/4] overflow-hidden relative flex items-center justify-center p-3 ${
                  isDark ? "bg-[#14291D]" : "bg-[#FAF3E0]"
                }`}
              >
                <img
                  src="https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/label-coconut.jpg"
                  alt="Coconut Oil: Coastal Curries & Rice Dishes"
                  className="w-full h-full max-h-full max-w-full object-contain hover:scale-105 transition-transform duration-500 drop-shadow-md"
                />
              </div>
              <div className="p-6 space-y-2 flex-1 flex flex-col justify-start">
                <span className="text-[11px] font-bold text-[#E0B04A] uppercase tracking-wider">
                  Wood-Pressed Coconut Oil
                </span>
                <h4
                  className={`text-lg font-bold font-serif ${
                    isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                  }`}
                >
                  Coastal Curries & Rice Dishes
                </h4>
                <p
                  className={`text-xs leading-relaxed ${
                    isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"
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
                  ? "bg-[#14291D] border-[#1F3D2B] hover:border-[#E0B04A]"
                  : "bg-white border-[#F2E8CC] hover:border-[#E0B04A]"
              }`}
            >
              <div
                className={`w-full aspect-[4/5] sm:aspect-[3/4] overflow-hidden relative flex items-center justify-center p-3 ${
                  isDark ? "bg-[#14291D]" : "bg-[#FAF3E0]"
                }`}
              >
                <img
                  src="https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/label-sesame.jpg"
                  alt="Sesame Oil: Tempering, Puliogare & Podis"
                  className="w-full h-full max-h-full max-w-full object-contain hover:scale-105 transition-transform duration-500 drop-shadow-md"
                />
              </div>
              <div className="p-6 space-y-2 flex-1 flex flex-col justify-start">
                <span className="text-[11px] font-bold text-[#E0B04A] uppercase tracking-wider">
                  Wood-Pressed Sesame Oil
                </span>
                <h4
                  className={`text-lg font-bold font-serif ${
                    isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                  }`}
                >
                  Tempering, Puliogare & Podis
                </h4>
                <p
                  className={`text-xs leading-relaxed ${
                    isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"
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
            ? "bg-[#14291D] border-[#14291D] text-[#FAF3E0]"
            : "bg-[#FAF3E0] border-[#F2E8CC] text-[#14291D]"
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 box-border">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold tracking-widest text-[#E0B04A] uppercase">
              {cmsConfig.craftsmanship?.tag || "Artisanal Standards"}
            </span>
            <h2
              className={`text-3xl font-extrabold font-serif ${
                isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
              }`}
            >
              {cmsConfig.craftsmanship?.title || "Wood-Pressed vs Commercial Refined Oils"}
            </h2>
            <p
              className={`text-xs sm:text-sm ${
                isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"
              }`}
            >
              {cmsConfig.craftsmanship?.subtitle || "Understand the biological difference between traditional Marachekku extraction and solvent refining."}
            </p>
          </div>

          <div
            className={`w-full max-w-full rounded-3xl border shadow-sm overflow-hidden box-border ${
              isDark
                ? "bg-[#14291D] border-[#1F3D2B]"
                : "bg-white border-[#F2E8CC]"
            }`}
          >
            <div className="w-full max-w-full overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead
                  className={`font-bold uppercase tracking-wider border-b ${
                    isDark
                      ? "bg-[#1F3D2B] text-[#FAF3E0] border-[#1F3D2B]"
                      : "bg-[#F5EDE1] text-[#14291D] border-[#E3D4C0]"
                  }`}
                >
                  <tr>
                    <th className="py-4 px-6">Quality Factor</th>
                    <th
                      className={`py-4 px-6 ${
                        isDark ? "text-[#3F4F45]" : "text-[#3F4F45]"
                      }`}
                    >
                      Commercial Refined Oil
                    </th>
                    <th
                      className={`py-4 px-6 font-black ${
                        isDark
                          ? "bg-amber-950/40 text-amber-300"
                          : "bg-amber-100/70 text-[#1F3D2B]"
                      }`}
                    >
                      MANOPAVANA Wood-Pressed
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y ${
                    isDark ? "divide-[#14291D]" : "divide-[#F2E8CC]"
                  }`}
                >
                  {(cmsConfig.craftsmanship?.comparisons || BENCHMARK_COMPARISONS).map((row, idx) => (
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
                          isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                        }`}
                      >
                        {row.metric}
                      </td>
                      <td
                        className={`py-4 px-6 ${
                          isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"
                        }`}
                      >
                        {row.commercial}
                      </td>
                      <td
                        className={`py-4 px-6 font-semibold ${
                          isDark
                            ? "bg-amber-950/30 text-amber-200"
                            : "bg-amber-50/50 text-[#1F3D2B]"
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
                  ? "bg-[#14291D] border-[#14291D] text-[#3F4F45]"
                  : "bg-[#FAF3E0] border-[#F2E8CC] text-[#3F4F45]"
              }`}
            >
              {cmsConfig.craftsmanship?.disclaimer || BENCHMARK_DISCLAIMER}
            </div>
          </div>
        </div>
      </section>

      {/* 7. VERIFIED BENGALURU CUSTOMER REVIEWS */}
      <section
        className={`w-full max-w-full py-16 sm:py-20 border-b transition-colors box-border ${
          isDark
            ? "bg-[#14291D] border-[#14291D] text-[#FAF3E0]"
            : "bg-[#FAF3E0] border-[#F2E8CC] text-[#14291D]"
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 box-border">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold tracking-widest text-[#E0B04A] uppercase">
                Real Customer Voices
              </span>
              <h2
                className={`text-3xl font-extrabold font-serif ${
                  isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                }`}
              >
                Trusted Across Bengaluru Kitchens
              </h2>
              <p
                className={`text-xs sm:text-sm ${
                  isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"
                }`}
              >
                Live community feedback from home cooks who made the switch to unrefined cold-pressed oils.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsReviewFormOpen(!isReviewFormOpen)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1F3D2B] hover:bg-[#1F3D2B] text-white font-bold text-xs shadow-md transition-all self-start sm:self-auto cursor-pointer"
            >
              <MessageSquarePlus className="w-4 h-4 text-amber-300" />
              <span>{isReviewFormOpen ? "Cancel Form" : "Write a Customer Review"}</span>
            </button>
          </div>

          {/* Collapsible Review Submission Form */}
          {isReviewFormOpen && (
            <div
              className={`w-full max-w-full rounded-3xl border-2 border-[#E0B04A]/40 p-6 sm:p-8 shadow-lg space-y-4 animate-fade-in box-border ${
                isDark ? "bg-[#14291D]" : "bg-white"
              }`}
            >
              <div
                className={`border-b pb-3 ${
                  isDark ? "border-[#14291D]" : "border-[#F2E8CC]"
                }`}
              >
                <h3
                  className={`text-base font-bold font-serif ${
                    isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                  }`}
                >
                  Share Your Experience
                </h3>
                <p
                  className={`text-xs ${
                    isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"
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
                        isDark ? "text-[#FAF3E0]" : "text-[#1F3D2B]"
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
                      className={`w-full px-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0B04A]/40 ${
                        isDark
                          ? "bg-[#14291D] border-[#1F3D2B] text-[#FAF3E0]"
                          : "bg-[#FAF3E0] border-[#F2E8CC] text-[#14291D]"
                      }`}
                    />
                  </div>

                  <div>
                    <label
                      className={`block font-semibold mb-1 ${
                        isDark ? "text-[#FAF3E0]" : "text-[#1F3D2B]"
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
                      className={`w-full px-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0B04A]/40 ${
                        isDark
                          ? "bg-[#14291D] border-[#1F3D2B] text-[#FAF3E0]"
                          : "bg-[#FAF3E0] border-[#F2E8CC] text-[#14291D]"
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block font-semibold mb-1 ${
                        isDark ? "text-[#FAF3E0]" : "text-[#1F3D2B]"
                      }`}
                    >
                      Oil / Product Reviewed
                    </label>
                    <select
                      value={revProduct}
                      onChange={(e) => setRevProduct(e.target.value)}
                      className={`w-full px-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0B04A]/40 ${
                        isDark
                          ? "bg-[#14291D] border-[#1F3D2B] text-[#FAF3E0]"
                          : "bg-[#FAF3E0] border-[#F2E8CC] text-[#14291D]"
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
                        isDark ? "text-[#FAF3E0]" : "text-[#1F3D2B]"
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
                      <span className="font-bold text-xs text-[#E0B04A] ml-2">
                        {revRating} Star{revRating > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    className={`block font-semibold mb-1 ${
                      isDark ? "text-[#FAF3E0]" : "text-[#1F3D2B]"
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
                    className={`w-full px-3.5 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0B04A]/40 ${
                      isDark
                        ? "bg-[#14291D] border-[#1F3D2B] text-[#FAF3E0]"
                        : "bg-[#FAF3E0] border-[#F2E8CC] text-[#14291D]"
                    }`}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsReviewFormOpen(false)}
                    className={`px-4 py-2 font-medium ${
                      isDark ? "text-[#E0B04A] hover:text-white" : "text-[#3F4F45] hover:text-[#14291D]"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="px-6 py-2.5 rounded-xl bg-[#1F3D2B] hover:bg-[#1F3D2B] text-white font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer"
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
                    ? "bg-[#14291D] border-[#1F3D2B]"
                    : "bg-white border-[#F2E8CC]"
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
                      isDark ? "text-[#E0B04A]" : "text-[#4A3525]"
                    }`}
                  >
                    "{rev.comment}"
                  </p>
                </div>

                <div
                  className={`pt-3 border-t space-y-1 ${
                    isDark ? "border-[#14291D]" : "border-[#F2E8CC]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
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
                      isDark ? "text-[#3F4F45]" : "text-[#3F4F45]"
                    }`}
                  >
                    <span>{rev.locality}, {rev.city}</span>
                    <span>{rev.date}</span>
                  </div>
                  <div className="text-[10px] text-[#E0B04A] font-semibold truncate pt-0.5">
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
                    ? "bg-[#14291D] border-[#1F3D2B] text-[#FAF3E0]"
                    : "bg-[#FCFAF7] border-[#E9DFD0] text-[#14291D]"
                }`}
              >
                <div className="flex items-center gap-2.5 text-[#E0B04A]">
                  <Lock className="w-5 h-5 text-[#E0B04A]" />
                  <h3
                    className={`text-sm font-bold font-serif ${
                      isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                    }`}
                  >
                    Admin Review Deletion Gate
                  </h3>
                </div>
                <p
                  className={`text-xs ${
                    isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"
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
                        ? "bg-[#14291D] border-[#1F3D2B] text-[#FAF3E0]"
                        : "bg-white border-[#F2E8CC] text-[#14291D]"
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
                      isDark ? "text-[#E0B04A] hover:text-white" : "text-[#3F4F45] hover:text-[#14291D]"
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
            ? "bg-[#14291D] text-[#FAF3E0]"
            : "bg-[#FAF3E0] text-[#14291D]"
        }`}
      >
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 box-border">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold tracking-widest text-[#E0B04A] uppercase">
              Frequently Asked Questions
            </span>
            <h2
              className={`text-3xl font-extrabold font-serif ${
                isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
              }`}
            >
              Everything About Our Oils & Dispatch
            </h2>
          </div>

          <div className="space-y-3.5">
            {(cmsConfig.faqs && cmsConfig.faqs.length > 0 ? cmsConfig.faqs : FAQS).map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className={`border rounded-2xl overflow-hidden transition-all shadow-2xs ${
                    isDark
                      ? "bg-[#14291D] border-[#1F3D2B]"
                      : "bg-white border-[#F2E8CC]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span
                      className={`text-sm font-bold ${
                        isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                      }`}
                    >
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#3F4F45] transition-transform ${
                        isOpen ? "rotate-180 text-[#E0B04A]" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div
                      className={`px-5 pb-5 pt-1 text-xs leading-relaxed border-t ${
                        isDark
                          ? "text-[#FAF3E0] border-[#1F3D2B]"
                          : "text-[#14291D] border-[#F2E8CC]"
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
