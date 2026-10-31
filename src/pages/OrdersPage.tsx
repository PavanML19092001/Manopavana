import React, { useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Package,
  Search,
  Truck,
  MapPin,
  ChevronRight,
  ArrowLeft,
  FileText,
  AlertCircle,
  ExternalLink,
  MessageCircle,
  Clock,
  Sparkles,
  Phone,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { Order, OrderStatus } from "../types";
import { extractCleanPhone } from "../firebase";
import { InvoiceModal } from "../components/InvoiceModal";
import { BUSINESS_CONFIG } from "../constants";

export const OrdersPage = () => {
  const { orderRef } = useParams<{ orderRef?: string }>();
  const navigate = useNavigate();
  const {
    orders,
    currentUser,
    customerProfile,
    themeMode,
    cancelOrderWithinWindow,
    showToast,
    setLoginModalOpen,
  } = useStore();

  const isDark = themeMode === "dark";
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);

  // Filter orders belonging to this user
  const userOrders = useMemo(() => {
    const seen = new Set<string>();
    const res: Order[] = [];
    const userUid = currentUser?.uid;
    const primaryUid = customerProfile?.primaryUid;
    const userPhone =
      customerProfile?.phone ||
      (currentUser?.phoneNumber ? extractCleanPhone(currentUser.phoneNumber) : "");
    const phoneUid = userPhone ? `phone_${userPhone}` : undefined;
    const allowedUids = new Set([userUid, primaryUid, phoneUid].filter(Boolean) as string[]);

    if (allowedUids.size === 0 && !userPhone) return [];

    for (const o of orders) {
      const orderPhone = extractCleanPhone(o.customerPhone || o.shippingAddress?.phone || "");
      const isMine =
        (o.customerUid && allowedUids.has(o.customerUid)) ||
        ((o as any).firebaseUid && allowedUids.has((o as any).firebaseUid)) ||
        (userPhone && orderPhone && orderPhone === userPhone);

      if (isMine) {
        const key = o.orderRef || o.id;
        if (key && !seen.has(key)) {
          seen.add(key);
          res.push(o);
        }
      }
    }
    // Sort latest first
    return res.sort((a, b) => (b.timestampMs || b.timestamp || 0) - (a.timestampMs || a.timestamp || 0));
  }, [orders, currentUser, customerProfile?.primaryUid, customerProfile?.phone]);

  // If orderRef is provided in URL, locate that single order
  const activeOrder = useMemo(() => {
    if (!orderRef) return null;
    return userOrders.find(
      (o) => o.orderRef.toLowerCase() === orderRef.toLowerCase() || o.id.toLowerCase() === orderRef.toLowerCase()
    ) || null;
  }, [orderRef, userOrders]);

  const filteredOrders = useMemo(() => {
    return userOrders.filter((ord) => {
      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "Delivered" && ord.orderStatus !== "Delivered") return false;
        if (statusFilter === "Cancelled" && ord.orderStatus !== "Cancelled") return false;
        if (
          statusFilter === "In Transit" &&
          (ord.orderStatus === "Delivered" || ord.orderStatus === "Cancelled")
        )
          return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchRef = ord.orderRef.toLowerCase().includes(q) || ord.id.toLowerCase().includes(q);
      const matchItem = ord.items.some((i) => i.title.toLowerCase().includes(q));
      const matchTrack = (ord.trackingNumber || "").toLowerCase().includes(q);
      return matchRef || matchItem || matchTrack;
    });
  }, [userOrders, statusFilter, searchQuery]);

  if (!currentUser) {
    return (
      <div
        className={`w-full min-h-[70vh] flex items-center justify-center p-6 ${
          isDark ? "bg-[#140D09] text-[#FAF4EA]" : "bg-[#FAF7F2] text-[#24140A]"
        }`}
      >
        <div
          className={`max-w-md w-full p-8 rounded-3xl border text-center space-y-5 shadow-xl ${
            isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
          }`}
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#E08F35]">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold font-serif">Sign in to view your Orders</h2>
            <p className="text-xs text-stone-500">
              Access your Flipkart-exact order tracking, invoices, and delivery timeline.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLoginModalOpen(true)}
            className="w-full py-3 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            Sign In / Register with Mobile
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // FLIPKART-EXACT SINGLE ORDER DETAILS VIEW
  // --------------------------------------------------------------------------
  if (activeOrder) {
    const addr = (activeOrder.shippingAddress || {}) as any;
    const isPackedOrPickedUp =
      activeOrder.orderStatus === "Packed" ||
      activeOrder.orderStatus === "Dispatched" ||
      activeOrder.orderStatus === "Delivered" ||
      Boolean(activeOrder.trackingNumber);

    const canCancel = activeOrder.orderStatus === "Placed" && !activeOrder.trackingNumber;

    const getStepStatus = (stepIndex: number) => {
      // 1: Confirmed, 2: Packed/Picked Up, 3: Shipped, 4: Out for Delivery, 5: Delivered
      const status = activeOrder.orderStatus;
      if (status === "Cancelled") return "cancelled";
      if (status === "Delivered") return "completed";
      if (status === "Dispatched") {
        return stepIndex <= 3 ? "completed" : stepIndex === 4 ? "current" : "upcoming";
      }
      if (status === "Packed") {
        return stepIndex <= 2 ? "completed" : "upcoming";
      }
      // "Placed"
      return stepIndex === 1 ? "completed" : "upcoming";
    };

    return (
      <div
        className={`w-full min-h-[calc(100vh-80px)] py-6 sm:py-10 transition-colors ${
          isDark ? "bg-[#140D09] text-[#FAF4EA]" : "bg-[#F1F3F6] text-[#212121]"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
          {/* Top Breadcrumb Header */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate("/orders")}
              className={`flex items-center gap-2 text-xs font-bold cursor-pointer transition-colors ${
                isDark ? "text-amber-300 hover:text-white" : "text-[#2874F0] hover:underline"
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to all orders</span>
            </button>
            <span className="text-xs font-mono font-bold text-stone-500">
              Order ID: #{activeOrder.orderRef}
            </span>
          </div>

          {/* Flipkart Card 1: Delivery Address */}
          <div
            className={`p-5 sm:p-6 rounded-2xl border shadow-xs space-y-3 ${
              isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-stone-200"
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#E08F35]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">
                  Delivery Address
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-[#E08F35]">
                {addr.label || "Home"}
              </span>
            </div>
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm text-stone-900 dark:text-stone-100">
                {addr.fullName || currentUser.displayName || "Valued Customer"}
              </p>
              <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
                {addr.addressLine1}
                {addr.landmark ? `, Near ${addr.landmark}` : ""}
              </p>
              <p className="text-stone-700 dark:text-stone-300 font-semibold">
                {addr.district || addr.city || "Bengaluru"}, {addr.state || "Karnataka"} -{" "}
                <span className="font-mono">{addr.pincode}</span>
              </p>
              <p className="text-stone-500 pt-1">
                <span className="font-semibold text-stone-700 dark:text-stone-300">Phone: </span>
                {addr.phone || "N/A"}
              </p>
            </div>
          </div>

          {/* Flipkart Card 2: Visual Order Stepper Tracker */}
          <div
            className={`p-5 sm:p-6 rounded-2xl border shadow-xs space-y-6 ${
              isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-stone-200"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4 border-stone-200 dark:border-stone-800">
              <div>
                <span className="text-xs text-stone-500 block">Current Status</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      activeOrder.orderStatus === "Delivered"
                        ? "bg-emerald-500"
                        : activeOrder.orderStatus === "Cancelled"
                        ? "bg-red-500"
                        : "bg-amber-500 animate-pulse"
                    }`}
                  />
                  <h2 className="text-base font-bold font-serif">
                    {activeOrder.orderStatus === "Delivered"
                      ? "Delivered to Doorstep"
                      : activeOrder.orderStatus === "Cancelled"
                      ? "Order Cancelled"
                      : activeOrder.orderStatus === "Dispatched"
                      ? "Dispatched with Delhivery Carrier"
                      : activeOrder.orderStatus === "Packed"
                      ? "Packed & Ready at Facility"
                      : "Order Confirmed"}
                  </h2>
                </div>
              </div>

              {activeOrder.trackingNumber && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-stone-500">
                    AWB: #{activeOrder.trackingNumber}
                  </span>
                  <a
                    href={`https://www.delhivery.com/track/package/${activeOrder.trackingNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#E08F35]/15 text-[#5E3210] dark:text-amber-200 hover:bg-[#E08F35]/25 flex items-center gap-1 transition-colors"
                  >
                    <span>Track on Delhivery</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Stepper Timeline (Flipkart style) */}
            {activeOrder.orderStatus !== "Cancelled" ? (
              <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200 dark:before:bg-stone-800">
                {/* Step 1: Placed */}
                <div className="relative flex items-start gap-4">
                  <div
                    className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      getStepStatus(1) === "completed"
                        ? "bg-emerald-600 text-white"
                        : "bg-stone-300 text-stone-700"
                    }`}
                  >
                    ✓
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Order Confirmed
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {activeOrder.date || "Order verified & queued for fresh pressing"}
                    </p>
                  </div>
                </div>

                {/* Step 2: Packed */}
                <div className="relative flex items-start gap-4">
                  <div
                    className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      getStepStatus(2) === "completed"
                        ? "bg-emerald-600 text-white"
                        : "bg-stone-200 dark:bg-stone-800 text-stone-400"
                    }`}
                  >
                    {getStepStatus(2) === "completed" ? "✓" : "2"}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Packed & Picked Up by Delhivery
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {isPackedOrPickedUp
                        ? `Handed over to carrier • Peenya 2nd Stage Hub`
                        : "Cold-pressing fresh batch & bubble pack packaging"}
                    </p>
                  </div>
                </div>

                {/* Step 3: Shipped / In Transit */}
                <div className="relative flex items-start gap-4">
                  <div
                    className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      getStepStatus(3) === "completed"
                        ? "bg-emerald-600 text-white"
                        : "bg-stone-200 dark:bg-stone-800 text-stone-400"
                    }`}
                  >
                    {getStepStatus(3) === "completed" ? "✓" : "3"}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Shipped & In Transit
                    </p>
                    <p className="text-[11px] text-stone-500">
                      Package is on the way to your nearest delivery hub
                    </p>
                  </div>
                </div>

                {/* Step 4: Delivered */}
                <div className="relative flex items-start gap-4">
                  <div
                    className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      getStepStatus(4) === "completed"
                        ? "bg-emerald-600 text-white"
                        : "bg-stone-200 dark:bg-stone-800 text-stone-400"
                    }`}
                  >
                    {getStepStatus(4) === "completed" ? "✓" : "4"}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Delivered
                    </p>
                    <p className="text-[11px] text-stone-500">
                      Doorstep delivery with tamper-proof seal intact
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-600 text-xs">
                <XCircle className="w-5 h-5 shrink-0" />
                <span>
                  This order was cancelled. If paid online, a full refund has been initiated to your
                  source account.
                </span>
              </div>
            )}
          </div>

          {/* Flipkart Card 3: Items in this Order */}
          <div
            className={`p-5 sm:p-6 rounded-2xl border shadow-xs space-y-4 ${
              isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-stone-200"
            }`}
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 border-b pb-3 border-stone-200 dark:border-stone-800">
              Items Ordered ({activeOrder.items.length})
            </h3>
            <div className="divide-y divide-stone-200 dark:divide-stone-800">
              {activeOrder.items.map((it, idx) => (
                <div key={idx} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-amber-500/5 border border-stone-200 dark:border-stone-800 p-1 flex items-center justify-center shrink-0">
                    <img
                      src={it.image}
                      alt={it.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold truncate text-stone-900 dark:text-stone-100">
                      {it.title}
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      Pack: <span className="font-semibold text-stone-700 dark:text-stone-300">{it.variant}</span> • Qty:{" "}
                      <span className="font-semibold text-stone-700 dark:text-stone-300">{it.quantity}</span>
                    </p>
                    <p className="text-xs font-bold text-stone-900 dark:text-stone-100 mt-1">
                      ₹{it.price * it.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Flipkart Card 4: Price Details & Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Price Details */}
            <div
              className={`p-5 sm:p-6 rounded-2xl border shadow-xs space-y-3 ${
                isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-stone-200"
              }`}
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 border-b pb-3 border-stone-200 dark:border-stone-800">
                Price Details
              </h3>
              <div className="text-xs space-y-2 text-stone-600 dark:text-stone-400">
                <div className="flex justify-between">
                  <span>List Price</span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    ₹{activeOrder.subtotal}
                  </span>
                </div>
                {activeOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span className="font-bold">-₹{activeOrder.discount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {activeOrder.shippingFee === 0 ? "FREE" : `₹${activeOrder.shippingFee}`}
                  </span>
                </div>
                <div className="pt-2 border-t flex justify-between text-sm font-bold text-stone-900 dark:text-stone-100 border-stone-200 dark:border-stone-800">
                  <span>Total Amount</span>
                  <span className="text-base font-serif text-[#C8751B] dark:text-amber-300">
                    ₹{activeOrder.total}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 pt-1">
                  Payment Mode:{" "}
                  <span className="font-bold uppercase text-stone-700 dark:text-stone-300">
                    {activeOrder.paymentMode || activeOrder.paymentMethod}
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Actions & Help */}
            <div
              className={`p-5 sm:p-6 rounded-2xl border shadow-xs space-y-3 flex flex-col justify-between ${
                isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-stone-200"
              }`}
            >
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 border-b pb-3 border-stone-200 dark:border-stone-800">
                  Actions & Support
                </h3>
                <div className="space-y-2.5 pt-3">
                  {/* Download Invoice Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrderForInvoice(activeOrder);
                      setIsInvoiceOpen(true);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <FileText className="w-4 h-4 text-[#E08F35]" />
                    <span>Download Tax Invoice (PDF)</span>
                  </button>

                  {/* WhatsApp Support Link */}
                  <a
                    href={`https://wa.me/${BUSINESS_CONFIG.PHONE_RAW}?text=${encodeURIComponent(
                      `Hi MANOPAVANA, I need assistance regarding my order #${activeOrder.orderRef}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Need Help? Chat on WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Cancel Button (Strictly removed once picked up / packed) */}
              <div className="pt-3 border-t border-stone-200 dark:border-stone-800">
                {canCancel ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm(`Are you sure you want to cancel Order #${activeOrder.orderRef}?`)) {
                        await cancelOrderWithinWindow(activeOrder.orderRef);
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel Order
                  </button>
                ) : (
                  <p className="text-[11px] text-stone-500 text-center">
                    {activeOrder.orderStatus === "Cancelled"
                      ? "Order cancelled."
                      : "Order is packed/handed over to Delhivery logistics. Cancellation is closed."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tax Invoice Modal */}
        {isInvoiceOpen && selectedOrderForInvoice && (
          <InvoiceModal
            order={selectedOrderForInvoice}
            isOpen={isInvoiceOpen}
            onClose={() => {
              setIsInvoiceOpen(false);
              setSelectedOrderForInvoice(null);
            }}
          />
        )}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // FLIPKART-EXACT ORDERS LIST VIEW
  // --------------------------------------------------------------------------
  return (
    <div
      className={`w-full min-h-[calc(100vh-80px)] py-6 sm:py-10 transition-colors ${
        isDark ? "bg-[#140D09] text-[#FAF4EA]" : "bg-[#F1F3F6] text-[#212121]"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif">
              My Orders ({userOrders.length})
            </h1>
            <p className="text-xs text-stone-500">
              Track your wood-pressed oils and view past tax invoices
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search your orders here..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-[#E08F35]/30"
            />
          </div>
        </div>

        {/* Status Filters (All, On the way, Delivered, Cancelled) */}
        <div className="flex flex-wrap gap-2">
          {["all", "In Transit", "Delivered", "Cancelled"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all cursor-pointer ${
                statusFilter === st
                  ? "bg-[#5E3210] text-white shadow-xs"
                  : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700"
              }`}
            >
              {st === "all" ? "All Orders" : st}
            </button>
          ))}
        </div>

        {/* Orders List Cards */}
        {filteredOrders.length === 0 ? (
          <div
            className={`p-12 text-center rounded-3xl border space-y-3 ${
              isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-stone-200"
            }`}
          >
            <Package className="w-12 h-12 mx-auto text-stone-300 dark:text-stone-700" />
            <h3 className="text-base font-bold font-serif">No orders found</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {searchQuery
                ? `No orders matching "${searchQuery}"`
                : "You haven't placed any orders yet. Experience the authentic taste of 100% Marachekku oils!"}
            </p>
            <Link
              to="/"
              className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-[#E08F35] text-[#1F120A] font-bold text-xs shadow-md transition-all hover:scale-105"
            >
              Explore Wood-Pressed Oils
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((ord) => {
              const primaryItem = ord.items[0];
              const remainingCount = ord.items.length - 1;
              const isDelivered = ord.orderStatus === "Delivered";
              const isCancelled = ord.orderStatus === "Cancelled";

              return (
                <div
                  key={ord.orderRef}
                  onClick={() => navigate(`/orders/${ord.orderRef}`)}
                  className={`p-4 sm:p-5 rounded-2xl border shadow-xs transition-all hover:shadow-md cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isDark
                      ? "bg-[#1C120B] border-[#362114] hover:border-amber-500/40"
                      : "bg-white border-stone-200 hover:border-[#E08F35]/50"
                  }`}
                >
                  {/* Left: Product Thumbnail & Title */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-amber-500/5 border border-stone-200 dark:border-stone-800 p-1 flex items-center justify-center shrink-0">
                      {primaryItem?.image ? (
                        <img
                          src={primaryItem.image}
                          alt={primaryItem.title}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-stone-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                        {primaryItem?.title || "Wood Pressed Oil"}
                        {remainingCount > 0 && (
                          <span className="text-[11px] font-normal text-stone-500 ml-1">
                            +{remainingCount} more item{remainingCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-stone-500">
                        Pack: <span className="font-semibold text-stone-700 dark:text-stone-300">{primaryItem?.variant || "1L"}</span> • Order ID:{" "}
                        <span className="font-mono text-stone-700 dark:text-stone-300 font-semibold">
                          #{ord.orderRef}
                        </span>
                      </p>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        Placed on: {ord.date || "Recent"}
                      </p>
                    </div>
                  </div>

                  {/* Middle: Price */}
                  <div className="text-left md:text-center shrink-0">
                    <span className="text-xs text-stone-400 block md:hidden">Amount:</span>
                    <span className="text-base sm:text-lg font-bold font-serif text-stone-900 dark:text-stone-100">
                      ₹{ord.total}
                    </span>
                    <span className="text-[10px] text-stone-400 block uppercase font-mono">
                      {ord.paymentMode || ord.paymentMethod}
                    </span>
                  </div>

                  {/* Right: Flipkart Status Dot & Details Trigger */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                    <div className="text-left md:text-right">
                      <div className="flex items-center gap-1.5 md:justify-end">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isDelivered
                              ? "bg-emerald-500"
                              : isCancelled
                              ? "bg-red-500"
                              : "bg-amber-500 animate-pulse"
                          }`}
                        />
                        <span
                          className={`text-xs font-bold ${
                            isDelivered
                              ? "text-emerald-700 dark:text-emerald-400"
                              : isCancelled
                              ? "text-red-600"
                              : "text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {isDelivered
                            ? "Delivered"
                            : isCancelled
                            ? "Cancelled"
                            : ord.orderStatus === "Dispatched"
                            ? "In Transit"
                            : ord.orderStatus === "Packed"
                            ? "Packed & Picked up"
                            : "Order Placed"}
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-400 mt-0.5">
                        {isDelivered
                          ? "Delivered to your address"
                          : isCancelled
                          ? "Refund processed"
                          : ord.trackingNumber
                          ? `Delhivery AWB #${ord.trackingNumber}`
                          : "Preparing your shipment"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
