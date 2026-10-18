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
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { BUSINESS_CONFIG, LEGAL_POLICIES } from "../../constants";

export const StorefrontCMSPanel: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const { cmsConfig, updateCMSConfig, showToast } = useStore();

  const [activeTab, setActiveTab] = useState<
    "brand" | "facility" | "pricing_stock" | "products" | "policies"
  >("products");

  // Tab 1: Global Brand & Copy
  const [ticker, setTicker] = useState(cmsConfig?.announcementTicker || "");
  const [headline, setHeadline] = useState(cmsConfig?.heroHeadline || "");
  const [subhead, setSubhead] = useState(cmsConfig?.heroSubhead || "");
  const [tagline, setTagline] = useState(cmsConfig?.brandTagline || "Pure by nature, trusted for life");
  const [logoUrl, setLogoUrl] = useState(cmsConfig?.brandLogoUrl || "");
  const [videoUrl, setVideoUrl] = useState(cmsConfig?.chekkuVideoUrl || "");
  const [threshold, setThreshold] = useState(cmsConfig?.freeShippingThreshold ?? 500);
  const [stdFee, setStdFee] = useState(cmsConfig?.standardShippingFee ?? 49);

  // Tab 2: Facility & Legal Credentials
  const [founderName, setFounderName] = useState(cmsConfig?.founderName || BUSINESS_CONFIG.FOUNDER_NAME);
  const [primaryPhone, setPrimaryPhone] = useState(cmsConfig?.primaryPhone || BUSINESS_CONFIG.PRIMARY_PHONE);
  const [altPhone, setAltPhone] = useState(cmsConfig?.altPhone || BUSINESS_CONFIG.ALT_PHONE);
  const [email, setEmail] = useState(cmsConfig?.email || BUSINESS_CONFIG.EMAIL);
  const [facilityAddress, setFacilityAddress] = useState(cmsConfig?.facilityAddress || BUSINESS_CONFIG.FACILITY_ADDRESS);
  const [fssaiLicense, setFssaiLicense] = useState(cmsConfig?.fssaiLicense || BUSINESS_CONFIG.FSSAI_LICENSE);
  const [gstin, setGstin] = useState(cmsConfig?.gstin || BUSINESS_CONFIG.GSTIN);
  const [blrNotice, setBlrNotice] = useState(cmsConfig?.bangaloreDeliveryNotice || "");

  // Tab 3: Live Pricing & Stock Controls
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

  const [productDetails, setProductDetails] = useState<
    Record<
      string,
      {
        name?: string;
        subtitle?: string;
        description?: string;
        fullStory?: string;
        imageUrl?: string;
        benefits?: string;
        cookingUses?: string;
        smokePoint?: string;
        extractionMethod?: string;
        ingredients?: string;
        shelfLife?: string;
      }
    >
  >(
    (cmsConfig as any)?.productDetails || {
      groundnut: {
        name: "Wood-Pressed Groundnut Oil",
        subtitle: "100% Pure Mara Chekku • Unrefined & Chemical-Free",
        description: "Cold-pressed from handpicked premium grade groundnuts using traditional Vagai wood presses.",
        fullStory: "Our cold-pressed Groundnut oil is extracted using authentic wooden pestles (Marachekku) operated at under 45°C. No chemicals, solvents, or heating processes are ever used, preserving the natural nutty aroma, rich vitamin E, and natural antioxidants intact.",
        imageUrl: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/groundnut_oil_bottle.png",
        benefits: "Zero cholesterol, Rich in natural Vitamin E, High monounsaturated fats (MUFA), Zero chemical preservatives",
        cookingUses: "Everyday South Indian cooking, deep frying, tadka, dosas, and curries",
        smokePoint: "230°C (High Smoke Point - Ideal for Indian deep frying)",
        extractionMethod: "Traditional Vagai (Albizia Lebbeck) Wood Chekku below 45°C",
        ingredients: "100% Single-Origin Cleaned Groundnut Seeds",
        shelfLife: "9 Months from date of cold-pressing (Store in a cool, dark place)",
      },
      coconut: {
        name: "Wood-Pressed Coconut Oil",
        subtitle: "Sun-Dried Copra • Raw, Fragrant & Unbleached",
        description: "Extracted from sulfur-free sun-dried coconut copra for authentic coastal flavor and wellness.",
        fullStory: "Crafted exclusively from sulfur-free, naturally sun-dried copra sourced from coastal groves. Slowly pressed in wooden churns without artificial bleaching, refining, or deodorizing to preserve pure lauric acid and antimicrobial medium-chain triglycerides (MCTs).",
        imageUrl: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/coconut_oil_bottle.png",
        benefits: "Contains over 50% Lauric Acid, Natural MCTs for metabolic energy, Excellent for skin and hair health, 100% unbleached",
        cookingUses: "Kerala & coastal curries, roasting, baking, oil pulling, and hair/scalp massage",
        smokePoint: "177°C (Medium Smoke Point - Ideal for sauteing and raw consumption)",
        extractionMethod: "Slow Wooden Churn Expeller (Marachekku) without heat treatment",
        ingredients: "100% Naturally Sun-Dried Coconut Copra (Sulfur-Free)",
        shelfLife: "12 Months from date of packaging",
      },
      sesame: {
        name: "Wood-Pressed Sesame (Gingelly) Oil",
        subtitle: "Traditional Palm Jaggery Infused • Nutrient Dense",
        description: "Cold-pressed with organic palm jaggery to eliminate natural bitterness and impart a rich amber sheen.",
        fullStory: "Our traditional Gingelly oil adheres to timeless artisanal craftsmanship: selected black sesame seeds are pressed in heavy wooden chekkus alongside pure palm jaggery. The natural jaggery balances the seed's astringency while infusing essential minerals, iron, and sesame lignans.",
        imageUrl: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/sesame_oil_bottle.png",
        benefits: "Rich in Sesamol and Sesamolin antioxidants, Natural source of calcium and zinc, Promotes cardiovascular health",
        cookingUses: "Authentic idli podi mixing, sambar & rasam tadka, authentic pickles, and traditional oil massages",
        smokePoint: "210°C (High Smoke Point - Ideal for tempering and simmering)",
        extractionMethod: "Traditional Marachekku with Palm Jaggery Binder",
        ingredients: "90% Black Sesame Seeds, 10% Traditional Palm Jaggery",
        shelfLife: "12 Months from date of packaging",
      },
    }
  );

  // Tab 5: Policies (A to Z Content)
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
    updateCMSConfig((prev) => ({
      ...prev,
      announcementTicker: ticker,
      heroHeadline: headline,
      heroSubhead: subhead,
      brandTagline: tagline,
      brandLogoUrl: logoUrl,
      chekkuVideoUrl: videoUrl,
      founderName,
      primaryPhone,
      altPhone,
      email,
      facilityAddress,
      fssaiLicense,
      gstin,
      bangaloreDeliveryNotice: blrNotice,
      freeShippingThreshold: Number(threshold),
      standardShippingFee: Number(stdFee),
      prices,
      stock,
      productDetails,
      policies,
    }));
    showToast("Master storefront settings, product catalog, prices & legal policies synced!");
  };

  const updateProductField = (
    id: string,
    field:
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
      | "shelfLife",
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

  const updatePrice = (key: keyof typeof prices, value: number) => {
    setPrices((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleStock = (key: keyof typeof stock) => {
    setStock((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
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

  return (
    <div
      className={`rounded-2xl border p-6 shadow-sm space-y-5 ${
        isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
      }`}
    >
      <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#E08F35]" />
          <h2 className="text-base font-bold font-serif">Master Storefront CMS (A to Z)</h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold">
          settings/store_config
        </span>
      </div>

      {/* Responsive Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2 border-stone-200 dark:border-stone-800">
        {[
          { key: "products", label: "Product Pages (A-Z Content)" },
          { key: "pricing_stock", label: "Prices & Inventory" },
          { key: "brand", label: "Logo & Hero Banner" },
          { key: "facility", label: "Facility & Legal IDs" },
          { key: "policies", label: "Customer Policies" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab.key
                ? "bg-[#5E3210] text-white shadow-sm"
                : isDark
                ? "bg-[#150D07] text-[#D8C8B8] hover:bg-[#24160E]"
                : "bg-stone-100 text-[#5C4230] hover:bg-stone-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSaveAll} className="space-y-4 text-xs">
        {/* TAB 1: PRODUCT PAGES (A to Z EDITING) */}
        {activeTab === "products" && (
          <div className="space-y-4 animate-fade-in">
            {/* Oil Type Sub-tabs */}
            <div className="flex items-center gap-2 pb-1 border-b border-stone-200 dark:border-stone-800">
              {(["groundnut", "coconut", "sesame"] as const).map((oil) => (
                <button
                  key={oil}
                  type="button"
                  onClick={() => setSelectedOilProduct(oil)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
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

            {/* Editing Panel for Selected Product */}
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 space-y-3.5 bg-stone-50/50 dark:bg-black/20">
              <div className="flex items-center justify-between border-b pb-2 border-stone-200 dark:border-stone-800">
                <span className="font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {selectedOilProduct} Oil — Full Page Specifications
                </span>
                {productDetails[selectedOilProduct]?.imageUrl && (
                  <img
                    src={productDetails[selectedOilProduct].imageUrl}
                    alt={selectedOilProduct}
                    className="w-10 h-10 object-contain rounded-lg border border-stone-300 dark:border-stone-700 bg-white p-0.5"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Product Title</label>
                  <input
                    type="text"
                    value={productDetails[selectedOilProduct]?.name || ""}
                    onChange={(e) => updateProductField(selectedOilProduct, "name", e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Subtitle / Tagline</label>
                  <input
                    type="text"
                    value={productDetails[selectedOilProduct]?.subtitle || ""}
                    onChange={(e) => updateProductField(selectedOilProduct, "subtitle", e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">Short Description (Catalog Cards)</label>
                <input
                  type="text"
                  value={productDetails[selectedOilProduct]?.description || ""}
                  onChange={(e) => updateProductField(selectedOilProduct, "description", e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">
                  Full Story & Heritage (Detailed Product Page Description)
                </label>
                <textarea
                  rows={3}
                  value={productDetails[selectedOilProduct]?.fullStory || ""}
                  onChange={(e) => updateProductField(selectedOilProduct, "fullStory", e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">
                  Key Health Benefits (Comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Zero cholesterol, Rich in Vitamin E, High MUFA"
                  value={productDetails[selectedOilProduct]?.benefits || ""}
                  onChange={(e) => updateProductField(selectedOilProduct, "benefits", e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs"
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
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs"
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
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs"
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
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Ingredients</label>
                  <input
                    type="text"
                    value={productDetails[selectedOilProduct]?.ingredients || ""}
                    onChange={(e) => updateProductField(selectedOilProduct, "ingredients", e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Shelf Life & Storage</label>
                  <input
                    type="text"
                    value={productDetails[selectedOilProduct]?.shelfLife || ""}
                    onChange={(e) => updateProductField(selectedOilProduct, "shelfLife", e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">
                  Primary Bottle Image URL (Cloudflare R2 / CDN)
                </label>
                <input
                  type="url"
                  value={productDetails[selectedOilProduct]?.imageUrl || ""}
                  onChange={(e) => updateProductField(selectedOilProduct, "imageUrl", e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent font-mono text-[11px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRICING & INVENTORY */}
        {activeTab === "pricing_stock" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Groundnut Oil */}
              <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-black/20 space-y-3">
                <span className="font-bold text-amber-700 dark:text-amber-400 block border-b pb-1">
                  Groundnut Oil Rates & Stock
                </span>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">1L Price (₹)</label>
                    <input
                      type="number"
                      value={prices.groundnut1L}
                      onChange={(e) => updatePrice("groundnut1L", Number(e.target.value))}
                      className="w-full px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStock("groundnut1L")}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[11px] mt-3.5 transition-colors cursor-pointer ${
                      stock.groundnut1L
                        ? "bg-emerald-600 text-white"
                        : "bg-red-600 text-white"
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
                      className="w-full px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStock("groundnut500ml")}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[11px] mt-3.5 transition-colors cursor-pointer ${
                      stock.groundnut500ml
                        ? "bg-emerald-600 text-white"
                        : "bg-red-600 text-white"
                    }`}
                  >
                    500ml: {stock.groundnut500ml ? "In Stock" : "Out of Stock"}
                  </button>
                </div>
              </div>

              {/* Coconut Oil */}
              <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-black/20 space-y-3">
                <span className="font-bold text-amber-700 dark:text-amber-400 block border-b pb-1">
                  Coconut Oil Rates & Stock
                </span>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">1L Price (₹)</label>
                    <input
                      type="number"
                      value={prices.coconut1L}
                      onChange={(e) => updatePrice("coconut1L", Number(e.target.value))}
                      className="w-full px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStock("coconut1L")}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[11px] mt-3.5 transition-colors cursor-pointer ${
                      stock.coconut1L
                        ? "bg-emerald-600 text-white"
                        : "bg-red-600 text-white"
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
                      className="w-full px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStock("coconut500ml")}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[11px] mt-3.5 transition-colors cursor-pointer ${
                      stock.coconut500ml
                        ? "bg-emerald-600 text-white"
                        : "bg-red-600 text-white"
                    }`}
                  >
                    500ml: {stock.coconut500ml ? "In Stock" : "Out of Stock"}
                  </button>
                </div>
              </div>

              {/* Sesame Oil */}
              <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-black/20 space-y-3">
                <span className="font-bold text-amber-700 dark:text-amber-400 block border-b pb-1">
                  Sesame Oil Rates & Stock
                </span>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">1L Price (₹)</label>
                    <input
                      type="number"
                      value={prices.sesame1L}
                      onChange={(e) => updatePrice("sesame1L", Number(e.target.value))}
                      className="w-full px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStock("sesame1L")}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[11px] mt-3.5 transition-colors cursor-pointer ${
                      stock.sesame1L
                        ? "bg-emerald-600 text-white"
                        : "bg-red-600 text-white"
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
                      className="w-full px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStock("sesame500ml")}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[11px] mt-3.5 transition-colors cursor-pointer ${
                      stock.sesame500ml
                        ? "bg-emerald-600 text-white"
                        : "bg-red-600 text-white"
                    }`}
                  >
                    500ml: {stock.sesame500ml ? "In Stock" : "Out of Stock"}
                  </button>
                </div>
              </div>

              {/* Combo Bundles */}
              <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-black/20 space-y-3">
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
                      className="w-full px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStock("combo3L")}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[11px] mt-3.5 transition-colors cursor-pointer ${
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
                      className="w-full px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStock("combo1_5L")}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[11px] mt-3.5 transition-colors cursor-pointer ${
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

        {/* TAB 3: BRAND, LOGO & HERO */}
        {activeTab === "brand" && (
          <div className="space-y-3 animate-fade-in">
            <div>
              <label className="block font-semibold mb-1">Announcement Ticker</label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
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
            <div>
              <label className="block font-semibold mb-1">Logo Image URL</label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-mono text-[11px]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Hero Background Video URL</label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-mono text-[11px]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Hero Headline</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Hero Subhead</label>
              <textarea
                rows={3}
                value={subhead}
                onChange={(e) => setSubhead(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block font-semibold mb-1">Free Delivery Threshold (₹)</label>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Standard Delivery Fee (₹)</label>
                <input
                  type="number"
                  value={stdFee}
                  onChange={(e) => setStdFee(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FACILITY, GST & CONTACT */}
        {activeTab === "facility" && (
          <div className="space-y-3 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Founder / Grievance Officer</label>
                <input
                  type="text"
                  value={founderName}
                  onChange={(e) => setFounderName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Support Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Primary Phone</label>
                <input
                  type="text"
                  value={primaryPhone}
                  onChange={(e) => setPrimaryPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Alternate Phone</label>
                <input
                  type="text"
                  value={altPhone}
                  onChange={(e) => setAltPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">Peenya Facility Address</label>
              <input
                type="text"
                value={facilityAddress}
                onChange={(e) => setFacilityAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">FSSAI License Reg.</label>
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

        {/* TAB 5: LEGAL POLICIES */}
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
                    rows={4}
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
        <button
          type="submit"
          className="w-full py-3.5 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
        >
          <Save className="w-4 h-4 text-amber-300" />
          <span>Save Changes (Live Firestore Sync)</span>
        </button>
      </form>
    </div>
  );
};