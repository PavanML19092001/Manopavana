import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import {
  Lock,
  ShieldAlert,
  Settings,
  MapPin,
  ExternalLink,
  MessageCircle,
  Save,
  CheckCircle2,
  Truck,
  RotateCcw,
  Sparkles,
  Image,
  Video,
  Type,
  Phone,
  Package,
  Printer,
  Copy,
  Check,
  AlertCircle,
  Compass,
  Send,
  Activity,
  Zap,
  RefreshCw,
  Trash2,
  Search,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { BUSINESS_CONFIG } from "../constants";
import { OrderStatus, Order } from "../types";

export const AdminPage: React.FC = () => {
  const {
    currentUser,
    isAdminAuthenticated,
    authenticateAdmin,
    logoutAdmin,
    cmsConfig,
    updateCMSConfig,
    orders,
    saveOrder,
    deleteOrder,
    updateOrderStatus,
    updateOrderDetails,
    showToast,
    themeMode,
  } = useStore();

  const isDark = themeMode === "dark";

  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  // Editable config state
  const [ticker, setTicker] = useState(cmsConfig.announcementTicker);
  const [headline, setHeadline] = useState(cmsConfig.heroHeadline);
  const [subhead, setSubhead] = useState(cmsConfig.heroSubhead);
  const [tagline, setTagline] = useState(cmsConfig.brandTagline || "Pure by nature, trusted for life");
  const [logoUrl, setLogoUrl] = useState(cmsConfig.brandLogoUrl || "");
  const [videoUrl, setVideoUrl] = useState(cmsConfig.chekkuVideoUrl || "");
  const [threshold, setThreshold] = useState(cmsConfig.freeShippingThreshold);
  const [stdFee, setStdFee] = useState(cmsConfig.standardShippingFee);

  // Price overrides
  const [prices, setPrices] = useState(cmsConfig.prices);
  const [stock, setStock] = useState(cmsConfig.stock);

  // Delhivery Logistics & Porter State
  const [checkingPincode, setCheckingPincode] = useState<Record<string, boolean>>({});
  const [pincodeStatus, setPincodeStatus] = useState<
    Record<string, { serviceable: boolean; cod: boolean; prepaid: boolean; message?: string }>
  >({});
  const [manifesting, setManifesting] = useState<Record<string, boolean>>({});
  const [manifestError, setManifestError] = useState<Record<string, string>>({});
  const [fallbackAwb, setFallbackAwb] = useState<Record<string, string>>({});
  const [customAwb, setCustomAwb] = useState<Record<string, string>>({});
  const [copiedPorter, setCopiedPorter] = useState<Record<string, boolean>>({});

  const handleCheckPincode = async (orderRef: string, pincode: string) => {
    setCheckingPincode((p) => ({ ...p, [orderRef]: true }));
    try {
      const res = await fetch(`/api?action=delhivery_check_pincode&pincode=${encodeURIComponent(pincode)}`);
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setPincodeStatus((p) => ({
          ...p,
          [orderRef]: {
            serviceable: Boolean(data.serviceable),
            cod: Boolean(data.cod),
            prepaid: Boolean(data.prepaid),
            message: data.serviceable
              ? `Serviceable (${data.city || ""}, ${data.state || ""})`
              : "Not Serviceable",
          },
        }));
        showToast(
          data.serviceable
            ? `Delhivery delivers to ${pincode}! (COD: ${data.cod ? "Yes" : "No"})`
            : `Pincode ${pincode} not serviceable by Delhivery`
        );
      } else {
        showToast("Pincode check failed");
      }
    } catch {
      showToast("Network error checking Delhivery pincode");
    } finally {
      setCheckingPincode((p) => ({ ...p, [orderRef]: false }));
    }
  };

  const handleManifestDelhivery = async (order: Order) => {
    setManifesting((p) => ({ ...p, [order.orderRef]: true }));
    setManifestError((p) => ({ ...p, [order.orderRef]: "" }));

    const totalGrams =
      order.items.reduce((acc, item) => {
        const is1L = item.variant.includes("1L") || item.variant.includes("3L");
        const gramsPerUnit = is1L ? 1000 : 550;
        return acc + gramsPerUnit * item.quantity;
      }, 0) || 1000;

    try {
      const res = await fetch(`/api?action=delhivery_create_shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderRef: order.orderRef,
          customerName: order.shippingAddress.fullName || "Customer",
          phone: order.shippingAddress.phone,
          address: `${order.shippingAddress.addressLine1}${
            order.shippingAddress.landmark ? `, Near ${order.shippingAddress.landmark}` : ""
          }`,
          pincode: order.shippingAddress.pincode,
          city: order.shippingAddress.city || order.shippingAddress.district || "Bengaluru",
          state: order.shippingAddress.state || "Karnataka",
          paymentMode: order.paymentMethod === "cod" ? "COD" : "Prepaid",
          totalAmount: order.total,
          weightGrams: totalGrams,
          productsDesc: order.items.map((i) => `${i.title} (${i.variant})`).join(", "),
          quantity: order.items.reduce((acc, i) => acc + i.quantity, 0),
        }),
      });

      const data = await res.json();

      if (data.status === "SUCCESS" && data.waybill) {
        await updateOrderDetails(order.orderRef, {
          trackingNumber: data.waybill,
          courier: "Delhivery Express",
          orderStatus: "Dispatched",
        });
        showToast(`Delhivery Shipment Manifested! AWB: #${data.waybill}`);
      } else if (data.fallbackWaybill) {
        setFallbackAwb((p) => ({ ...p, [order.orderRef]: data.fallbackWaybill }));
        setManifestError((p) => ({
          ...p,
          [order.orderRef]:
            data.insufficientBalanceHelp || data.message || "Delhivery wallet recharge needed",
        }));
        showToast("Delhivery wallet needs recharge at one.delhivery.com. Fallback AWB ready!");
      } else {
        setManifestError((p) => ({
          ...p,
          [order.orderRef]:
            data.insufficientBalanceHelp || data.message || "Failed to create shipment manifest",
        }));
        showToast("Delhivery shipment booking notice");
      }
    } catch {
      setManifestError((p) => ({
        ...p,
        [order.orderRef]: "Network error connecting to Delhivery API",
      }));
      showToast("Error contacting Delhivery API");
    } finally {
      setManifesting((p) => ({ ...p, [order.orderRef]: false }));
    }
  };

  const handleApplyFallbackAwb = async (orderRef: string, awb: string) => {
    await updateOrderDetails(orderRef, {
      trackingNumber: awb,
      courier: "Delhivery Express",
      orderStatus: "Dispatched",
    });
    showToast(`Assigned Delhivery AWB: #${awb}`);
  };

  const handleSaveCustomAwb = async (orderRef: string) => {
    const awb = (customAwb[orderRef] || "").trim();
    if (!awb) {
      showToast("Please enter a valid AWB number");
      return;
    }
    await updateOrderDetails(orderRef, {
      trackingNumber: awb,
      courier: "Delhivery Express",
      orderStatus: "Dispatched",
    });
    setCustomAwb((p) => ({ ...p, [orderRef]: "" }));
    showToast(`Saved Delhivery AWB #${awb}`);
  };

  const handleCopyPorter = (order: Order) => {
    const text = `Customer: ${order.shippingAddress.fullName || "Customer"}
Phone: ${order.shippingAddress.phone}
Address: ${order.shippingAddress.addressLine1}${
      order.shippingAddress.landmark ? `, Near ${order.shippingAddress.landmark}` : ""
    }, ${order.shippingAddress.district || order.shippingAddress.city} - ${
      order.shippingAddress.pincode
    }
Items: ${order.items.map((i) => `${i.title} (${i.variant}) x${i.quantity}`).join(", ")}
Order Ref: #${order.orderRef}
Total: ₹${order.total} (${order.paymentMethod?.toUpperCase()})`;

    navigator.clipboard.writeText(text);
    setCopiedPorter((p) => ({ ...p, [order.orderRef]: true }));
    showToast("Copied customer drop details for Porter app!");
    setTimeout(() => {
      setCopiedPorter((p) => ({ ...p, [order.orderRef]: false }));
    }, 2500);
  };

  // Delhivery Logistics Diagnostic & Testing Lab State
  const [pingingApi, setPingingApi] = useState(false);
  const [pingResult, setPingResult] = useState<{
    status: string;
    authenticated: boolean;
    tokenMasked: string;
    warehouse: string;
    originPincode: string;
    sampleWaybill?: string;
    latencyMs?: number;
    message?: string;
  } | null>(null);

  const [testPincodeInput, setTestPincodeInput] = useState("400001");
  const [testPincodeLoading, setTestPincodeLoading] = useState(false);
  const [testPincodeResult, setTestPincodeResult] = useState<{
    status: string;
    serviceable: boolean;
    pincode: string | number;
    city?: string;
    district?: string;
    state?: string;
    cod?: boolean;
    prepaid?: boolean;
    message?: string;
  } | null>(null);

  const [fetchingTestAwb, setFetchingTestAwb] = useState(false);
  const [testAwbResult, setTestAwbResult] = useState<string | null>(null);

  const handlePingDelhivery = async () => {
    setPingingApi(true);
    try {
      const res = await fetch("/api?action=delhivery_test_connection");
      const data = await res.json();
      setPingResult(data);
      if (data.status === "SUCCESS") {
        showToast(`Delhivery API connected! Latency: ${data.latencyMs}ms`);
      } else {
        showToast(data.message || "Delhivery connection check failed");
      }
    } catch {
      showToast("Error connecting to Delhivery API");
    } finally {
      setPingingApi(false);
    }
  };

  const handleTestPincodeLookup = async (pinOverride?: string) => {
    const pin = (pinOverride || testPincodeInput).trim();
    if (pin.length !== 6) {
      showToast("Please enter a valid 6-digit pincode");
      return;
    }
    if (pinOverride) {
      setTestPincodeInput(pinOverride);
    }
    setTestPincodeLoading(true);
    try {
      const res = await fetch(`/api?action=delhivery_check_pincode&pincode=${encodeURIComponent(pin)}`);
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setTestPincodeResult(data);
        showToast(
          data.serviceable
            ? `Pincode ${pin} is deliverable by Delhivery!`
            : `Pincode ${pin} not serviceable by Delhivery`
        );
      } else {
        showToast("Pincode lookup failed");
      }
    } catch {
      showToast("Network error during pincode lookup");
    } finally {
      setTestPincodeLoading(false);
    }
  };

  const handleGenerateTestAwb = async () => {
    setFetchingTestAwb(true);
    try {
      const res = await fetch("/api?action=delhivery_fetch_waybill");
      const data = await res.json();
      if (data.status === "SUCCESS" && data.waybill) {
        setTestAwbResult(data.waybill);
        showToast(`Allocated Delhivery AWB: #${data.waybill}`);
      } else {
        showToast("Failed to fetch test AWB from Delhivery");
      }
    } catch {
      showToast("Error communicating with Delhivery Waybill API");
    } finally {
      setFetchingTestAwb(false);
    }
  };

  const handleCreateSampleOrder = async (isLocal: boolean) => {
    const testNum = Math.floor(1000 + Math.random() * 9000);
    const testRef = isLocal ? `BLR-TEST-${testNum}` : `NAT-TEST-${testNum}`;
    const now = Date.now();
    const sampleOrder: Order = {
      id: `order_${now}`,
      orderRef: testRef,
      date: new Date().toISOString(),
      timestamp: now,
      timestampMs: now,
      items: [
        {
          id: `item_1_${now}`,
          productId: "groundnut",
          title: "Cold Pressed Groundnut Oil",
          subtitle: "Traditional Marachekku Extra Virgin",
          variant: "1L",
          price: 360,
          regularPrice: 420,
          quantity: 2,
          image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80",
        },
        {
          id: `item_2_${now}`,
          productId: "coconut",
          title: "Cold Pressed Coconut Oil",
          subtitle: "Pure Sulphur-Free Copra",
          variant: "500ml",
          price: 240,
          regularPrice: 280,
          quantity: 1,
          image: "https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=500&auto=format&fit=crop&q=80",
        },
      ],
      subtotal: 960,
      discount: 0,
      shippingFee: 0,
      total: 960,
      orderStatus: "Placed",
      paymentMethod: isLocal ? "phonepe" : "cod",
      paymentMode: isLocal ? "PHONEPE_PAID" : "COD",
      paymentStatus: isLocal ? "COMPLETED" : "PENDING",
      shippingAddress: isLocal
        ? {
            fullName: "Ramesh Kumar (Bangalore Test)",
            phone: "9876543210",
            addressLine1: "Flat 402, Green Glen Layout, Bellandur",
            landmark: "Near EcoSpace Tech Park",
            city: "Bengaluru",
            district: "Bengaluru Urban",
            state: "Karnataka",
            pincode: "560103",
            isBangalore: true,
          }
        : {
            fullName: "Aditi Sharma (National Test)",
            phone: "9820012345",
            addressLine1: "A-501, Raheja Heights, Dindoshi",
            landmark: "Near Oberoi Mall",
            city: "Mumbai",
            district: "Mumbai Suburban",
            state: "Maharashtra",
            pincode: "400063",
            isBangalore: false,
          },
    };

    await saveOrder(sampleOrder);
    showToast(`Created sample ${isLocal ? "Bengaluru Local" : "National (Delhivery Express)"} order #${testRef}!`);
  };

  const handleClearSampleOrders = async () => {
    const testOrders = orders.filter((o) => o.orderRef.includes("TEST"));
    if (testOrders.length === 0) {
      showToast("No test orders found in queue");
      return;
    }
    for (const ord of testOrders) {
      await deleteOrder(ord.orderRef);
    }
    showToast(`Removed ${testOrders.length} test order(s)`);
  };

  // Keep state in sync with real-time Firestore updates
  useEffect(() => {
    setTicker(cmsConfig.announcementTicker);
    setHeadline(cmsConfig.heroHeadline);
    setSubhead(cmsConfig.heroSubhead);
    setTagline(cmsConfig.brandTagline || "Pure by nature, trusted for life");
    setLogoUrl(cmsConfig.brandLogoUrl || "");
    setVideoUrl(cmsConfig.chekkuVideoUrl || "");
    setThreshold(cmsConfig.freeShippingThreshold);
    setStdFee(cmsConfig.standardShippingFee);
    setPrices(cmsConfig.prices);
    setStock(cmsConfig.stock);
  }, [cmsConfig]);

  // STRICT ACCESS SECURITY GATE
  // If not logged in as manopavana@gmail.com, immediately redirect to Home page
  if (!currentUser || currentUser.email !== "manopavana@gmail.com") {
    return <Navigate to="/" replace />;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = authenticateAdmin(pinInput);
    if (!ok) {
      setPinError(true);
    } else {
      setPinError(false);
      showToast("Admin session unlocked!");
    }
  };

  const handleSaveStorefront = (e: React.FormEvent) => {
    e.preventDefault();
    updateCMSConfig((prev) => ({
      ...prev,
      announcementTicker: ticker,
      heroHeadline: headline,
      heroSubhead: subhead,
      brandTagline: tagline,
      brandLogoUrl: logoUrl,
      chekkuVideoUrl: videoUrl,
      freeShippingThreshold: Number(threshold),
      standardShippingFee: Number(stdFee),
      prices,
      stock,
    }));
    showToast("Storefront copy, branding & prices saved to Firestore live!");
  };

  const handleToggleStock = (key: keyof typeof stock) => {
    setStock((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // If logged in as manopavana@gmail.com, require PIN 1234
  if (!isAdminAuthenticated) {
    return (
      <div
        className={`w-full min-h-[calc(100vh-80px)] py-20 flex items-center justify-center transition-colors px-4 box-border ${
          isDark ? "bg-[#140D09] text-[#FAF4EA]" : "bg-[#FAF7F2] text-[#24140A]"
        }`}
      >
        <div className="w-full max-w-md mx-auto text-center">
          <div
            className={`p-8 rounded-3xl border shadow-xl space-y-6 ${
              isDark
                ? "bg-[#1C120B] border-[#362114]"
                : "bg-white border-[#E8DEC8]"
            }`}
          >
            <div
              className={`w-16 h-16 mx-auto rounded-full border flex items-center justify-center ${
                isDark
                  ? "bg-[#150D07] border-[#362114]"
                  : "bg-[#FAF6EE] border-[#DDD1BE]"
              }`}
            >
              <Lock className="w-8 h-8 text-[#E08F35]" />
            </div>

            <div className="space-y-1">
              <h1
                className={`text-xl font-bold font-serif ${
                  isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                }`}
              >
                MANOPAVANA Administrator Gate
              </h1>
              <p
                className={`text-xs ${
                  isDark ? "text-[#D8C8B8]" : "text-[#5C4230]"
                }`}
              >
                Logged in as{" "}
                <span
                  className={`font-semibold ${
                    isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                  }`}
                >
                  {currentUser.email}
                </span>
                . Enter PIN to unlock live CMS & dispatch hub.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="Enter 4-digit PIN (1234)"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  className={`w-full text-center tracking-widest text-lg font-mono font-bold px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 transition-colors ${
                    isDark
                      ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA] placeholder-[#8A7665]"
                      : "bg-[#FAF7F2] border border-[#DDD1BE] text-[#1F120A] placeholder-[#8A7665]"
                  }`}
                />
                {pinError && (
                  <p className="text-xs text-red-500 font-semibold mt-1.5">
                    Invalid PIN. Enter secret administrator PIN (1234).
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Unlock Administration Portal
              </button>
            </form>

            <p
              className={`text-[11px] ${
                isDark ? "text-[#A89482]" : "text-[#7A5E48]"
              }`}
            >
              Authorized Facility: Peenya 2nd Stage, Bangalore
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full min-h-[calc(100vh-80px)] py-8 transition-colors box-border ${
        isDark ? "bg-[#140D09] text-[#FAF4EA]" : "bg-[#FAF7F2] text-[#24140A]"
      }`}
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 box-border">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#3D2514] text-white p-6 rounded-3xl shadow-lg">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-[#E08F35]/20 text-[#E08F35]">
            <ShieldAlert className="w-6 h-6 text-[#E08F35]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-serif">
                MANOPAVANA Live Storefront CMS & Dispatch Hub
              </h1>
              <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                <Sparkles className="w-3 h-3" />
                Live Two-Way Sync
              </span>
            </div>
            <p className="text-xs text-[#D6C4B0] mt-0.5">
              Admin: {currentUser.email} • Facility: {BUSINESS_CONFIG.FACILITY_ADDRESS}
            </p>
          </div>
        </div>

        <button
          onClick={logoutAdmin}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold transition-colors cursor-pointer shrink-0"
        >
          Lock / Logout
        </button>
      </div>

      {/* Delhivery Logistics Integration Hub & Testing Sandbox */}
      <div
        className={`rounded-3xl border p-6 shadow-sm space-y-5 transition-colors ${
          isDark ? "bg-[#1A1009] border-[#3B2516]" : "bg-white border-[#E8DFC8]"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#E08F35]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-serif text-[#1F120A] dark:text-[#FAF4EA]">
                  Delhivery Logistics Engine & Testing Lab
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  API Active
                </span>
              </div>
              <p className="text-xs text-[#6A523E] dark:text-[#C4B29E]">
                Token: <span className="font-mono font-semibold">6d43e0...fc9a</span> • Registered Warehouse:{" "}
                <span className="font-semibold text-amber-700 dark:text-amber-400">
                  MANOPAVANA_PEENYA (Bangalore 560058)
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePingDelhivery}
              disabled={pingingApi}
              className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-[#5E3210] dark:text-amber-200 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Activity className={`w-3.5 h-3.5 text-[#E08F35] ${pingingApi ? "animate-spin" : ""}`} />
              <span>{pingingApi ? "Testing Connection..." : "Ping Delhivery API"}</span>
            </button>

            <a
              href="https://one.delhivery.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-[#1F120A] dark:text-[#FAF4EA] text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <span>Delhivery One Portal</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
          </div>
        </div>

        {/* Live Ping Health Status Banner if pinged */}
        {pingResult && (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex flex-wrap items-center justify-between gap-3 ${
              pingResult.authenticated
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                : "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <div>
                <span className="font-bold">Live API Status: {pingResult.message}</span>
                <span className="block text-[11px] opacity-80 font-mono">
                  Origin Hub: {pingResult.originPincode} • Registered Warehouse: {pingResult.warehouse} • Latency: {pingResult.latencyMs}ms
                </span>
              </div>
            </div>
            {pingResult.sampleWaybill && (
              <span className="px-2.5 py-1 rounded bg-white/60 dark:bg-black/40 font-mono text-[11px] font-bold border border-emerald-500/20">
                Waybill Reserved: #{pingResult.sampleWaybill}
              </span>
            )}
          </div>
        )}

        {/* Diagnostic Testing Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Tool 1: Live Pincode Serviceability Tester */}
          <div
            className={`p-4 rounded-2xl border space-y-3 ${
              isDark ? "bg-[#140D07] border-[#2D1B10]" : "bg-[#FAF8F5] border-[#E8DEC8]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5 text-[#1F120A] dark:text-[#FAF4EA]">
                <Search className="w-3.5 h-3.5 text-[#E08F35]" />
                1. Test Any Pincode
              </span>
              <span className="text-[10px] text-stone-500">Serviceability Check</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={6}
                value={testPincodeInput}
                onChange={(e) => setTestPincodeInput(e.target.value)}
                placeholder="6-digit pincode"
                className="w-full px-3 py-1.5 text-xs font-mono rounded-xl bg-white dark:bg-[#1E130B] border border-stone-300 dark:border-stone-700 text-[#1F120A] dark:text-[#FAF4EA] focus:outline-none focus:ring-1 focus:ring-[#E08F35]"
              />
              <button
                type="button"
                onClick={() => handleTestPincodeLookup()}
                disabled={testPincodeLoading}
                className="px-3 py-1.5 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white text-xs font-bold transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                {testPincodeLoading ? "Checking..." : "Check"}
              </button>
            </div>

            {/* Quick Pincode Presets */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {[
                { label: "Mumbai", pin: "400001" },
                { label: "Delhi", pin: "110001" },
                { label: "Mysuru", pin: "570001" },
                { label: "Bangalore", pin: "560001" },
              ].map((p) => (
                <button
                  key={p.pin}
                  type="button"
                  onClick={() => handleTestPincodeLookup(p.pin)}
                  className="text-[10px] px-2 py-0.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:border-amber-500 text-stone-600 dark:text-stone-300 cursor-pointer"
                >
                  {p.label} ({p.pin})
                </button>
              ))}
            </div>

            {testPincodeResult && (
              <div
                className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
                  testPincodeResult.serviceable
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                    : "bg-red-500/10 border-red-500/20 text-red-800 dark:text-red-300"
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>Pin {testPincodeResult.pincode}: {testPincodeResult.serviceable ? "Serviceable ✓" : "Not Serviceable ✗"}</span>
                  {testPincodeResult.serviceable && (
                    <span className="text-[10px] uppercase font-mono">{testPincodeResult.city}, {testPincodeResult.state}</span>
                  )}
                </div>
                {testPincodeResult.serviceable && (
                  <div className="flex gap-2 text-[10px] opacity-90">
                    <span>COD: {testPincodeResult.cod ? "✓ Available" : "✗ No"}</span>
                    <span>Prepaid: {testPincodeResult.prepaid ? "✓ Available" : "✗ No"}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tool 2: Test Live Waybill Generation */}
          <div
            className={`p-4 rounded-2xl border space-y-3 ${
              isDark ? "bg-[#140D07] border-[#2D1B10]" : "bg-[#FAF8F5] border-[#E8DEC8]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5 text-[#1F120A] dark:text-[#FAF4EA]">
                <Zap className="w-3.5 h-3.5 text-[#E08F35]" />
                2. Test Waybill / AWB Allocator
              </span>
              <span className="text-[10px] text-stone-500">Live API</span>
            </div>
            <p className="text-[11px] text-[#6A523E] dark:text-[#C4B29E]">
              Tests Delhivery's live Waybill allocation engine to verify that your account can reserve official tracking numbers.
            </p>

            <button
              type="button"
              onClick={handleGenerateTestAwb}
              disabled={fetchingTestAwb}
              className="w-full py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-[#5E3210] dark:text-amber-200 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetchingTestAwb ? "animate-spin" : ""}`} />
              <span>{fetchingTestAwb ? "Allocating Waybill..." : "Request Live Test AWB"}</span>
            </button>

            {testAwbResult && (
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#1E130B] border border-emerald-500/30 text-[11px] space-y-1">
                <span className="font-bold text-emerald-600 block">Delhivery AWB Reserved:</span>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs">#{testAwbResult}</span>
                  <a
                    href={`https://www.delhivery.com/track/package/${testAwbResult}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-0.5 text-[10px] font-bold"
                  >
                    <span>Check Tracking</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Tool 3: Simulate Orders (Test Without Buying!) */}
          <div
            className={`p-4 rounded-2xl border space-y-3 ${
              isDark ? "bg-[#140D07] border-[#2D1B10]" : "bg-[#FAF8F5] border-[#E8DEC8]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5 text-[#1F120A] dark:text-[#FAF4EA]">
                <Package className="w-3.5 h-3.5 text-[#E08F35]" />
                3. Test Without Placing Order
              </span>
              <span className="text-[10px] text-emerald-600 font-bold">1-Click Seed</span>
            </div>
            <p className="text-[11px] text-[#6A523E] dark:text-[#C4B29E]">
              Generate a realistic test order in your delivery dispatch queue below to try the full manifest, label printing, and WhatsApp dispatch!
            </p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleCreateSampleOrder(false)}
                className="w-full py-1.5 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Truck className="w-3 h-3 text-amber-300" />
                <span>+ Seed Outside-Bengaluru Order</span>
              </button>

              <button
                type="button"
                onClick={() => handleCreateSampleOrder(true)}
                className="w-full py-1.5 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-[#1F120A] dark:text-[#FAF4EA] text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MapPin className="w-3 h-3 text-[#E08F35]" />
                <span>+ Seed Bengaluru Local Order</span>
              </button>
            </div>

            {orders.some((o) => o.orderRef.includes("TEST")) && (
              <button
                type="button"
                onClick={handleClearSampleOrders}
                className="text-[10px] text-red-500 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer pt-0.5 mx-auto"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear All Test Orders</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Storefront Copy, Branding, Shipping & Price Toggler */}
        <div className="lg:col-span-6 space-y-6">
          <div
            className={`rounded-2xl border p-6 shadow-2xs space-y-5 ${
              isDark
                ? "bg-[#1C120B] border-[#362114]"
                : "bg-white border-[#E8DEC8]"
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-3 ${
                isDark ? "border-[#2D1B10]" : "border-[#EFE8DC]"
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#E08F35]" />
                <h2
                  className={`text-sm font-bold font-serif ${
                    isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                  }`}
                >
                  Global Branding, Copy & Pricing
                </h2>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  isDark
                    ? "bg-[#150D07] border-[#362114] text-[#A89482]"
                    : "bg-[#FAF6EE] border-[#E8DEC8] text-[#6A523E]"
                }`}
              >
                settings/store_config
              </span>
            </div>

            <form onSubmit={handleSaveStorefront} className="space-y-4 text-xs">
              {/* Top Announcement Ticker */}
              <div>
                <label
                  className={`block font-semibold mb-1 ${
                    isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"
                  }`}
                >
                  Announcement Bar Ticker Text
                </label>
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 transition-colors ${
                    isDark
                      ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                      : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                  }`}
                />
              </div>

              {/* Brand Tagline */}
              <div>
                <label
                  className={`block font-semibold mb-1 flex items-center gap-1.5 ${
                    isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"
                  }`}
                >
                  <Type className="w-3.5 h-3.5 text-[#E08F35]" />
                  Brand Tagline (Under MANOPAVANA logo)
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Pure by nature, trusted for life"
                  className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 transition-colors ${
                    isDark
                      ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                      : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                  }`}
                />
              </div>

              {/* Logo URL */}
              <div>
                <label
                  className={`block font-semibold mb-1 flex items-center gap-1.5 ${
                    isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"
                  }`}
                >
                  <Image className="w-3.5 h-3.5 text-[#E08F35]" />
                  Brand Logo Image URL
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className={`w-full px-3.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 font-mono text-[11px] transition-colors ${
                    isDark
                      ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                      : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                  }`}
                />
              </div>

              {/* Hero Video URL */}
              <div>
                <label
                  className={`block font-semibold mb-1 flex items-center gap-1.5 ${
                    isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"
                  }`}
                >
                  <Video className="w-3.5 h-3.5 text-[#E08F35]" />
                  Background Chekku Video URL (Hero section)
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://..."
                  className={`w-full px-3.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 font-mono text-[11px] transition-colors ${
                    isDark
                      ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                      : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                  }`}
                />
              </div>

              {/* Hero Headline */}
              <div>
                <label
                  className={`block font-semibold mb-1 ${
                    isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"
                  }`}
                >
                  Hero Headline
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 transition-colors ${
                    isDark
                      ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                      : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                  }`}
                />
              </div>

              {/* Hero Subhead */}
              <div>
                <label
                  className={`block font-semibold mb-1 ${
                    isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"
                  }`}
                >
                  Hero Subhead Paragraph
                </label>
                <textarea
                  rows={3}
                  value={subhead}
                  onChange={(e) => setSubhead(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 transition-colors ${
                    isDark
                      ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                      : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                  }`}
                />
              </div>

              {/* Shipping Controls */}
              <div
                className={`grid grid-cols-2 gap-4 pt-2 border-t ${
                  isDark ? "border-[#2D1B10]" : "border-[#EFE8DC]"
                }`}
              >
                <div>
                  <label
                    className={`block font-semibold mb-1 ${
                      isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"
                    }`}
                  >
                    Free Delivery Threshold (₹)
                  </label>
                  <input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className={`w-full px-3.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 transition-colors ${
                      isDark
                        ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                        : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`block font-semibold mb-1 ${
                      isDark ? "text-[#FAF4EA]" : "text-[#4A3220]"
                    }`}
                  >
                    Standard Delivery Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={stdFee}
                    onChange={(e) => setStdFee(Number(e.target.value))}
                    className={`w-full px-3.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 transition-colors ${
                      isDark
                        ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                        : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                    }`}
                  />
                </div>
              </div>

              {/* Price & Stock toggles */}
              <div
                className={`pt-3 border-t space-y-3 ${
                  isDark ? "border-[#2D1B10]" : "border-[#EFE8DC]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3
                    className={`font-bold ${
                      isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                    }`}
                  >
                    Catalog Pricing & Live Stock Control
                  </h3>
                  <span
                    className={`text-[10px] ${
                      isDark ? "text-[#A89482]" : "text-[#7A5E48]"
                    }`}
                  >
                    Click badge to toggle stock
                  </span>
                </div>

                <div className="space-y-2">
                  {[
                    { key: "groundnut1L", name: "Groundnut Oil 1L", priceKey: "groundnut1L" },
                    { key: "groundnut500ml", name: "Groundnut Oil 500ml", priceKey: "groundnut500ml" },
                    { key: "coconut1L", name: "Coconut Oil 1L", priceKey: "coconut1L" },
                    { key: "coconut500ml", name: "Coconut Oil 500ml", priceKey: "coconut500ml" },
                    { key: "sesame1L", name: "Sesame Oil 1L", priceKey: "sesame1L" },
                    { key: "sesame500ml", name: "Sesame Oil 500ml", priceKey: "sesame500ml" },
                    { key: "combo3L", name: "3L Trio Essential Box", priceKey: "combo3L" },
                    { key: "combo1_5L", name: "1.5L Trio Starter Box", priceKey: "combo1_5L" },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                        isDark
                          ? "bg-[#150D07] border-[#362114]"
                          : "bg-[#FAF6EE] border-[#E5DAC8]"
                      }`}
                    >
                      <span
                        className={`font-semibold ${
                          isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                        }`}
                      >
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={isDark ? "text-[#A89482]" : "text-[#7A5E48]"}>
                          ₹
                        </span>
                        <input
                          type="number"
                          value={prices[item.priceKey as keyof typeof prices]}
                          onChange={(e) =>
                            setPrices({ ...prices, [item.priceKey]: Number(e.target.value) })
                          }
                          className={`w-20 px-2 py-1 rounded-lg text-right font-bold ${
                            isDark
                              ? "bg-[#1C120B] border border-[#3A2417] text-[#E08F35]"
                              : "bg-white border border-[#DDD1BE] text-[#5E3210]"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => handleToggleStock(item.key as keyof typeof stock)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors shadow-2xs ${
                            stock[item.key as keyof typeof stock]
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-red-600 hover:bg-red-700 text-white"
                          }`}
                        >
                          {stock[item.key as keyof typeof stock] ? "In Stock" : "Sold Out"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4 text-amber-300" />
                <span>Save Live CMS Changes (Propagate Everywhere)</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right: Live Incoming Orders & Direct Google Maps Route */}
        <div className="lg:col-span-6 space-y-4">
          <div
            className={`rounded-2xl border p-6 shadow-2xs space-y-4 ${
              isDark
                ? "bg-[#1C120B] border-[#362114]"
                : "bg-white border-[#E8DEC8]"
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-3 ${
                isDark ? "border-[#2D1B10]" : "border-[#EFE8DC]"
              }`}
            >
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#E08F35]" />
                <h2
                  className={`text-sm font-bold font-serif ${
                    isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                  }`}
                >
                  Live Orders & Delivery Dispatch Queue ({orders.length})
                </h2>
              </div>
              <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Real-Time Firestore
              </span>
            </div>

            {orders.length === 0 ? (
              <div
                className={`p-8 text-center space-y-2 ${
                  isDark ? "text-[#A89482]" : "text-[#6A523E]"
                }`}
              >
                <Package className="w-8 h-8 mx-auto text-[#DDD1BE]" />
                <p className="text-xs font-semibold">No customer orders placed yet</p>
                <p className="text-[11px] opacity-80">
                  New orders will automatically appear here in real time as customers complete checkout.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[750px] overflow-y-auto pr-1">
                {orders.map((ord) => {
                  const mapsQuery = ord.shippingAddress.lat && ord.shippingAddress.lng
                    ? `${ord.shippingAddress.lat},${ord.shippingAddress.lng}`
                    : encodeURIComponent(
                        `${ord.shippingAddress.addressLine1}, ${
                          ord.shippingAddress.district || ord.shippingAddress.city || "Bengaluru"
                        } ${ord.shippingAddress.pincode}`
                      );
                  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

                  const cleanPhone = (ord.shippingAddress.phone || "").replace(/\D/g, "").slice(-10);
                  const waText = encodeURIComponent(
                    `Hi ${ord.shippingAddress.fullName || "Customer"}, your MANOPAVANA order #${
                      ord.orderRef
                    } is currently: ${ord.orderStatus}. Tracking: ${window.location.origin}/account?order=${
                      ord.orderRef
                    }`
                  );
                  const waUrl = `https://wa.me/91${cleanPhone}?text=${waText}`;

                  return (
                    <div
                      key={ord.orderRef}
                      className={`p-4 rounded-2xl border space-y-3 shadow-2xs ${
                        isDark
                          ? "bg-[#150D07] border-[#362114]"
                          : "bg-[#FAF7F2] border-[#E8DEC8]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold ${
                                isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                              }`}
                            >
                              #{ord.orderRef}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                isDark
                                  ? "bg-[#1C120B] border-[#3D2514] text-[#E08F35]"
                                  : "bg-white border-[#DDD1BE] text-[#5E3210]"
                              }`}
                            >
                              ₹{ord.total}
                            </span>
                            <span
                              className={`text-[10px] ${
                                isDark ? "text-[#A89482]" : "text-[#7A5E48]"
                              }`}
                            >
                              {ord.paymentMethod?.toUpperCase()}
                            </span>
                            {ord.orderRef.includes("TEST") && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                                SIMULATED TEST
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-[11px] mt-0.5 ${
                              isDark ? "text-[#D8C8B8]" : "text-[#6A523E]"
                            }`}
                          >
                            {ord.shippingAddress.fullName || "Customer"} • {ord.shippingAddress.phone}
                          </p>
                        </div>

                        {/* Status Selector with quick remove for test orders */}
                        <div className="flex items-center gap-1.5">
                          {ord.orderRef.includes("TEST") && (
                            <button
                              type="button"
                              onClick={() => deleteOrder(ord.orderRef)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 border border-red-500/20 transition-colors cursor-pointer shrink-0"
                              title="Delete this test order"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <select
                            value={ord.orderStatus}
                            onChange={(e) =>
                              updateOrderStatus(ord.id, e.target.value as OrderStatus)
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold focus:ring-1 focus:ring-[#E08F35] ${
                              isDark
                                ? "bg-[#1C120B] border border-[#3D2514] text-amber-200"
                                : "bg-white border border-[#DDD1BE] text-[#5E3210]"
                            }`}
                          >
                            <option value="Placed">Placed</option>
                            <option value="Payment Incomplete">Payment Incomplete</option>
                            <option value="Packed">Packed</option>
                            <option value="Dispatched">Dispatched</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Failed (Expired)">Failed (Expired)</option>
                          </select>
                        </div>
                      </div>

                      {/* Items Ordered Summary */}
                      <div
                        className={`text-[11px] p-2.5 rounded-xl border space-y-1 ${
                          isDark
                            ? "bg-[#1C120B] border-[#362114] text-[#D8C8B8]"
                            : "bg-white border-[#EFE8DC] text-[#4A3220]"
                        }`}
                      >
                        <span
                          className={`font-semibold block ${
                            isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                          }`}
                        >
                          Ordered Items ({ord.items.length}):
                        </span>
                        <ul className="list-disc list-inside space-y-0.5">
                          {ord.items.map((it, idx) => (
                            <li key={idx}>
                              {it.title} ({it.variant}) × {it.quantity} — ₹{it.price * it.quantity}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Delivery Address */}
                      <div
                        className={`text-[11px] p-2.5 rounded-xl border space-y-1 ${
                          isDark
                            ? "bg-[#1C120B] border-[#362114] text-[#D8C8B8]"
                            : "bg-white border-[#EFE8DC] text-[#4A3220]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-semibold block ${
                              isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                            }`}
                          >
                            Delivery Drop Address:
                          </span>
                          {/* Route Destination Badge */}
                          {(() => {
                            const isLocal = Boolean(
                              ord.shippingAddress?.isBangalore ||
                              (ord.shippingAddress?.pincode && ord.shippingAddress.pincode.startsWith("560")) ||
                              ord.shippingAddress?.city?.toLowerCase().includes("bangalore") ||
                              ord.shippingAddress?.city?.toLowerCase().includes("bengaluru")
                            );
                            return isLocal ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-bold text-[10px] border border-amber-500/20">
                                <MapPin className="w-2.5 h-2.5" />
                                Bengaluru Local
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold text-[10px] border border-blue-500/20">
                                <Truck className="w-2.5 h-2.5" />
                                Outside Bengaluru • Delhivery
                              </span>
                            );
                          })()}
                        </div>
                        <p>
                          {ord.shippingAddress.addressLine1}
                          {ord.shippingAddress.landmark ? `, Near ${ord.shippingAddress.landmark}` : ""}
                          , {ord.shippingAddress.district || ord.shippingAddress.city} -{" "}
                          {ord.shippingAddress.pincode}
                        </p>
                      </div>

                      {/* DELHIVERY DISPATCH & LOGISTICS ENGINE */}
                      <div
                        className={`p-3 rounded-xl border space-y-2.5 text-xs ${
                          isDark
                            ? "bg-[#191009] border-[#3D2514]"
                            : "bg-[#F7F2E8] border-[#DFD4BF]"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-bold">
                            <Truck className="w-3.5 h-3.5 text-[#E08F35]" />
                            <span className={isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"}>
                              Delhivery Logistics Hub
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 font-normal">
                              Token Active
                            </span>
                          </div>

                          {/* Quick Pincode Serviceability Check */}
                          <div className="flex items-center gap-2">
                            {pincodeStatus[ord.orderRef] ? (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  pincodeStatus[ord.orderRef].serviceable
                                    ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                                    : "bg-red-500/15 text-red-600 border border-red-500/30"
                                }`}
                              >
                                {pincodeStatus[ord.orderRef].serviceable
                                  ? `Delhivery Deliverable (COD: ${
                                      pincodeStatus[ord.orderRef].cod ? "Yes" : "No"
                                    })`
                                  : "Delhivery Not Serviceable"}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  handleCheckPincode(
                                    ord.orderRef,
                                    ord.shippingAddress.pincode
                                  )
                                }
                                disabled={checkingPincode[ord.orderRef]}
                                className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                                  isDark
                                    ? "bg-[#1C120B] border-[#3D2514] text-[#E08F35] hover:bg-[#28180E]"
                                    : "bg-white border-[#DDD1BE] text-[#5E3210] hover:bg-[#FAF6EE]"
                                }`}
                              >
                                {checkingPincode[ord.orderRef]
                                  ? "Checking..."
                                  : `Verify Pin ${ord.shippingAddress.pincode}`}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* If shipment already manifested / has AWB tracking number */}
                        {ord.trackingNumber ? (
                          <div
                            className={`p-2.5 rounded-lg border space-y-2 ${
                              isDark
                                ? "bg-[#140D07] border-[#362114]"
                                : "bg-white border-[#E5DAC8]"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-bold text-emerald-600 block flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Shipment Booked ({ord.courier || "Delhivery Express"})
                                </span>
                                <span
                                  className={`font-mono text-xs font-bold ${
                                    isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                                  }`}
                                >
                                  AWB: {ord.trackingNumber}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <a
                                  href={`https://www.delhivery.com/track/package/${ord.trackingNumber}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-2xs"
                                >
                                  <span>Track on Delhivery</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>

                                <a
                                  href={`https://track.delhivery.com/api/p/packing_slip?wbns=${ord.trackingNumber}&pdf=true`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] flex items-center gap-1 transition-colors ${
                                    isDark
                                      ? "bg-[#1E130B] border-[#3D2514] text-[#FAF4EA] hover:bg-[#2A1A0F]"
                                      : "bg-[#FAF6EE] border-[#DDD1BE] text-[#1F120A] hover:bg-[#EFE8DC]"
                                  }`}
                                  title="Print Packing Slip Label"
                                >
                                  <Printer className="w-2.5 h-2.5 text-[#E08F35]" />
                                  <span>Print Label</span>
                                </a>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* If shipment not manifested yet */
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleManifestDelhivery(ord)}
                                disabled={manifesting[ord.orderRef]}
                                className="px-3 py-1.5 rounded-lg bg-[#5E3210] hover:bg-[#43230A] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              >
                                <Truck className="w-3.5 h-3.5 text-amber-300" />
                                <span>
                                  {manifesting[ord.orderRef]
                                    ? "Connecting Delhivery API..."
                                    : "⚡ 1-Click Manifest with Delhivery"}
                                </span>
                              </button>

                              {/* Manual AWB Entry Toggle / Input */}
                              <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                                <input
                                  type="text"
                                  placeholder="Or paste AWB from Delhivery One..."
                                  value={customAwb[ord.orderRef] || ""}
                                  onChange={(e) =>
                                    setCustomAwb((p) => ({
                                      ...p,
                                      [ord.orderRef]: e.target.value,
                                    }))
                                  }
                                  className={`flex-1 px-2.5 py-1 text-xs rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#E08F35] ${
                                    isDark
                                      ? "bg-[#140D07] border border-[#362114] text-[#FAF4EA] placeholder-[#8A7665]"
                                      : "bg-white border border-[#DDD1BE] text-[#1F120A] placeholder-[#8A7665]"
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveCustomAwb(ord.orderRef)}
                                  className="px-2.5 py-1 rounded-lg bg-stone-700 hover:bg-stone-800 text-white text-[11px] font-bold cursor-pointer transition-colors shrink-0"
                                >
                                  Save AWB
                                </button>
                              </div>
                            </div>

                            {/* Insufficient balance notice or error explanation */}
                            {manifestError[ord.orderRef] && (
                              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] space-y-1">
                                <div className="flex items-center gap-1 font-bold">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>Delhivery Dispatch Alert:</span>
                                </div>
                                <p className="opacity-90">{manifestError[ord.orderRef]}</p>
                                {fallbackAwb[ord.orderRef] && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleApplyFallbackAwb(
                                        ord.orderRef,
                                        fallbackAwb[ord.orderRef]
                                      )
                                    }
                                    className="mt-1 px-2.5 py-1 rounded bg-[#5E3210] text-white font-bold text-[10px] cursor-pointer hover:bg-[#43230A]"
                                  >
                                    Assign Generated AWB #{fallbackAwb[ord.orderRef]} & Mark Dispatched
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action buttons (Maps, Porter Copy, WhatsApp) */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                              isDark
                                ? "bg-[#1C120B] border-[#362114] text-amber-200 hover:border-[#E08F35]"
                                : "bg-white border-[#DDD1BE] hover:border-[#E08F35] text-[#5E3210]"
                            }`}
                          >
                            <MapPin className="w-3.5 h-3.5 text-[#E08F35]" />
                            <span>Google Maps Pin</span>
                            <ExternalLink className="w-3 h-3 text-[#A69788]" />
                          </a>

                          {/* 1-Click Porter Address Formatter & Copier */}
                          <button
                            type="button"
                            onClick={() => handleCopyPorter(ord)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                              copiedPorter[ord.orderRef]
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                                : isDark
                                ? "bg-[#1C120B] border-[#362114] text-[#FAF4EA] hover:border-[#E08F35]"
                                : "bg-white border-[#DDD1BE] hover:border-[#E08F35] text-[#1F120A]"
                            }`}
                            title="Copy customer name, phone and address formatted for Porter"
                          >
                            {copiedPorter[ord.orderRef] ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-[#E08F35]" />
                            )}
                            <span>
                              {copiedPorter[ord.orderRef]
                                ? "Copied for Porter!"
                                : "Copy for Porter"}
                            </span>
                          </button>
                        </div>

                        {/* WhatsApp Dispatch Button */}
                        <a
                          href={
                            ord.trackingNumber
                              ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
                                  `Hi ${
                                    ord.shippingAddress.fullName || "Customer"
                                  }, your MANOPAVANA order #${
                                    ord.orderRef
                                  } has been dispatched via Delhivery Express! Track your parcel live here: https://www.delhivery.com/track/package/${
                                    ord.trackingNumber
                                  }`
                                )}`
                              : waUrl
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>
                            {ord.trackingNumber
                              ? "WhatsApp Delhivery Tracking"
                              : "WhatsApp Dispatch"}
                          </span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};
