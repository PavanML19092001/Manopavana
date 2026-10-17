import React, { useState, useEffect } from "react";
import {
  FileText,
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
  X,
  AlertTriangle,
  Edit3,
} from "lucide-react";
import { InvoiceModal } from "./InvoiceModal";
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

export const LiveOrderTracker = ({
  order,
  themeMode = "light",
}: LiveOrderTrackerProps) => {
  const { updateOrderDetails, cancelOrderWithinWindow, showToast } = useStore();
  const isDark = themeMode === "dark";
  const [showAllScans, setShowAllScans] = useState(false);
  const [delhiveryScans, setDelhiveryScans] = useState<DelhiveryScan[]>([]);
  const [delhiveryLoading, setDelhiveryLoading] = useState(false);
  const [delhiveryError, setDelhiveryError] = useState<string | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Edit Delivery Details Modal State
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editName, setEditName] = useState(order.shippingAddress?.fullName || "");
  const [editPhone, setEditPhone] = useState(order.shippingAddress?.phone || "");
  const [editAddressLine, setEditAddressLine] = useState(order.shippingAddress?.addressLine1 || "");
  const [editLandmark, setEditLandmark] = useState(order.shippingAddress?.landmark || "");
  const [editPincode, setEditPincode] = useState(order.shippingAddress?.pincode || "");

  const isBLR = Boolean(
    order.shippingAddress?.isBangalore ||
      (order.shippingAddress?.pincode && order.shippingAddress.pincode.startsWith("560")) ||
      order.shippingAddress?.city?.toLowerCase().includes("bangalore") ||
      order.shippingAddress?.city?.toLowerCase().includes("bengaluru")
  );

  const isCod = order.paymentMethod === "cod" || order.paymentMode === "COD";
  const isCancelled = (order.orderStatus as string) === "Cancelled";

  // Allowed to edit or cancel until order leaves Peenya dispatch hub
  const canModifyOrCancel =
    order.orderStatus === "Placed" || order.orderStatus === "Packed";

  useEffect(() => {
    if (!isBLR && order.trackingNumber && order.trackingNumber.length > 5 && !isCancelled) {
      fetchDelhiveryTracking(order.trackingNumber);
    }
  }, [order.trackingNumber, isBLR, isCancelled]);

  const fetchDelhiveryTracking = async (waybill: string) => {
    setDelhiveryLoading(true);
    setDelhiveryError(null);
    try {
      const res = await fetch(`/api?action=delhivery_track&waybill=${encodeURIComponent(waybill)}`);
      if (!res.ok) throw new Error("Tracking response status " + res.status);
      const data = await res.json();

      const pkg = data.data?.ShipmentData?.[0]?.Shipment;
      if (pkg) {
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

  const handleSaveDeliveryDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = editPhone.trim().replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      showToast("Please enter a valid 10-digit WhatsApp number.");
      return;
    }
    if (!editAddressLine.trim()) {
      showToast("Street address cannot be empty.");
      return;
    }

    await updateOrderDetails(order.orderRef, {
      shippingAddress: {
        ...order.shippingAddress,
        fullName: editName.trim(),
        phone: cleanPhone,
        addressLine1: editAddressLine.trim(),
        landmark: editLandmark.trim(),
        pincode: editPincode.trim(),
      },
    });

    setIsEditingAddress(false);
    showToast("Delivery address updated successfully!");
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
      default:
        return 1;
    }
  };

  const currentStep = getStepProgress(order.orderStatus);

  const getEstimatedDeliveryText = () => {
    if (isCancelled) {
      return "Order Cancelled. Delivery process terminated.";
    }
    if (order.orderStatus === "Delivered") {
      return "Delivered Safely to Doorstep";
    }
    if (isBLR) {
      return "Expected Doorstep Delivery: Within 24-48 Hours (Direct from Peenya Facility)";
    }
    return "Expected Doorstep Delivery: In 3-5 Business Days (Delhivery Express)";
  };

  return (
    <>
      <div
        className={`w-full rounded-3xl border shadow-sm overflow-hidden transition-colors ${
          isDark ? "bg-[#1A1009] border-[#3B2516] text-[#FAF4EA]" : "bg-white border-[#E8DFC8] text-[#1F120A]"
        }`}
      >
        {/* 1. Top Order Summary Banner */}
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
                  isCancelled
                    ? "bg-red-500/15 text-red-600 border border-red-500/30"
                    : order.orderStatus === "Delivered"
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
              Placed on {order.date} • Total Amount:{" "}
              <span className="font-extrabold text-[#E08F35]">₹{order.total}</span>
            </p>
          </div>

          {/* Action Buttons with Dynamic WhatsApp Helpline */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`https://wa.me/${BUSINESS_CONFIG.PHONE_RAW}?text=${encodeURIComponent(
                isCancelled
                  ? `Hi MANOPAVANA, my order #${order.orderRef} was cancelled. Could you please confirm the refund status of ₹${order.total}?`
                  : `Hi MANOPAVANA, I want to track my order #${order.orderRef}. Could you provide the latest dispatch update?`
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

            {(order.orderStatus === "Dispatched" || order.orderStatus === "Delivered") && (
  <button
    type="button"
    onClick={() => setIsInvoiceOpen(true)}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
      isDark
        ? "bg-[#1A1009] border-[#3B2516] text-[#FAF4EA] hover:bg-[#2A1A0F]"
        : "bg-white border-[#DDD1BE] text-[#1F120A] hover:bg-[#FAF6EE]"
    }`}
  >
    <FileText className="w-3.5 h-3.5 text-[#E08F35]" />
    <span>Download Invoice</span>
  </button>
)}
          </div>
        </div>

        {/* 2. Cancellation & Edit Address Action Bar */}
        {canModifyOrCancel && (
          <div className="px-6 py-3.5 bg-amber-500/10 border-b border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <Clock className="w-4 h-4 shrink-0 text-[#E08F35]" />
              <span>
                You can edit your delivery address or cancel this order any time before it leaves our facility.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditingAddress(true)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                  isDark
                    ? "border-[#3D2514] text-[#FAF4EA] hover:bg-[#2A1A0F]"
                    : "border-[#DDD1BE] text-[#5C4230] hover:bg-[#FAF6EE]"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-[#E08F35]" />
                <span>Edit Address</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (window.confirm("Are you sure you want to cancel this order?")) {
                    await cancelOrderWithinWindow(order.orderRef);
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Cancel Order
              </button>
            </div>
          </div>
        )}

        {/* 3. Expected Delivery Callout */}
        <div
          className={`px-6 py-3.5 flex items-center gap-3 border-b text-xs font-semibold ${
            isCancelled
              ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400"
              : order.orderStatus === "Delivered"
              ? isDark
                ? "bg-emerald-950/20 border-[#3B2516] text-emerald-400"
                : "bg-emerald-50 border-emerald-100 text-emerald-800"
              : isDark
              ? "bg-[#25170D] border-[#3B2516] text-amber-300"
              : "bg-[#FFF9EE] border-[#F2E5CC] text-[#7A4B1A]"
          }`}
        >
          {isCancelled ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          ) : (
            <Calendar className="w-4 h-4 shrink-0 text-[#E08F35]" />
          )}
          <span>{getEstimatedDeliveryText()}</span>
        </div>

        {/* 4. Live Status Section */}
        <div className="p-6 space-y-8">
          <div>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-6 ${isDark ? "text-[#D8C8B8]" : "text-[#7A5E48]"}`}>
              Delivery Milestones & Live Status
            </h3>

            {isCancelled ? (
              <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 shrink-0">
                    <X className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-red-700 dark:text-red-300">
                      Order Cancelled
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                      This order has been cancelled and will not be packed or delivered.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-red-200 dark:border-red-900/30 text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  {isCod ? (
                    <p>
                      <strong>Cash on Delivery (COD) Status:</strong> Cash collection has been completely voided. No payment is required.
                    </p>
                  ) : (
                    <div className="space-y-1.5 bg-white dark:bg-[#140D07] p-3.5 rounded-xl border border-red-200 dark:border-red-900/40">
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-stone-900 dark:text-[#FAF4EA]">Online Refund Status:</span>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {order.paymentStatus === "REFUND_INITIATED" ? "Refund Initiated" : "Processing Refund"}
                        </span>
                      </div>
                      <p className="text-stone-600 dark:text-stone-400">
                        A full refund of <strong>₹{order.total}</strong> has been reversed via PhonePe to your original payment mode (UPI / Bank Account).
                      </p>
                      <p className="text-[11px] text-stone-500">
                        Timeline: Typically credits within <strong>2 to 24 hours for UPI</strong>, or <strong>3 to 5 business days</strong> for cards/net banking.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
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

                    {/* Outside Bangalore Live Delhivery Checkpoints */}
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
                                  {scan.instructions && (
                                    <p className="text-stone-400 text-[10px]">{scan.instructions}</p>
                                  )}
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
            )}
          </div>

          {/* 5. Delivery Address & Bill Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-stone-200 dark:border-stone-800">
            {/* Delivery Address Card */}
            <div
              className={`p-4 rounded-2xl border space-y-2.5 text-xs ${
                isDark ? "bg-[#140D07] border-[#362114]" : "bg-[#FAF7F2] border-[#E8DEC8]"
              }`}
            >
              <div className="flex items-center justify-between font-bold text-xs">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#E08F35]" />
                  <span>Delivery Address</span>
                </div>
                {canModifyOrCancel && (
                  <button
                    type="button"
                    onClick={() => setIsEditingAddress(true)}
                    className="text-[11px] text-[#E08F35] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
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

            {/* Bill Summary */}
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
                      isCancelled
                        ? "bg-red-500/15 text-red-600"
                        : isCod
                        ? "bg-amber-500/15 text-amber-600"
                        : "bg-emerald-500/15 text-emerald-600"
                    }`}
                  >
                    {isCancelled
                      ? "Order Cancelled"
                      : isCod
                      ? `Collect ₹${order.total} on Arrival`
                      : "Paid Online via PhonePe"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Ordered Items List */}
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

      {/* Edit Delivery Address Modal */}
      {isEditingAddress && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-md bg-white dark:bg-[#1C120B] text-stone-900 dark:text-[#FAF4EA] rounded-3xl p-6 border border-stone-200 dark:border-[#362114] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
              <h3 className="font-bold font-serif text-sm">Edit Delivery Address & Contact</h3>
              <button
                type="button"
                onClick={() => setIsEditingAddress(false)}
                className="p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDeliveryDetails} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Recipient Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent focus:ring-2 focus:ring-[#E08F35]/40"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">WhatsApp Phone Number</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, ""))}
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-mono focus:ring-2 focus:ring-[#E08F35]/40"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={editAddressLine}
                  onChange={(e) => setEditAddressLine(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent focus:ring-2 focus:ring-[#E08F35]/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Landmark (Optional)</label>
                  <input
                    type="text"
                    value={editLandmark}
                    onChange={(e) => setEditLandmark(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent focus:ring-2 focus:ring-[#E08F35]/40"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Pincode</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={editPincode}
                    onChange={(e) => setEditPincode(e.target.value.replace(/\D/g, ""))}
                    className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-mono focus:ring-2 focus:ring-[#E08F35]/40"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingAddress(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold cursor-pointer transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Tax Invoice Modal */}
      {!isCancelled && (
        <InvoiceModal
          order={order}
          isOpen={isInvoiceOpen}
          onClose={() => setIsInvoiceOpen(false)}
        />
      )}
    </>
  );
};