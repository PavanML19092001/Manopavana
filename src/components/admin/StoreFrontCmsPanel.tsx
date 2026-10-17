import React, { useState } from "react";
import {
  Settings,
  Image,
  Video,
  Type,
  FileText,
  DollarSign,
  Package,
  Save,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { BUSINESS_CONFIG, LEGAL_POLICIES } from "../../constants";

export const StorefrontCMSPanel: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const { cmsConfig, updateCMSConfig, showToast } = useStore();

  const [activeTab, setActiveTab] = useState<"brand" | "facility" | "products" | "policies">("brand");

  // Global Brand & Copy
  const [ticker, setTicker] = useState(cmsConfig?.announcementTicker || "");
  const [headline, setHeadline] = useState(cmsConfig?.heroHeadline || "");
  const [subhead, setSubhead] = useState(cmsConfig?.heroSubhead || "");
  const [tagline, setTagline] = useState(cmsConfig?.brandTagline || "Pure by nature, trusted for life");
  const [logoUrl, setLogoUrl] = useState(cmsConfig?.brandLogoUrl || "");
  const [videoUrl, setVideoUrl] = useState(cmsConfig?.chekkuVideoUrl || "");
  const [threshold, setThreshold] = useState(cmsConfig?.freeShippingThreshold ?? 500);
  const [stdFee, setStdFee] = useState(cmsConfig?.standardShippingFee ?? 49);

  // Facility & Contact Credentials
  const [founderName, setFounderName] = useState(cmsConfig?.founderName || BUSINESS_CONFIG.FOUNDER_NAME);
  const [primaryPhone, setPrimaryPhone] = useState(cmsConfig?.primaryPhone || BUSINESS_CONFIG.PRIMARY_PHONE);
  const [altPhone, setAltPhone] = useState(cmsConfig?.altPhone || BUSINESS_CONFIG.ALT_PHONE);
  const [email, setEmail] = useState(cmsConfig?.email || BUSINESS_CONFIG.EMAIL);
  const [facilityAddress, setFacilityAddress] = useState(cmsConfig?.facilityAddress || BUSINESS_CONFIG.FACILITY_ADDRESS);
  const [fssaiLicense, setFssaiLicense] = useState(cmsConfig?.fssaiLicense || BUSINESS_CONFIG.FSSAI_LICENSE);
  const [gstin, setGstin] = useState(cmsConfig?.gstin || BUSINESS_CONFIG.GSTIN);
  const [blrNotice, setBlrNotice] = useState(cmsConfig?.bangaloreDeliveryNotice || "");

  // Product Catalog Customization
  const [productDetails, setProductDetails] = useState<Record<string, { name?: string; description?: string; imageUrl?: string }>>(
    (cmsConfig as any)?.productDetails || {
      groundnut: {
        name: "Wood-Pressed Groundnut Oil",
        description: "Pure cold-pressed oil made from high-grade peanuts.",
        imageUrl: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/groundnut_oil_bottle.png",
      },
      coconut: {
        name: "Wood-Pressed Coconut Oil",
        description: "Freshly pressed from natural sun-dried copra.",
        imageUrl: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/coconut_oil_bottle.png",
      },
      sesame: {
        name: "Wood-Pressed Sesame (Gingelly) Oil",
        description: "Cold-pressed with traditional palm jaggery.",
        imageUrl: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/sesame_oil_bottle.png",
      },
    }
  );

  // Policies (A to Z Content)
  const [policies, setPolicies] = useState((cmsConfig as any)?.policies || {
    terms: { title: LEGAL_POLICIES.terms.title, content: LEGAL_POLICIES.terms.content },
    shipping: { title: LEGAL_POLICIES.shipping.title, content: LEGAL_POLICIES.shipping.content },
    returns: { title: LEGAL_POLICIES.returns.title, content: LEGAL_POLICIES.returns.content },
    privacy: { title: LEGAL_POLICIES.privacy.title, content: LEGAL_POLICIES.privacy.content },
  });

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
      productDetails,
      policies,
    }));
    showToast("Master storefront settings, product metadata & legal policies synced!");
  };

  const updateProductItem = (id: string, field: "name" | "description" | "imageUrl", value: string) => {
    setProductDetails((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
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

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2 border-stone-200 dark:border-stone-800">
        {[
          { key: "brand", label: "Logo & Hero Banner" },
          { key: "facility", label: "Facility & Legal IDs" },
          { key: "products", label: "Product Details & Images" },
          { key: "policies", label: "Customer Legal Policies" },
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
        {/* TAB 1: BRAND, LOGO & HERO */}
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

        {/* TAB 2: FACILITY, GST & CONTACT */}
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
              <label className="block font-semibold mb-1">Bangalore Delivery Notice</label>
              <input
                type="text"
                value={blrNotice}
                onChange={(e) => setBlrNotice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
              />
            </div>
          </div>
        )}

        {/* TAB 3: PRODUCTS & IMAGES */}
        {activeTab === "products" && (
          <div className="space-y-4 animate-fade-in">
            {["groundnut", "coconut", "sesame"].map((pId) => (
              <div
                key={pId}
                className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2.5 bg-stone-50/50 dark:bg-black/20"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    {pId} Oil Configuration
                  </span>
                  {productDetails[pId]?.imageUrl && (
                    <img
                      src={productDetails[pId].imageUrl}
                      alt={pId}
                      className="w-8 h-8 object-contain rounded border border-stone-300 dark:border-stone-700 bg-white"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-0.5">Product Title</label>
                  <input
                    type="text"
                    value={productDetails[pId]?.name || ""}
                    onChange={(e) => updateProductItem(pId, "name", e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-0.5">Short Description</label>
                  <input
                    type="text"
                    value={productDetails[pId]?.description || ""}
                    onChange={(e) => updateProductItem(pId, "description", e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-0.5">Bottle Image URL (Cloudflare R2 / CDN)</label>
                  <input
                    type="url"
                    value={productDetails[pId]?.imageUrl || ""}
                    onChange={(e) => updateProductItem(pId, "imageUrl", e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-transparent font-mono text-[11px]"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: LEGAL POLICIES */}
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