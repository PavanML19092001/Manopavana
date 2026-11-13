import React, { useEffect, useMemo, useState } from "react";
import {
  Tag,
  Copy,
  Check,
  Plus,
  Sparkles,
  Trash2,
  Pause,
  Play,
  ArrowLeft,
  Link2,
  MessageSquare,
  Users,
  Ticket,
  Loader2,
} from "lucide-react";
import { Coupon } from "../../types";
import {
  subscribeCoupons,
  saveCouponToFirestore,
  deleteCouponFromFirestore,
  generateSingleUseCouponsBatch,
  normalizeCouponCode,
} from "../../firebase";

interface CouponsManagerPanelProps {
  isDark: boolean;
  onBack: () => void;
  showToast: (msg: string) => void;
}

const DEFAULT_STORE_ORIGIN = "https://www.manopavana.com";

export const CouponsManagerPanel: React.FC<CouponsManagerPanelProps> = ({
  isDark,
  onBack,
  showToast,
}) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [filterType, setFilterType] = useState<"all" | "shared" | "single_use" | "active">("all");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Create Shared Coupon State
  const [newCode, setNewCode] = useState("");
  const [newPercent, setNewPercent] = useState(10);
  const [newMinOrder, setNewMinOrder] = useState(0);
  const [newMaxTotal, setNewMaxTotal] = useState("");
  const [newTag, setNewTag] = useState("Instagram Reel");
  const [newExpireDays, setNewExpireDays] = useState("");
  const [isSavingShared, setIsSavingShared] = useState(false);

  // Batch Single-Use Generator State
  const [batchCount, setBatchCount] = useState(10);
  const [batchPercent, setBatchPercent] = useState(10);
  const [batchDays, setBatchDays] = useState(30);
  const [batchTag, setBatchTag] = useState("Instagram Reel VIP");
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [lastBatch, setLastBatch] = useState<Coupon[]>([]);

  useEffect(() => {
    const unsub = subscribeCoupons((list) => {
      setCoupons(list);
    });
    return () => unsub();
  }, []);

  const primaryReelCoupon = useMemo(() => {
    return coupons.find((c) => c.code === "REEL10") || coupons.find((c) => c.type === "shared") || null;
  }, [coupons]);

  const activeShareCode = primaryReelCoupon?.code || "REEL10";
  const shareUrl = `${DEFAULT_STORE_ORIGIN}/?coupon=${activeShareCode}`;
  const dmMessage = `Namaskara! 🙏 Thank you for commenting on our Manopavana Wood-Pressed Oils Reel! 🌿\n\nHere is your exclusive 10% OFF reward (valid on all oils, combos & our Zero-Drip Dispenser, 1 use per customer):\n\n🎟️ Code: ${activeShareCode}\n👉 Tap to auto-apply 10% OFF: ${shareUrl}\n\nFreshly wood-pressed in Bengaluru — zero chemicals, 100% pure! ✨`;

  const copyText = async (text: string, key: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      showToast(`${label} copied!`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      showToast("Could not access clipboard. Please copy manually.");
    }
  };

  const handleCreateShared = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = normalizeCouponCode(newCode);
    if (!code || code.length < 3) {
      showToast("Enter a coupon code of at least 3 characters (e.g. REEL10).");
      return;
    }
    setIsSavingShared(true);
    try {
      const days = parseInt(newExpireDays, 10);
      const maxTot = parseInt(newMaxTotal, 10);
      const payload: Coupon = {
        code,
        type: "shared",
        discountPercent: Math.min(50, Math.max(1, Number(newPercent) || 10)),
        minOrderAmount: Math.max(0, Number(newMinOrder) || 0),
        maxTotalUses: Number.isFinite(maxTot) && maxTot > 0 ? maxTot : null,
        usedCount: 0,
        maxUsesPerCustomer: 1,
        redeemedByUids: [],
        redeemedPhones: [],
        totalRevenueDriven: 0,
        expiresAt: Number.isFinite(days) && days > 0 ? Date.now() + days * 24 * 60 * 60 * 1000 : null,
        isActive: true,
        campaignTag: newTag.trim() || "Instagram Reel",
      };
      const ok = await saveCouponToFirestore(payload);
      if (ok) {
        showToast(`Created shared coupon ${code}!`);
        setNewCode("");
        setNewMaxTotal("");
        setNewExpireDays("");
      } else {
        showToast("Failed to save coupon.");
      }
    } finally {
      setIsSavingShared(false);
    }
  };

  const handleGenerateBatch = async () => {
    setIsGeneratingBatch(true);
    try {
      const created = await generateSingleUseCouponsBatch(
        batchCount,
        batchPercent,
        batchTag.trim() || "Instagram Reel VIP",
        batchDays > 0 ? batchDays : null
      );
      setLastBatch(created);
      showToast(`Generated ${created.length} single-use VIP coupon codes!`);
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      if (filterType === "shared") return c.type === "shared";
      if (filterType === "single_use") return c.type === "single_use";
      if (filterType === "active") return c.isActive;
      return true;
    });
  }, [coupons, filterType]);

  const totalRedemptions = useMemo(
    () => coupons.reduce((sum, c) => sum + (Number(c.usedCount) || 0), 0),
    [coupons]
  );
  const totalCouponRevenue = useMemo(
    () => coupons.reduce((sum, c) => sum + (Number(c.totalRevenueDriven) || 0), 0),
    [coupons]
  );

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div
        className={`p-5 rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
          isDark ? "bg-[#14291D] border-[#1F3D2B]" : "bg-[#F2E8CC] border-[#E0B04A]/40"
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-2 rounded-xl bg-white dark:bg-[#1F3D2B] text-[#14291D] dark:text-[#FAF3E0] font-bold text-xs border border-[#E0B04A]/40 hover:bg-[#E0B04A]/25 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to CMS Dashboard</span>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#14291D] dark:text-[#FAF3E0] flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#E0B04A]" />
              <span>Instagram Reel Coupons & Promo Manager</span>
            </h1>
            <p className="text-xs text-[#2D4536] dark:text-[#A89482]">
              Firestore-locked 1-use-per-customer promo codes & single-use VIP batch generator (Zero localStorage)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-[#14291D] border border-[#E0B04A]/40 text-[#14291D] dark:text-[#FAF3E0]">
            Total Redemptions: <span className="text-[#E0B04A]">{totalRedemptions}</span>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-[#14291D] border border-[#E0B04A]/40 text-[#14291D] dark:text-[#FAF3E0]">
            Revenue Driven:{" "}
            <span className="text-emerald-700 dark:text-emerald-300">
              ₹{totalCouponRevenue.toLocaleString("en-IN")}
            </span>
          </span>
        </div>
      </div>

      {/* Instagram DM Quick Share Kit */}
      <div
        className={`rounded-3xl border p-6 shadow-sm space-y-4 ${
          isDark ? "bg-[#14291D] border-[#1F3D2B]" : "bg-white border-[#E0B04A]/50"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E0B04A]/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E0B04A]/20 flex items-center justify-center text-[#E0B04A]">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-serif text-[#14291D] dark:text-[#FAF3E0]">
                Ready-to-Send Instagram Reel DM Kit ({activeShareCode})
              </h2>
              <p className="text-[11px] text-[#3F4F45] dark:text-[#A89482]">
                Clicking this link auto-applies 10% OFF in memory for their current order (valid 1x per customer UID & mobile number).
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-[#FAF3E0] dark:bg-[#1F3D2B]/60 border border-[#E0B04A]/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#14291D] dark:text-[#FAF3E0] flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-[#E0B04A]" />
                <span>Auto-Apply Storefront Link</span>
              </span>
              <button
                type="button"
                onClick={() => copyText(shareUrl, "share-link", "Magic DM Link")}
                className="px-3 py-1.5 rounded-lg bg-[#1F3D2B] hover:bg-[#14291D] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey === "share-link" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === "share-link" ? "Copied!" : "Copy Link"}</span>
              </button>
            </div>
            <p className="font-mono text-xs bg-white dark:bg-[#14291D] p-2.5 rounded-xl border border-[#E0B04A]/30 text-[#1F3D2B] dark:text-[#F3D17A] break-all select-all">
              {shareUrl}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF3E0] dark:bg-[#1F3D2B]/60 border border-[#E0B04A]/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#14291D] dark:text-[#FAF3E0] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E0B04A]" />
                <span>Copy-Paste Instagram DM Reply</span>
              </span>
              <button
                type="button"
                onClick={() => copyText(dmMessage, "dm-msg", "DM Message")}
                className="px-3 py-1.5 rounded-lg bg-[#E0B04A] hover:bg-[#F3D17A] text-[#14291D] text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey === "dm-msg" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === "dm-msg" ? "Copied!" : "Copy DM"}</span>
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-[11px] bg-white dark:bg-[#14291D] p-2.5 rounded-xl border border-[#E0B04A]/30 text-[#14291D] dark:text-[#FAF3E0] max-h-28 overflow-y-auto">
              {dmMessage}
            </pre>
          </div>
        </div>
      </div>

      {/* Creation Row: Shared Promo vs Single-Use Batch Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form 1: Create Shared Campaign Code */}
        <form
          onSubmit={handleCreateShared}
          className={`rounded-3xl border p-6 shadow-sm space-y-4 ${
            isDark ? "bg-[#14291D] border-[#1F3D2B]" : "bg-white border-[#F2E8CC]"
          }`}
        >
          <div className="flex items-center gap-2 border-b border-[#E0B04A]/20 pb-3">
            <Users className="w-4 h-4 text-[#E0B04A]" />
            <div>
              <h3 className="text-sm font-bold font-serif text-[#14291D] dark:text-[#FAF3E0]">
                Create Shared Campaign Code
              </h3>
              <p className="text-[11px] text-[#3F4F45] dark:text-[#A89482]">
                One memorable code (1 use per customer UID & mobile number)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">Coupon Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. INSTA10"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-xl border border-[#F2E8CC] bg-[#FAF3E0]/60 font-mono font-bold uppercase text-[#14291D]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Discount % *</label>
              <input
                type="number"
                min={1}
                max={50}
                value={newPercent}
                onChange={(e) => setNewPercent(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#F2E8CC] bg-[#FAF3E0]/60 font-bold text-[#14291D]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Max Total Redemptions</label>
              <input
                type="number"
                min={1}
                placeholder="Unlimited"
                value={newMaxTotal}
                onChange={(e) => setNewMaxTotal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#F2E8CC] bg-[#FAF3E0]/60 text-[#14291D]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Min Order Value (₹)</label>
              <input
                type="number"
                min={0}
                value={newMinOrder}
                onChange={(e) => setNewMinOrder(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#F2E8CC] bg-[#FAF3E0]/60 text-[#14291D]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Expires in Days</label>
              <input
                type="number"
                min={1}
                placeholder="Never"
                value={newExpireDays}
                onChange={(e) => setNewExpireDays(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#F2E8CC] bg-[#FAF3E0]/60 text-[#14291D]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Campaign Label</label>
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#F2E8CC] bg-[#FAF3E0]/60 text-[#14291D]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingShared}
            className="w-full py-2.5 rounded-xl bg-[#1F3D2B] hover:bg-[#14291D] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4 text-[#F3D17A]" />
            <span>{isSavingShared ? "Saving..." : "Create Shared Coupon"}</span>
          </button>
        </form>

        {/* Form 2: Single-Use VIP Batch Generator */}
        <div
          className={`rounded-3xl border p-6 shadow-sm space-y-4 ${
            isDark ? "bg-[#14291D] border-[#1F3D2B]" : "bg-white border-[#F2E8CC]"
          }`}
        >
          <div className="flex items-center gap-2 border-b border-[#E0B04A]/20 pb-3">
            <Ticket className="w-4 h-4 text-[#E0B04A]" />
            <div>
              <h3 className="text-sm font-bold font-serif text-[#14291D] dark:text-[#FAF3E0]">
                1-Click Single-Use VIP Code Generator
              </h3>
              <p className="text-[11px] text-[#3F4F45] dark:text-[#A89482]">
                Generates unique MP-XXXX codes that auto-burn forever after 1 checkout
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">Number of Codes</label>
              <select
                value={batchCount}
                onChange={(e) => setBatchCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#F2E8CC] bg-[#FAF3E0]/60 font-bold text-[#14291D]"
              >
                <option value={5}>5 Single-Use Codes</option>
                <option value={10}>10 Single-Use Codes</option>
                <option value={25}>25 Single-Use Codes</option>
                <option value={50}>50 Single-Use Codes</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Discount %</label>
              <input
                type="number"
                min={1}
                max={50}
                value={batchPercent}
                onChange={(e) => setBatchPercent(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#F2E8CC] bg-[#FAF3E0]/60 font-bold text-[#14291D]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Valid Days (0 = No Expiry)</label>
              <input
                type="number"
                min={0}
                value={batchDays}
                onChange={(e) => setBatchDays(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#F2E8CC] bg-[#FAF3E0]/60 text-[#14291D]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Campaign Label</label>
              <input
                type="text"
                value={batchTag}
                onChange={(e) => setBatchTag(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#F2E8CC] bg-[#FAF3E0]/60 text-[#14291D]"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={isGeneratingBatch}
            onClick={handleGenerateBatch}
            className="w-full py-2.5 rounded-xl bg-[#E0B04A] hover:bg-[#F3D17A] text-[#14291D] text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isGeneratingBatch ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Batch...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate {batchCount} Single-Use Codes</span>
              </>
            )}
          </button>

          {lastBatch.length > 0 && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                <span>Latest Generated Batch ({lastBatch.length})</span>
                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      lastBatch.map((c) => `${c.code} -> ${DEFAULT_STORE_ORIGIN}/?coupon=${c.code}`).join("\n"),
                      "batch-all",
                      "All Generated Links"
                    )
                  }
                  className="underline cursor-pointer"
                >
                  Copy All Links
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {lastBatch.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() =>
                      copyText(`${DEFAULT_STORE_ORIGIN}/?coupon=${c.code}`, c.code, `Link for ${c.code}`)
                    }
                    className="px-2 py-1 rounded bg-white border border-emerald-300 font-mono text-[11px] font-bold text-emerald-900 hover:bg-emerald-100 cursor-pointer"
                  >
                    {c.code}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active & Historical Coupons Table */}
      <div
        className={`rounded-3xl border p-6 shadow-sm space-y-4 ${
          isDark ? "bg-[#14291D] border-[#1F3D2B]" : "bg-white border-[#F2E8CC]"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E0B04A]/20 pb-3">
          <h3 className="text-base font-bold font-serif text-[#14291D] dark:text-[#FAF3E0]">
            All Coupons ({filteredCoupons.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {(["all", "shared", "single_use", "active"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterType(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize cursor-pointer transition-colors ${
                  filterType === tab
                    ? "bg-[#1F3D2B] text-white"
                    : "bg-[#FAF3E0] text-[#3F4F45] border border-[#F2E8CC]"
                }`}
              >
                {tab.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F2E8CC] text-[#3F4F45]">
                <th className="py-2.5 pr-4 font-bold">Code</th>
                <th className="py-2.5 pr-4 font-bold">Type</th>
                <th className="py-2.5 pr-4 font-bold">Discount</th>
                <th className="py-2.5 pr-4 font-bold">Uses</th>
                <th className="py-2.5 pr-4 font-bold">Revenue</th>
                <th className="py-2.5 pr-4 font-bold">Status</th>
                <th className="py-2.5 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2E8CC]/60">
              {filteredCoupons.map((c) => {
                const isExpired = Boolean(c.expiresAt && Date.now() > Number(c.expiresAt));
                const maxTot = c.type === "single_use" ? 1 : c.maxTotalUses || null;
                const isExhausted = maxTot !== null && (c.usedCount || 0) >= maxTot;
                const couponLink = `${DEFAULT_STORE_ORIGIN}/?coupon=${c.code}`;

                return (
                  <tr key={c.code} className="hover:bg-[#FAF3E0]/40">
                    <td className="py-3 pr-4">
                      <span className="font-mono font-black text-sm text-[#14291D] dark:text-[#FAF3E0]">
                        {c.code}
                      </span>
                      {c.campaignTag && (
                        <span className="block text-[10px] text-[#3F4F45]">{c.campaignTag}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          c.type === "shared"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-purple-100 text-purple-900"
                        }`}
                      >
                        {c.type === "shared" ? "Shared (1x/user)" : "Single-Use"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-bold">{c.discountPercent}% Off</td>
                    <td className="py-3 pr-4 font-mono font-bold">
                      {c.usedCount || 0} / {maxTot ?? "∞"}
                    </td>
                    <td className="py-3 pr-4 font-bold text-emerald-700">
                      ₹{(Number(c.totalRevenueDriven) || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 pr-4">
                      {isExhausted ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-200 text-stone-700">
                          Used Up
                        </span>
                      ) : isExpired ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                          Expired
                        </span>
                      ) : c.isActive ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          Paused
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => copyText(couponLink, `row-${c.code}`, `Link for ${c.code}`)}
                          className="p-1.5 rounded-lg bg-[#FAF3E0] hover:bg-[#F2E8CC] text-[#14291D] border border-[#E0B04A]/40 cursor-pointer"
                          title="Copy Magic Link"
                        >
                          {copiedKey === `row-${c.code}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await saveCouponToFirestore({ ...c, isActive: !c.isActive });
                            showToast(`${c.code} ${c.isActive ? "paused" : "activated"}`);
                          }}
                          className="p-1.5 rounded-lg bg-[#FAF3E0] hover:bg-[#F2E8CC] text-[#14291D] border border-[#E0B04A]/40 cursor-pointer"
                          title={c.isActive ? "Pause Coupon" : "Activate Coupon"}
                        >
                          {c.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`Delete coupon "${c.code}" permanently?`)) {
                              await deleteCouponFromFirestore(c.code);
                              showToast(`Deleted coupon ${c.code}`);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 cursor-pointer"
                          title="Delete Coupon"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCoupons.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#3F4F45]">
                    No coupons found in this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
