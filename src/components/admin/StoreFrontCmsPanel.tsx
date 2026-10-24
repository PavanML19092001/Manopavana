import React, { useState } from "react";
import {
  Settings,
  Image,
  Video,
  FileText,
  DollarSign,
  Package,
  Save,
  CheckCircle2,
  Sparkles,
  Flame,
  Utensils,
  ShieldCheck,
  Tag,
  Layers,
  ChevronDown,
  ChevronUp,
  Truck,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  Search,
  User,
  MapPin,
  CreditCard,
  Clock,
  Check,
  Plus,
  Trash2,
  HelpCircle,
  Volume2,
  Award,
  Music,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import {
  BUSINESS_CONFIG,
  LEGAL_POLICIES,
  COMBOS,
  BENCHMARK_COMPARISONS,
  BENCHMARK_DISCLAIMER,
  PACKAGING_FEATURES,
  FAQS,
  MEDIA_ASSETS,
} from "../../constants";
import {
  OrderStatus,
  FAQItem,
  CraftsmanshipConfig,
  PackagingFeaturesConfig,
  ProductDetailOverride,
  ComboDetailOverride,
} from "../../types";

export const StorefrontCMSPanel: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const {
    cmsConfig,
    updateCMSConfig,
    showToast,
    adminOrders,
    refreshAdminOrders,
    updateOrderStatus,
  } = useStore();

  const [activeTab, setActiveTab] = useState<
    | "orders"
    | "brand"
    | "products"
    | "combos"
    | "pricing_stock"
    | "craftsmanship"
    | "packaging"
    | "faqs"
    | "facility"
    | "policies"
  >("orders");

  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);

  // Tab 1: Global Brand, Hero Banner, Audio & Media
  const [brandName, setBrandName] = useState(cmsConfig?.brandName || BUSINESS_CONFIG.BRAND_NAME);
  const [ticker, setTicker] = useState(cmsConfig?.announcementTicker || "");
  const [tagline, setTagline] = useState(cmsConfig?.brandTagline || "Pure by nature, trusted for life");
  const [eyebrow, setEyebrow] = useState(cmsConfig?.heroEyebrow || "⚜️ GOOD FOOD STARTS HERE");
  const [headline, setHeadline] = useState(cmsConfig?.heroHeadline || "");
  const [subhead, setSubhead] = useState(cmsConfig?.heroSubhead || "");
  const [ctaPrimaryText, setCtaPrimaryText] = useState(cmsConfig?.heroCtaPrimaryText || "Explore The Collection →");
  const [logoUrl, setLogoUrl] = useState(cmsConfig?.brandLogoUrl || "");
  const [videoUrl, setVideoUrl] = useState(cmsConfig?.chekkuVideoUrl || "");
  const [fallbackImageUrl, setFallbackImageUrl] = useState(cmsConfig?.heroFallbackImage || MEDIA_ASSETS.heroFallbackImage);
  const [ambientAudioTrack, setAmbientAudioTrack] = useState(cmsConfig?.ambientAudioTrack || MEDIA_ASSETS.ambientAudioTrack);
  const [comboBannerImage, setComboBannerImage] = useState(cmsConfig?.comboBannerImage || MEDIA_ASSETS.comboBanner);
  const [highlightsInput, setHighlightsInput] = useState(
    (cmsConfig?.heroHighlights || BUSINESS_CONFIG.HERO_HIGHLIGHTS).join(", ")
  );
  const [threshold, setThreshold] = useState(cmsConfig?.freeShippingThreshold ?? 500);
  const [stdFee, setStdFee] = useState(cmsConfig?.standardShippingFee ?? 49);

  // Tab 2: Facility & Legal Credentials
  const [founderName, setFounderName] = useState(cmsConfig?.founderName || BUSINESS_CONFIG.FOUNDER_NAME);
  const [primaryPhone, setPrimaryPhone] = useState(cmsConfig?.primaryPhone || BUSINESS_CONFIG.PRIMARY_PHONE);
  const [altPhone, setAltPhone] = useState(cmsConfig?.altPhone || BUSINESS_CONFIG.ALT_PHONE);
  const [email, setEmail] = useState(cmsConfig?.email || BUSINESS_CONFIG.EMAIL);
  const [facilityAddress, setFacilityAddress] = useState(cmsConfig?.facilityAddress || BUSINESS_CONFIG.FACILITY_ADDRESS);
  const [facilityStatement, setFacilityStatement] = useState(cmsConfig?.facilityStatement || BUSINESS_CONFIG.FACILITY_STATEMENT);
  const [fssaiLicense, setFssaiLicense] = useState(cmsConfig?.fssaiLicense || BUSINESS_CONFIG.FSSAI_LICENSE);
  const [gstin, setGstin] = useState(cmsConfig?.gstin || BUSINESS_CONFIG.GSTIN);
  const [blrNotice, setBlrNotice] = useState(cmsConfig?.bangaloreDeliveryNotice || "");
  const [delhiveryWarehouse, setDelhiveryWarehouse] = useState(cmsConfig?.delhiveryWarehouse || "MANOPAVANA_PEENYA");
  const [delhiveryOriginPincode, setDelhiveryOriginPincode] = useState(cmsConfig?.delhiveryOriginPincode || "560058");

  // Tab 3: Live Selling Prices, MRPs & Stock Controls
  const [prices, setPrices] = useState(
    cmsConfig?.prices || {
      groundnut1L: 399,
      groundnut500ml: 189,
      coconut1L: 499,
      coconut500ml: 269,
      sesame1L: 499,
      sesame500ml: 269,
      combo3L: 1299,
      combo1_5L: 699,
    }
  );

  const [mrp, setMrp] = useState(
    cmsConfig?.mrp || {
      groundnut1L: 399,
      groundnut500ml: 189,
      coconut1L: 499,
      coconut500ml: 269,
      sesame1L: 499,
      sesame500ml: 269,
      combo3L: 1560,
      combo1_5L: 840,
    }
  );

  const [stock, setStock] = useState(
    cmsConfig?.stock || {
      groundnut1L: true,
      groundnut500ml: true,
      coconut1L: true,
      coconut500ml: true,
      sesame1L: true,
      sesame500ml: true,
      combo3L: true,
      combo1_5L: true,
    }
  );

  // Tab 4: Deep Product Page Information (A to Z)
  const [selectedOilProduct, setSelectedOilProduct] = useState<"groundnut" | "coconut" | "sesame">("groundnut");

  const [productDetails, setProductDetails] = useState<Record<string, ProductDetailOverride>>(
    (cmsConfig as any)?.productDetails || {
      groundnut: {
        name: "Wood-Pressed Groundnut Oil",
        kannadaName: "ಶುದ್ಧ ಮರದ ಗಾಣದ ಕಡಲೆಕಾಯಿ ಎಣ್ಣೆ",
        subtitle: "100% Pure Mara Chekku • Unrefined & Chemical-Free",
        description: "Cold-pressed from handpicked premium grade groundnuts using traditional Vagai wood presses.",
        shortDescription: "Sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore packaging and distribution facility.",
        fullStory: "Our cold-pressed Groundnut oil is extracted using authentic wooden pestles (Marachekku) operated at under 45°C. No chemicals, solvents, or heating processes are ever used, preserving the natural nutty aroma, rich vitamin E, and natural antioxidants intact.",
        imageUrl: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/label-groundnut.jpg",
        benefits: "Zero cholesterol, Rich in natural Vitamin E, High monounsaturated fats (MUFA), Zero chemical preservatives",
        cookingUses: "Everyday South Indian cooking, deep frying, tadka, dosas, and curries",
        smokePoint: "230°C (High Smoke Point - Ideal for Indian deep frying)",
        extractionMethod: "Traditional Vagai (Albizia Lebbeck) Wood Chekku below 45°C",
        ingredients: "100% Single-Origin Cleaned Groundnut Seeds",
        shelfLife: "9-12 Months (Store in cool, dark place)",
        containerType: "Food-Grade Shatterproof Bottle + Drip-Free Spout",
        fssaiLicense: "Reg. No. 21226008004689",
        nutrition: {
          energy: "862.1 Kcal",
          totalFat: "99.97 gm",
          saturatedFat: "86.95 gm",
          monoUnsaturatedFat: "6.48 gm",
          polyUnsaturatedFat: "1.83 gm",
          transFat: "0.0 gm",
          cholesterol: "0.0 mg",
          protein: "0.0 gm",
        },
        quiz: {
          question: "What tagline is printed right below 'GROUNDNUT OIL' on the front label?",
          correctAnswer: "Perfect for Everyday Indian Cooking",
        },
      },
      coconut: {
        name: "Wood-Pressed Coconut Oil",
        kannadaName: "ಶುದ್ಧ ಮರದ ಗಾಣದ ತೆಂಗಿನ ಎಣ್ಣೆ",
        subtitle: "Sun-Dried Copra • Raw, Fragrant & Unbleached",
        description: "Extracted from sulfur-free sun-dried coconut copra for authentic coastal flavor and wellness.",
        shortDescription: "Sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore facility with wholesome MCTs.",
        fullStory: "Crafted exclusively from sulfur-free, naturally sun-dried copra sourced from coastal groves. Slowly pressed in wooden churns without artificial bleaching, refining, or deodorizing to preserve pure lauric acid and antimicrobial medium-chain triglycerides (MCTs).",
        imageUrl: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/label-coconut.jpg",
        benefits: "Contains over 50% Lauric Acid, Natural MCTs for metabolic energy, Excellent for skin and hair health, 100% unbleached",
        cookingUses: "Kerala & coastal curries, roasting, baking, oil pulling, and hair/scalp massage",
        smokePoint: "177°C (Medium Smoke Point - Ideal for sauteing and raw consumption)",
        extractionMethod: "Slow Wooden Churn Expeller (Marachekku) without heat treatment",
        ingredients: "100% Naturally Sun-Dried Coconut Copra (Sulfur-Free)",
        shelfLife: "9-12 Months",
        containerType: "Food-Grade Shatterproof Bottle + Drip-Free Spout",
        fssaiLicense: "Reg. No. 21226008004689",
        nutrition: {
          energy: "862.1 Kcal",
          totalFat: "99.97 gm",
          saturatedFat: "86.95 gm",
          monoUnsaturatedFat: "6.48 gm",
          polyUnsaturatedFat: "1.83 gm",
          transFat: "0.0 gm",
          cholesterol: "0.0 mg",
          protein: "0.0 gm",
        },
        quiz: {
          question: "What tagline is printed right below 'COCONUT OIL' on the front label?",
          correctAnswer: "Made for Authentic Flavours",
        },
      },
      sesame: {
        name: "Wood-Pressed Sesame (Gingelly) Oil",
        kannadaName: "ಶುದ್ಧ ಮರದ ಗಾಣದ ಎಳ್ಳೆಣ್ಣೆ",
        subtitle: "Traditional Palm Jaggery Infused • Nutrient Dense",
        description: "Cold-pressed with organic palm jaggery to eliminate natural bitterness and impart a rich amber sheen.",
        shortDescription: "Sourced directly from traditional wood-press artisans, settled naturally, and ground with pure palm jaggery for traditional nutty warmth.",
        fullStory: "Our traditional Gingelly oil adheres to timeless artisanal craftsmanship: selected black sesame seeds are pressed in heavy wooden chekkus alongside pure palm jaggery. The natural jaggery balances the seed's astringency while infusing essential minerals, iron, and sesame lignans.",
        imageUrl: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/label-sesame.jpg",
        benefits: "Rich in Sesamol and Sesamolin antioxidants, Natural source of calcium and zinc, Promotes cardiovascular health",
        cookingUses: "Authentic idli podi mixing, sambar & rasam tadka, authentic pickles, and traditional oil massages",
        smokePoint: "210°C (High Smoke Point - Ideal for tempering and simmering)",
        extractionMethod: "Traditional Marachekku with Palm Jaggery Binder",
        ingredients: "90% Black Sesame Seeds, 10% Traditional Palm Jaggery",
        shelfLife: "9-12 Months",
        containerType: "Food-Grade Shatterproof Bottle + Drip-Free Spout",
        fssaiLicense: "Reg. No. 21226008004689",
        nutrition: {
          energy: "884.3 Kcal",
          totalFat: "99.96 gm",
          saturatedFat: "13.9 gm",
          monoUnsaturatedFat: "42.11 gm",
          polyUnsaturatedFat: "43.35 gm",
          transFat: "0.0 gm",
          cholesterol: "0.0 mg",
          protein: "0.0 gm",
        },
        quiz: {
          question: "What tagline is printed right below 'SESAME OIL' on the front label?",
          correctAnswer: "The Traditional Choice for Rich Flavour",
        },
      },
    }
  );

  // Tab 5: Combo Products
  const [selectedComboId, setSelectedComboId] = useState<"combo-3l" | "combo-1.5l">("combo-3l");
  const [comboDetails, setComboDetails] = useState<Record<string, ComboDetailOverride>>(
    (cmsConfig as any)?.comboDetails || {
      "combo-3l": {
        name: "Complete 3-Oil Essential Box (3L Trio)",
        heading: "Complete Kitchen 3-Oil Essential Box (3 Litres)",
        volumeLabel: "3 Litres (1L Groundnut + 1L Coconut + 1L Sesame)",
        description: "Equip your kitchen with South India's 3 core traditional wood-pressed oils. Sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore packaging and distribution facility.",
        image: MEDIA_ASSETS.comboBanner,
        bullets: "Complete monthly cooking coverage for your family, Free Doorstep Delivery included across Bangalore (24–72 hrs), Raw artisanal extraction with zero chemical additives or solvents, Includes verified 10% repeat order QR codes on all 3 bottles",
        regularPrice: 1299,
        loyaltyPrice: 1169,
        mrp: 1560,
        inStock: true,
      },
      "combo-1.5l": {
        name: "Complete 3-Oil Starter Box (1.5L Trio)",
        heading: "Complete Kitchen 3-Oil Starter Box (1.5 Litres)",
        volumeLabel: "1.5 Litres (500ml Groundnut + 500ml Coconut + 500ml Sesame)",
        description: "Compact kitchen starter box containing 500ml Groundnut Oil, 500ml Coconut Oil, and 500ml Sesame Oil, packed fresh at our Bangalore packaging and distribution facility.",
        image: MEDIA_ASSETS.comboBanner,
        bullets: "Complete monthly cooking coverage for your family, Free Doorstep Delivery included across Bangalore (24–72 hrs), Raw artisanal extraction with zero chemical additives or solvents, Includes verified 10% repeat order QR codes on all 3 bottles",
        regularPrice: 699,
        loyaltyPrice: 629,
        mrp: 840,
        inStock: true,
      },
    }
  );

  // Tab 6: Craftsmanship & Comparison Matrix ("Why Marachekku?")
  const [craftsmanship, setCraftsmanship] = useState<CraftsmanshipConfig>(
    cmsConfig?.craftsmanship || {
      tag: "ARTISANAL STANDARDS",
      title: "Wood-Pressed vs Commercial Refined Oils",
      subtitle: "Understand the biological difference between traditional Marachekku extraction and solvent refining.",
      disclaimer: BENCHMARK_DISCLAIMER,
      comparisons: BENCHMARK_COMPARISONS,
    }
  );

  // Tab 7: Packaging & 360 Video
  const [packagingFeatures, setPackagingFeatures] = useState<PackagingFeaturesConfig>(
    cmsConfig?.packagingFeatures || PACKAGING_FEATURES
  );

  // Tab 8: FAQs
  const [faqs, setFaqs] = useState<FAQItem[]>(
    cmsConfig?.faqs && cmsConfig.faqs.length > 0 ? cmsConfig.faqs : FAQS
  );

  // Tab 9: Legal Policies (A to Z)
  const [policies, setPolicies] = useState(
    (cmsConfig as any)?.policies || {
      terms: { title: LEGAL_POLICIES.terms.title, content: LEGAL_POLICIES.terms.content },
      shipping: { title: LEGAL_POLICIES.shipping.title, content: LEGAL_POLICIES.shipping.content },
      returns: { title: LEGAL_POLICIES.returns.title, content: LEGAL_POLICIES.returns.content },
      privacy: { title: LEGAL_POLICIES.privacy.title, content: LEGAL_POLICIES.privacy.content },
    }
  );

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedHighlights = highlightsInput
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);

    updateCMSConfig((prev) => ({
      ...prev,
      brandName,
      announcementTicker: ticker,
      brandTagline: tagline,
      heroEyebrow: eyebrow,
      heroHeadline: headline,
      heroSubhead: subhead,
      heroCtaPrimaryText: ctaPrimaryText,
      brandLogoUrl: logoUrl,
      chekkuVideoUrl: videoUrl,
      heroFallbackImage: fallbackImageUrl,
      ambientAudioTrack,
      comboBannerImage,
      heroHighlights: parsedHighlights.length > 0 ? parsedHighlights : prev.heroHighlights,
      freeShippingThreshold: Number(threshold),
      standardShippingFee: Number(stdFee),
      founderName,
      primaryPhone,
      altPhone,
      email,
      facilityAddress,
      facilityStatement,
      fssaiLicense,
      gstin,
      bangaloreDeliveryNotice: blrNotice,
      delhiveryWarehouse,
      delhiveryOriginPincode,
      prices,
      mrp,
      stock,
      productDetails,
      comboDetails,
      craftsmanship,
      packagingFeatures,
      faqs,
      policies,
    }));
    showToast("🎉 Storefront, deep product catalogs, combos, media & policies saved live to Firestore!");
  };

  const updateProductField = (id: string, field: string, value: any) => {
    setProductDetails((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const updateProductNutrition = (id: string, field: string, value: string) => {
    setProductDetails((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        nutrition: {
          ...(prev[id]?.nutrition || {}),
          [field]: value,
        },
      },
    }));
  };

  const updateComboField = (id: string, field: string, value: any) => {
    setComboDetails((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const updatePrice = (key: keyof typeof prices, value: number) => {
    setPrices((prev) => ({ ...prev, [key]: value }));
  };

  const updateMrp = (key: keyof typeof mrp, value: number) => {
    setMrp((prev) => ({ ...prev, [key]: value }));
  };

  const toggleStock = (key: keyof typeof stock) => {
    setStock((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updatePolicyItem = (key: string, field: "title" | "content", value: string) => {
    setPolicies((prev: any) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const updateComparisonRow = (idx: number, field: "metric" | "commercial" | "manopavana", value: string) => {
    const list = [...(craftsmanship.comparisons || BENCHMARK_COMPARISONS)];
    list[idx] = { ...list[idx], [field]: value };
    setCraftsmanship((prev) => ({ ...prev, comparisons: list }));
  };

  const updatePackagingItem = (idx: number, field: "title" | "description", value: string) => {
    const list = [...(packagingFeatures.items || PACKAGING_FEATURES.items)];
    list[idx] = { ...list[idx], [field]: value };
    setPackagingFeatures((prev) => ({ ...prev, items: list }));
  };

  const updateFaqItem = (idx: number, field: "question" | "answer", value: string) => {
    const nextFaqs = [...faqs];
    nextFaqs[idx] = { ...nextFaqs[idx], [field]: value };
    setFaqs(nextFaqs);
  };

  const addNewFaq = () => {
    setFaqs((prev) => [
      ...prev,
      {
        question: "New Question Title",
        answer: "Provide clear explanation here.",
        category: "quality",
      },
    ]);
  };

  const deleteFaq = (idx: number) => {
    setFaqs((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div
      className={`rounded-2xl border p-6 shadow-sm space-y-5 ${
        isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#E08F35]" />
          <div>
            <h2 className="text-base font-bold font-serif">Master Storefront CMS (Every Text & Image)</h2>
            <p className="text-[11px] text-[#6A523E] dark:text-[#C4B29E]">
              Edit all content, products, combos, media & prices with live ₹0 Firestore synchronization
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            settings/store_config
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2 border-stone-200 dark:border-stone-800">
        {[
          { key: "orders", label: `Live Orders (${adminOrders.length})` },
          { key: "brand", label: "Brand, Hero & Media" },
          { key: "products", label: "Product Catalog (A-Z)" },
          { key: "combos", label: "Value Combos (A-Z)" },
          { key: "pricing_stock", label: "Prices, MRP & Stock" },
          { key: "craftsmanship", label: "Craftsmanship & Table" },
          { key: "packaging", label: "Packaging & 360 Video" },
          { key: "faqs", label: `FAQs (${faqs.length})` },
          { key: "facility", label: "Facility & Legal IDs" },
          { key: "policies", label: "Customer Policies" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === tab.key
                ? "bg-[#5E3210] text-white shadow-sm"
                : isDark
                ? "bg-[#150D07] text-[#D8C8B8] hover:bg-[#24160E]"
                : "bg-stone-100 text-[#5C4230] hover:bg-stone-200"
            }`}
          >
            {tab.key === "orders" && (
              <span className={`w-2 h-2 rounded-full ${adminOrders.length > 0 ? "bg-emerald-400 animate-pulse" : "bg-stone-400"}`} />
            )}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSaveAll} className="space-y-5 text-xs">
        {/* TAB 1: LIVE ORDERS */}
        {activeTab === "orders" && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-black/20 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-[#1F120A] dark:text-[#FAF4EA] flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#E08F35]" />
                    <span>Real-Time Customer Orders & Dispatch Tracker</span>
                  </h3>
                  <p className="text-[11px] text-[#6A523E] dark:text-[#C4B29E]">
                    Synced live directly with Firestore `orders` collection
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setIsRefreshingOrders(true);
                    await refreshAdminOrders();
                    setIsRefreshingOrders(false);
                  }}
                  disabled={isRefreshingOrders}
                  className="px-3.5 py-1.5 rounded-xl bg-[#E08F35] text-[#140D09] hover:bg-amber-400 font-bold text-xs flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingOrders ? "animate-spin" : ""}`} />
                  <span>Refresh Orders</span>
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search by Order ID, customer phone, name, pincode..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs"
                  />
                </div>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-semibold"
                >
                  <option value="all">All Statuses ({adminOrders.length})</option>
                  <option value="Placed">Placed</option>
                  <option value="Payment Incomplete">Payment Incomplete</option>
                  <option value="Packed">Packed</option>
                  <option value="Dispatched">Dispatched</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Orders Feed */}
            {adminOrders.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-stone-300 dark:border-stone-800 space-y-2">
                <Clock className="w-8 h-8 text-stone-400 mx-auto animate-pulse" />
                <p className="font-bold text-sm">No orders recorded in Firestore yet</p>
                <p className="text-stone-500 text-xs">Customer orders will appear here automatically in real time.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {adminOrders
                  .filter((o) => {
                    if (orderStatusFilter !== "all" && o.orderStatus !== orderStatusFilter) return false;
                    if (!orderSearch.trim()) return true;
                    const q = orderSearch.toLowerCase();
                    const ref = (o.orderRef || o.id || "").toLowerCase();
                    const phone = (o.shippingAddress?.phone || o.customerPhone || "").toLowerCase();
                    const name = (o.shippingAddress?.fullName || "").toLowerCase();
                    const pin = (o.shippingAddress?.pincode || "").toLowerCase();
                    return ref.includes(q) || phone.includes(q) || name.includes(q) || pin.includes(q);
                  })
                  .map((o) => {
                    const cleanPhone = (o.shippingAddress?.phone || o.customerPhone || "").replace(/\D/g, "").slice(-10);
                    return (
                      <div
                        key={o.orderRef || o.id}
                        className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-black/20 space-y-3 hover:border-[#D49A37] transition-all shadow-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2 border-stone-100 dark:border-stone-800">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-xs">
                              #{o.orderRef || o.id}
                            </span>
                            <span className="text-[10px] text-stone-400">{o.date}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                o.orderStatus === "Delivered"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                                  : o.orderStatus === "Cancelled"
                                  ? "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                              }`}
                            >
                              {o.orderStatus}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#1F120A] dark:text-[#FAF4EA]">
                              ₹{o.total}
                            </span>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                              {o.paymentMethod || o.paymentMode || "COD"}
                            </span>
                          </div>
                        </div>

                        {/* Customer & Address Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="font-bold flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-amber-600" />
                              <span>{o.shippingAddress?.fullName || "Valued Customer"}</span>
                            </div>
                            <div className="text-stone-500 flex items-center gap-2">
                              <span>📱 {cleanPhone || "N/A"}</span>
                              {cleanPhone && (
                                <a
                                  href={`https://wa.me/91${cleanPhone}?text=Hi%20${encodeURIComponent(
                                    o.shippingAddress?.fullName || "there"
                                  )},%20update%20regarding%20your%20MANOPAVANA%20Order%20%23${o.orderRef}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  <span>WhatsApp</span>
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="font-bold flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-amber-600" />
                              <span>
                                {o.shippingAddress?.city || "Bengaluru"} ({o.shippingAddress?.pincode || "560058"})
                              </span>
                            </div>
                            <p className="text-stone-500 truncate">{o.shippingAddress?.addressLine1}</p>
                          </div>
                        </div>

                        {/* Line Items */}
                        <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-900/40 text-[11px] space-y-1">
                          <span className="font-bold text-stone-600 dark:text-stone-400">Order Items:</span>
                          <div className="space-y-0.5">
                            {o.items?.map((item, i) => (
                              <div key={i} className="flex justify-between">
                                <span>
                                  {item.title} ({item.variant}) × {item.quantity}
                                </span>
                                <span className="font-semibold">₹{item.price * item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Inline Status Updater */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-100 dark:border-stone-800">
                          <span className="text-[11px] text-stone-500">Update Order Status:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {(["Placed", "Packed", "Dispatched", "Delivered", "Cancelled"] as OrderStatus[]).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => updateOrderStatus(o.orderRef, st)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                  o.orderStatus === st
                                    ? "bg-[#5E3210] text-white shadow-xs"
                                    : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200"
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BRAND, HERO & MEDIA */}
        {activeTab === "brand" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">Brand Name</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-serif"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Brand Tagline</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Top Announcement Bar Ticker</label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">Hero Eyebrow / Tag</label>
                <input
                  type="text"
                  value={eyebrow}
                  onChange={(e) => setEyebrow(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Primary CTA Button Text</label>
                <input
                  type="text"
                  value={ctaPrimaryText}
                  onChange={(e) => setCtaPrimaryText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Hero Main Headline</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-serif font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Hero Subhead / Narrative</label>
              <textarea
                rows={3}
                value={subhead}
                onChange={(e) => setSubhead(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent leading-relaxed"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Hero 3 Highlights (Comma-separated)</label>
              <input
                type="text"
                value={highlightsInput}
                onChange={(e) => setHighlightsInput(e.target.value)}
                placeholder="Marachekku Pressing, Natural Sedimentation, Direct Bangalore Delivery"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
              />
            </div>

            {/* Media URLs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block font-semibold mb-1">Brand Logo Image URL</label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-[11px]"
                />
                {logoUrl && (
                  <div className="mt-2 p-2 rounded-lg bg-stone-100 dark:bg-stone-900 border flex items-center gap-3">
                    <img src={logoUrl} alt="Logo Preview" className="w-10 h-10 object-contain bg-white rounded p-1" />
                    <span className="text-[10px] text-stone-500">Live Logo Preview</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1">Hero Video URL (MP4)</label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-[11px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">Hero Fallback Image URL</label>
                <input
                  type="text"
                  value={fallbackImageUrl}
                  onChange={(e) => setFallbackImageUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-[11px]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Artisanal Ambient Audio Track (MP3 URL)</label>
                <input
                  type="text"
                  value={ambientAudioTrack}
                  onChange={(e) => setAmbientAudioTrack(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-[11px]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Combos Section Family Banner Image URL</label>
              <input
                type="text"
                value={comboBannerImage}
                onChange={(e) => setComboBannerImage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-[11px]"
              />
            </div>

            {/* Delivery Thresholds */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-200 dark:border-stone-800">
              <div>
                <label className="block font-semibold mb-1">Free Delivery Threshold (₹)</label>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Standard Shipping Fee (₹)</label>
                <input
                  type="number"
                  value={stdFee}
                  onChange={(e) => setStdFee(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-bold"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PRODUCT CATALOG (A-Z) */}
        {activeTab === "products" && (
          <div className="space-y-4 animate-fade-in">
            {/* Oil Selector */}
            <div className="flex gap-2 border-b pb-2">
              {[
                { id: "groundnut", label: "Groundnut Oil" },
                { id: "coconut", label: "Coconut Oil" },
                { id: "sesame", label: "Sesame Oil" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedOilProduct(p.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                    selectedOilProduct === p.id
                      ? "bg-[#5E3210] text-white"
                      : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Product Fields */}
            {(() => {
              const current = productDetails[selectedOilProduct] || {};
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold mb-1">Product Title (English)</label>
                      <input
                        type="text"
                        value={current.name || ""}
                        onChange={(e) => updateProductField(selectedOilProduct, "name", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-serif font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Product Title (Kannada)</label>
                      <input
                        type="text"
                        value={current.kannadaName || ""}
                        onChange={(e) => updateProductField(selectedOilProduct, "kannadaName", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-serif"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold mb-1">Subtitle / Badge</label>
                      <input
                        type="text"
                        value={current.subtitle || ""}
                        onChange={(e) => updateProductField(selectedOilProduct, "subtitle", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Smoke Point & Technique</label>
                      <input
                        type="text"
                        value={current.smokePoint || ""}
                        onChange={(e) => updateProductField(selectedOilProduct, "smokePoint", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Short Description (Catalog Card)</label>
                    <textarea
                      rows={2}
                      value={current.shortDescription || current.description || ""}
                      onChange={(e) => updateProductField(selectedOilProduct, "shortDescription", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Full Story & Artisanal Process</label>
                    <textarea
                      rows={4}
                      value={current.fullStory || ""}
                      onChange={(e) => updateProductField(selectedOilProduct, "fullStory", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold mb-1">Key Health Benefits</label>
                      <textarea
                        rows={2}
                        value={typeof current.benefits === "string" ? current.benefits : (current.benefits || []).join(", ")}
                        onChange={(e) => updateProductField(selectedOilProduct, "benefits", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent leading-relaxed"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Cooking & Culinary Pairings</label>
                      <textarea
                        rows={2}
                        value={current.cookingUses || ""}
                        onChange={(e) => updateProductField(selectedOilProduct, "cookingUses", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold mb-1">Extraction Method</label>
                      <input
                        type="text"
                        value={current.extractionMethod || ""}
                        onChange={(e) => updateProductField(selectedOilProduct, "extractionMethod", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Ingredients</label>
                      <input
                        type="text"
                        value={current.ingredients || ""}
                        onChange={(e) => updateProductField(selectedOilProduct, "ingredients", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Shelf Life</label>
                      <input
                        type="text"
                        value={current.shelfLife || ""}
                        onChange={(e) => updateProductField(selectedOilProduct, "shelfLife", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-[11px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Primary Product / Label Image URL</label>
                    <input
                      type="text"
                      value={current.imageUrl || current.labelImageUrl || ""}
                      onChange={(e) => updateProductField(selectedOilProduct, "imageUrl", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-[11px]"
                    />
                  </div>

                  {/* Nutritional Facts Mini-Grid */}
                  <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-black/20 space-y-2">
                    <span className="font-bold text-amber-700 dark:text-amber-400 block border-b pb-1">
                      Nutritional Values per 100g
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-500">Energy</label>
                        <input
                          type="text"
                          value={current.nutrition?.energy || "862.1 Kcal"}
                          onChange={(e) => updateProductNutrition(selectedOilProduct, "energy", e.target.value)}
                          className="w-full px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-500">Total Fat</label>
                        <input
                          type="text"
                          value={current.nutrition?.totalFat || "99.97 gm"}
                          onChange={(e) => updateProductNutrition(selectedOilProduct, "totalFat", e.target.value)}
                          className="w-full px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-500">Saturated Fat</label>
                        <input
                          type="text"
                          value={current.nutrition?.saturatedFat || "86.95 gm"}
                          onChange={(e) => updateProductNutrition(selectedOilProduct, "saturatedFat", e.target.value)}
                          className="w-full px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-500">MUFA</label>
                        <input
                          type="text"
                          value={current.nutrition?.monoUnsaturatedFat || "6.48 gm"}
                          onChange={(e) => updateProductNutrition(selectedOilProduct, "monoUnsaturatedFat", e.target.value)}
                          className="w-full px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 4: VALUE COMBOS (A-Z) */}
        {activeTab === "combos" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex gap-2 border-b pb-2">
              {[
                { id: "combo-3l", label: "3L Trio Essential Box" },
                { id: "combo-1.5l", label: "1.5L Starter Kitchen Box" },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedComboId(c.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                    selectedComboId === c.id
                      ? "bg-[#5E3210] text-white"
                      : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {(() => {
              const current = comboDetails[selectedComboId] || {};
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold mb-1">Combo Display Title</label>
                      <input
                        type="text"
                        value={current.name || ""}
                        onChange={(e) => updateComboField(selectedComboId, "name", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-serif font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Section Card Heading</label>
                      <input
                        type="text"
                        value={current.heading || ""}
                        onChange={(e) => updateComboField(selectedComboId, "heading", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Volume Description Label</label>
                    <input
                      type="text"
                      value={current.volumeLabel || ""}
                      onChange={(e) => updateComboField(selectedComboId, "volumeLabel", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Combo Description</label>
                    <textarea
                      rows={3}
                      value={current.description || ""}
                      onChange={(e) => updateComboField(selectedComboId, "description", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Value Bullets (Comma-separated)</label>
                    <textarea
                      rows={3}
                      value={
                        typeof current.bullets === "string"
                          ? current.bullets
                          : Array.isArray(current.bullets)
                          ? current.bullets.join(", ")
                          : ""
                      }
                      onChange={(e) => updateComboField(selectedComboId, "bullets", e.target.value)}
                      placeholder="Free delivery included, 10% repeat reorder QR, etc."
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Combo Banner Image URL</label>
                    <input
                      type="text"
                      value={current.image || ""}
                      onChange={(e) => updateComboField(selectedComboId, "image", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-[11px]"
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 5: PRICING, MRPS & INVENTORY */}
        {activeTab === "pricing_stock" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Groundnut Oil */}
              <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-black/20 space-y-3">
                <span className="font-bold text-amber-700 dark:text-amber-400 block border-b pb-1">
                  Groundnut Oil Rates & Stock
                </span>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-500">1L Price (₹)</label>
                      <input
                        type="number"
                        value={prices.groundnut1L}
                        onChange={(e) => updatePrice("groundnut1L", Number(e.target.value))}
                        className="w-20 px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-500">1L MRP (₹)</label>
                      <input
                        type="number"
                        value={mrp.groundnut1L || prices.groundnut1L}
                        onChange={(e) => updateMrp("groundnut1L", Number(e.target.value))}
                        className="w-20 px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-stone-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleStock("groundnut1L")}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold mt-3 ${
                        stock.groundnut1L ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                      }`}
                    >
                      {stock.groundnut1L ? "In Stock" : "Out"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100 dark:border-stone-800">
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-500">500ml Price (₹)</label>
                      <input
                        type="number"
                        value={prices.groundnut500ml}
                        onChange={(e) => updatePrice("groundnut500ml", Number(e.target.value))}
                        className="w-20 px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-500">500ml MRP (₹)</label>
                      <input
                        type="number"
                        value={mrp.groundnut500ml || prices.groundnut500ml}
                        onChange={(e) => updateMrp("groundnut500ml", Number(e.target.value))}
                        className="w-20 px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-stone-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleStock("groundnut500ml")}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold mt-3 ${
                        stock.groundnut500ml ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                      }`}
                    >
                      {stock.groundnut500ml ? "In Stock" : "Out"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Coconut Oil */}
              <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-black/20 space-y-3">
                <span className="font-bold text-amber-700 dark:text-amber-400 block border-b pb-1">
                  Coconut Oil Rates & Stock
                </span>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-500">1L Price (₹)</label>
                      <input
                        type="number"
                        value={prices.coconut1L}
                        onChange={(e) => updatePrice("coconut1L", Number(e.target.value))}
                        className="w-20 px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-500">1L MRP (₹)</label>
                      <input
                        type="number"
                        value={mrp.coconut1L || prices.coconut1L}
                        onChange={(e) => updateMrp("coconut1L", Number(e.target.value))}
                        className="w-20 px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-stone-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleStock("coconut1L")}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold mt-3 ${
                        stock.coconut1L ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                      }`}
                    >
                      {stock.coconut1L ? "In Stock" : "Out"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100 dark:border-stone-800">
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-500">500ml Price (₹)</label>
                      <input
                        type="number"
                        value={prices.coconut500ml}
                        onChange={(e) => updatePrice("coconut500ml", Number(e.target.value))}
                        className="w-20 px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-500">500ml MRP (₹)</label>
                      <input
                        type="number"
                        value={mrp.coconut500ml || prices.coconut500ml}
                        onChange={(e) => updateMrp("coconut500ml", Number(e.target.value))}
                        className="w-20 px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-stone-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleStock("coconut500ml")}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold mt-3 ${
                        stock.coconut500ml ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                      }`}
                    >
                      {stock.coconut500ml ? "In Stock" : "Out"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sesame Oil */}
              <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-black/20 space-y-3">
                <span className="font-bold text-amber-700 dark:text-amber-400 block border-b pb-1">
                  Sesame Oil Rates & Stock
                </span>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-500">1L Price (₹)</label>
                      <input
                        type="number"
                        value={prices.sesame1L}
                        onChange={(e) => updatePrice("sesame1L", Number(e.target.value))}
                        className="w-20 px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-500">1L MRP (₹)</label>
                      <input
                        type="number"
                        value={mrp.sesame1L || prices.sesame1L}
                        onChange={(e) => updateMrp("sesame1L", Number(e.target.value))}
                        className="w-20 px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-stone-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleStock("sesame1L")}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold mt-3 ${
                        stock.sesame1L ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                      }`}
                    >
                      {stock.sesame1L ? "In Stock" : "Out"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100 dark:border-stone-800">
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-500">500ml Price (₹)</label>
                      <input
                        type="number"
                        value={prices.sesame500ml}
                        onChange={(e) => updatePrice("sesame500ml", Number(e.target.value))}
                        className="w-20 px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-500">500ml MRP (₹)</label>
                      <input
                        type="number"
                        value={mrp.sesame500ml || prices.sesame500ml}
                        onChange={(e) => updateMrp("sesame500ml", Number(e.target.value))}
                        className="w-20 px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-stone-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleStock("sesame500ml")}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold mt-3 ${
                        stock.sesame500ml ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                      }`}
                    >
                      {stock.sesame500ml ? "In Stock" : "Out"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Combos Pricing Row */}
            <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-black/20 space-y-3">
              <span className="font-bold text-amber-700 dark:text-amber-400 block border-b pb-1">
                Value Combos Rates & Stock
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-500">3L Trio Price (₹)</label>
                    <input
                      type="number"
                      value={prices.combo3L}
                      onChange={(e) => updatePrice("combo3L", Number(e.target.value))}
                      className="w-24 px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-500">3L Trio MRP (₹)</label>
                    <input
                      type="number"
                      value={mrp.combo3L || 1560}
                      onChange={(e) => updateMrp("combo3L", Number(e.target.value))}
                      className="w-24 px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-stone-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStock("combo3L")}
                    className={`px-3 py-1.5 rounded text-[10px] font-bold mt-3 ${
                      stock.combo3L ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    }`}
                  >
                    {stock.combo3L ? "In Stock" : "Out of Stock"}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-500">1.5L Trio Price (₹)</label>
                    <input
                      type="number"
                      value={prices.combo1_5L}
                      onChange={(e) => updatePrice("combo1_5L", Number(e.target.value))}
                      className="w-24 px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-500">1.5L Trio MRP (₹)</label>
                    <input
                      type="number"
                      value={mrp.combo1_5L || 840}
                      onChange={(e) => updateMrp("combo1_5L", Number(e.target.value))}
                      className="w-24 px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-stone-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStock("combo1_5L")}
                    className={`px-3 py-1.5 rounded text-[10px] font-bold mt-3 ${
                      stock.combo1_5L ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    }`}
                  >
                    {stock.combo1_5L ? "In Stock" : "Out of Stock"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: CRAFTSMANSHIP & COMPARISON TABLE */}
        {activeTab === "craftsmanship" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">Section Tag</label>
                <input
                  type="text"
                  value={craftsmanship.tag || "ARTISANAL STANDARDS"}
                  onChange={(e) => setCraftsmanship((prev) => ({ ...prev, tag: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Section Title</label>
                <input
                  type="text"
                  value={craftsmanship.title || "Wood-Pressed vs Commercial Refined Oils"}
                  onChange={(e) => setCraftsmanship((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-serif font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Section Subtitle</label>
              <input
                type="text"
                value={craftsmanship.subtitle || ""}
                onChange={(e) => setCraftsmanship((prev) => ({ ...prev, subtitle: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Bottom Disclaimer Note</label>
              <textarea
                rows={2}
                value={craftsmanship.disclaimer || ""}
                onChange={(e) => setCraftsmanship((prev) => ({ ...prev, disclaimer: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent leading-relaxed"
              />
            </div>

            <div className="space-y-3 pt-2">
              <span className="font-bold text-amber-700 dark:text-amber-400 block border-b pb-1">
                5 Comparison Matrix Rows (Marachekku vs Industrial)
              </span>
              {(craftsmanship.comparisons || BENCHMARK_COMPARISONS).map((row, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2 bg-stone-50/50 dark:bg-black/20">
                  <div className="font-bold text-[11px] text-amber-800 dark:text-amber-400">
                    Row {idx + 1}: {row.metric}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-stone-500">Metric Name</label>
                      <input
                        type="text"
                        value={row.metric}
                        onChange={(e) => updateComparisonRow(idx, "metric", e.target.value)}
                        className="w-full px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-500">Commercial Expeller Drawback</label>
                      <input
                        type="text"
                        value={row.commercial}
                        onChange={(e) => updateComparisonRow(idx, "commercial", e.target.value)}
                        className="w-full px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-500">MANOPAVANA Pure Advantage</label>
                      <input
                        type="text"
                        value={row.manopavana}
                        onChange={(e) => updateComparisonRow(idx, "manopavana", e.target.value)}
                        className="w-full px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: PACKAGING & 360 VIDEO */}
        {activeTab === "packaging" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">Packaging Tag</label>
                <input
                  type="text"
                  value={packagingFeatures.tag || PACKAGING_FEATURES.tag}
                  onChange={(e) => setPackagingFeatures((prev) => ({ ...prev, tag: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Section Heading</label>
                <input
                  type="text"
                  value={packagingFeatures.heading || PACKAGING_FEATURES.heading}
                  onChange={(e) => setPackagingFeatures((prev) => ({ ...prev, heading: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-serif font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Section Subhead</label>
              <textarea
                rows={2}
                value={packagingFeatures.subhead || PACKAGING_FEATURES.subhead}
                onChange={(e) => setPackagingFeatures((prev) => ({ ...prev, subhead: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent leading-relaxed"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">360 Rotating Bottle Video URL (MP4)</label>
              <input
                type="text"
                value={packagingFeatures.bottle360Video || MEDIA_ASSETS.bottle360Video}
                onChange={(e) => setPackagingFeatures((prev) => ({ ...prev, bottle360Video: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent text-[11px]"
              />
            </div>

            <div className="space-y-3 pt-2">
              <span className="font-bold text-amber-700 dark:text-amber-400 block border-b pb-1">
                3 Engineering Feature Cards
              </span>
              {(packagingFeatures.items || PACKAGING_FEATURES.items).map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2 bg-stone-50/50 dark:bg-black/20">
                  <span className="font-bold text-xs text-amber-800 dark:text-amber-400">Card 0{idx + 1}</span>
                  <div>
                    <label className="block text-[10px] text-stone-500 mb-0.5">Feature Title</label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updatePackagingItem(idx, "title", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent font-semibold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-500 mb-0.5">Feature Description</label>
                    <textarea
                      rows={2}
                      value={item.description}
                      onChange={(e) => updatePackagingItem(idx, "description", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: FAQS KNOWLEDGE BASE */}
        {activeTab === "faqs" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Frequently Asked Questions ({faqs.length})</h3>
                <p className="text-[11px] text-stone-500">Edit, add, or remove questions displayed on the storefront</p>
              </div>
              <button
                type="button"
                onClick={addNewFaq}
                className="px-3 py-1.5 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question</span>
              </button>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-black/20 space-y-2 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#E08F35]">FAQ #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => deleteFaq(idx)}
                      className="p-1 text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                      title="Delete Question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-500 mb-0.5">Question Title</label>
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => updateFaqItem(idx, "question", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent font-semibold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-500 mb-0.5">Detailed Answer</label>
                    <textarea
                      rows={3}
                      value={faq.answer}
                      onChange={(e) => updateFaqItem(idx, "answer", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 9: FACILITY, TAX IDS & LOGISTICS */}
        {activeTab === "facility" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">Founder & Grievance Officer</label>
                <input
                  type="text"
                  value={founderName}
                  onChange={(e) => setFounderName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Primary Phone (WhatsApp Enabled)</label>
                <input
                  type="text"
                  value={primaryPhone}
                  onChange={(e) => setPrimaryPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">Alternate Phone Number</label>
                <input
                  type="text"
                  value={altPhone}
                  onChange={(e) => setAltPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Official Support Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Packaging Facility Full Address</label>
              <textarea
                rows={2}
                value={facilityAddress}
                onChange={(e) => setFacilityAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent leading-relaxed"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Facility Mission / Assurance Statement</label>
              <textarea
                rows={2}
                value={facilityStatement}
                onChange={(e) => setFacilityStatement(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">FSSAI License Reg. No.</label>
                <input
                  type="text"
                  value={fssaiLicense}
                  onChange={(e) => setFssaiLicense(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">Delhivery Warehouse Name</label>
                <input
                  type="text"
                  value={delhiveryWarehouse}
                  onChange={(e) => setDelhiveryWarehouse(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Delhivery Origin Pincode</label>
                <input
                  type="text"
                  value={delhiveryOriginPincode}
                  onChange={(e) => setDelhiveryOriginPincode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Delivery Dispatch Notice</label>
              <input
                type="text"
                value={blrNotice}
                onChange={(e) => setBlrNotice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
              />
            </div>
          </div>
        )}

        {/* TAB 10: LEGAL POLICIES */}
        {activeTab === "policies" && (
          <div className="space-y-4 animate-fade-in">
            {[
              { key: "terms", label: "Terms & Conditions" },
              { key: "shipping", label: "Shipping & Delivery Policy" },
              { key: "returns", label: "Return & Refund Policy" },
              { key: "privacy", label: "Privacy Policy" },
            ].map((p) => (
              <div
                key={p.key}
                className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2 bg-stone-50/50 dark:bg-black/20"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#E08F35]" />
                  <span className="font-bold text-xs">{p.label}</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-0.5">Policy Modal Heading</label>
                  <input
                    type="text"
                    value={policies[p.key]?.title || ""}
                    onChange={(e) => updatePolicyItem(p.key, "title", e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-0.5">Full Policy Verbatim Text</label>
                  <textarea
                    rows={5}
                    value={policies[p.key]?.content || ""}
                    onChange={(e) => updatePolicyItem(p.key, "content", e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs leading-relaxed"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Master Live Save Button */}
        <div className="pt-3 sticky bottom-4 z-20">
          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-black text-sm shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Save className="w-5 h-5 text-amber-300" />
            <span>Save All Storefront Changes (Live Firestore Sync)</span>
          </button>
        </div>
      </form>
    </div>
  );
};