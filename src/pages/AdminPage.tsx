import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { StorefrontCMSPanel } from "../components/admin/StoreFrontCmsPanel";

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
  Eye,
  Key,
  HelpCircle,
  Info,
  Globe,
  FileText,
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
    adminOrders,
    saveOrder,
    deleteOrder,
    updateOrderStatus,
    updateOrderDetails,
    showToast,
    themeMode,
    togglePreviewStorefront,
  } = useStore();

  const isDark = themeMode === "dark";

  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [showCloudflareGuide, setShowCloudflareGuide] = useState(false);

  // Editable config state
  const [ticker, setTicker] = useState(cmsConfig?.announcementTicker || "");
  const [headline, setHeadline] = useState(cmsConfig?.heroHeadline || "");
  const [subhead, setSubhead] = useState(cmsConfig?.heroSubhead || "");
  const [tagline, setTagline] = useState(cmsConfig?.brandTagline || "Pure by nature, trusted for life");
  const [logoUrl, setLogoUrl] = useState(cmsConfig?.brandLogoUrl || "");
  const [videoUrl, setVideoUrl] = useState(cmsConfig?.chekkuVideoUrl || "");
  const [threshold, setThreshold] = useState(cmsConfig?.freeShippingThreshold ?? 500);
  const [stdFee, setStdFee] = useState(cmsConfig?.standardShippingFee ?? 49);

  // Expanded Business Credentials & Contact State
  const [founderName, setFounderName] = useState(cmsConfig?.founderName || BUSINESS_CONFIG.FOUNDER_NAME);
  const [primaryPhone, setPrimaryPhone] = useState(cmsConfig?.primaryPhone || BUSINESS_CONFIG.PRIMARY_PHONE);
  const [altPhone, setAltPhone] = useState(cmsConfig?.altPhone || BUSINESS_CONFIG.ALT_PHONE);
  const [email, setEmail] = useState(cmsConfig?.email || BUSINESS_CONFIG.EMAIL);
  const [facilityAddress, setFacilityAddress] = useState(cmsConfig?.facilityAddress || BUSINESS_CONFIG.FACILITY_ADDRESS);
  const [fssaiLicense, setFssaiLicense] = useState(cmsConfig?.fssaiLicense || BUSINESS_CONFIG.FSSAI_LICENSE);
  const [gstin, setGstin] = useState(cmsConfig?.gstin || BUSINESS_CONFIG.GSTIN);
  const [blrNotice, setBlrNotice] = useState(
    cmsConfig?.bangaloreDeliveryNotice || "Same-Day / Next-Day Direct Courier from Peenya Facility"
  );

  // Price overrides
  const [prices, setPrices] = useState(cmsConfig?.prices || {});
  const [stock, setStock] = useState(cmsConfig?.stock || {});

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

  // Bangalore Local Manual Tracking State
  const [blrCourier, setBlrCourier] = useState<Record<string, string>>({});
  const [blrNotes, setBlrNotes] = useState<Record<string, string>>({});
  const [blrTracking, setBlrTracking] = useState<Record<string, string>>({});
  const [blrStatus, setBlrStatus] = useState<Record<string, OrderStatus>>({});
  const [savedSuccessRef, setSavedSuccessRef] = useState<Record<string, boolean>>({});

  const handleSaveBlrTracking = async (orderRef: string, currentOrd: Order) => {
    try {
      const courierVal =
        blrCourier[orderRef] !== undefined
          ? blrCourier[orderRef]
          : currentOrd.courier || "MANOPAVANA Peenya Direct Fleet";
      const notesVal =
        blrNotes[orderRef] !== undefined ? blrNotes[orderRef] : currentOrd.notes || "";
      const trackingVal =
        blrTracking[orderRef] !== undefined
          ? blrTracking[orderRef]
          : currentOrd.trackingNumber || "";
      const statusVal = blrStatus[orderRef] || currentOrd.orderStatus || "Dispatched";

      await updateOrderDetails(orderRef, {
        courier: courierVal,
        notes: notesVal,
        trackingNumber: trackingVal,
        orderStatus: statusVal,
      });

      setSavedSuccessRef((p) => ({ ...p, [orderRef]: true }));
      setTimeout(() => {
        setSavedSuccessRef((p) => ({ ...p, [orderRef]: false }));
      }, 4000);
      showToast(`Bengaluru tracking details saved for #${orderRef}`);
    } catch (err) {
      console.error("Failed to save tracking:", err);
      showToast(`Error saving tracking details for #${orderRef}`);
    }
  };

  const handleCopyRiderDrop = (ord: Order) => {
    const addr = ord?.shippingAddress || ({} as any);
    const mapsLink =
      addr.lat && addr.lng
        ? `https://www.google.com/maps?q=${addr.lat},${addr.lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${addr.addressLine1 || ""}, Bengaluru - ${addr.pincode || ""}`
          )}`;
    const text = `📦 MANOPAVANA DROP DETAILS\nOrder: #${ord.orderRef}\nCustomer: ${addr.fullName || "Customer"}\nPhone: ${addr.phone || "N/A"}\nAddress: ${addr.addressLine1 || ""}${
      addr.landmark ? ` (Near ${addr.landmark})` : ""
    }, ${addr.district || "Bengaluru"} - ${addr.pincode || ""}\nPayment: ${ord.paymentMethod?.toUpperCase()} (₹${ord.total})\nLocation Pin: ${mapsLink}`;
    navigator.clipboard.writeText(text);
    showToast("📋 Drop address & GPS copied for delivery rider!");
  };

  const handleCheckPincode = async (orderRef: string, pincode?: string) => {
    if (!pincode) {
      showToast("No valid pincode provided");
      return;
    }
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

    const addr = order?.shippingAddress || ({} as any);
    const items = Array.isArray(order.items) ? order.items : [];

    const totalGrams =
      items.reduce((acc, item) => {
        const is1L = (item?.variant || "").includes("1L") || (item?.variant || "").includes("3L");
        const gramsPerUnit = is1L ? 1000 : 550;
        return acc + gramsPerUnit * (item?.quantity || 1);
      }, 0) || 1000;

    try {
      const res = await fetch(`/api?action=delhivery_create_shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderRef: order.orderRef,
          customerName: addr.fullName || "Customer",
          phone: addr.phone || "",
          address: `${addr.addressLine1 || ""}${
            addr.landmark ? `, Near ${addr.landmark}` : ""
          }`,
          pincode: addr.pincode || "560058",
          city: addr.city || addr.district || "Bengaluru",
          state: addr.state || "Karnataka",
          paymentMode: order.paymentMethod === "cod" ? "COD" : "Prepaid",
          totalAmount: order.total || 0,
          weightGrams: totalGrams,
          productsDesc: items.map((i) => `${i.title} (${i.variant})`).join(", ") || "Marachekku Oil",
          quantity: items.reduce((acc, i) => acc + (i.quantity || 1), 0),
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
    const addr = order?.shippingAddress || ({} as any);
    const items = Array.isArray(order.items) ? order.items : [];
    const text = `Customer: ${addr.fullName || "Customer"}
Phone: ${addr.phone || "N/A"}
Address: ${addr.addressLine1 || ""}${
      addr.landmark ? `, Near ${addr.landmark}` : ""
    }, ${addr.district || addr.city || "Bengaluru"} - ${
      addr.pincode || ""
    }
Items: ${items.map((i) => `${i.title} (${i.variant}) x${i.quantity}`).join(", ")}
Order Ref: #${order.orderRef}
Total: ₹${order.total} (${order.paymentMethod?.toUpperCase()})`;

    navigator.clipboard.writeText(text);
    setCopiedPorter((p) => ({ ...p, [order.orderRef]: true }));
    showToast("Copied customer drop details for Porter app!");
    setTimeout(() => {
      setCopiedPorter((p) => ({ ...p, [order.orderRef]: false }));
    }, 2500);
  };

  // Delhivery Diagnostics
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

  // Keep state in sync with real-time Firestore updates
  useEffect(() => {
    if (cmsConfig) {
      setTicker(cmsConfig.announcementTicker || "");
      setHeadline(cmsConfig.heroHeadline || "");
      setSubhead(cmsConfig.heroSubhead || "");
      setTagline(cmsConfig.brandTagline || "Pure by nature, trusted for life");
      setLogoUrl(cmsConfig.brandLogoUrl || "");
      setVideoUrl(cmsConfig.chekkuVideoUrl || "");
      setFounderName(cmsConfig.founderName || BUSINESS_CONFIG.FOUNDER_NAME);
      setPrimaryPhone(cmsConfig.primaryPhone || BUSINESS_CONFIG.PRIMARY_PHONE);
      setAltPhone(cmsConfig.altPhone || BUSINESS_CONFIG.ALT_PHONE);
      setEmail(cmsConfig.email || BUSINESS_CONFIG.EMAIL);
      setFacilityAddress(cmsConfig.facilityAddress || BUSINESS_CONFIG.FACILITY_ADDRESS);
      setFssaiLicense(cmsConfig.fssaiLicense || BUSINESS_CONFIG.FSSAI_LICENSE);
      setGstin(cmsConfig.gstin || BUSINESS_CONFIG.GSTIN);
      setBlrNotice(cmsConfig.bangaloreDeliveryNotice || "Same-Day / Next-Day Direct Courier from Peenya Facility");
      setThreshold(cmsConfig.freeShippingThreshold ?? 500);
      setStdFee(cmsConfig.standardShippingFee ?? 49);
      if (cmsConfig.prices) setPrices(cmsConfig.prices);
      if (cmsConfig.stock) setStock(cmsConfig.stock);
    }
  }, [cmsConfig]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await authenticateAdmin(pinInput.trim());
    if (!ok) {
      setPinError(true);
    } else {
      setPinError(false);
      showToast("Administrator portal unlocked successfully!");
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
    }));
    showToast("Storefront copy, facility details & prices saved to Firestore live!");
  };

  const handleToggleStock = (key: string) => {
    setStock((prev: any) => ({
      ...prev,
      [key]: !prev?.[key],
    }));
  };

  const displayOrders = (adminOrders && adminOrders.length > 0 ? adminOrders : orders) || [];

  // PIN Gate
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
              <Lock className="w-8 h-8 text-[#E08F35]"/>
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
                {currentUser?.email ? (
                  <>
                    Logged in as{" "}
                    <span className="font-semibold text-amber-500">
                      {currentUser.email}
                    </span>
                    . Enter PIN to unlock live CMS & dispatch hub.
                  </>
                ) : (
                  <>Enter Master Security PIN to unlock store management.</>
                )}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="Enter Secret Admin PIN"
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
                    Invalid PIN. Please enter your secret admin PIN.
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Unlock Administration Portal
              </button>

              <button
                type="button"
                onClick={() => setShowCloudflareGuide(true)}
                className={`w-full py-2 rounded-xl text-[11px] font-semibold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  isDark
                    ? "bg-transparent border-[#362114] text-[#D8C8B8] hover:bg-[#1C120B]"
                    : "bg-transparent border-[#DDD1BE] text-[#5C4230] hover:bg-[#FAF6EE]"
                }`}
              >
                <Key className="w-3.5 h-3.5 text-[#E08F35]"/>
                <span>How to store PIN encrypted in Cloudflare</span>
              </button>
            </form>

            <p
              className={`text-[11px] ${
                isDark ? "text-[#A89482]" : "text-[#7A5E48]"
              }`}
            >
              Authorized Facility: Peenya 2nd Stage, Bangalore • Edge Verified
            </p>
          </div>
        </div>

        {/* Cloudflare Guide Modal */}
        {showCloudflareGuide && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className={`w-full max-w-xl rounded-3xl p-6 sm:p-8 space-y-5 text-left border shadow-2xl overflow-y-auto max-h-[90vh] ${
                isDark ? "bg-[#1C120B] text-[#FAF4EA] border-[#362114]" : "bg-white text-[#1F120A] border-[#DDD1BE]"
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-[#E08F35]"/>
                  <h3 className="font-bold font-serif text-base">Cloudflare Encrypted PIN Setup Guide</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCloudflareGuide(false)}
                  className="px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-stone-800 text-xs font-bold"
                >
                  ✕ Close
                </button>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-stone-700 dark:text-stone-300">
                <p>
                  To secure your master PIN on Cloudflare without placing it in client code, set it as an
                  <strong> Encrypted Environment Variable</strong> inside your Cloudflare Pages Dashboard:
                </p>
                <ol className="list-decimal list-inside space-y-2 pl-1">
                  <li>
                    Log in to <strong>dash.cloudflare.com</strong> and open <strong>Workers & Pages</strong>.
                  </li>
                  <li>
                    Select your <strong>manopavana</strong> project.
                  </li>
                  <li>
                    Go to <strong>Settings</strong> ➔ <strong>Environment variables</strong>.
                  </li>
                  <li>
                    Click <strong>Add variable</strong>:
                    <div className="p-3 my-1.5 rounded-xl bg-stone-100 dark:bg-black/40 font-mono text-[11px] border border-amber-500/30 space-y-1">
                      <div>Variable Name: <strong className="text-amber-700 dark:text-amber-400">ADMIN_PIN</strong></div>
                      <div>Type: Select <strong className="text-emerald-700 dark:text-emerald-400">Encrypt</strong> (Stores secret in Cloudflare KMS)</div>
                    </div>
                  </li>
                  <li>
                    Click <strong>Save and Deploy</strong>. Cloudflare will decrypt it safely on edge verification.
                  </li>
                </ol>
              </div>

              <button
                type="button"
                onClick={() => setShowCloudflareGuide(false)}
                className="w-full py-2.5 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs shadow-md transition-colors"
              >
                Got it, Continue
              </button>
            </div>
          </div>
        )}
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
              <ShieldAlert className="w-6 h-6 text-[#E08F35]"/>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-serif">
                  MANOPAVANA Live Storefront CMS & Dispatch Hub
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  <Sparkles className="w-3 h-3"/>
                  Live Two-Way Sync
                </span>
              </div>
              <p className="text-xs text-[#D6C4B0] mt-0.5">
                Admin: {currentUser?.email || "Master PIN Authorized"} • Facility: {facilityAddress}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => togglePreviewStorefront(true)}
              className="px-4 py-2.5 rounded-xl bg-[#E08F35] hover:bg-[#c97a26] text-[#1F120A] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              <Eye className="w-3.5 h-3.5"/>
              <span>Preview Storefront as Customer</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCloudflareGuide(true)}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5 text-amber-300"/>
              <span>Cloudflare PIN Setup</span>
            </button>
            <button
              type="button"
              onClick={logoutAdmin}
              className="px-3 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200 text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              Lock PIN
            </button>
          </div>
        </div>

        {/* Delhivery Diagnostics */}
        <div
          className={`rounded-3xl border p-6 shadow-sm space-y-5 transition-colors ${
            isDark ? "bg-[#1A1009] border-[#3B2516]" : "bg-white border-[#E8DFC8]"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#E08F35]">
                <Truck className="w-5 h-5"/>
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
                  Registered Warehouse:{" "}
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
                <ExternalLink className="w-3.5 h-3.5 opacity-60"/>
              </a>
            </div>
          </div>

          {pingResult && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex flex-wrap items-center justify-between gap-3 ${
                pingResult.authenticated
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                  : "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600"/>
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
        </div>

        

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Storefront Copy, Branding, Shipping & Price Toggler */}
  {/* Left: Master Storefront CMS Controls (A to Z) */}
  
  <div className="lg:col-span-6 space-y-6">
    <StorefrontCMSPanel isDark={isDark} />
  </div>

  {/* Right: Live Incoming Orders Queue */}
  <div className="lg:col-span-6 space-y-4">
    {/* Existing live orders list */}
  </div>
          {/* Right: Live Incoming Orders Queue */}
          <div className="lg:col-span-6 space-y-4">
            <div
              className={`rounded-2xl border p-6 shadow-2xs space-y-4 ${
                isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
              }`}
            >
              <div
                className={`flex items-center justify-between border-b pb-3 ${
                  isDark ? "border-[#2D1B10]" : "border-[#EFE8DC]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#E08F35]"/>
                  <h2
                    className={`text-sm font-bold font-serif ${
                      isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                    }`}
                  >
                    Live Orders & Delivery Dispatch Queue ({displayOrders.length})
                  </h2>
                </div>
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Real-Time Firestore
                </span>
              </div>

              {displayOrders.length === 0 ? (
                <div
                  className={`p-8 text-center space-y-2 ${
                    isDark ? "text-[#A89482]" : "text-[#6A523E]"
                  }`}
                >
                  <Package className="w-8 h-8 mx-auto text-[#DDD1BE]"/>
                  <p className="text-xs font-semibold">No customer orders placed yet</p>
                  <p className="text-[11px] opacity-80">
                    New orders will automatically appear here in real time as customers complete checkout.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[750px] overflow-y-auto pr-1">
                  {displayOrders.map((ord) => {
                    const addr = ord?.shippingAddress || ({} as any);
                    const items = Array.isArray(ord.items) ? ord.items : [];

                    const mapsQuery =
                      addr.lat && addr.lng
                        ? `${addr.lat},${addr.lng}`
                        : encodeURIComponent(
                            `${addr.addressLine1 || ""}, ${
                              addr.district || addr.city || "Bengaluru"
                            } ${addr.pincode || ""}`
                          );
                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

                    const cleanPhone = (addr.phone || "").replace(/\D/g, "").slice(-10);
                    const waText = encodeURIComponent(
                      `Hi ${addr.fullName || "Customer"}, your MANOPAVANA order #${
                        ord.orderRef
                      } is currently: ${ord.orderStatus}. Tracking: ${window.location.origin}/account?order=${
                        ord.orderRef
                      }`
                    );
                    const waUrl = `https://wa.me/91${cleanPhone}?text=${waText}`;

                    const isLocal = Boolean(
                      addr.isBangalore ||
                        (addr.pincode && String(addr.pincode).startsWith("560")) ||
                        addr.city?.toLowerCase()?.includes("bangalore") ||
                        addr.city?.toLowerCase()?.includes("bengaluru")
                    );

                    return (
                      <div
                        key={ord.orderRef}
                        className={`p-4 rounded-2xl border space-y-3 shadow-2xs ${
                          isDark ? "bg-[#150D07] border-[#362114]" : "bg-[#FAF7F2] border-[#E8DEC8]"
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
                            </div>
                            <p
                              className={`text-[11px] mt-0.5 ${
                                isDark ? "text-[#D8C8B8]" : "text-[#6A523E]"
                              }`}
                            >
                              {addr.fullName || "Customer"} • {addr.phone || "No phone"}
                            </p>
                          </div>

                          {/* Status Selector */}
                          <div className="flex items-center gap-1.5">
                            <select
                              value={ord.orderStatus}
                              onChange={(e) =>
                                updateOrderStatus(ord.id || ord.orderRef, e.target.value as OrderStatus)
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
                              <option value="Cancelled">Cancelled</option>
                              <option value="Failed (Expired)">Failed (Expired)</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete order #${ord.orderRef}?`)) {
                                  deleteOrder(ord.orderRef);
                                }
                              }}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                              title="Delete Order"
                            >
                              <Trash2 className="w-3.5 h-3.5"/>
                            </button>
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
                            Ordered Items ({items.length}):
                          </span>
                          <ul className="list-disc list-inside space-y-0.5">
                            {items.map((it, idx) => (
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
                            {isLocal ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-bold text-[10px] border border-amber-500/20">
                                <MapPin className="w-2.5 h-2.5"/>
                                Bengaluru Local (Peenya Facility)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold text-[10px] border border-blue-500/20">
                                <Truck className="w-2.5 h-2.5"/>
                                Outside Bengaluru • Delhivery
                              </span>
                            )}
                          </div>
                          <p>
                            {addr.addressLine1 || "No street address provided"}
                            {addr.landmark ? `, Near ${addr.landmark}` : ""}
                            , {addr.district || addr.city || "Bengaluru"} - {addr.pincode || ""}
                          </p>
                        </div>

                        {/* Logistics Block */}
                        {isLocal ? (
                          <div
                            className={`p-3.5 rounded-xl border space-y-3 text-xs ${
                              isDark ? "bg-[#191009] border-[#3D2514]" : "bg-[#FDF9F2] border-[#E8DEC8]"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 font-bold">
                                <MapPin className="w-3.5 h-3.5 text-amber-500"/>
                                <span className={isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"}>
                                  Bengaluru Direct Delivery (Peenya Hub)
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/20">
                                  Manual Tracking Mode
                                </span>
                              </div>
                              <span className="text-[11px] text-stone-500">
                                Direct Doorstep Dispatch • 24-48h Delivery
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                              <div>
                                <label className={`block text-[11px] font-bold mb-1 ${isDark ? "text-[#D8C8B8]" : "text-[#5C4230]"}`}>
                                  Delivery Partner / Rider
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. MANOPAVANA Peenya Direct / Borzo"
                                  value={
                                    blrCourier[ord.orderRef] !== undefined
                                      ? blrCourier[ord.orderRef]
                                      : ord.courier || ""
                                  }
                                  onChange={(e) =>
                                    setBlrCourier((p) => ({ ...p, [ord.orderRef]: e.target.value }))
                                  }
                                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#E08F35] ${
                                    isDark ? "bg-[#140D07] border border-[#362114] text-[#FAF4EA]" : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                                  }`}
                                />
                              </div>

                              <div>
                                <label className={`block text-[11px] font-bold mb-1 ${isDark ? "text-[#D8C8B8]" : "text-[#5C4230]"}`}>
                                  Rider Contact / Notes
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Ph: +91 9886012345 • Slot: 4-6 PM"
                                  value={
                                    blrNotes[ord.orderRef] !== undefined
                                      ? blrNotes[ord.orderRef]
                                      : ord.notes || ""
                                  }
                                  onChange={(e) =>
                                    setBlrNotes((p) => ({ ...p, [ord.orderRef]: e.target.value }))
                                  }
                                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#E08F35] ${
                                    isDark ? "bg-[#140D07] border border-[#362114] text-[#FAF4EA]" : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                                  }`}
                                />
                              </div>

                              <div>
                                <label className={`block text-[11px] font-bold mb-1 ${isDark ? "text-[#D8C8B8]" : "text-[#5C4230]"}`}>
                                  Tracking / Waybill Number
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. MV-BLR-83801"
                                  value={
                                    blrTracking[ord.orderRef] !== undefined
                                      ? blrTracking[ord.orderRef]
                                      : ord.trackingNumber || ""
                                  }
                                  onChange={(e) =>
                                    setBlrTracking((p) => ({ ...p, [ord.orderRef]: e.target.value }))
                                  }
                                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#E08F35] ${
                                    isDark ? "bg-[#140D07] border border-[#362114] text-[#FAF4EA]" : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                                  }`}
                                />
                              </div>

                              <div>
                                <label className={`block text-[11px] font-bold mb-1 ${isDark ? "text-[#D8C8B8]" : "text-[#5C4230]"}`}>
                                  Fulfillment Status
                                </label>
                                <select
                                  value={blrStatus[ord.orderRef] || ord.orderStatus || "Placed"}
                                  onChange={(e) =>
                                    setBlrStatus((p) => ({ ...p, [ord.orderRef]: e.target.value as OrderStatus }))
                                  }
                                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#E08F35] ${
                                    isDark ? "bg-[#140D07] border border-[#362114] text-[#FAF4EA]" : "bg-white border border-[#DDD1BE] text-[#1F120A]"
                                  }`}
                                >
                                  <option value="Placed">Placed</option>
                                  <option value="Packed">Packed</option>
                                  <option value="Dispatched">Dispatched</option>
                                  <option value="Delivered">Delivered</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-200 dark:border-stone-800">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveBlrTracking(ord.orderRef, ord)}
                                  className="px-3.5 py-1.5 rounded-lg bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                >
                                  <Save className="w-3.5 h-3.5 text-amber-300"/>
                                  <span>Save Tracking Details</span>
                                </button>

                                {savedSuccessRef[ord.orderRef] && (
                                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-md flex items-center gap-1 animate-fade-in">
                                    <Check className="w-3.5 h-3.5 text-emerald-600"/>
                                    <span>Saved to Firestore!</span>
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleCopyRiderDrop(ord)}
                                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                    isDark
                                      ? "bg-[#1E130B] border-[#3D2514] text-[#FAF4EA] hover:bg-[#28180E]"
                                      : "bg-white border-[#DDD1BE] text-[#5E3210] hover:bg-[#FAF6EE]"
                                  }`}
                                >
                                  <Copy className="w-3.5 h-3.5 text-[#E08F35]"/>
                                  <span>Copy Rider Drop Details</span>
                                </button>

                                <a
                                  href="https://borzodelivery.com/in"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => handleCopyRiderDrop(ord)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                >
                                  <Truck className="w-3.5 h-3.5"/>
                                  <span>Book on Borzo</span>
                                  <ExternalLink className="w-3 h-3 opacity-80"/>
                                </a>
                              </div>

                              <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600"/>
                                <span>Live on Website Order Tracker</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`p-3 rounded-xl border space-y-2.5 text-xs ${
                              isDark ? "bg-[#191009] border-[#3D2514]" : "bg-[#F7F2E8] border-[#DFD4BF]"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 font-bold">
                                <Truck className="w-3.5 h-3.5 text-[#E08F35]"/>
                                <span className={isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"}>
                                  Delhivery Logistics Hub (Outside Bengaluru)
                                </span>
                              </div>

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
                                      handleCheckPincode(ord.orderRef, addr.pincode)
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
                                      : `Verify Pin ${addr.pincode || ""}`}
                                  </button>
                                )}
                              </div>
                            </div>

                            {ord.trackingNumber ? (
                              <div
                                className={`p-2.5 rounded-lg border space-y-2 ${
                                  isDark ? "bg-[#140D07] border-[#362114]" : "bg-white border-[#E5DAC8]"
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <span className="text-[10px] font-bold text-emerald-600 block flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600"/>
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
                                      <Printer className="w-2.5 h-2.5 text-[#E08F35]"/>
                                      <span>Print Label</span>
                                    </a>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleManifestDelhivery(ord)}
                                    disabled={manifesting[ord.orderRef]}
                                    className="px-3 py-1.5 rounded-lg bg-[#5E3210] hover:bg-[#43230A] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                  >
                                    <Truck className="w-3.5 h-3.5 text-amber-300"/>
                                    <span>
                                      {manifesting[ord.orderRef]
                                        ? "Connecting Delhivery..."
                                        : "⚡ 1-Click Manifest"}
                                    </span>
                                  </button>

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
                                        isDark ? "bg-[#140D07] border border-[#362114] text-[#FAF4EA] placeholder-[#8A7665]" : "bg-white border border-[#DDD1BE] text-[#1F120A] placeholder-[#8A7665]"
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

                                {manifestError[ord.orderRef] && (
                                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] space-y-1">
                                    <div className="flex items-center gap-1 font-bold">
                                      <AlertCircle className="w-3.5 h-3.5 shrink-0"/>
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
                        )}

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
                              <MapPin className="w-3.5 h-3.5 text-[#E08F35]"/>
                              <span>Google Maps Pin</span>
                              <ExternalLink className="w-3 h-3 text-[#A69788]"/>
                            </a>

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
                            >
                              {copiedPorter[ord.orderRef] ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600"/>
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-[#E08F35]"/>
                              )}
                              <span>
                                {copiedPorter[ord.orderRef]
                                  ? "Copied for Porter!"
                                  : "Copy for Porter"}
                              </span>
                            </button>
                          </div>

                          <a
                            href={
                              ord.trackingNumber
                                ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
                                    `Hi ${
                                      addr.fullName || "Customer"
                                    }, your MANOPAVANA order #${
                                      ord.orderRef
                                    } has been dispatched! Track your parcel live here: https://www.delhivery.com/track/package/${
                                      ord.trackingNumber
                                    }`
                                  )}`
                                : waUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          >
                            <MessageCircle className="w-3.5 h-3.5"/>
                            <span>
                              {ord.trackingNumber
                                ? "WhatsApp Tracking"
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