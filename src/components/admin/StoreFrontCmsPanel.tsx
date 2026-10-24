import React, { useState } from "react";
import {
  Settings,
  Image as ImageIcon,
  Video,
  FileText,
  DollarSign,
  Package,
  Save,
  Sparkles,
  Flame,
  Utensils,
  ShieldCheck,
  Building,
  Phone,
  Mail,
  Truck,
  Volume2,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { BUSINESS_CONFIG, LEGAL_POLICIES } from "../../constants";

export const StorefrontCMSPanel: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const { cmsConfig, updateCMSConfig, showToast } = useStore();

  const [activeTab, setActiveTab] = useState<
    "products" | "combos_packaging" | "pricing_stock" | "brand_hero" | "craftsmanship" | "facility_logistics" | "policies"
  >("products");

  // ==========================================
  // TAB 1: BRAND, HERO, TICKER & AMBIENCE
  // ==========================================
  const [brandName, setBrandName] = useState(cmsConfig?.brandName || BUSINESS_CONFIG.BRAND_NAME);
  const [tagline, setTagline] = useState(cmsConfig?.brandTagline || "Pure by nature, trusted for life");
  const [logoUrl, setLogoUrl] = useState(cmsConfig?.brandLogoUrl || "");
  const [ticker, setTicker] = useState(
    cmsConfig?.announcementTicker ||
      "FREE Doorstep Delivery across India on orders above ₹500 | 100% Marachekku Cold-Pressed"
  );
  const [tickerButtonText, setTickerButtonText] = useState(
    cmsConfig?.tickerButtonText || "Scan Bottle for 10% Off →"
  );

  // Hero Section
  const [heroBadge, setHeroBadge] = useState(cmsConfig?.heroBadge || "Traditional Marachekku Cold-Pressed");
  const [heroHeadline, setHeroHeadline] = useState(cmsConfig?.heroHeadline || BUSINESS_CONFIG.HERO_HEADLINE);
  const [heroSubhead, setHeroSubhead] = useState(cmsConfig?.heroSubhead || BUSINESS_CONFIG.HERO_SUBHEAD);
  const [heroVideoUrl, setHeroVideoUrl] = useState(cmsConfig?.chekkuVideoUrl || "");
  const [heroPrimaryCta, setHeroPrimaryCta] = useState(cmsConfig?.heroPrimaryCta || "Explore Pure Oils");
  const [heroSecondaryCta, setHeroSecondaryCta] = useState(cmsConfig?.heroSecondaryCta || "Verify Bottle QR (10% Off)");

  const [heroHighlight1, setHeroHighlight1] = useState(
    cmsConfig?.heroHighlights?.[0] || "Marachekku Pressing"
  );
  const [heroHighlight2, setHeroHighlight2] = useState(
    cmsConfig?.heroHighlights?.[1] || "Natural Sedimentation"
  );
  const [heroHighlight3, setHeroHighlight3] = useState(
    cmsConfig?.heroHighlights?.[2] || "Direct Bangalore Delivery"
  );

  // Audio Ambience Player
  const [audioTitle, setAudioTitle] = useState(cmsConfig?.audioTitle || "Marada Gaana Beats");
  const [audioSubtitle, setAudioSubtitle] = useState(cmsConfig?.audioSubtitle || "Traditional wood press rhythm");
  const [audioUrl, setAudioUrl] = useState(
    cmsConfig?.audioUrl || "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/marada_gaana_beat.mp3"
  );

  // Delivery thresholds
  const [threshold, setThreshold] = useState(cmsConfig?.freeShippingThreshold ?? 500);
  const [stdFee, setStdFee] = useState(cmsConfig?.standardShippingFee ?? 49);

  // ==========================================
  // TAB 2: CRAFTSMANSHIP & COMPARISON MATRIX
  // ==========================================
  const [craftsmanshipTitle, setCraftsmanshipTitle] = useState(
    cmsConfig?.craftsmanshipTitle || "The Ancient Marachekku Standard"
  );
  const [craftsmanshipSubtitle, setCraftsmanshipSubtitle] = useState(
    cmsConfig?.craftsmanshipSubtitle || "Cold extraction below 45°C vs refined industrial oil extraction"
  );

  const [marachekkuPoints, setMarachekkuPoints] = useState<string[]>(
    cmsConfig?.marachekkuPoints || [
      "Traditional Vagai Wood Pestle",
      "Cold Churned below 45°C",
      "Natural Sunlight Sedimentation",
      "Zero Preservatives or Hexane",
    ]
  );

  const [refinedPoints, setRefinedPoints] = useState<string[]>(
    cmsConfig?.refinedPoints || [
      "High Heat Expellers (>200°C)",
      "Chemical Solvent Extraction (Hexane)",
      "Artificial Bleaching & Deodorizing",
      "Loss of Natural Tocopherols & Phytosterols",
    ]
  );

  // ==========================================
  // TAB 3: LIVE PRICING & STOCK CONTROLS
  // ==========================================
  const [prices, setPrices] = useState(
    cmsConfig?.prices || {
      groundnut1L: 399,
      groundnut500ml: 239,
      coconut1L: 499,
      coconut500ml: 279,
      sesame1L: 499,
      sesame500ml: 279,
      combo3L: 1299,
      combo1_5L: 699,
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

  // ==========================================
  // TAB 4: DEEP PRODUCT PAGES (A to Z + 11 IMAGES)
  // ==========================================
  const [selectedOilProduct, setSelectedOilProduct] = useState<"groundnut" | "coconut" | "sesame">("groundnut");

  const [productDetails, setProductDetails] = useState<
    Record<
      string,
      {
        kannadaName?: string;
        name?: string;
        subtitle?: string;
        description?: string;
        fullStory?: string;
        imageUrl?: string;
        images?: string[];
        benefits?: string;
        cookingUses?: string;
        smokePoint?: string;
        extractionMethod?: string;
        ingredients?: string;
        shelfLife?: string;
        standards?: string;
      }
    >
  >(
    (cmsConfig as any)?.productDetails || {
      groundnut: {
        kannadaName: "ಕಡಲೆಕಾಯಿ ಎಣ್ಣೆ",
        name: "Wood-Pressed Groundnut Oil",
        subtitle: "100% Pure Mara Chekku • Unrefined & Chemical-Free",
        description: "Cold-pressed from handpicked premium grade groundnuts using traditional Vagai wood presses.",
        fullStory:
          "Our cold-pressed Groundnut oil is extracted using authentic wooden pestles (Marachekku) operated at under 45°C. No chemicals, solvents, or heating processes are ever used, preserving the natural nutty aroma, rich vitamin E, and natural antioxidants intact.",
        imageUrl: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/groundnut-2.png",
        images: Array.from({ length: 11 }, (_, i) => `https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/groundnut-${i === 0 ? 2 : i + 1}.png`),
        benefits: "Zero cholesterol, Rich in natural Vitamin E, High monounsaturated fats (MUFA), Zero chemical preservatives",
        cookingUses: "Everyday Indian cooking, deep frying, tadka, dosas, and curries",
        smokePoint: "230°C (High Smoke Point - Ideal for Indian deep frying)",
        extractionMethod: "Traditional Vagai (Albizia Lebbeck) Wood Chekku below 45°C",
        ingredients: "100% Single-Origin Cleaned Groundnut Seeds",
        shelfLife: "9 Months from date of cold-pressing (Store in a cool, dark place)",
        standards: "Cold Settled & Hand Filtered (Meets Agmark & FSSAI Standards)",
      },
      coconut: {
        kannadaName: "ತೆಂಗಿನ ಎಣ್ಣೆ",
        name: "Wood-Pressed Coconut Oil",
        subtitle: "Sun-Dried Copra • Raw, Fragrant & Unbleached",
        description: "Extracted from sulfur-free sun-dried coconut copra for authentic coastal flavor and wellness.",
        fullStory:
          "Crafted exclusively from sulfur-free, naturally sun-dried copra sourced from coastal groves. Slowly pressed in wooden churns without artificial bleaching, refining, or deodorizing to preserve pure lauric acid and antimicrobial medium-chain triglycerides (MCTs).",
        imageUrl: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/coconut-2.png",
        images: Array.from({ length: 11 }, (_, i) => `https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/coconut-${i === 0 ? 2 : i + 1}.png`),
        benefits: "Contains over 50% Lauric Acid, Natural MCTs for metabolic energy, Excellent for skin and hair health, 100% unbleached",
        cookingUses: "Coastal curries, roasting, baking, oil pulling, and hair/scalp massage",
        smokePoint: "177°C (Medium Smoke Point - Ideal for sauteing and raw consumption)",
        extractionMethod: "Slow Wooden Churn Expeller (Marachekku) without heat treatment",
        ingredients: "100% Naturally Sun-Dried Coconut Copra (Sulfur-Free)",
        shelfLife: "12 Months from date of packaging",
        standards: "Unbleached, Sulfur-Free Certified & Cold Churned (Agmark Grade)",
      },
      sesame: {
        kannadaName: "ಎಳ್ಳೆಣ್ಣೆ",
        name: "Wood-Pressed Sesame (Gingelly) Oil",
        subtitle: "Traditional Palm Jaggery Infused • Nutrient Dense",
        description: "Cold-pressed with organic palm jaggery to eliminate natural bitterness and impart a rich amber sheen.",
        fullStory:
          "Our traditional Gingelly oil adheres to timeless artisanal craftsmanship: selected black sesame seeds are pressed in heavy wooden chekkus alongside pure palm jaggery. The natural jaggery balances the seed's astringency while infusing essential minerals, iron, and sesame lignans.",
        imageUrl: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/sesame-2.png",
        images: Array.from({ length: 11 }, (_, i) => `https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/sesame-${i === 0 ? 2 : i + 1}.png`),
        benefits: "Rich in Sesamol and Sesamolin antioxidants, Natural source of calcium and zinc, Promotes cardiovascular health",
        cookingUses: "Authentic idli podi mixing, sambar & rasam tadka, authentic pickles, and traditional oil massages",
        smokePoint: "210°C (High Smoke Point - Ideal for tempering and simmering)",
        extractionMethod: "Traditional Marachekku with Palm Jaggery Binder",
        ingredients: "90% Black Sesame Seeds, 10% Traditional Palm Jaggery",
        shelfLife: "12 Months from date of packaging",
        standards: "Cold Settled & Hand Filtered (Agmark Grade I Standard)",
      },
    }
  );

  // ==========================================
  // TAB 5: COMBOS & PACKAGING HIGHLIGHTS
  // ==========================================
  const [comboDetails, setComboDetails] = useState({
    combo3L: {
      name: cmsConfig?.comboDetails?.combo3L?.name || "Grand Kitchen Trio (3L Bundle)",
      subtitle: cmsConfig?.comboDetails?.combo3L?.subtitle || "1L Groundnut + 1L Coconut + 1L Sesame (Gingelly)",
      imageUrl: cmsConfig?.comboDetails?.combo3L?.imageUrl || "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/trio_3l_bundle.png",
      inclusions: cmsConfig?.comboDetails?.combo3L?.inclusions || "1x 1L Wood-Pressed Groundnut Oil, 1x 1L Wood-Pressed Coconut Oil, 1x 1L Wood-Pressed Sesame Oil",
    },
    combo1_5L: {
      name: cmsConfig?.comboDetails?.combo1_5L?.name || "Taster Trio Bundle (1.5L Bundle)",
      subtitle: cmsConfig?.comboDetails?.combo1_5L?.subtitle || "500ml Groundnut + 500ml Coconut + 500ml Sesame",
      imageUrl: cmsConfig?.comboDetails?.combo1_5L?.imageUrl || "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/trio_1_5l_bundle.png",
      inclusions: cmsConfig?.comboDetails?.combo1_5L?.inclusions || "1x 500ml Wood-Pressed Groundnut Oil, 1x 500ml Wood-Pressed Coconut Oil, 1x 500ml Wood-Pressed Sesame Oil",
    },
  });

  interface PackagingFeature {
  title: string;
  description: string;
}

const [packagingHighlights, setPackagingHighlights] = useState<PackagingFeature[]>(
  cmsConfig?.packagingHighlights || [
    {
      title: "Oil Dispenser Spout",
      description: "Drip-free precision silicone seal designed for clean kitchen counters and measured pouring.",
    },
    {
      title: "Food-Grade Shatterproof PET",
      description: "BPA-free recyclable amber containers protecting virgin oil from UV oxidation and breakage.",
    },
    {
      title: "Induction Foil Seal",
      description: "Airtight tamper-evident heat induction foil locked immediately post-settling at our hub.",
    },
    {
      title: "Eco-Protective Outer Casing",
      description: "Shock-absorbing honeycomb paper cushioned packaging engineered for zero transit damage.",
    },
  ]
);

  // ==========================================
  // TAB 6: FACILITY, GST & DELHIVERY LOGISTICS
  // ==========================================
  const [founderName, setFounderName] = useState(cmsConfig?.founderName || BUSINESS_CONFIG.FOUNDER_NAME);
  const [primaryPhone, setPrimaryPhone] = useState(cmsConfig?.primaryPhone || BUSINESS_CONFIG.PRIMARY_PHONE);
  const [altPhone, setAltPhone] = useState(cmsConfig?.altPhone || BUSINESS_CONFIG.ALT_PHONE);
  const [email, setEmail] = useState(cmsConfig?.email || BUSINESS_CONFIG.EMAIL);
  const [facilityAddress, setFacilityAddress] = useState(cmsConfig?.facilityAddress || BUSINESS_CONFIG.FACILITY_ADDRESS);
  const [fssaiLicense, setFssaiLicense] = useState(cmsConfig?.fssaiLicense || BUSINESS_CONFIG.FSSAI_LICENSE);
  const [gstin, setGstin] = useState(cmsConfig?.gstin || BUSINESS_CONFIG.GSTIN);
  const [delhiveryWarehouse, setDelhiveryWarehouse] = useState(cmsConfig?.delhiveryWarehouse || "MANOPAVANA_PEENYA");
  const [delhiveryOriginPincode, setDelhiveryOriginPincode] = useState(cmsConfig?.delhiveryOriginPincode || "560058");
  const [dispatchNotice, setDispatchNotice] = useState(
    cmsConfig?.bangaloreDeliveryNotice || "Dispatched direct from Peenya 2nd Stage via Delhivery Express across India"
  );

  // ==========================================
  // TAB 7: LEGAL POLICIES
  // ==========================================
  const [policies, setPolicies] = useState(
    (cmsConfig as any)?.policies || {
      terms: { title: LEGAL_POLICIES.terms.title, content: LEGAL_POLICIES.terms.content },
      shipping: { title: LEGAL_POLICIES.shipping.title, content: LEGAL_POLICIES.shipping.content },
      returns: { title: LEGAL_POLICIES.returns.title, content: LEGAL_POLICIES.returns.content },
      privacy: { title: LEGAL_POLICIES.privacy.title, content: LEGAL_POLICIES.privacy.content },
    }
  );

  // ==========================================
  // MUTATION HANDLERS
  // ==========================================
  const updateProductField = (
    id: string,
    field:
      | "kannadaName"
      | "name"
      | "subtitle"
      | "description"
      | "fullStory"
      | "imageUrl"
      | "benefits"
      | "cookingUses"
      | "smokePoint"
      | "extractionMethod"
      | "ingredients"
      | "shelfLife"
      | "standards",
    value: string
  ) => {
    setProductDetails((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const updateProductAngleImage = (productId: string, angleIndex: number, newUrl: string) => {
    setProductDetails((prev) => {
      const currentImages = prev[productId]?.images || [];
      const updatedImages = [...currentImages];
      updatedImages[angleIndex] = newUrl;
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          images: updatedImages,
          ...(angleIndex === 0 ? { imageUrl: newUrl } : {}),
        },
      };
    });
  };

  const updatePrice = (key: keyof typeof prices, value: number) => {
    setPrices((prev) => ({ ...prev, [key]: value }));
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

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    updateCMSConfig((prev) => ({
      ...prev,
      brandName,
      brandTagline: tagline,
      brandLogoUrl: logoUrl,
      announcementTicker: ticker,
      tickerButtonText,
      heroBadge,
      heroHeadline,
      heroSubhead,
      chekkuVideoUrl: heroVideoUrl,
      heroPrimaryCta,
      heroSecondaryCta,
      heroHighlights: [heroHighlight1, heroHighlight2, heroHighlight3],
      audioTitle,
      audioSubtitle,
      audioUrl,
      craftsmanshipTitle,
      craftsmanshipSubtitle,
      marachekkuPoints,
      refinedPoints,
      freeShippingThreshold: Number(threshold),
      standardShippingFee: Number(stdFee),
      prices,
      stock,
      productDetails,
      comboDetails,
      packagingHighlights,
      founderName,
      primaryPhone,
      altPhone,
      email,
      facilityAddress,
      fssaiLicense,
      gstin,
      delhiveryWarehouse,
      delhiveryOriginPincode,
      bangaloreDeliveryNotice: dispatchNotice,
      policies,
    }));
    showToast("Master storefront CMS synchronized live across the website!");
  };

  return (
    <div
      className={`rounded-3xl border p-6 shadow-sm space-y-6 ${
        isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4 border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-[#E08F35]">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold font-serif">Master Storefront CMS</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Live text, full 11-angle inspection galleries, combos, rates & policies
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
          settings/store_config
        </span>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-3 border-stone-200 dark:border-stone-800">
        {[
          { key: "products", label: "Product Pages & 11 Images", icon: Package },
          { key: "combos_packaging", label: "Combos & Packaging", icon: Layers },
          { key: "pricing_stock", label: "Prices & Stock", icon: DollarSign },
          { key: "brand_hero", label: "Hero Banner & Header", icon: ImageIcon },
          { key: "craftsmanship", label: "Craftsmanship Matrix", icon: Sparkles },
          { key: "facility_logistics", label: "Facility & Logistics", icon: Building },
          { key: "policies", label: "Customer Policies", icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.key
                  ? "bg-[#5E3210] text-white shadow-sm"
                  : isDark
                  ? "bg-[#150D07] text-[#D8C8B8] hover:bg-[#24160E]"
                  : "bg-stone-100 text-[#5C4230] hover:bg-stone-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSaveAll} className="space-y-6 text-xs">
        {/* ========================================================= */}
        {/* TAB 1: PRODUCT PAGES (A TO Z CONTENT + 11 ANGLE IMAGES)   */}
        {/* ========================================================= */}
        {activeTab === "products" && (
          <div className="space-y-5 animate-fade-in">
            {/* Oil Selector Tabs */}
            <div className="flex items-center gap-2 pb-1 border-b border-stone-200 dark:border-stone-800">
              {(["groundnut", "coconut", "sesame"] as const).map((oil) => (
                <button
                  key={oil}
                  type="button"
                  onClick={() => setSelectedOilProduct(oil)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                    selectedOilProduct === oil
                      ? "bg-[#E08F35] text-[#1C120B] shadow-sm font-black"
                      : isDark
                      ? "bg-[#150D07] text-stone-300 hover:bg-[#24160E]"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  {oil} Oil Page
                </button>
              ))}
            </div>

            <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-4 bg-stone-50/50 dark:bg-black/20">
              <div className="flex items-center justify-between border-b pb-2.5 border-stone-200 dark:border-stone-800">
                <span className="font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {selectedOilProduct} Oil — Complete Product Page Information
                </span>
                {productDetails[selectedOilProduct]?.imageUrl && (
                  <img
                    src={productDetails[selectedOilProduct].imageUrl}
                    alt={selectedOilProduct}
                    className="w-10 h-10 object-contain rounded-lg border border-stone-300 dark:border-stone-700 bg-white p-0.5"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Kannada Script Title</label>
                  <input
                    type="text"
                    value={productDetails[selectedOilProduct]?.kannadaName || ""}
                    onChange={(e) => updateProductField(selectedOilProduct, "kannadaName", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Product Title</label>
                  <input
                    type="text"
                    value={productDetails[selectedOilProduct]?.name || ""}
                    onChange={(e) => updateProductField(selectedOilProduct, "name", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Subtitle / Tagline</label>
                  <input
                    type="text"
                    value={productDetails[selectedOilProduct]?.subtitle || ""}
                    onChange={(e) => updateProductField(selectedOilProduct, "subtitle", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">Catalog Card Short Description</label>
                <input
                  type="text"
                  value={productDetails[selectedOilProduct]?.description || ""}
                  onChange={(e) => updateProductField(selectedOilProduct, "description", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">
                  Full Story & Cold-Press Heritage (Product Detail Page)
                </label>
                <textarea
                  rows={3}
                  value={productDetails[selectedOilProduct]?.fullStory || ""}
                  onChange={(e) => updateProductField(selectedOilProduct, "fullStory", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] text-xs leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">
                  Key Health Benefits (Comma-separated)
                </label>
                <input
                  type="text"
                  value={productDetails[selectedOilProduct]?.benefits || ""}
                  onChange={(e) => updateProductField(selectedOilProduct, "benefits", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      Smoke Point
                    </span>
                  </label>
                  <input
                    type="text"
                    value={productDetails[selectedOilProduct]?.smokePoint || ""}
                    onChange={(e) => updateProductField(selectedOilProduct, "smokePoint", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1">
                    <span className="flex items-center gap-1">
                      <Utensils className="w-3.5 h-3.5 text-amber-500" />
                      Culinary & Daily Uses
                    </span>
                  </label>
                  <input
                    type="text"
                    value={productDetails[selectedOilProduct]?.cookingUses || ""}
                    onChange={(e) => updateProductField(selectedOilProduct, "cookingUses", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Extraction Method</label>
                  <input
                    type="text"
                    value={productDetails[selectedOilProduct]?.extractionMethod || ""}
                    onChange={(e) => updateProductField(selectedOilProduct, "extractionMethod", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Ingredients</label>
                  <input
                    type="text"
                    value={productDetails[selectedOilProduct]?.ingredients || ""}
                    onChange={(e) => updateProductField(selectedOilProduct, "ingredients", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Shelf Life & Storage</label>
                  <input
                    type="text"
                    value={productDetails[selectedOilProduct]?.shelfLife || ""}
                    onChange={(e) => updateProductField(selectedOilProduct, "shelfLife", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">Certification Standards Statement</label>
                <input
                  type="text"
                  value={productDetails[selectedOilProduct]?.standards || ""}
                  onChange={(e) => updateProductField(selectedOilProduct, "standards", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] text-xs"
                />
              </div>

              {/* 11 MULTI-ANGLE STUDIO SHOT IMAGES */}
              <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-stone-900 dark:text-[#FAF4EA]">
                    <ImageIcon className="w-4 h-4 text-[#E08F35]" />
                    Multi-Angle Inspection Strip (All 11 Studio Shot URLs)
                  </span>
                  <span className="text-[10px] text-stone-500">Angle 1 serves as primary product cover image</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Array.from({ length: 11 }).map((_, idx) => {
                    const currentImg =
                      productDetails[selectedOilProduct]?.images?.[idx] ||
                      `https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/${selectedOilProduct}-${idx + 1}.png`;
                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#150D07] flex items-center gap-2.5"
                      >
                        <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-black p-0.5 border shrink-0 overflow-hidden flex items-center justify-center">
                          <img
                            src={currentImg}
                            alt={`Angle ${idx + 1}`}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/groundnut-2.png";
                            }}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="block text-[10px] font-bold text-stone-700 dark:text-stone-300">
                            Angle {idx + 1} Image URL {idx === 0 && "(Cover)"}
                          </label>
                          <input
                            type="url"
                            value={currentImg}
                            onChange={(e) => updateProductAngleImage(selectedOilProduct, idx, e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-transparent font-mono text-[10px]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: COMBOS & PACKAGING HIGHLIGHTS                      */}
        {/* ========================================================= */}
        {activeTab === "combos_packaging" && (
          <div className="space-y-5 animate-fade-in">
            {/* 3L Combo Card */}
            <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-black/20 space-y-3">
              <span className="font-bold text-amber-700 dark:text-amber-400 block border-b pb-1 text-xs">
                Grand Kitchen Trio Combo (3L Bundle)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Bundle Title</label>
                  <input
                    type="text"
                    value={comboDetails.combo3L.name}
                    onChange={(e) =>
                      setComboDetails((p) => ({
                        ...p,
                        combo3L: { ...p.combo3L, name: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Bundle Subtitle</label>
                  <input
                    type="text"
                    value={comboDetails.combo3L.subtitle}
                    onChange={(e) =>
                      setComboDetails((p) => ({
                        ...p,
                        combo3L: { ...p.combo3L, subtitle: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">Bundle Image URL</label>
                <input
                  type="url"
                  value={comboDetails.combo3L.imageUrl}
                  onChange={(e) =>
                    setComboDetails((p) => ({
                      ...p,
                      combo3L: { ...p.combo3L, imageUrl: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">Inclusions Summary</label>
                <input
                  type="text"
                  value={comboDetails.combo3L.inclusions}
                  onChange={(e) =>
                    setComboDetails((p) => ({
                      ...p,
                      combo3L: { ...p.combo3L, inclusions: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                />
              </div>
            </div>

            {/* 1.5L Combo Card */}
            <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-black/20 space-y-3">
              <span className="font-bold text-amber-700 dark:text-amber-400 block border-b pb-1 text-xs">
                Taster Trio Combo (1.5L Bundle)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Bundle Title</label>
                  <input
                    type="text"
                    value={comboDetails.combo1_5L.name}
                    onChange={(e) =>
                      setComboDetails((p) => ({
                        ...p,
                        combo1_5L: { ...p.combo1_5L, name: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Bundle Subtitle</label>
                  <input
                    type="text"
                    value={comboDetails.combo1_5L.subtitle}
                    onChange={(e) =>
                      setComboDetails((p) => ({
                        ...p,
                        combo1_5L: { ...p.combo1_5L, subtitle: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">Bundle Image URL</label>
                <input
                  type="url"
                  value={comboDetails.combo1_5L.imageUrl}
                  onChange={(e) =>
                    setComboDetails((p) => ({
                      ...p,
                      combo1_5L: { ...p.combo1_5L, imageUrl: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">Inclusions Summary</label>
                <input
                  type="text"
                  value={comboDetails.combo1_5L.inclusions}
                  onChange={(e) =>
                    setComboDetails((p) => ({
                      ...p,
                      combo1_5L: { ...p.combo1_5L, inclusions: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                />
              </div>
            </div>

            

            {/* 4 Packaging Highlights */}
            <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-black/20 space-y-3">
              <span className="font-bold text-amber-700 dark:text-amber-400 block border-b pb-1 text-xs">
                Leak-Free Packaging Engineering Cards (Home & Product Page)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
{packagingHighlights.map((feat: { title: string; description: string }, idx: number) => (                  <div key={idx} className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#150D07] space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold mb-0.5">Feature {idx + 1} Title</label>
                      <input
                        type="text"
                        value={feat.title}
                        onChange={(e) => {
                          const updated = [...packagingHighlights];
                          updated[idx].title = e.target.value;
                          setPackagingHighlights(updated);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-transparent font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold mb-0.5">Feature {idx + 1} Description</label>
                      <textarea
                        rows={2}
                        value={feat.description}
                        onChange={(e) => {
                          const updated = [...packagingHighlights];
                          updated[idx].description = e.target.value;
                          setPackagingHighlights(updated);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-transparent text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: LIVE PRICING & INVENTORY                           */}
        {/* ========================================================= */}
        {activeTab === "pricing_stock" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Groundnut */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-black/20 space-y-3">
                <span className="font-bold text-amber-700 dark:text-amber-400 block border-b pb-1">
                  Groundnut Oil Prices & Stock
                </span>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">1L Price (₹)</label>
                    <input
                      type="number"
                      value={prices.groundnut1L}
                      onChange={(e) => updatePrice("groundnut1L", Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] font-bold text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStock("groundnut1L")}
                    className={`px-3 py-2 rounded-xl font-bold text-[11px] mt-4 transition-colors cursor-pointer ${
                      stock.groundnut1L ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    }`}
                  >
                    1L: {stock.groundnut1L ? "In Stock" : "Out of Stock"}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">500ml Price (₹)</label>
                    <input
                      type="number"
                      value={prices.groundnut500ml}
                      onChange={(e) => updatePrice("groundnut500ml", Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] font-bold text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStock("groundnut500ml")}
                    className={`px-3 py-2 rounded-xl font-bold text-[11px] mt-4 transition-colors cursor-pointer ${
                      stock.groundnut500ml ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    }`}
                  >
                    500ml: {stock.groundnut500ml ? "In Stock" : "Out of Stock"}
                  </button>
                </div>
              </div>

              {/* Coconut */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-black/20 space-y-3">
                <span className="font-bold text-amber-700 dark:text-amber-400 block border-b pb-1">
                  Coconut Oil Prices & Stock
                </span>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">1L Price (₹)</label>
                    <input
                      type="number"
                      value={prices.coconut1L}
                      onChange={(e) => updatePrice("coconut1L", Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] font-bold text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStock("coconut1L")}
                    className={`px-3 py-2 rounded-xl font-bold text-[11px] mt-4 transition-colors cursor-pointer ${
                      stock.coconut1L ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    }`}
                  >
                    1L: {stock.coconut1L ? "In Stock" : "Out of Stock"}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">500ml Price (₹)</label>
                    <input
                      type="number"
                      value={prices.coconut500ml}
                      onChange={(e) => updatePrice("coconut500ml", Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] font-bold text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStock("coconut500ml")}
                    className={`px-3 py-2 rounded-xl font-bold text-[11px] mt-4 transition-colors cursor-pointer ${
                      stock.coconut500ml ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    }`}
                  >
                    500ml: {stock.coconut500ml ? "In Stock" : "Out of Stock"}
                  </button>
                </div>
              </div>

              {/* Sesame */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-black/20 space-y-3">
                <span className="font-bold text-amber-700 dark:text-amber-400 block border-b pb-1">
                  Sesame (Gingelly) Oil Prices & Stock
                </span>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">1L Price (₹)</label>
                    <input
                      type="number"
                      value={prices.sesame1L}
                      onChange={(e) => updatePrice("sesame1L", Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] font-bold text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStock("sesame1L")}
                    className={`px-3 py-2 rounded-xl font-bold text-[11px] mt-4 transition-colors cursor-pointer ${
                      stock.sesame1L ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    }`}
                  >
                    1L: {stock.sesame1L ? "In Stock" : "Out of Stock"}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">500ml Price (₹)</label>
                    <input
                      type="number"
                      value={prices.sesame500ml}
                      onChange={(e) => updatePrice("sesame500ml", Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] font-bold text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStock("sesame500ml")}
                    className={`px-3 py-2 rounded-xl font-bold text-[11px] mt-4 transition-colors cursor-pointer ${
                      stock.sesame500ml ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    }`}
                  >
                    500ml: {stock.sesame500ml ? "In Stock" : "Out of Stock"}
                  </button>
                </div>
              </div>

              {/* Combos */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-black/20 space-y-3">
                <span className="font-bold text-amber-700 dark:text-amber-400 block border-b pb-1">
                  Artisanal Trio Combos
                </span>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">3L Trio Price (₹)</label>
                    <input
                      type="number"
                      value={prices.combo3L}
                      onChange={(e) => updatePrice("combo3L", Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] font-bold text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStock("combo3L")}
                    className={`px-3 py-2 rounded-xl font-bold text-[11px] mt-4 transition-colors cursor-pointer ${
                      stock.combo3L ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    }`}
                  >
                    3L Trio: {stock.combo3L ? "In Stock" : "Out of Stock"}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">1.5L Trio Price (₹)</label>
                    <input
                      type="number"
                      value={prices.combo1_5L}
                      onChange={(e) => updatePrice("combo1_5L", Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] font-bold text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStock("combo1_5L")}
                    className={`px-3 py-2 rounded-xl font-bold text-[11px] mt-4 transition-colors cursor-pointer ${
                      stock.combo1_5L ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    }`}
                  >
                    1.5L Trio: {stock.combo1_5L ? "In Stock" : "Out of Stock"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: BRAND, HERO, BANNER & AMBIENCE                     */}
        {/* ========================================================= */}
        {activeTab === "brand_hero" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Brand Name Display</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Brand Tagline</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Top Announcement Ticker Text</label>
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Ticker Right Button Label</label>
                <input
                  type="text"
                  value={tickerButtonText}
                  onChange={(e) => setTickerButtonText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Brand Logo Image URL</label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Hero Pressing Video URL (MP4)</label>
                <input
                  type="url"
                  value={heroVideoUrl}
                  onChange={(e) => setHeroVideoUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] font-mono text-[11px]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Top Hero Badge Label</label>
              <input
                type="text"
                value={heroBadge}
                onChange={(e) => setHeroBadge(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Hero Main Headline</label>
              <input
                type="text"
                value={heroHeadline}
                onChange={(e) => setHeroHeadline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Hero Sub-headline</label>
              <textarea
                rows={3}
                value={heroSubhead}
                onChange={(e) => setHeroSubhead(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
              />
            </div>

            {/* 3 Highlight Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1">Hero Chip 1</label>
                <input
                  type="text"
                  value={heroHighlight1}
                  onChange={(e) => setHeroHighlight1(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Hero Chip 2</label>
                <input
                  type="text"
                  value={heroHighlight2}
                  onChange={(e) => setHeroHighlight2(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Hero Chip 3</label>
                <input
                  type="text"
                  value={heroHighlight3}
                  onChange={(e) => setHeroHighlight3(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Hero Primary Button Label</label>
                <input
                  type="text"
                  value={heroPrimaryCta}
                  onChange={(e) => setHeroPrimaryCta(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Hero Secondary Button Label</label>
                <input
                  type="text"
                  value={heroSecondaryCta}
                  onChange={(e) => setHeroSecondaryCta(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                />
              </div>
            </div>

            {/* Ambient Sound Settings */}
            <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-black/20 space-y-3">
              <span className="font-bold text-amber-700 dark:text-amber-400 block border-b pb-1 text-xs flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-[#E08F35]" />
                Traditional Marachekku Audio Ambience Player
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Audio Display Title</label>
                  <input
                    type="text"
                    value={audioTitle}
                    onChange={(e) => setAudioTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Audio Subtitle / Description</label>
                  <input
                    type="text"
                    value={audioSubtitle}
                    onChange={(e) => setAudioSubtitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">Audio File URL (MP3)</label>
                <input
                  type="url"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] font-mono text-[11px]"
                />
              </div>
            </div>

            {/* Delivery thresholds */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-semibold mb-1">Free Delivery Threshold (₹)</label>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Standard Delivery Fee (₹)</label>
                <input
                  type="number"
                  value={stdFee}
                  onChange={(e) => setStdFee(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: CRAFTSMANSHIP & COMPARISON MATRIX                  */}
        {/* ========================================================= */}
        {activeTab === "craftsmanship" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Craftsmanship Section Title</label>
                <input
                  type="text"
                  value={craftsmanshipTitle}
                  onChange={(e) => setCraftsmanshipTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Section Subtitle</label>
                <input
                  type="text"
                  value={craftsmanshipSubtitle}
                  onChange={(e) => setCraftsmanshipSubtitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Marachekku Column */}
              <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-2.5">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 block border-b border-emerald-500/30 pb-1 text-xs">
                  Authentic Marachekku (Cold Pressed) Attributes
                </span>
                {marachekkuPoints.map((pt, idx) => (
                  <div key={idx}>
                    <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">
                      Point {idx + 1}
                    </label>
                    <input
                      type="text"
                      value={pt}
                      onChange={(e) => {
                        const updated = [...marachekkuPoints];
                        updated[idx] = e.target.value;
                        setMarachekkuPoints(updated);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-500/30 bg-white dark:bg-[#120A06] text-xs"
                    />
                  </div>
                ))}
              </div>

              {/* Refined Commercial Column */}
              <div className="p-4 rounded-2xl border border-red-500/30 bg-red-50/30 dark:bg-red-950/20 space-y-2.5">
                <span className="font-bold text-red-800 dark:text-red-300 block border-b border-red-500/30 pb-1 text-xs">
                  Commercial Refined Oil Attributes
                </span>
                {refinedPoints.map((pt, idx) => (
                  <div key={idx}>
                    <label className="block text-[10px] font-bold text-red-700 dark:text-red-400 mb-0.5">
                      Point {idx + 1}
                    </label>
                    <input
                      type="text"
                      value={pt}
                      onChange={(e) => {
                        const updated = [...refinedPoints];
                        updated[idx] = e.target.value;
                        setRefinedPoints(updated);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-white dark:bg-[#120A06] text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: FACILITY & LOGISTICS HUB                           */}
        {/* ========================================================= */}
        {activeTab === "facility_logistics" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Founder & Grievance Officer</label>
                <input
                  type="text"
                  value={founderName}
                  onChange={(e) => setFounderName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Support Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Primary Helpdesk Phone</label>
                <input
                  type="text"
                  value={primaryPhone}
                  onChange={(e) => setPrimaryPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Alternate Phone</label>
                <input
                  type="text"
                  value={altPhone}
                  onChange={(e) => setAltPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Packaging Facility Address</label>
              <input
                type="text"
                value={facilityAddress}
                onChange={(e) => setFacilityAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">FSSAI Central License Reg. No.</label>
                <input
                  type="text"
                  value={fssaiLicense}
                  onChange={(e) => setFssaiLicense(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Delhivery Registered Warehouse Code</label>
                <input
                  type="text"
                  value={delhiveryWarehouse}
                  onChange={(e) => setDelhiveryWarehouse(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Delhivery Origin Dispatch Pincode</label>
                <input
                  type="text"
                  maxLength={6}
                  value={delhiveryOriginPincode}
                  onChange={(e) => setDelhiveryOriginPincode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Pan-India Express Dispatch Notice</label>
              <input
                type="text"
                value={dispatchNotice}
                onChange={(e) => setDispatchNotice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06]"
              />
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: LEGAL POLICIES                                     */}
        {/* ========================================================= */}
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
                className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-2.5 bg-stone-50/50 dark:bg-black/20"
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
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-0.5">Verbatim Policy Text</label>
                  <textarea
                    rows={4}
                    value={policies[p.key]?.content || ""}
                    onChange={(e) => updatePolicyItem(p.key, "content", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] text-xs leading-relaxed"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Master Save Button */}
        <button
          type="submit"
          className="w-full py-4 rounded-2xl bg-[#5E3210] hover:bg-[#43230A] active:scale-[0.99] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-6"
        >
          <Save className="w-4 h-4 text-amber-300" />
          <span>Save Changes (Live Firestore Sync)</span>
        </button>
      </form>
    </div>
  );
};