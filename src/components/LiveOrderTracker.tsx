import React, { useState, useEffect } from "react";
import {
  Package,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  MessageCircle,
  Phone,
  Printer,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  Check,
  ShieldCheck,
  Banknote,
  CreditCard,
  Building2,
  Calendar,
} from "lucide-react";
import { Order, OrderStatus } from "../types";
import { BUSINESS_CONFIG } from "../constants";
import { useStore } from "../context/StoreContext";

interface LiveOrderTrackerProps {
  order: Order;
  themeMode?: "blend" | "light" | "dark";
}

interface DelhiveryScan {
  scanDateTime?: string;
  scanTime?: string;
  scanLocation?: string;
  scanType?: string;
  instructions?: string;
  statusDateTime?: string;
}

export const LiveOrderTracker: React.FC<LiveOrderTrackerProps> = ({
  order,
  themeMode = "light",
}) => {
  const { updateOrderDetails } = useStore();
  const isDark = themeMode === "dark";
  const [showAllScans, setShowAllScans] = useState(false);
  const [delhiveryScans, setDelhiveryScans] = useState<DelhiveryScan[]>([]);
  const [delhiveryLoading, setDelhiveryLoading] = useState(false);
  const [delhiveryError, setDelhiveryError] = useState<string | null>(null);

  const isBLR = Boolean(
    order.shippingAddress?.isBangalore ||
      (order.shippingAddress?.pincode && order.shippingAddress.pincode.startsWith("560")) ||
      order.shippingAddress?.city?.toLowerCase().includes("bangalore") ||
      order.shippingAddress?.city?.toLowerCase().includes("bengaluru")
  );

  const isCod = order.paymentMethod === "cod" || order.paymentMode === "COD";

  // Fetch live scans if shipped via Delhivery
  useEffect(() => {
    if (!isBLR && order.trackingNumber && order.trackingNumber.length > 5) {
      fetchDelhiveryTracking(order.trackingNumber);
    }
  }, [order.trackingNumber, isBLR]);

  const fetchDelhiveryTracking = async (waybill: string) => {
    setDelhiveryLoading(true);
    setDelhiveryError(null);
    try {
      const res = await fetch(`/api?action=delhivery_track&waybill=${encodeURIComponent(waybill)}`);
      if (!res.ok) throw new Error("Tracking response status " + res.status);
      const data = await res.json();
      
      const pkg = data.data?.ShipmentData?.[0]?.Shipment;
      if (pkg) {
        // Auto-sync order status if Delhivery confirms delivery
        const statusStr = String(pkg.Status?.Status || "").toLowerCase();
        if (statusStr.includes("delivered") && order.orderStatus !== "Delivered") {
          updateOrderDetails(order.orderRef, { orderStatus: "Delivered" });
        } else if (
          (statusStr.includes("transit") || statusStr.includes("out for delivery") || statusStr.includes("dispatched")) &&
          order.orderStatus === "Placed"
        ) {
          updateOrderDetails(order.orderRef, { orderStatus: "Dispatched" });
        }

        if (pkg.Scans && Array.isArray(pkg.Scans)) {
          const sortedScans = [...pkg.Scans].map((s: any) => ({
            scanDateTime: s.ScanDetail?.ScanDateTime || s.ScanDateTime,
            scanLocation: s.ScanDetail?.ScannedLocation || s.ScannedLocation,
            scanType: s.ScanDetail?.ScanType || s.Scan || s.ScanType,
            instructions: s.ScanDetail?.Instructions || s.Instructions,
          }));
          setDelhiveryScans(sortedScans);
        }
      }
    } catch (e: any) {
      console.warn("Could not load Delhivery scans:", e?.message);
      setDelhiveryError("Live checkpoints syncing with hub.");
    } finally {
      setDelhiveryLoading(false);
    }
  };

  const getStepProgress = (status: OrderStatus) => {
    switch (status) {
      case "Placed":
        return 1;
      case "Packed":
        return 2;
      case "Dispatched":
        return 3;
      case "Delivered":
        return 4;
      case "Payment Incomplete":
      case "Failed (Expired)":
        return 0;
      default:
        return 1;
    }
  };

  const currentStep = getStepProgress(order.orderStatus);

  // Delivery ETA calculation
  const getEstimatedDeliveryText = () => {
    if (order.orderStatus === "Delivered") {
      return "Delivered Safely to Doorstep";
    }
    if (isBLR) {
      return "Expected Doorstep Delivery: Within 24-48 Hours (Direct from Peenya Facility)";
    }
    return "Expected Doorstep Delivery: In 3-5 Business Days (Delhivery Express)";
  };

  return (
    <div
      className={`w-full rounded-3xl border shadow-sm overflow-hidden transition-colors ${
        isDark ? "bg-[#1A1009] border-[#3B2516] text-[#FAF4EA]" : "bg-white border-[#E8DFC8] text-[#1F120A]"
      }`}
    >
      {/* 1. Flipkart-style Top Order Summary Banner */}
      <div
        className={`p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isDark ? "bg-[#22150C] border-[#3B2516]" : "bg-[#FAF7F2] border-[#EFE8DC]"
        }`}
      >
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg md:text-xl font-bold font-serif">
              Order #{order.orderRef}
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                order.orderStatus === "Delivered"
                  ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                  : order.orderStatus === "Dispatched"
                  ? "bg-blue-500/15 text-blue-600 border border-blue-500/30"
                  : "bg-amber-500/15 text-amber-600 border border-amber-500/30"
              }`}
            >
              ● {order.orderStatus}
            </span>

            {isCod ? (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                Cash on Delivery (COD)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Online Payment (Paid)
              </span>
            )}

            {isBLR ? (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                Bengaluru Doorstep Route
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                Pan-India Route • Delhivery
              </span>
            )}
          </div>

          <p className={`text-xs mt-1.5 ${isDark ? "text-[#D8C8B8]" : "text-[#6A523E]"}`}>
            Placed on {order.date} • Total Amount: <span className="font-extrabold text-[#E08F35]">₹{order.total}</span>
          </p>
        </div>

        {/* ETA & Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`https://wa.me/${BUSINESS_CONFIG.PHONE_RAW}?text=${encodeURIComponent(
              `Hi MANOPAVANA, I want to track my order #${order.orderRef}. Could you provide the latest dispatch update?`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp Support</span>
          </a>

          <a
            href={`tel:${BUSINESS_CONFIG.PRIMARY_PHONE.replace(/\s+/g, "")}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              isDark
                ? "bg-[#1A1009] border-[#3B2516] text-[#FAF4EA] hover:bg-[#2A1A0F]"
                : "bg-white border-[#DDD1BE] text-[#1F120A] hover:bg-[#FAF6EE]"
            }`}
          >
            <Phone className="w-3.5 h-3.5 text-[#E08F35]" />
            <span>Call Facility</span>
          </a>
        </div>
      </div>

      {/* 2. Flipkart Expected Delivery Callout */}
      <div
        className={`px-6 py-3.5 flex items-center gap-3 border-b text-xs font-semibold ${
          order.orderStatus === "Delivered"
            ? isDark
              ? "bg-emerald-950/20 border-[#3B2516] text-emerald-400"
              : "bg-emerald-50 border-emerald-100 text-emerald-800"
            : isDark
            ? "bg-[#25170D] border-[#3B2516] text-amber-300"
            : "bg-[#FFF9EE] border-[#F2E5CC] text-[#7A4B1A]"
        }`}
      >
        <Calendar className="w-4 h-4 shrink-0 text-[#E08F35]" />
        <span>{getEstimatedDeliveryText()}</span>
      </div>

      {/* 3. Flipkart-style Visual Stepper Timeline */}
      <div className="p-6 space-y-8">
        <div>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-6 ${isDark ? "text-[#D8C8B8]" : "text-[#7A5E48]"}`}>
            Delivery Milestones & Live Status
          </h3>

          <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-[11px] sm:before:left-[15px] before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-300 dark:before:bg-stone-700">
            {/* Step 1: Order Placed */}
            <div className="relative flex items-start gap-4">
              <div
                className={`absolute -left-6 sm:-left-8 top-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep >= 1
                    ? "bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-500/20"
                    : "bg-stone-200 dark:bg-stone-800 text-stone-500"
                }`}
              >
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold">Order Placed & Confirmed</h4>
                  <span className={`text-[11px] ${isDark ? "text-[#A89482]" : "text-[#7A5E48]"}`}>
                    {order.date}
                  </span>
                </div>
                <p className={`text-xs ${isDark ? "text-[#D8C8B8]" : "text-[#5C4230]"}`}>
                  Order #{order.orderRef} placed with {isCod ? "Cash on Delivery" : "Online Payment"}. Items verified by store.
                </p>
              </div>
            </div>

            {/* Step 2: Packed at Facility */}
            <div className="relative flex items-start gap-4">
              <div
                className={`absolute -left-6 sm:-left-8 top-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep >= 2
                    ? "bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-500/20"
                    : currentStep === 1
                    ? "bg-[#E08F35] text-white animate-pulse"
                    : "bg-stone-200 dark:bg-stone-800 text-stone-500"
                }`}
              >
                {currentStep >= 2 ? (
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                ) : (
                  <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold">Packed at Facility</h4>
                  {currentStep >= 2 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                      Completed
                    </span>
                  )}
                </div>
                <p className={`text-xs ${isDark ? "text-[#D8C8B8]" : "text-[#5C4230]"}`}>
                  MANOPAVANA Packaging & Distribution Facility (Peenya 2nd Stage, Bangalore - 560058). Bottles inspected with leak-free seal and shatterproof protective barrier.
                </p>
              </div>
            </div>

            {/* Step 3: Dispatched / In Transit */}
            <div className="relative flex items-start gap-4">
              <div
                className={`absolute -left-6 sm:-left-8 top-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep >= 3
                    ? "bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-500/20"
                    : currentStep === 2
                    ? "bg-[#E08F35] text-white animate-pulse"
                    : "bg-stone-200 dark:bg-stone-800 text-stone-500"
                }`}
              >
                {currentStep >= 3 ? (
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                ) : (
                  <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold">
                    {isBLR ? "Dispatched for Bengaluru Doorstep Delivery" : "Dispatched via Delhivery Express"}
                  </h4>
                  {currentStep >= 3 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600">
                      In Transit
                    </span>
                  )}
                </div>

                <p className={`text-xs ${isDark ? "text-[#D8C8B8]" : "text-[#5C4230]"}`}>
                  {isBLR ? (
                    <>
                      Direct carrier:{" "}
                      <span className="font-semibold text-[#E08F35]">
                        {order.courier || "MANOPAVANA Peenya Express Carrier"}
                      </span>
                      {order.notes && <span className="block mt-0.5 font-mono text-[11px]">Note: {order.notes}</span>}
                    </>
                  ) : (
                    <>
                      Carrier: <span className="font-semibold text-blue-600">Delhivery Express Surface</span>
                      {order.trackingNumber && (
                        <span className="block mt-0.5 font-mono text-[11px] text-[#E08F35]">
                          Delhivery Waybill / AWB: #{order.trackingNumber}
                        </span>
                      )}
                    </>
                  )}
                </p>

                {/* Outside Bangalore: Live Delhivery Checkpoints rendered right inside our site! */}
                {!isBLR && order.trackingNumber && (
                  <div
                    className={`mt-3 p-3.5 rounded-2xl border text-xs space-y-2.5 ${
                      isDark ? "bg-[#140D07] border-[#362114]" : "bg-[#FAF7F2] border-[#E8DEC8]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <Truck className="w-3.5 h-3.5 text-[#E08F35]" />
                        <span>Live Delhivery Checkpoints</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => fetchDelhiveryTracking(order.trackingNumber!)}
                        disabled={delhiveryLoading}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E08F35] hover:underline cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${delhiveryLoading ? "animate-spin" : ""}`} />
                        <span>Refresh</span>
                      </button>
                    </div>

                    {delhiveryLoading && (
                      <p className="text-[11px] text-stone-500 animate-pulse">
                        Retrieving real-time transit scans from Delhivery...
                      </p>
                    )}

                    {delhiveryScans.length > 0 ? (
                      <div className="space-y-2 pt-1">
                        {(showAllScans ? delhiveryScans : delhiveryScans.slice(0, 3)).map((scan, sIdx) => (
                          <div
                            key={sIdx}
                            className={`p-2 rounded-xl text-[11px] flex items-start gap-2 border ${
                              isDark ? "bg-[#1D120B] border-[#3D2514]" : "bg-white border-[#EFE8DC]"
                            }`}
                          >
                            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <div className="flex-1">
                              <p className="font-bold">{scan.scanType || "In Transit"}</p>
                              <p className="text-stone-500">
                                {scan.scanLocation && `Location: ${scan.scanLocation} • `}
                                {scan.scanDateTime || ""}
                              </p>
                              {scan.instructions && <p className="text-stone-400 text-[10px]">{scan.instructions}</p>}
                            </div>
                          </div>
                        ))}

                        {delhiveryScans.length > 3 && (
                          <button
                            type="button"
                            onClick={() => setShowAllScans(!showAllScans)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E08F35] hover:underline cursor-pointer pt-1"
                          >
                            {showAllScans ? (
                              <>
                                <span>Show fewer scans</span>
                                <ChevronUp className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                <span>View all {delhiveryScans.length} transit checkpoints</span>
                                <ChevronDown className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    ) : (
                      !delhiveryLoading && (
                        <p className={`text-[11px] ${isDark ? "text-[#A89482]" : "text-[#7A5E48]"}`}>
                          {delhiveryError || "Package manifested. Initial hub scan in progress at Delhivery Bengaluru sorting center."}
                        </p>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Step 4: Out for Delivery / Delivered */}
            <div className="relative flex items-start gap-4">
              <div
                className={`absolute -left-6 sm:-left-8 top-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep >= 4
                    ? "bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-500/20"
                    : currentStep === 3
                    ? "bg-[#E08F35] text-white animate-pulse"
                    : "bg-stone-200 dark:bg-stone-800 text-stone-500"
                }`}
              >
                {currentStep >= 4 ? (
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                ) : (
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold">
                    {order.orderStatus === "Delivered" ? "Delivered at Doorstep" : "Doorstep Handover"}
                  </h4>
                  {order.orderStatus === "Delivered" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600">
                      Delivered
                    </span>
                  )}
                </div>
                <p className={`text-xs ${isDark ? "text-[#D8C8B8]" : "text-[#5C4230]"}`}>
                  {order.orderStatus === "Delivered"
                    ? "Your pure Marachekku oil package was successfully delivered to your doorstep. Thank you for choosing MANOPAVANA!"
                    : isCod
                    ? `Our delivery executive will arrive at your address. Please keep ₹${order.total} cash ready for collection.`
                    : "Delivery executive will deliver directly to your drop address."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Delivery Address & Ordered Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-stone-200 dark:border-stone-800">
          {/* Shipping Address Card */}
          <div
            className={`p-4 rounded-2xl border space-y-2.5 text-xs ${
              isDark ? "bg-[#140D07] border-[#362114]" : "bg-[#FAF7F2] border-[#E8DEC8]"
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <MapPin className="w-4 h-4 text-[#E08F35]" />
              <span>Delivery Address</span>
            </div>
            <div className="space-y-0.5">
              <p className="font-bold text-sm">{order.shippingAddress.fullName || "Valued Customer"}</p>
              <p className="text-stone-500">Phone: {order.shippingAddress.phone}</p>
              <p className="text-stone-500">
                {order.shippingAddress.addressLine1}
                {order.shippingAddress.landmark ? `, Near ${order.shippingAddress.landmark}` : ""}
              </p>
              <p className="text-stone-500">
                {order.shippingAddress.district || order.shippingAddress.city},{" "}
                {order.shippingAddress.state} - {order.shippingAddress.pincode}
              </p>
            </div>
          </div>

          {/* Payment & Bill Summary */}
          <div
            className={`p-4 rounded-2xl border space-y-2.5 text-xs ${
              isDark ? "bg-[#140D07] border-[#362114]" : "bg-[#FAF7F2] border-[#E8DEC8]"
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              {isCod ? (
                <Banknote className="w-4 h-4 text-[#E08F35]" />
              ) : (
                <CreditCard className="w-4 h-4 text-[#E08F35]" />
              )}
              <span>Payment Summary</span>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-stone-500">
                <span>Items Subtotal:</span>
                <span>₹{order.subtotal}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Loyalty Discount:</span>
                  <span>-₹{order.discount}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-500">
                <span>Doorstep Delivery:</span>
                <span>{order.shippingFee === 0 ? "FREE" : `₹${order.shippingFee}`}</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-stone-200 dark:border-stone-800">
                <span>Total Amount:</span>
                <span className="text-[#E08F35]">₹{order.total}</span>
              </div>
              <div className="pt-1">
                <span
                  className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded ${
                    isCod
                      ? "bg-amber-500/15 text-amber-600"
                      : "bg-emerald-500/15 text-emerald-600"
                  }`}
                >
                  {isCod ? `Collect ₹${order.total} on Arrival` : "Paid Online via PhonePe"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Ordered Items List */}
        <div className="space-y-3 pt-2">
          <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-[#D8C8B8]" : "text-[#7A5E48]"}`}>
            Items in this Package ({order.items.length})
          </h4>

          <div className="space-y-2">
            {order.items.map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-4 text-xs ${
                  isDark ? "bg-[#140D07] border-[#362114]" : "bg-[#FAF7F2] border-[#E8DEC8]"
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-12 h-12 object-contain rounded-xl p-1 bg-white/5 border border-stone-200/50 dark:border-stone-800"
                    />
                  )}
                  <div>
                    <p className="font-bold text-sm">{item.title}</p>
                    <p className={`text-[11px] ${isDark ? "text-[#A89482]" : "text-[#7A5E48]"}`}>
                      Variant: {item.variant} • Quantity: {item.quantity}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-extrabold text-sm text-[#E08F35]">
                    ₹{item.price * item.quantity}
                  </span>
                  <p className="text-[10px] text-stone-500">₹{item.price} each</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
