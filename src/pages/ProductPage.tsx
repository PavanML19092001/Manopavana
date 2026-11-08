import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ShoppingBag,
  ArrowLeft,
  QrCode,
  Check,
  ChevronRight,
  Minus,
  Plus,
  Sparkles,
  Star,
  MessageSquarePlus,
  Send,
  Share2,
  Copy,
  ExternalLink,
  X,
  Zap,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { BottleVolume } from "../types";
import combo1lImg from "../assets/diwali/combo_1l.jpg";
import combo500mlImg from "../assets/diwali/combo_500ml.jpg";
import { THEMED_PRODUCT_IMAGES } from "../constants";
import { FESTIVE_CONFIG, isFestiveActive } from "../config/festiveConfig";
import { getSalePrice, getSaleSavings, isSaleActive, getSaleDeadlineLabel } from "../utils/salePricing";

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
    combos,
    reviews,
    themeMode,
    currentUser,
    setLoginModalOpen,
    addProductReview,
    showToast,
  } = useStore();

  const isDark = themeMode === "dark";

  const comboMatch = combos.find((c) => c.id === id);
  const product = products.find((p) => p.id === id) || products[0];

  const [selectedVolume, setSelectedVolume] = useState<BottleVolume>("1L");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Review form state
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [reviewerNameInput, setReviewerNameInput] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Flipkart style Share Modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const regularPrice = product.prices[selectedVolume];
  const price = getSalePrice(regularPrice);
  const mrp = product.mrp[selectedVolume];
  const inStock = product.inStock[selectedVolume];
  const savings = getSaleSavings(regularPrice);
  const isSale = isSaleActive();
  const discountAmount = Math.max(0, mrp - price);
  const discountPercent = mrp > 0 ? Math.round((discountAmount / mrp) * 100) : 0;

  const cartItemId = `${product.id}-${selectedVolume}`;
  const cartItem = cart.find((item) => item.id === cartItemId);
  const currentQuantity = cartItem ? cartItem.quantity : 0;

  // Review filtering by product
  const productReviews = reviews.filter((r) => {
    const prodName = (r.product || "").toLowerCase();
    const prodId = ((r as any).productId || "").toLowerCase();
    return prodName.includes(product.name.toLowerCase()) || prodName.includes(product.id) || prodId === product.id;
  });

  const averageRating = productReviews.length > 0
    ? (productReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / productReviews.length).toFixed(1)
    : "0.0";

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
        regularPrice,
        image: product.images[selectedImageIndex] || product.images[0],
      },
      1
    );
    showToast(`Added ${product.name} (${selectedVolume}) to your bag`);
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
        regularPrice,
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
      comment: commentInput.trim(),
      reviewerName: reviewerNameInput.trim() || undefined,
    });
    setIsSubmittingReview(false);

    if (success) {
      setCommentInput("");
      setReviewerNameInput("");
      setIsWritingReview(false);
      showToast("Thank you! Your verified review has been published.");
    }
  };

  // Helper to ensure shared image file always has an opaque white background (never transparent / black in WhatsApp or OS share)
  const getWhiteBackgroundShareFile = async (
    imgSrc: string,
    filename: string
  ): Promise<File | null> => {
    try {
      const resp = await fetch(imgSrc);
      if (!resp.ok) return null;
      const blob = await resp.blob();

      // If it's already a JPEG, it is by definition opaque with solid white background
      if (blob.type === "image/jpeg") {
        return new File([blob], `${filename}.jpg`, { type: "image/jpeg" });
      }

      // Convert PNG or any alpha image to a solid white background JPEG using HTML5 canvas
      return new Promise<File | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || 800;
            canvas.height = img.naturalHeight || 800;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(new File([blob], `${filename}.jpg`, { type: "image/jpeg" }));
              return;
            }
            // Fill with pure white background
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Draw bottle image on top of white background
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
              (jpegBlob) => {
                if (jpegBlob) {
                  resolve(new File([jpegBlob], `${filename}.jpg`, { type: "image/jpeg" }));
                } else {
                  resolve(new File([blob], `${filename}.jpg`, { type: "image/jpeg" }));
                }
              },
              "image/jpeg",
              0.95
            );
          } catch {
            resolve(new File([blob], `${filename}.jpg`, { type: "image/jpeg" }));
          }
        };
        img.onerror = () => {
          resolve(new File([blob], `${filename}.jpg`, { type: "image/jpeg" }));
        };
        img.src = URL.createObjectURL(blob);
      });
    } catch (e) {
      console.warn("Could not create white background share file:", e);
      return null;
    }
  };

  // FLIPKART STYLE SHARE HANDLER - SENDS CLEAN LINK WITH RICH PREVIEW CARD
  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = `${product.name} (Pure Marachekku Wood-Pressed Oil)`;
    // Clean text without trailing url: navigator.share with url appends the url automatically
    const shareText = `Check out *${product.name}* (100% Marachekku Wood-Pressed Oil) from MANOPAVANA Bengaluru:\nPrice: ₹${price} (${selectedVolume})`;
    const shareTextWithUrl = `${shareText}\n${shareUrl}`;

    // Try Web Share API with white-background image file if supported
    if (navigator.share) {
      try {
        let fileShared = false;
        try {
          // Use guaranteed white-background image for sharing
          const whiteImgPath =
            THEMED_PRODUCT_IMAGES[product.id]?.white ||
            `/images/products/${product.id}-white.jpg`;

          const file = await getWhiteBackgroundShareFile(
            whiteImgPath,
            `${product.id}-pure-wood-pressed-oil`
          );

          if (file) {
            // Level 2 Web Share API with both white-background image file and clickable link
            const fullPayload: any = {
              title: shareTitle,
              text: shareText,
              url: shareUrl,
              files: [file],
            };

            if (navigator.canShare && navigator.canShare(fullPayload)) {
              await navigator.share(fullPayload);
              fileShared = true;
            } else if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: shareTitle,
                text: shareTextWithUrl,
                files: [file],
              });
              fileShared = true;
            }
          }
        } catch (e) {
          console.warn("Notice: file share with image file fell back to standard link share", e);
        }

        if (!fileShared) {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl,
          });
        }
        showToast("Product shared successfully!");
        return;
      } catch (err: unknown) {
        const error = err as { name?: string };
        if (error.name === "AbortError") {
          return; // user cancelled share sheet
        }
      }
    }

    // Fallback: Open interactive Flipkart-style share sheet
    setIsShareModalOpen(true);
    try {
      await navigator.clipboard.writeText(`${product.name} (₹${price} - ${selectedVolume})\n${shareUrl}`);
      setCopiedLink(true);
      showToast("Product link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      // clipboard write failed
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${product.name} (₹${price} - ${selectedVolume})\n${window.location.href}`);
      setCopiedLink(true);
      showToast("Product link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      showToast("Unable to copy link automatically");
    }
  };

  const activeImageUrl = product.images[selectedImageIndex] || product.images[0];
  const shareMessage = encodeURIComponent(
    `🌿 *${product.name}* (100% Traditional Marachekku Wood-Pressed Oil)\n` +
    `💰 Price: ₹${price} (${selectedVolume} Bottle)\n` +
    `📍 MANOPAVANA, Bengaluru\n\n` +
    `🔗 Order & View Details: ${window.location.href}`
  );

  React.useEffect(() => {
    document.title = `${product.name} - MANOPAVANA Artisanal Oils`;
    // Update OpenGraph image to solid white background image for WhatsApp/social preview cards
    const whiteImgUrl = THEMED_PRODUCT_IMAGES[product.id]?.white || `${window.location.origin}/images/products/${product.id}-white.jpg`;
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
      ogImage.setAttribute("content", whiteImgUrl);
    }
    const ogSecureImage = document.querySelector('meta[property="og:image:secure_url"]');
    if (ogSecureImage) {
      ogSecureImage.setAttribute("content", whiteImgUrl);
    }
    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (twitterImage) {
      twitterImage.setAttribute("content", whiteImgUrl);
    }
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute("content", `${product.name} - MANOPAVANA`);
    }
  }, [product.name, product.id]);

  return (
    <div
      className={`w-full min-h-[calc(100vh-80px)] pb-36 pt-3 transition-colors box-border ${
        isDark ? "bg-[#14291D] text-[#FAF3E0]" : "bg-[#FAF3E0] text-[#14291D]"
      }`}
    >
      {/* Breadcrumb Navigation */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-2 text-xs">
        <Link
          to="/"
          className={`flex items-center gap-1 transition-colors ${
            isDark ? "text-[#E0B04A] hover:text-white" : "text-[#3F4F45] hover:text-[#14291D]"
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Oils</span>
        </Link>
        <ChevronRight className={`w-3 h-3 ${isDark ? "text-[#5A3E2C]" : "text-[#C8BAA8]"}`} />
        <span className={isDark ? "text-[#3F4F45]" : "text-[#3F4F45]"}>Artisanal Wood-Pressed</span>
        <ChevronRight className={`w-3 h-3 ${isDark ? "text-[#5A3E2C]" : "text-[#C8BAA8]"}`} />
        <span className={`font-bold truncate max-w-[160px] sm:max-w-none ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
          {product.name}
        </span>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-1 space-y-6">
        {/* ------------------------------------------------------------- */}
        {/* STEP 1: PRODUCT NAME SECTION (FIRST) WITH FLIPKART SHARE BTN */}
        {/* ------------------------------------------------------------- */}
        <section
          aria-label="Product Information"
          className={`p-5 sm:p-6 rounded-3xl border shadow-xs transition-colors ${
            isDark ? "bg-[#14291D] border-[#1F3D2B]" : "bg-white border-[#F2E8CC]"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-[#E0B04A] font-semibold">
                <span className="font-bold">{product.kannadaName}</span>
                <span className="text-[10px] opacity-75">• 100% Traditional Marachekku</span>
              </div>

              <h1
                className={`text-2xl sm:text-3xl lg:text-4xl font-black font-serif leading-tight ${
                  isDark ? "text-[#FAF3E0]" : "text-[#14291D]"
                }`}
              >
                {product.name}
              </h1>

              {/* Star Ratings Summary Badge (Flipkart Style) */}
              <div className="flex items-center gap-2 pt-1">
                {productReviews.length > 0 ? (
                  <>
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-700 text-white text-xs font-black">
                      <span>{averageRating}</span>
                      <Star className="w-3 h-3 fill-white text-white" />
                    </div>
                    <span className={`text-xs ${isDark ? "text-[#3F4F45]" : "text-[#3F4F45]"}`}>
                      {productReviews.length} {productReviews.length === 1 ? "Customer Review" : "Customer Reviews"}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-stone-500/15 text-stone-600 dark:text-stone-300 text-xs font-bold border border-stone-300 dark:border-stone-700">
                      <span>0.0</span>
                      <Star className="w-3 h-3 text-stone-400" />
                    </div>
                    <span className={`text-xs ${isDark ? "text-[#3F4F45]" : "text-[#3F4F45]"}`}>
                      0 Ratings & 0 Reviews
                    </span>
                  </>
                )}
              </div>

              <p
                className={`text-xs sm:text-sm leading-relaxed pt-1 ${
                  isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"
                }`}
              >
                {product.shortDescription}
              </p>
            </div>

            {/* FLIPKART STYLE SHARE BUTTON */}
            <div className="flex flex-col items-center shrink-0">
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share product with image and link"
                className={`w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 hover:scale-105 ${
                  isDark
                    ? "bg-[#1F3D2B] border-[#E0B04A] text-[#F3D17A] hover:bg-[#1F3D2B]"
                    : "bg-white border-[#E0B04A] text-[#1F3D2B] hover:bg-[#FAF3E0]"
                }`}
                title="Share this product"
              >
                <Share2 className="w-5 h-5 text-[#E0B04A]" />
              </button>
              <span className={`text-[10px] font-bold mt-1 ${isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"}`}>
                Share
              </span>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* STEP 2: PRODUCT IMAGES (THEN PRODUCT IMAGES)                 */}
        {/* Note: Tags below product images have been removed!           */}
        {/* ------------------------------------------------------------- */}
        <section
          aria-label="Product Images"
          className={`p-4 sm:p-6 rounded-3xl border shadow-xs space-y-4 transition-colors ${
            isDark ? "bg-[#14291D] border-[#1F3D2B]" : "bg-white border-[#F2E8CC]"
          }`}
        >
          {/* Main Angle Image Display */}
          <div
            className={`relative aspect-square max-h-[480px] w-full rounded-2xl border flex items-center justify-center p-6 shadow-inner overflow-hidden group transition-colors ${
              isDark ? "bg-[#14291D] border-[#2E1A0F]" : "bg-[#FAF3E0] border-[#F2E8CC]"
            }`}
          >
            <img
              src={product.images[selectedImageIndex] || product.images[0]}
              alt={`${product.name} Angle ${selectedImageIndex + 1}`}
              className="max-h-full max-w-full object-contain mx-auto transition-transform duration-300 group-hover:scale-105 drop-shadow-xl"
            />
          </div>

          {/* 11-Image Horizontal Thumbnail Strip */}
          <div className="space-y-1.5">
            <div
              className={`flex items-center justify-between text-xs ${
                isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"
              }`}
            >
              <span className={`font-bold ${isDark ? "text-[#FAF3E0]" : "text-[#3F4F45]"}`}>
                Multi-Angle Studio Gallery ({product.images.length} Shots):
              </span>
              <span className="text-[11px]">Select photo to inspect</span>
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
                      isDark ? "bg-[#14291D]" : "bg-[#FAF3E0]"
                    } ${
                      isSelected
                        ? "border-[#E0B04A] ring-2 ring-[#E0B04A]/40 scale-105"
                        : isDark
                        ? "border-[#2E1A0F] hover:border-[#E0B04A] opacity-75 hover:opacity-100"
                        : "border-[#F2E8CC] hover:border-[#E0B04A] opacity-75 hover:opacity-100"
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
        </section>

        {/* ------------------------------------------------------------- */}
        {/* STEP 3: REMAINING STUFF (PRICE & VARIANTS OPTION ONLY,        */}
        {/* NO BUY NOW OR ADD TO BAG BUTTONS IN THE MIDDLE)               */}
        {/* ------------------------------------------------------------- */}
        <section
          aria-label="Product Pricing and Variants"
          className={`p-5 sm:p-6 rounded-3xl border shadow-xs space-y-5 transition-colors ${
            isDark ? "bg-[#14291D] border-[#1F3D2B]" : "bg-white border-[#F2E8CC]"
          }`}
        >
          {/* Price display with MRP & Savings */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className={`text-3xl sm:text-4xl font-black font-serif ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
                ₹{price}
              </span>
              {isSale && savings > 0 ? (
                <span className="text-base sm:text-lg line-through text-[#4A5A50] font-semibold">
                  ₹{regularPrice}
                </span>
              ) : mrp > price && (
                <span className="text-base sm:text-lg line-through text-[#4A5A50] font-semibold">
                  ₹{mrp}
                </span>
              )}
              {isSale && savings > 0 ? (
                <span className="text-xs font-black text-[#14291D] bg-[#E0B04A] border border-[#F3D17A] px-2.5 py-0.5 rounded-md shadow-2xs">
                  10% OFF
                </span>
              ) : discountPercent > 0 && (
                <span className="text-xs font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-md">
                  {discountPercent}% OFF (Save ₹{discountAmount})
                </span>
              )}
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                Inclusive of GST
              </span>
            </div>
            {isSale && savings > 0 && (
              <p className="text-xs font-bold text-[#14291D] dark:text-[#F3D17A] pt-0.5">
                You save ₹{savings} • {getSaleDeadlineLabel()}
              </p>
            )}
            <p className={`text-xs ${isDark ? "text-[#FAF3E0]/70" : "text-[#3F4F45]"}`}>
              Direct artisan price. Free delivery across India unlocked on orders above ₹800 (or any 2+ bottles).
            </p>
          </div>

          {/* VARIANTS OPTION ONLY (MIDDLE BUTTONS REMOVED AS REQUESTED) */}
          <div className={`pt-4 border-t space-y-2.5 ${isDark ? "border-[#14291D]" : "border-[#F2E8CC]"}`}>
            <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? "text-[#FAF3E0]" : "text-[#1F3D2B]"}`}>
              Select Variant (Bottle Size):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedVolume("1L")}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  selectedVolume === "1L"
                    ? isDark
                      ? "bg-amber-950/40 border-[#E0B04A] ring-2 ring-[#E0B04A]/30 text-white shadow-md"
                      : "bg-amber-50/90 border-[#E0B04A] ring-2 ring-[#E0B04A]/30 text-[#14291D] shadow-md"
                    : isDark
                    ? "bg-[#14291D] border-[#2E1A0F] text-[#E0B04A] hover:border-[#E0B04A]"
                    : "bg-[#FAF3E0] border-[#F2E8CC] text-[#3F4F45] hover:border-[#F2E8CC]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedVolume === "1L" ? "border-[#E0B04A] bg-[#E0B04A]" : "border-stone-400"
                      }`}
                    >
                      {selectedVolume === "1L" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <span className="font-bold text-sm sm:text-base">1 Litre Bottle</span>
                  </div>
                  <span className="font-black text-base text-[#E0B04A]">
                    ₹{product.prices["1L"]}
                  </span>
                </div>
                <span className={`text-[11px] mt-1 pl-6 block ${isDark ? "text-[#3F4F45]" : "text-[#3F4F45]"}`}>
                  Best value for daily cooking & frying
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedVolume("500ml")}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  selectedVolume === "500ml"
                    ? isDark
                      ? "bg-amber-950/40 border-[#E0B04A] ring-2 ring-[#E0B04A]/30 text-white shadow-md"
                      : "bg-amber-50/90 border-[#E0B04A] ring-2 ring-[#E0B04A]/30 text-[#14291D] shadow-md"
                    : isDark
                    ? "bg-[#14291D] border-[#2E1A0F] text-[#E0B04A] hover:border-[#E0B04A]"
                    : "bg-[#FAF3E0] border-[#F2E8CC] text-[#3F4F45] hover:border-[#F2E8CC]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedVolume === "500ml" ? "border-[#E0B04A] bg-[#E0B04A]" : "border-stone-400"
                      }`}
                    >
                      {selectedVolume === "500ml" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <span className="font-bold text-sm sm:text-base">500 ml Bottle</span>
                  </div>
                  <span className="font-black text-base text-[#E0B04A]">
                    ₹{product.prices["500ml"]}
                  </span>
                </div>
                <span className={`text-[11px] mt-1 pl-6 block ${isDark ? "text-[#3F4F45]" : "text-[#3F4F45]"}`}>
                  Compact bottle for smaller kitchen needs
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Bottle QR Loyalty Banner */}
        <section
          aria-label="Loyalty Discount"
          className="p-4 sm:p-5 rounded-3xl bg-[#1F3D2B] text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg border border-[#5A3820]"
        >
          <div className="flex items-center gap-3.5">
            <span className="p-2.5 rounded-2xl bg-[#E0B04A]/20 text-[#E0B04A] shrink-0">
              <QrCode className="w-6 h-6 text-[#E0B04A]" />
            </span>
            <div>
              <h4 className="text-sm font-bold text-amber-200">
                Already own this bottle?
              </h4>
              <p className="text-xs text-[#E0B04A] mt-0.5">
                Scan your front label security tagline to unlock 10% repeat order discount for 7 days!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openLoyaltyQuiz(product)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#E0B04A] text-[#14291D] font-black text-xs shrink-0 hover:bg-[#F59E0B] transition-colors cursor-pointer shadow-md text-center"
          >
            Scan & Save 10%
          </button>
        </section>

        {/* Culinary Pairing & Cooking Profile */}
        <section
          aria-label="Cooking Profile"
          className={`rounded-3xl border p-5 sm:p-6 space-y-3 transition-colors ${
            isDark ? "bg-[#14291D] border-[#1F3D2B]" : "bg-white border-[#F2E8CC]"
          }`}
        >
          <h3 className={`text-base font-bold font-serif ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
            Culinary Usage & Cooking Profile
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className={`p-3.5 rounded-2xl ${isDark ? "bg-[#14291D]" : "bg-[#FAF3E0]"}`}>
              <span className={`block text-[10px] uppercase font-bold ${isDark ? "text-[#3F4F45]" : "text-[#3F4F45]"}`}>
                Smoke Point
              </span>
              <span className={`font-bold mt-1 block ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
                {cookingProfile.smokePoint}
              </span>
            </div>
            <div className={`p-3.5 rounded-2xl ${isDark ? "bg-[#14291D]" : "bg-[#FAF3E0]"}`}>
              <span className={`block text-[10px] uppercase font-bold ${isDark ? "text-[#3F4F45]" : "text-[#3F4F45]"}`}>
                Best Culinary Style
              </span>
              <span className={`font-bold mt-1 block ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
                {cookingProfile.bestStyle}
              </span>
            </div>
            <div className={`p-3.5 rounded-2xl ${isDark ? "bg-[#14291D]" : "bg-[#FAF3E0]"}`}>
              <span className={`block text-[10px] uppercase font-bold ${isDark ? "text-[#3F4F45]" : "text-[#3F4F45]"}`}>
                Natural Aroma
              </span>
              <span className={`font-bold mt-1 block ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
                {cookingProfile.aroma}
              </span>
            </div>
          </div>
        </section>

        {/* Product Specifications Table */}
        <section
          aria-label="Quality Specifications"
          className={`rounded-3xl border p-5 sm:p-6 space-y-3.5 transition-colors ${
            isDark ? "bg-[#14291D] border-[#1F3D2B]" : "bg-white border-[#F2E8CC]"
          }`}
        >
          <h3 className={`text-base font-bold font-serif ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
            Extraction & Quality Specifications
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div className={`p-3 rounded-2xl ${isDark ? "bg-[#14291D]" : "bg-[#FAF3E0]"}`}>
              <span className={`block text-[10px] uppercase font-bold ${isDark ? "text-[#3F4F45]" : "text-[#3F4F45]"}`}>
                Extraction Method
              </span>
              <span className={`font-semibold mt-0.5 block ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
                {product.specs.extraction}
              </span>
            </div>
            <div className={`p-3 rounded-2xl ${isDark ? "bg-[#14291D]" : "bg-[#FAF3E0]"}`}>
              <span className={`block text-[10px] uppercase font-bold ${isDark ? "text-[#3F4F45]" : "text-[#3F4F45]"}`}>
                Processing
              </span>
              <span className={`font-semibold mt-0.5 block ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
                {product.specs.processing}
              </span>
            </div>
            <div className={`p-3 rounded-2xl ${isDark ? "bg-[#14291D]" : "bg-[#FAF3E0]"}`}>
              <span className={`block text-[10px] uppercase font-bold ${isDark ? "text-[#3F4F45]" : "text-[#3F4F45]"}`}>
                Facility
              </span>
              <span className={`font-semibold mt-0.5 block ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
                {product.specs.facility}
              </span>
            </div>
            <div className={`p-3 rounded-2xl ${isDark ? "bg-[#14291D]" : "bg-[#FAF3E0]"}`}>
              <span className={`block text-[10px] uppercase font-bold ${isDark ? "text-[#3F4F45]" : "text-[#3F4F45]"}`}>
                Container
              </span>
              <span className={`font-semibold mt-0.5 block ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
                {product.specs.container}
              </span>
            </div>
            <div className={`p-3 rounded-2xl ${isDark ? "bg-[#14291D]" : "bg-[#FAF3E0]"}`}>
              <span className={`block text-[10px] uppercase font-bold ${isDark ? "text-[#3F4F45]" : "text-[#3F4F45]"}`}>
                Best For
              </span>
              <span className={`font-semibold mt-0.5 block ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
                {product.specs.bestFor}
              </span>
            </div>
            <div className={`p-3 rounded-2xl ${isDark ? "bg-[#14291D]" : "bg-[#FAF3E0]"}`}>
              <span className={`block text-[10px] uppercase font-bold ${isDark ? "text-[#3F4F45]" : "text-[#3F4F45]"}`}>
                Shelf Life
              </span>
              <span className={`font-semibold mt-0.5 block ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
                {product.specs.shelfLife}
              </span>
            </div>
          </div>
          <p
            className={`text-xs font-semibold p-3 rounded-xl border ${
              isDark
                ? "bg-emerald-950/40 text-emerald-200 border-emerald-800/40"
                : "text-emerald-800 bg-emerald-50 border-emerald-200"
            }`}
          >
            Standards: {product.specs.standards}
          </p>
        </section>

        {/* Nutritional Matrix Table */}
        <section
          aria-label="Nutritional Matrix"
          className={`rounded-3xl border p-5 sm:p-6 space-y-3.5 transition-colors ${
            isDark ? "bg-[#14291D] border-[#1F3D2B]" : "bg-white border-[#F2E8CC]"
          }`}
        >
          <h3 className={`text-base font-bold font-serif ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
            Nutritional Matrix (per 100g serving)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <tbody className={`divide-y ${isDark ? "divide-[#14291D]" : "divide-[#F2E8CC]"}`}>
                <tr>
                  <td className={`py-2.5 ${isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"}`}>Energy</td>
                  <td className={`py-2.5 font-bold text-right ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
                    {product.nutrition.energy}
                  </td>
                </tr>
                <tr>
                  <td className={`py-2.5 ${isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"}`}>Total Fat</td>
                  <td className={`py-2.5 font-bold text-right ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
                    {product.nutrition.totalFat}
                  </td>
                </tr>
                <tr>
                  <td className={`py-2.5 ${isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"}`}>Saturated Fat</td>
                  <td className={`py-2.5 font-bold text-right ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
                    {product.nutrition.saturatedFat}
                  </td>
                </tr>
                <tr>
                  <td className={`py-2.5 ${isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"}`}>Mono Unsaturated Fat</td>
                  <td className={`py-2.5 font-bold text-right ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
                    {product.nutrition.monoUnsaturatedFat}
                  </td>
                </tr>
                <tr>
                  <td className={`py-2.5 ${isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"}`}>Poly Unsaturated Fat</td>
                  <td className={`py-2.5 font-bold text-right ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
                    {product.nutrition.polyUnsaturatedFat}
                  </td>
                </tr>
                <tr>
                  <td className={`py-2.5 ${isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"}`}>Trans Fat</td>
                  <td className={`py-2.5 font-bold text-right ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
                    {product.nutrition.transFat}
                  </td>
                </tr>
                <tr>
                  <td className={`py-2.5 ${isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"}`}>Cholesterol</td>
                  <td className={`py-2.5 font-bold text-right ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
                    {product.nutrition.cholesterol}
                  </td>
                </tr>
                <tr>
                  <td className={`py-2.5 ${isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"}`}>Protein & Total Sugar</td>
                  <td className={`py-2.5 font-bold text-right ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
                    0.0 gm
                  </td>
                </tr>
                <tr>
                  <td className={`py-2.5 ${isDark ? "text-[#E0B04A]" : "text-[#3F4F45]"}`}>Moisture / Total Ash</td>
                  <td className={`py-2.5 font-bold text-right ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
                    {product.nutrition.moisture}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* STEP 4: REVIEWS AT THE END                                    */}
        {/* ------------------------------------------------------------- */}
        <section
          aria-label="Customer Reviews"
          className={`rounded-3xl border p-5 sm:p-6 space-y-4 transition-colors ${
            isDark ? "bg-[#14291D] border-[#1F3D2B]" : "bg-white border-[#F2E8CC]"
          }`}
        >
          <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <h3 className="font-bold font-serif text-base sm:text-lg">
                Customer Reviews & Ratings ({productReviews.length})
              </h3>
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1F3D2B] hover:bg-[#1F3D2B] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <MessageSquarePlus className="w-3.5 h-3.5 text-amber-300" />
              <span>{isWritingReview ? "Close Form" : "Rate Product"}</span>
            </button>
          </div>

          {/* Review Input Box */}
          {isWritingReview && (
            <form
              onSubmit={handleSubmitReview}
              className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold mb-1 text-stone-900 dark:text-[#FAF3E0]">
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
                        className={`w-6 h-6 ${
                          star <= ratingInput
                            ? "text-amber-500 fill-amber-500"
                            : "text-stone-300 dark:text-stone-700"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-bold text-amber-700 dark:text-amber-300 text-xs">
                    {ratingInput} of 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-stone-900 dark:text-[#FAF3E0]">
                  Your Name (Optional):
                </label>
                <input
                  type="text"
                  value={reviewerNameInput}
                  onChange={(e) => setReviewerNameInput(e.target.value)}
                  placeholder={currentUser?.displayName || "e.g. Ramesh Kumar"}
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#14291D] text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E0B04A]/40 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-stone-900 dark:text-[#FAF3E0]">
                  Your Cooking Experience / Feedback:
                </label>
                <textarea
                  required
                  rows={3}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Share how this wood-pressed oil tasted in your cooking, aroma, or health routine..."
                  className="w-full p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#14291D] text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E0B04A]/40 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWritingReview(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview || !commentInput.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#1F3D2B] hover:bg-[#1F3D2B] text-white font-bold cursor-pointer transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isSubmittingReview ? "Posting..." : "Submit Review"}</span>
                </button>
              </div>
            </form>
          )}

          {productReviews.length === 0 ? (
            <div className="text-center py-8 text-xs text-stone-500">
              No verified customer reviews yet for this oil. Be the first to try and review!
            </div>
          ) : (
            <div className="space-y-3">
              {productReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 rounded-2xl bg-stone-50 dark:bg-[#14291D] border border-stone-200 dark:border-[#1F3D2B] space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 dark:text-[#FAF3E0]">
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
        </section>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* STEP 5: FIXED FLIPKART-STYLE BUY NOW & ADD TO BAG BOTTOM BAR */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`fixed bottom-0 inset-x-0 z-40 backdrop-blur-xl border-t px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.25)] transition-colors ${
          isDark
            ? "bg-[#140C07]/95 border-[#1F3D2B] text-[#FAF3E0]"
            : "bg-white/95 border-[#E5DACB] text-[#14291D]"
        }`}
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          {/* Price & Variant Snapshot */}
          <div className="min-w-0 pr-2">
            <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate ${isDark ? "text-[#3F4F45]" : "text-[#3F4F45]"}`}>
              {product.name} ({selectedVolume})
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-xl sm:text-2xl font-black font-serif ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
                ₹{price}
              </span>
              {isSale && savings > 0 ? (
                <span className="text-xs line-through text-[#4A5A50] font-semibold hidden xs:inline">
                  ₹{regularPrice}
                </span>
              ) : mrp > price && (
                <span className="text-xs line-through text-[#4A5A50] font-semibold hidden xs:inline">
                  ₹{mrp}
                </span>
              )}
              {isSale && savings > 0 && (
                <span className="text-[10px] font-bold text-[#14291D] bg-[#E0B04A] px-1.5 py-0.5 rounded shadow-2xs">
                  10% OFF
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons: Add to Bag & Buy Now */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {currentQuantity === 0 ? (
              <button
                type="button"
                disabled={!inStock}
                onClick={handleAddToCart}
                className={`py-3 px-4 sm:px-6 rounded-xl border-2 font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 ${
                  isDark
                    ? "bg-[#1F3D2B] border-[#E0B04A] text-[#F3D17A] hover:bg-[#1F3D2B]"
                    : "bg-white border-[#1F3D2B] text-[#1F3D2B] hover:bg-[#FAF3E0]"
                }`}
              >
                <ShoppingBag className="w-4 h-4 text-[#E0B04A]" />
                <span>Add to Bag</span>
              </button>
            ) : (
              <div
                className={`flex items-center justify-between p-1 rounded-xl border-2 shadow-xs ${
                  isDark
                    ? "bg-[#14291D] border-[#E0B04A]"
                    : "bg-[#FAF3E0] border-[#E0B04A]"
                }`}
              >
                <button
                  type="button"
                  onClick={handleDecrement}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-black active:scale-95 transition-all cursor-pointer border ${
                    isDark
                      ? "bg-[#1F3D2B] border-[#5A3820] text-[#F3D17A] hover:bg-[#1F3D2B]"
                      : "bg-white border-[#D8C7B5] text-[#7A4B1A] hover:bg-[#F3EBE0]"
                  }`}
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4 stroke-[3] text-[#E0B04A]" />
                </button>
                <span className={`font-black text-xs sm:text-sm px-2.5 select-none ${isDark ? "text-[#FAF3E0]" : "text-[#14291D]"}`}>
                  {currentQuantity} in Bag
                </span>
                <button
                  type="button"
                  disabled={!inStock}
                  onClick={handleIncrement}
                  className="w-8 h-8 rounded-lg bg-[#E0B04A] hover:bg-[#F3D17A] text-[#14291D] border border-[#F3D17A] flex items-center justify-center font-black active:scale-95 transition-all cursor-pointer shadow-xs"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4 stroke-[3] text-[#14291D]" />
                </button>
              </div>
            )}

            <button
              type="button"
              disabled={!inStock}
              onClick={handleBuyNow}
              className="py-3 px-5 sm:px-7 rounded-xl bg-gradient-to-r from-[#E0B04A] via-[#F3D17A] to-[#B87C24] text-[#14291D] hover:brightness-110 font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Zap className="w-4 h-4 fill-[#14291D]" />
              <span>Buy Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FLIPKART STYLE SHARE MODAL FALLBACK                           */}
      {/* ------------------------------------------------------------- */}
      {isShareModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in"
        >
          <div
            className={`w-full max-w-sm rounded-3xl border shadow-2xl p-5 space-y-4 animate-scale-up ${
              isDark ? "bg-[#14291D] border-[#2D5A3F] text-[#FAF3E0]" : "bg-white border-[#F2E8CC] text-[#14291D]"
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#E0B04A]" />
                <h3 className="font-bold font-serif text-sm">Share this Product</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product Snapshot Card */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <img
                src={THEMED_PRODUCT_IMAGES[product.id]?.white || THEMED_PRODUCT_IMAGES[product.id]?.light || activeImageUrl}
                alt={product.name}
                className="w-14 h-14 object-contain rounded-xl bg-white p-1 border border-amber-200 shrink-0"
              />
              <div className="min-w-0">
                <p className="font-bold text-xs truncate">{product.name}</p>
                <p className="text-[11px] text-[#E0B04A] font-semibold">{product.kannadaName}</p>
                <p className="text-xs font-black mt-0.5">₹{price} ({selectedVolume})</p>
              </div>
            </div>

            {/* Quick Share Options */}
            <div className="space-y-2">
              {/* WhatsApp direct share */}
              <a
                href={`https://api.whatsapp.com/send?text=${shareMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsShareModalOpen(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Share via WhatsApp</span>
              </a>

              {/* Direct Copy Link button */}
              <button
                type="button"
                onClick={handleCopyLink}
                className={`w-full py-2.5 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  copiedLink
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : isDark
                    ? "bg-[#1F3D2B] border-[#5A3820] text-[#FAF3E0] hover:bg-[#1F3D2B]"
                    : "bg-[#FAF3E0] border-[#D8C7B5] text-[#14291D] hover:bg-[#F2E8CC]"
                }`}
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 text-[#E0B04A]" />}
                <span>{copiedLink ? "Link Copied to Clipboard!" : "Copy Product Link"}</span>
              </button>
            </div>

            <p className="text-[10px] text-center text-stone-400">
              WhatsApp preview card will automatically display the product photo
            </p>
          </div>
        </div>
      )}
    </div>
  );
};