import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  Truck,
  Droplets,
  Flame,
  ShoppingBag,
  ArrowLeft,
  QrCode,
  Check,
  ChevronRight,
  Info,
  Minus,
  Plus,
  Sparkles,
  Star,
  MessageSquarePlus,
  Send,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { PACKAGING_FEATURES, BUSINESS_CONFIG } from "../constants";
import { BottleVolume } from "../types";

export const ProductPage = () => {
  const { id } = useParams<Record<string, string | undefined>>();
  const navigate = useNavigate();
  const {
    addToCart,
    updateQuantity,
    cart,
    startBuyNow,
    openLoyaltyQuiz,
    loyalty,
    products,
    reviews,
    themeMode,
    currentUser,
    setLoginModalOpen,
    addProductReview,
  } = useStore();

  const isDark = themeMode === "dark";

  const product = products.find((p) => p.id === id) || products[0];

  const [selectedVolume, setSelectedVolume] = useState<BottleVolume>("1L");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Review form state
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const price = product.prices[selectedVolume];
  const mrp = product.mrp[selectedVolume];
  const inStock = product.inStock[selectedVolume];

  const cartItemId = `${product.id}-${selectedVolume}`;
  const cartItem = cart.find((item) => item.id === cartItemId);
  const currentQuantity = cartItem ? cartItem.quantity : 0;

  // Review filtering by product
  const productReviews = reviews.filter((r) => {
    const prodName = (r.product || "").toLowerCase();
    return prodName.includes(product.name.toLowerCase()) || prodName.includes(product.id);
  });

  const getCookingProfile = () => {
    if (product.id === "groundnut") {
      return {
        smokePoint: "230°C (High Heat)",
        bestStyle: "Deep Frying, Roasting & Daily Indian Curries",
        aroma: "Nutty, Rich & Unbleached",
      };
    }
    if (product.id === "coconut") {
      return {
        smokePoint: "177°C (Medium Heat)",
        bestStyle: "Coastal Curries, Chutney Tadka & Hair/Skin Nutrition",
        aroma: "Fresh Copra Fragrance",
      };
    }
    return {
      smokePoint: "210°C (Medium-High Heat)",
      bestStyle: "Tadka, Dosa Seasoning, Gravies & Ayurvedic Oil Pulling",
      aroma: "Deep Toasted Artisanal Gingelly",
    };
  };

  const cookingProfile = getCookingProfile();

  const handleAddToCart = () => {
    addToCart(
      {
        id: cartItemId,
        productId: product.id,
        title: product.name,
        subtitle: `Marachekku Pure • ${selectedVolume}`,
        variant: selectedVolume,
        price,
        regularPrice: mrp,
        image: product.images[selectedImageIndex] || product.images[0],
      },
      1
    );
  };

  const handleIncrement = () => {
    if (cartItem) {
      updateQuantity(cartItemId, 1);
    } else {
      handleAddToCart();
    }
  };

  const handleDecrement = () => {
    if (cartItem) {
      updateQuantity(cartItemId, -1);
    }
  };

  const handleBuyNow = () => {
    startBuyNow(
      {
        id: cartItemId,
        productId: product.id,
        title: product.name,
        subtitle: `Marachekku Pure • ${selectedVolume}`,
        variant: selectedVolume,
        price,
        regularPrice: mrp,
        image: product.images[selectedImageIndex] || product.images[0],
      },
      currentQuantity > 0 ? currentQuantity : 1
    );
    navigate("/checkout?mode=buynow");
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setLoginModalOpen(true);
      return;
    }
    if (!commentInput.trim()) return;

    setIsSubmittingReview(true);
    const success = await addProductReview({
      productId: product.id,
      productName: product.name,
      rating: ratingInput,
      comment: commentInput,
    });
    setIsSubmittingReview(false);

    if (success) {
      setCommentInput("");
      setIsWritingReview(false);
    }
  };

  return (
    <div
      className={`w-full min-h-[calc(100vh-80px)] pb-28 pt-4 transition-colors box-border ${
        isDark ? "bg-[#140D09] text-[#FAF4EA]" : "bg-[#FAF6F0] text-[#23150C]"
      }`}
    >
      {/* Breadcrumb Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 text-xs">
        <Link
          to="/"
          className={`flex items-center gap-1 transition-colors ${
            isDark ? "text-[#D6C4B0] hover:text-white" : "text-[#7A5E48] hover:text-[#23150C]"
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Oils</span>
        </Link>
        <ChevronRight className={`w-3 h-3 ${isDark ? "text-[#5A3E2C]" : "text-[#C8BAA8]"}`} />
        <span className={isDark ? "text-[#A8907E]" : "text-[#8C7A6B]"}>Artisanal Wood-Pressed</span>
        <ChevronRight className={`w-3 h-3 ${isDark ? "text-[#5A3E2C]" : "text-[#C8BAA8]"}`} />
        <span className={`font-bold ${isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}`}>
          {product.name}
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* LEFT: 11-Image Zoom Strip Carousel & Reviews Feed */}
          <div className="lg:col-span-6 space-y-6">
            {/* Big Active Image Display */}
            <div
              className={`relative aspect-square max-h-[520px] w-full rounded-3xl border flex items-center justify-center p-6 shadow-sm overflow-hidden group transition-colors ${
                isDark ? "bg-[#1C120B] border-[#362114]" : "bg-[#FAF6EE] border-[#E8DEC8]"
              }`}
            >
              <img
                src={product.images[selectedImageIndex] || product.images[0]}
                alt={`${product.name} Angle ${selectedImageIndex + 1}`}
                className="max-h-full object-contain mx-auto transition-transform duration-300 group-hover:scale-105 drop-shadow-lg"
              />
            </div>

            {/* 11-Image Horizontal Thumbnail Strip */}
            <div className="space-y-1.5">
              <div
                className={`flex items-center justify-between text-xs ${
                  isDark ? "text-[#D6C4B0]" : "text-[#7A5E48]"
                }`}
              >
                <span className={`font-semibold ${isDark ? "text-[#FAF4EA]" : "text-[#5A381E]"}`}>
                  Multi-Angle Inspection Strip (11 Studio Shots):
                </span>
                <span>Click angle to inspect</span>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                {product.images.map((imgUrl, index) => {
                  const isSelected = selectedImageIndex === index;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      className={`relative w-16 h-16 rounded-xl shrink-0 p-1 border-2 transition-all cursor-pointer ${
                        isDark ? "bg-[#1C120B]" : "bg-[#FAF6EE]"
                      } ${
                        isSelected
                          ? "border-[#E08F35] ring-2 ring-[#E08F35]/40 scale-105"
                          : isDark
                          ? "border-[#362114] hover:border-[#D49A37] opacity-80 hover:opacity-100"
                          : "border-[#E8DEC8] hover:border-[#D49A37] opacity-80 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Angle thumbnail ${index + 1}`}
                        className="w-full h-full object-contain"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Packaging Highlights snippet */}
            <div
              className={`p-4 rounded-2xl border space-y-2 ${
                isDark ? "bg-[#1C120B] border-[#362114]" : "bg-amber-50/70 border-amber-200/80"
              }`}
            >
              <div
                className={`flex items-center gap-2 text-xs font-bold ${
                  isDark ? "text-amber-300" : "text-[#5A381E]"
                }`}
              >
                <Droplets className="w-4 h-4 text-[#E08F35]" />
                <span>{PACKAGING_FEATURES.items[0].title}</span>
              </div>
              <p className={`text-[11px] ${isDark ? "text-[#D6C4B0]" : "text-[#7A5E48]"}`}>
                {PACKAGING_FEATURES.items[0].description}
              </p>
            </div>

            {/* DEDICATED REVIEWS SECTION & WRITE A REVIEW FORM */}
            <div
              className={`rounded-3xl border p-6 space-y-4 ${
                isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <h3 className="font-bold font-serif text-base">Customer Reviews & Ratings</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      setLoginModalOpen(true);
                    } else {
                      setIsWritingReview(!isWritingReview);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isWritingReview ? "Close Form" : "Rate Product"}</span>
                </button>
              </div>

              {/* Review Input Box */}
              {isWritingReview && (
                <form onSubmit={handleSubmitReview} className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 text-xs">
                  <div>
                    <label className="block font-bold mb-1 text-stone-900 dark:text-[#FAF4EA]">
                      Select Your Star Rating:
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingInput(star)}
                          className="p-1 cursor-pointer transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              star <= ratingInput
                                ? "text-amber-500 fill-amber-500"
                                : "text-stone-300 dark:text-stone-700"
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 font-bold text-amber-700 dark:text-amber-300">
                        {ratingInput} of 5 Stars
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-stone-900 dark:text-[#FAF4EA]">
                      Your Review / Cooking Experience:
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder="Share how this wood-pressed oil tasted in your cooking, tadka, or daily dishes..."
                      className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsWritingReview(false)}
                      className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReview || !commentInput.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#5E3210] hover:bg-[#43230A] text-white font-bold cursor-pointer transition-all disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5 text-amber-300" />
                      <span>{isSubmittingReview ? "Posting..." : "Submit Review"}</span>
                    </button>
                  </div>
                </form>
              )}

              {productReviews.length === 0 ? (
                <div className="text-center py-6 text-xs text-stone-500">
                  No verified customer reviews yet for this oil. Be the first to try and review!
                </div>
              ) : (
                <div className="space-y-3">
                  {productReviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-3.5 rounded-2xl bg-stone-50 dark:bg-[#140D07] border border-stone-200 dark:border-[#362114] space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900 dark:text-[#FAF4EA]">
                          {rev.name}
                        </span>
                        <div className="flex text-amber-500">
                          {Array.from({ length: rev.rating || 5 }).map((_, rIdx) => (
                            <Star key={rIdx} className="w-3.5 h-3.5 fill-amber-500" />
                          ))}
                        </div>
                      </div>
                      <p className="text-stone-600 dark:text-stone-300 leading-relaxed">{rev.comment}</p>
                      <span className="text-[10px] text-stone-400 block">{rev.date || "Verified Buyer"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Product Specs, Volume Selector, Nutrition, Purchasing */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs text-[#C8751B] font-semibold">
                <span>{product.kannadaName}</span>
              </div>

              <h1
                className={`text-3xl sm:text-4xl font-extrabold font-serif leading-tight ${
                  isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                }`}
              >
                {product.name}
              </h1>

              <p
                className={`text-xs sm:text-sm leading-relaxed ${
                  isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"
                }`}
              >
                {product.shortDescription}
              </p>

              {/* Standardized Purity, Smoke Point & Culinary Attribute Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border ${
                    isDark
                      ? "bg-amber-950/40 text-amber-300 border-amber-800/40"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-[#E08F35]" />
                  <span>Smoke Point: {cookingProfile.smokePoint}</span>
                </span>

                <span
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border ${
                    isDark
                      ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/40"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>100% Marachekku (Cold-Pressed)</span>
                </span>

                <span
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border ${
                    isDark
                      ? "bg-[#1C120B] text-stone-300 border-[#362114]"
                      : "bg-stone-100 text-stone-700 border-stone-200"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Zero Chemical Refinement</span>
                </span>
              </div>

              {/* FSSAI & Facility Badge */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold ${
                    isDark
                      ? "bg-amber-950/40 border-amber-800/40 text-amber-200"
                      : "bg-amber-100/70 border-amber-300 text-amber-900"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>FSSAI: {BUSINESS_CONFIG.FSSAI_LICENSE}</span>
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold ${
                    isDark
                      ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-200"
                      : "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  }`}
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Bangalore Facility Packaged</span>
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold ${
                    isDark
                      ? "bg-[#1E130B] border-[#362114] text-[#D8C8B8]"
                      : "bg-[#FAF7F2] border-[#E8DEC8] text-[#5C4230]"
                  }`}
                >
                  <Truck className="w-3.5 h-3.5 text-[#E08F35]" />
                  <span>Dispatched direct from Peenya 2nd Stage</span>
                </span>
              </div>
            </div>

            {/* Pricing Section & Single Unified Quantity Card */}
            <div
              className={`p-5 rounded-2xl border shadow-2xs space-y-4 ${
                isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
              }`}
            >
              <div className="flex items-baseline gap-3">
                <span className={`text-4xl font-black font-serif ${isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}`}>
                  ₹{price}
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  Inclusive of GST
                </span>
              </div>
              <p className={`text-xs ${isDark ? "text-[#A8907E]" : "text-[#7A5E48]"}`}>
                Honest, direct-from-artisan pricing. Free delivery unlocks at ₹500 across Bengaluru.
              </p>

              {/* Volume Switcher */}
              <div className={`pt-2 border-t space-y-2 ${isDark ? "border-[#2D1B10]" : "border-[#EFE8DC]"}`}>
                <label className={`block text-xs font-bold ${isDark ? "text-[#FAF4EA]" : "text-[#3D2514]"}`}>
                  Choose Bottle Size:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedVolume("1L")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedVolume === "1L"
                        ? isDark
                          ? "bg-amber-950/40 border-[#E08F35] ring-2 ring-[#E08F35]/30 text-white"
                          : "bg-amber-50/80 border-[#E08F35] ring-2 ring-[#E08F35]/30 text-[#23150C]"
                        : isDark
                        ? "bg-[#150D07] border-[#362114] text-[#D6C4B0] hover:border-[#D49A37]"
                        : "bg-white border-[#E8DEC8] text-[#5C402D] hover:border-[#DDD1BE]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">1 Litre Bottle</span>
                      <span className="font-black text-sm text-[#C8751B]">
                        ₹{product.prices["1L"]}
                      </span>
                    </div>
                    <span className={`text-[11px] mt-0.5 block ${isDark ? "text-[#A8907E]" : "text-[#7A5E48]"}`}>
                      Best for everyday cooking
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedVolume("500ml")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedVolume === "500ml"
                        ? isDark
                          ? "bg-amber-950/40 border-[#E08F35] ring-2 ring-[#E08F35]/30 text-white"
                          : "bg-amber-50/80 border-[#E08F35] ring-2 ring-[#E08F35]/30 text-[#23150C]"
                        : isDark
                        ? "bg-[#150D07] border-[#362114] text-[#D6C4B0] hover:border-[#D49A37]"
                        : "bg-white border-[#E8DEC8] text-[#5C402D] hover:border-[#DDD1BE]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">500 ml Bottle</span>
                      <span className="font-black text-sm text-[#C8751B]">
                        ₹{product.prices["500ml"]}
                      </span>
                    </div>
                    <span className={`text-[11px] mt-0.5 block ${isDark ? "text-[#A8907E]" : "text-[#7A5E48]"}`}>
                      Compact kitchen bottle
                    </span>
                  </button>
                </div>
              </div>

              {/* SINGLE UNIFIED QUANTITY SELECTOR */}
              <div className="pt-2 flex items-center gap-3">
                {currentQuantity === 0 ? (
                  <button
                    type="button"
                    disabled={!inStock}
                    onClick={handleAddToCart}
                    className={`flex-1 py-3.5 px-4 rounded-xl border-2 font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isDark
                        ? "bg-[#25150C] text-[#F5BC51] border-[#E08F35] hover:bg-[#361E10]"
                        : "bg-white text-[#5E3210] border-[#5E3210] hover:bg-[#FAF6EE]"
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 text-[#E08F35]" />
                    <span>Add to Bag</span>
                  </button>
                ) : (
                  <div className="flex-1 flex items-center justify-between p-1.5 rounded-xl border-2 border-[#5E3210] dark:border-[#E08F35]">
                    <button
                      type="button"
                      onClick={handleDecrement}
                      className="w-9 h-9 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center font-bold text-sm hover:bg-stone-200 transition-colors cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className={`font-black text-sm ${isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}`}>
                      {currentQuantity} in Bag
                    </span>
                    <button
                      type="button"
                      disabled={!inStock}
                      onClick={handleIncrement}
                      className="w-9 h-9 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center font-bold text-sm hover:bg-stone-200 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  disabled={!inStock}
                  onClick={handleBuyNow}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Buy Now</span>
                </button>
              </div>
            </div>

            {/* Bottle QR Loyalty Banner */}
            <div className="p-4 rounded-2xl bg-[#3D2514] text-white flex items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-[#E08F35]/20 text-[#E08F35]">
                  <QrCode className="w-6 h-6 text-[#E08F35]" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-amber-200">
                    Already own this bottle?
                  </h4>
                  <p className="text-[11px] text-[#D6C4B0]">
                    Verify the front label security tagline to unlock 10% repeat order discount!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openLoyaltyQuiz(product)}
                className="px-3.5 py-2 rounded-xl bg-[#E08F35] text-[#29170C] font-black text-xs shrink-0 hover:bg-[#F59E0B] transition-colors cursor-pointer"
              >
                Scan & Save
              </button>
            </div>

            {/* Product Specifications Table */}
            <div
              className={`rounded-2xl border p-5 space-y-3 ${
                isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
              }`}
            >
              <h3 className={`text-sm font-bold font-serif ${isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}`}>
                Extraction & Quality Specifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className={`p-3 rounded-xl ${isDark ? "bg-[#150D07]" : "bg-[#FAF6EE]"}`}>
                  <span className={`block text-[10px] uppercase font-bold ${isDark ? "text-[#A8907E]" : "text-[#7A5E48]"}`}>
                    Extraction
                  </span>
                  <span className={`font-semibold ${isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}`}>
                    {product.specs.extraction}
                  </span>
                </div>
                <div className={`p-3 rounded-xl ${isDark ? "bg-[#150D07]" : "bg-[#FAF6EE]"}`}>
                  <span className={`block text-[10px] uppercase font-bold ${isDark ? "text-[#A8907E]" : "text-[#7A5E48]"}`}>
                    Processing
                  </span>
                  <span className={`font-semibold ${isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}`}>
                    {product.specs.processing}
                  </span>
                </div>
                <div className={`p-3 rounded-xl ${isDark ? "bg-[#150D07]" : "bg-[#FAF6EE]"}`}>
                  <span className={`block text-[10px] uppercase font-bold ${isDark ? "text-[#A8907E]" : "text-[#7A5E48]"}`}>
                    Facility
                  </span>
                  <span className={`font-semibold ${isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}`}>
                    {product.specs.facility}
                  </span>
                </div>
                <div className={`p-3 rounded-xl ${isDark ? "bg-[#150D07]" : "bg-[#FAF6EE]"}`}>
                  <span className={`block text-[10px] uppercase font-bold ${isDark ? "text-[#A8907E]" : "text-[#7A5E48]"}`}>
                    Container
                  </span>
                  <span className={`font-semibold ${isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}`}>
                    {product.specs.container}
                  </span>
                </div>
                <div className={`p-3 rounded-xl ${isDark ? "bg-[#150D07]" : "bg-[#FAF6EE]"}`}>
                  <span className={`block text-[10px] uppercase font-bold ${isDark ? "text-[#A8907E]" : "text-[#7A5E48]"}`}>
                    Best For
                  </span>
                  <span className={`font-semibold ${isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}`}>
                    {product.specs.bestFor}
                  </span>
                </div>
                <div className={`p-3 rounded-xl ${isDark ? "bg-[#150D07]" : "bg-[#FAF6EE]"}`}>
                  <span className={`block text-[10px] uppercase font-bold ${isDark ? "text-[#A8907E]" : "text-[#7A5E48]"}`}>
                    Shelf Life
                  </span>
                  <span className={`font-semibold ${isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}`}>
                    {product.specs.shelfLife}
                  </span>
                </div>
              </div>
              <p
                className={`text-[11px] font-semibold p-2.5 rounded-xl border ${
                  isDark
                    ? "bg-emerald-950/40 text-emerald-200 border-emerald-800/40"
                    : "text-emerald-800 bg-emerald-50 border-emerald-200"
                }`}
              >
                Standards: {product.specs.standards}
              </p>
            </div>

            {/* 100g Nutritional Matrix Table */}
            <div
              className={`rounded-2xl border p-5 space-y-3 ${
                isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
              }`}
            >
              <h3 className={`text-sm font-bold font-serif ${isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}`}>
                Nutritional Matrix (per 100g serving)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <tbody className={`divide-y ${isDark ? "divide-[#2D1B10]" : "divide-[#EFE8DC]"}`}>
                    <tr>
                      <td className={`py-2 ${isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"}`}>Energy</td>
                      <td className={`py-2 font-bold text-right ${isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}`}>
                        {product.nutrition.energy}
                      </td>
                    </tr>
                    <tr>
                      <td className={`py-2 ${isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"}`}>Total Fat</td>
                      <td className={`py-2 font-bold text-right ${isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}`}>
                        {product.nutrition.totalFat}
                      </td>
                    </tr>
                    <tr>
                      <td className={`py-2 ${isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"}`}>Saturated Fat</td>
                      <td className={`py-2 font-bold text-right ${isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}`}>
                        {product.nutrition.saturatedFat}
                      </td>
                    </tr>
                    <tr>
                      <td className={`py-2 ${isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"}`}>Mono Unsaturated Fat</td>
                      <td className={`py-2 font-bold text-right ${isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}`}>
                        {product.nutrition.monoUnsaturatedFat}
                      </td>
                    </tr>
                    <tr>
                      <td className={`py-2 ${isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"}`}>Poly Unsaturated Fat</td>
                      <td className={`py-2 font-bold text-right ${isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}`}>
                        {product.nutrition.polyUnsaturatedFat}
                      </td>
                    </tr>
                    <tr>
                      <td className={`py-2 ${isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"}`}>Trans Fat</td>
                      <td className={`py-2 font-bold text-right ${isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}`}>
                        {product.nutrition.transFat}
                      </td>
                    </tr>
                    <tr>
                      <td className={`py-2 ${isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"}`}>Cholesterol</td>
                      <td className={`py-2 font-bold text-right ${isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}`}>
                        {product.nutrition.cholesterol}
                      </td>
                    </tr>
                    <tr>
                      <td className={`py-2 ${isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"}`}>Protein & Total Sugar</td>
                      <td className={`py-2 font-bold text-right ${isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}`}>
                        0.0 gm
                      </td>
                    </tr>
                    <tr>
                      <td className={`py-2 ${isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"}`}>Moisture / Total Ash</td>
                      <td className={`py-2 font-bold text-right ${isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}`}>
                        {product.nutrition.moisture}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Purchase Actions Bar (Mobile) */}
      <div
        className={`fixed bottom-0 inset-x-0 z-30 backdrop-blur-md border-t px-4 py-3 sm:hidden shadow-xl transition-colors ${
          isDark ? "bg-[#1A1009]/95 border-[#362114] text-[#FAF4EA]" : "bg-white/95 border-[#E8DEC8] text-[#23150C]"
        }`}
      >
        <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
          <div>
            <div className={`text-[10px] font-semibold uppercase ${isDark ? "text-[#A8907E]" : "text-[#7A5E48]"}`}>
              {product.name} ({selectedVolume})
            </div>
            <div className={`text-xl font-black font-serif ${isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}`}>
              ₹{price}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentQuantity === 0 ? (
              <button
                type="button"
                disabled={!inStock}
                onClick={handleAddToCart}
                className={`px-4 py-2.5 rounded-xl border font-bold text-xs ${
                  isDark
                    ? "bg-[#25150C] border-[#E08F35] text-[#F5BC51]"
                    : "border-[#5E3210] text-[#5E3210]"
                }`}
              >
                Add to Bag
              </button>
            ) : (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl border border-[#E08F35]">
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="w-6 h-6 flex items-center justify-center font-bold text-xs"
                >
                  -
                </button>
                <span className="font-bold text-xs">{currentQuantity}</span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="w-6 h-6 flex items-center justify-center font-bold text-xs"
                >
                  +
                </button>
              </div>
            )}
            <button
              type="button"
              disabled={!inStock}
              onClick={handleBuyNow}
              className="px-5 py-2.5 rounded-xl bg-[#5E3210] text-white font-bold text-xs shadow-md"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};