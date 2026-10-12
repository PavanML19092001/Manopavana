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
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { PRODUCTS, PACKAGING_FEATURES, BUSINESS_CONFIG } from "../constants";
import { BottleVolume } from "../types";

export const ProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, updateQuantity, cart, openLoyaltyQuiz, loyalty, products, themeMode } = useStore();

  const isDark = themeMode === "dark";

  const product = products.find((p) => p.id === id) || products[0];

  const [selectedVolume, setSelectedVolume] = useState<BottleVolume>("1L");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const price = product.prices[selectedVolume];
  const mrp = product.mrp[selectedVolume];
  const inStock = product.inStock[selectedVolume];

  const cartItemId = `${product.id}-${selectedVolume}`;
  const cartItem = cart.find((item) => item.id === cartItemId);
  const currentQuantity = cartItem ? cartItem.quantity : 0;

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
    if (!cartItem) {
      handleAddToCart();
    }
    navigate("/checkout");
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
          {/* LEFT: 11-Image Zoom Strip Carousel */}
          <div className="lg:col-span-6 space-y-4">
            {/* Big Active Image Display */}
            <div
              className={`relative aspect-square max-h-[520px] w-full rounded-3xl border flex items-center justify-center p-6 shadow-sm overflow-hidden group transition-colors ${
                isDark
                  ? "bg-[#1C120B] border-[#362114]"
                  : "bg-[#FAF6EE] border-[#E8DEC8]"
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
                isDark
                  ? "bg-[#1C120B] border-[#362114]"
                  : "bg-amber-50/70 border-amber-200/80"
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
          </div>

          {/* RIGHT: Product Specs, Volume Selector, Nutrition, Purchasing */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              {/* Regional Name */}
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
                  <span>{BUSINESS_CONFIG.FSSAI_LICENSE}</span>
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
              </div>
            </div>

            {/* Pricing Section */}
            <div
              className={`p-5 rounded-2xl border shadow-2xs space-y-3 ${
                isDark
                  ? "bg-[#1C120B] border-[#362114]"
                  : "bg-white border-[#E8DEC8]"
              }`}
            >
              <div className="flex items-baseline gap-3">
                <span
                  className={`text-4xl font-black font-serif ${
                    isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                  }`}
                >
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
              <div
                className={`pt-2 border-t space-y-2 ${
                  isDark ? "border-[#2D1B10]" : "border-[#EFE8DC]"
                }`}
              >
                <label
                  className={`block text-xs font-bold ${
                    isDark ? "text-[#FAF4EA]" : "text-[#3D2514]"
                  }`}
                >
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
                    <span
                      className={`text-[11px] mt-0.5 block ${
                        isDark ? "text-[#A8907E]" : "text-[#7A5E48]"
                      }`}
                    >
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
                    <span
                      className={`text-[11px] mt-0.5 block ${
                        isDark ? "text-[#A8907E]" : "text-[#7A5E48]"
                      }`}
                    >
                      Compact kitchen bottle
                    </span>
                  </button>
                </div>
              </div>

              {/* Quantity selector */}
              <div
                className={`pt-3 flex items-center justify-between border-t ${
                  isDark ? "border-[#2D1B10]" : "border-[#EFE8DC]"
                }`}
              >
                <div className="flex flex-col">
                  <span
                    className={`text-xs font-bold ${
                      isDark ? "text-[#FAF4EA]" : "text-[#3D2514]"
                    }`}
                  >
                    Quantity in Bag:
                  </span>
                  <span className={`text-[11px] ${currentQuantity > 0 ? "text-emerald-600 font-semibold" : isDark ? "text-[#A8907E]" : "text-[#7A5E48]"}`}>
                    {currentQuantity > 0 ? `${currentQuantity} item${currentQuantity > 1 ? "s" : ""} added to bag` : "0 items (press + or Add to Bag)"}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-3 p-1 rounded-xl border ${
                    isDark
                      ? "bg-[#150D07] border-[#362114]"
                      : "bg-[#FAF6EE] border-[#E5DAC8]"
                  }`}
                >
                  <button
                    type="button"
                    disabled={currentQuantity === 0}
                    onClick={handleDecrement}
                    className={`w-8 h-8 rounded-lg border font-bold text-sm flex items-center justify-center cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                      isDark
                        ? "bg-[#25150C] border-[#4D2E1A] text-[#FAF4EA] hover:bg-[#361E10]"
                        : "bg-white border-[#DDD1BE] text-[#3D2514] hover:bg-[#F3EDE2]"
                    }`}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span
                    className={`font-black text-sm px-2 min-w-[24px] text-center ${
                      isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                    }`}
                  >
                    {currentQuantity}
                  </span>
                  <button
                    type="button"
                    disabled={!inStock}
                    onClick={handleIncrement}
                    className={`w-8 h-8 rounded-lg border font-bold text-sm flex items-center justify-center cursor-pointer transition-colors disabled:opacity-50 ${
                      isDark
                        ? "bg-[#25150C] border-[#4D2E1A] text-[#FAF4EA] hover:bg-[#361E10]"
                        : "bg-white border-[#DDD1BE] text-[#3D2514] hover:bg-[#F3EDE2]"
                    }`}
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Main Desktop Actions */}
              <div className="pt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={!inStock}
                  onClick={handleAddToCart}
                  className={`py-3.5 px-4 rounded-xl border-2 font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isDark
                      ? "bg-[#25150C] text-[#F5BC51] border-[#E08F35] hover:bg-[#361E10]"
                      : "bg-white text-[#5E3210] border-[#5E3210] hover:bg-[#FAF6EE]"
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 text-[#E08F35]" />
                  <span>{currentQuantity > 0 ? `Add Another (${currentQuantity} in Bag)` : "Add to Bag"}</span>
                </button>

                <button
                  type="button"
                  disabled={!inStock}
                  onClick={handleBuyNow}
                  className="py-3.5 px-4 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                isDark
                  ? "bg-[#1C120B] border-[#362114]"
                  : "bg-white border-[#E8DEC8]"
              }`}
            >
              <h3
                className={`text-sm font-bold font-serif ${
                  isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                }`}
              >
                Extraction & Quality Specifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div
                  className={`p-3 rounded-xl ${
                    isDark ? "bg-[#150D07]" : "bg-[#FAF6EE]"
                  }`}
                >
                  <span
                    className={`block text-[10px] uppercase font-bold ${
                      isDark ? "text-[#A8907E]" : "text-[#7A5E48]"
                    }`}
                  >
                    Extraction
                  </span>
                  <span
                    className={`font-semibold ${
                      isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                    }`}
                  >
                    {product.specs.extraction}
                  </span>
                </div>
                <div
                  className={`p-3 rounded-xl ${
                    isDark ? "bg-[#150D07]" : "bg-[#FAF6EE]"
                  }`}
                >
                  <span
                    className={`block text-[10px] uppercase font-bold ${
                      isDark ? "text-[#A8907E]" : "text-[#7A5E48]"
                    }`}
                  >
                    Processing
                  </span>
                  <span
                    className={`font-semibold ${
                      isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                    }`}
                  >
                    {product.specs.processing}
                  </span>
                </div>
                <div
                  className={`p-3 rounded-xl ${
                    isDark ? "bg-[#150D07]" : "bg-[#FAF6EE]"
                  }`}
                >
                  <span
                    className={`block text-[10px] uppercase font-bold ${
                      isDark ? "text-[#A8907E]" : "text-[#7A5E48]"
                    }`}
                  >
                    Facility
                  </span>
                  <span
                    className={`font-semibold ${
                      isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                    }`}
                  >
                    {product.specs.facility}
                  </span>
                </div>
                <div
                  className={`p-3 rounded-xl ${
                    isDark ? "bg-[#150D07]" : "bg-[#FAF6EE]"
                  }`}
                >
                  <span
                    className={`block text-[10px] uppercase font-bold ${
                      isDark ? "text-[#A8907E]" : "text-[#7A5E48]"
                    }`}
                  >
                    Container
                  </span>
                  <span
                    className={`font-semibold ${
                      isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                    }`}
                  >
                    {product.specs.container}
                  </span>
                </div>
                <div
                  className={`p-3 rounded-xl ${
                    isDark ? "bg-[#150D07]" : "bg-[#FAF6EE]"
                  }`}
                >
                  <span
                    className={`block text-[10px] uppercase font-bold ${
                      isDark ? "text-[#A8907E]" : "text-[#7A5E48]"
                    }`}
                  >
                    Best For
                  </span>
                  <span
                    className={`font-semibold ${
                      isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                    }`}
                  >
                    {product.specs.bestFor}
                  </span>
                </div>
                <div
                  className={`p-3 rounded-xl ${
                    isDark ? "bg-[#150D07]" : "bg-[#FAF6EE]"
                  }`}
                >
                  <span
                    className={`block text-[10px] uppercase font-bold ${
                      isDark ? "text-[#A8907E]" : "text-[#7A5E48]"
                    }`}
                  >
                    Shelf Life
                  </span>
                  <span
                    className={`font-semibold ${
                      isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                    }`}
                  >
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
                isDark
                  ? "bg-[#1C120B] border-[#362114]"
                  : "bg-white border-[#E8DEC8]"
              }`}
            >
              <h3
                className={`text-sm font-bold font-serif ${
                  isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                }`}
              >
                Nutritional Matrix (per 100g serving)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <tbody
                    className={`divide-y ${
                      isDark ? "divide-[#2D1B10]" : "divide-[#EFE8DC]"
                    }`}
                  >
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
          isDark
            ? "bg-[#1A1009]/95 border-[#362114] text-[#FAF4EA]"
            : "bg-white/95 border-[#E8DEC8] text-[#23150C]"
        }`}
      >
        <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
          <div>
            <div
              className={`text-[10px] font-semibold uppercase ${
                isDark ? "text-[#A8907E]" : "text-[#7A5E48]"
              }`}
            >
              {product.name} ({selectedVolume})
            </div>
            <div
              className={`text-xl font-black font-serif ${
                isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
              }`}
            >
              ₹{price}
            </div>
          </div>
          <div className="flex items-center gap-2">
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
              {currentQuantity > 0 ? `Add More (${currentQuantity})` : "Add to Bag"}
            </button>
            <button
              type="button"
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
