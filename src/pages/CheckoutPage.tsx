import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  MapPin,
  ShieldCheck,
  CreditCard,
  Banknote,
  MessageCircle,
  Truck,
  AlertCircle,
  CheckCircle2,
  Lock,
  RefreshCw,
  Navigation,
  ExternalLink,
} from "lucide-react";
import L from "leaflet";
import { useStore } from "../context/StoreContext";
import {
  INDIAN_STATES_DISTRICTS,
  BUSINESS_CONFIG,
  PHONEPE_CONFIG,
} from "../constants";
import { Order } from "../types";
import { updateFirestoreOrderStatus } from "../firebase";
import { sendOrderConfirmationEmail } from "../services/emailService";

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    cart,
    addToCart,
    subtotal,
    discount,
    shippingFee,
    total,
    address,
    updateAddress,
    saveOrder,
    clearCart,
    showToast,
    setFlipkartModalOpen,
    getOrder,
    currentUser,
    themeMode,
  } = useStore();

  const isDark = themeMode === "dark";

  // Address Form State
  const [fullName, setFullName] = useState(address.fullName);
  const [phone, setPhone] = useState(address.phone);
  const [addressLine1, setAddressLine1] = useState(address.addressLine1);
  const [landmark, setLandmark] = useState(address.landmark);
  const [state, setState] = useState(address.state || "Karnataka");
  const [district, setDistrict] = useState(address.district || "Bengaluru Urban");
  const [pincode, setPincode] = useState(address.pincode || "560058");
  const [coords, setCoords] = useState<[number, number]>([
    address.lat || 12.9716,
    address.lng || 77.5946,
  ]);

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<"phonepe" | "cod" | "whatsapp">("phonepe");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [lastAttemptedOrder, setLastAttemptedOrder] = useState<Order | null>(null);

  // Check URL query parameters for return from PhonePe
  const orderRefQuery = searchParams.get("orderRef");

  useEffect(() => {
    if (orderRefQuery) {
      verifyPhonePeOrder(orderRefQuery);
    }
  }, [orderRefQuery]);

  const verifyPhonePeOrder = async (ref: string) => {
    setIsProcessing(true);
    try {
      const resp = await fetch(`/api?action=verify_order&orderRef=${encodeURIComponent(ref)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.status === "SUCCESS" || data.paymentStatus === "COMPLETED") {
          // 1. Update Firestore order document to PHONEPE_PAID
          await updateFirestoreOrderStatus(ref, {
            paymentStatus: "PHONEPE_PAID" as any,
            orderStatus: "Placed",
          });

          // 2. Dispatch order confirmation email via EmailJS to manopavana@gmail.com
          const matchedOrder = getOrder(ref);
          if (matchedOrder) {
            await sendOrderConfirmationEmail({
              ...matchedOrder,
              paymentStatus: "PHONEPE_PAID" as any,
            });
          }

          showToast("Payment verified via PhonePe! Order confirmed.");
          clearCart();
          navigate(`/account?order=${ref}`);
          return;
        }
      }

      // Incomplete or cancelled payment handling
      setPaymentError(
        "PhonePe transaction was not completed or was cancelled. Your items are safe. Click Retry Payment below to proceed."
      );
      // Retrieve stored pending order
      const existing = getOrder(ref);
      if (existing) {
        setLastAttemptedOrder(existing);
      }
    } catch (e) {
      console.warn("Verification notice:", e);
      setPaymentError("Could not verify PhonePe payment. You can retry with PhonePe, COD or WhatsApp.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetryPayment = () => {
    let orderToRestore = lastAttemptedOrder;
    if (!orderToRestore) {
      try {
        const stored = localStorage.getItem("pending_order_data");
        if (stored) orderToRestore = JSON.parse(stored);
      } catch {
        // ignore
      }
    }
    if (orderToRestore && orderToRestore.items) {
      // Restore items back into active cart
      orderToRestore.items.forEach((item) => {
        addToCart(
          {
            id: item.id,
            productId: item.productId,
            title: item.title,
            subtitle: item.subtitle,
            variant: item.variant,
            price: item.price,
            regularPrice: item.regularPrice,
            image: item.image,
          },
          item.quantity
        );
      });
      showToast("Items restored to active cart!");
    }
    setPaymentError(null);
  };

  // Leaflet Map in Checkout
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: coords,
          zoom: 14,
          attributionControl: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);

        const customIcon = L.divIcon({
          className: "checkout-leaflet-marker",
          html: `<div style="background-color:#5E3210; width:26px; height:26px; border-radius:50%; border:3px solid #FFF; box-shadow:0 4px 10px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center;">
                  <div style="background:#E08F35; width:10px; height:10px; border-radius:50%;"></div>
                </div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        const marker = L.marker(coords, {
          draggable: true,
          icon: customIcon,
        }).addTo(map);

        marker.on("dragend", () => {
          const latLng = marker.getLatLng();
          setCoords([latLng.lat, latLng.lng]);
          updateAddress({ lat: latLng.lat, lng: latLng.lng });
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      }
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const handleStateChange = (newState: string) => {
    setState(newState);
    const districtsForState = INDIAN_STATES_DISTRICTS[newState] || [];
    setDistrict(districtsForState[0] || "");
  };

  // Location check: Must start with 560 for Bangalore direct delivery
  const isBangalore = pincode.trim().startsWith("560");

  const handleGPSDetect = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setCoords(c);
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView(c, 15);
          markerRef.current.setLatLng(c);
        }
        updateAddress({ lat: c[0], lng: c[1] });
        showToast("📍 Pin set to your device GPS");
      },
      () => {
        showToast("GPS detection permission denied or timed out");
      }
    );
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      showToast("Your cart is empty. Add items first.");
      navigate("/");
      return;
    }

    if (!fullName || !phone || !addressLine1 || !pincode) {
      showToast("Please fill in all required shipping address details.");
      return;
    }

    // MANDATORY LOCATION GUARD:
    // If pincode does not start with 560, trigger the Flipkart Intercept Modal and block local dispatch
    if (!pincode.trim().startsWith("560")) {
      updateAddress({
        fullName,
        phone,
        addressLine1,
        landmark,
        district,
        state,
        pincode,
        city: district,
        isBangalore: false,
      });
      setFlipkartModalOpen(true);
      return;
    }

    // 1-Click sync address globally
    const finalAddress = {
      fullName,
      phone,
      addressLine1,
      landmark,
      district,
      state,
      pincode,
      city: "Bengaluru",
      lat: coords[0],
      lng: coords[1],
      isBangalore: true,
    };
    updateAddress(finalAddress);

    if (paymentMethod === "whatsapp") {
      const orderRef = `MV-${Date.now().toString().slice(-6)}`;
      const newOrder: Order = {
        id: `ORD-${Date.now().toString().slice(-4)}`,
        orderRef,
        date: "Just now",
        timestamp: Date.now(),
        timestampMs: Date.now(),
        items: [...cart],
        subtotal,
        discount,
        shippingFee,
        total,
        paymentMethod: "whatsapp",
        paymentMode: "WHATSAPP",
        paymentStatus: "COMPLETED",
        orderStatus: "Placed",
        shippingAddress: finalAddress,
        trackingNumber: `MV-BLR-${Math.floor(10000 + Math.random() * 90000)}`,
        courier: "MANOPAVANA Peenya Express Carrier",
      };

      await saveOrder(newOrder);
      await sendOrderConfirmationEmail(newOrder);
      clearCart();

      const itemLines = cart
        .map((i) => `• ${i.title} (${i.variant}) x ${i.quantity} = ₹${i.price * i.quantity}`)
        .join("%0A");
      const waText = `*NEW ORDER ON MANOPAVANA*%0A*Order Ref:* ${orderRef}%0A*Customer:* ${fullName}%0A*Phone:* ${phone}%0A*Address:* ${addressLine1}, Bengaluru - ${pincode}%0A%0A*Items:*%0A${itemLines}%0A%0A*Total Amount:* ₹${total}%0A*Delivery:* Bengaluru Doorstep Delivery%0A%0APlease confirm my order and send dispatch tracking.`;

      window.location.href = `https://wa.me/${BUSINESS_CONFIG.PHONE_RAW}?text=${waText}`;
      return;
    }

    if (paymentMethod === "cod") {
      const orderRef = `MV-${Date.now().toString().slice(-6)}`;
      const newOrder: Order = {
        id: `ORD-${Date.now().toString().slice(-4)}`,
        orderRef,
        date: "Just now",
        timestamp: Date.now(),
        timestampMs: Date.now(),
        items: [...cart],
        subtotal,
        discount,
        shippingFee,
        total,
        paymentMethod: "cod",
        paymentMode: "COD",
        paymentStatus: "COMPLETED",
        orderStatus: "Placed",
        shippingAddress: finalAddress,
        trackingNumber: `MV-BLR-${Math.floor(10000 + Math.random() * 90000)}`,
        courier: "MANOPAVANA Peenya Express Carrier",
      };

      await saveOrder(newOrder);
      await sendOrderConfirmationEmail(newOrder);
      clearCart();
      showToast("Order placed successfully with Cash on Delivery!");
      navigate(`/account?order=${orderRef}`);
      return;
    }

    if (paymentMethod === "phonepe") {
      setIsProcessing(true);
      setPaymentError(null);

      // 1. Strictly generate orderRef format: MP_timestamp_random
      const phonePeOrderRef = "MP_" + Date.now() + "_" + Math.floor(100 + Math.random() * 900);

      // 1. Do NOT mark the order as "Placed" or "Paid" locally
      const pendingOrder: Order = {
        id: `ORD-${Date.now().toString().slice(-4)}`,
        orderRef: phonePeOrderRef,
        date: "Just now",
        timestamp: Date.now(),
        timestampMs: Date.now(),
        items: [...cart],
        subtotal,
        discount,
        shippingFee,
        total,
        paymentMethod: "phonepe",
        paymentMode: "PHONEPE",
        paymentStatus: "PENDING",
        orderStatus: "Payment Incomplete",
        shippingAddress: finalAddress,
        trackingNumber: `MV-BLR-${Math.floor(10000 + Math.random() * 90000)}`,
        courier: "MANOPAVANA Peenya Express Carrier",
      };

      setLastAttemptedOrder(pendingOrder);

      // 4. Save pending_order_ref, pending_order_timestamp (Date.now()), and pending_order_data in localStorage
      localStorage.setItem("pending_order_ref", phonePeOrderRef);
      localStorage.setItem("pending_order_timestamp", Date.now().toString());
      localStorage.setItem("pending_order_data", JSON.stringify(pendingOrder));

      // Persist as pending order in Firestore
      await saveOrder(pendingOrder);

      try {
        const origin = window.location.origin;

        // 2 & 3. Send POST request to /api?action=create_order with amount converted to Paise >= 100 on edge
        const resp = await fetch("/api?action=create_order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderRef: phonePeOrderRef,
            amount: total,
            phone: phone,
            redirectBaseUrl: origin,
          }),
        });

        const data = await resp.json();

        // 5. When backend returns SUCCESS with redirectUrl, execute full window redirect without refreshing
        if (resp.ok && data.status === "SUCCESS" && data.redirectUrl) {
          window.location.href = data.redirectUrl;
          return;
        } else {
          // 6. If backend fails or returns an error, show clear error banner and do NOT place the order
          const errorMsg =
            data.message ||
            data.raw?.message ||
            "Unable to initiate transaction with PhonePe payment gateway. Please try again or select Cash on Delivery.";
          setPaymentError(errorMsg);
          showToast(errorMsg);
        }
      } catch (err: unknown) {
        console.error("PhonePe Initiation Request Error:", err);
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Connection error contacting PhonePe gateway. Please verify network or select Cash on Delivery.";
        setPaymentError(errorMsg);
        showToast(errorMsg);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div
      className={`w-full min-h-[calc(100vh-80px)] py-8 transition-colors box-border ${
        isDark ? "bg-[#140D09] text-[#FAF4EA]" : "bg-[#FAF6F0] text-[#23150C]"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-extrabold font-serif ${
              isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
            }`}
          >
            Checkout & Dispatch Order
          </h1>
          <p className={`text-xs ${isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"}`}>
            Pinpoint Bengaluru delivery coordinates and choose payment method
          </p>
        </div>

        {/* Failure recovery banner */}
        {paymentError && (
          <div className="p-4 sm:p-5 rounded-2xl bg-red-50 border-2 border-red-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-red-950 text-xs shadow-md">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-red-900">Payment Incomplete</p>
                <p className="mt-0.5 text-red-800">{paymentError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRetryPayment}
              className="px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-xs shrink-0 flex items-center gap-2 cursor-pointer shadow-sm transition-all"
            >
              <RefreshCw className="w-4 h-4 text-amber-200" />
              <span>⚡ Retry Payment</span>
            </button>
          </div>
        )}

        {/* Location warning if non-560 */}
        {!isBangalore && pincode && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
              <span>
                Pincode <strong>{pincode}</strong> is outside Bengaluru (560xxx). Direct Peenya doorstep delivery is exclusive to Bengaluru.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFlipkartModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-[#2874F0] text-white font-bold text-[11px] shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <span>Flipkart Store</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Delivery Address & Map Geocoding */}
          <div className="lg:col-span-7 space-y-6">
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
                  <MapPin className="w-4 h-4 text-[#E08F35]" />
                  <h2
                    className={`text-base font-bold font-serif ${
                      isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                    }`}
                  >
                    Shipping Address
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleGPSDetect}
                  className={`text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                    isDark ? "text-amber-300 hover:text-amber-200" : "text-[#5E3210] hover:text-[#E08F35]"
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>GPS Pinpoint</span>
                </button>
              </div>

              {/* Recipient details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    className={`block text-xs font-semibold mb-1 ${
                      isDark ? "text-[#FAF4EA]" : "text-[#3D2514]"
                    }`}
                  >
                    Recipient Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Manoj Kumar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 ${
                      isDark
                        ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA] placeholder-[#8C7A6B]"
                        : "bg-[#FAF7F2] border border-[#DDD1BE] text-[#23150C] placeholder-[#8C7A6B]"
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`block text-xs font-semibold mb-1 ${
                      isDark ? "text-[#FAF4EA]" : "text-[#3D2514]"
                    }`}
                  >
                    WhatsApp Contact Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9180301917"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 ${
                      isDark
                        ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA] placeholder-[#8C7A6B]"
                        : "bg-[#FAF7F2] border border-[#DDD1BE] text-[#23150C] placeholder-[#8C7A6B]"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label
                  className={`block text-xs font-semibold mb-1 ${
                    isDark ? "text-[#FAF4EA]" : "text-[#3D2514]"
                  }`}
                >
                  Flat / House / Street Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 118, Raghavendra Layout, Thigalarapalya"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 ${
                    isDark
                      ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA] placeholder-[#8C7A6B]"
                      : "bg-[#FAF7F2] border border-[#DDD1BE] text-[#23150C] placeholder-[#8C7A6B]"
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    className={`block text-xs font-semibold mb-1 ${
                      isDark ? "text-[#FAF4EA]" : "text-[#3D2514]"
                    }`}
                  >
                    State *
                  </label>
                  <select
                    value={state}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 ${
                      isDark
                        ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                        : "bg-[#FAF7F2] border border-[#DDD1BE] text-[#23150C]"
                    }`}
                  >
                    {Object.keys(INDIAN_STATES_DISTRICTS).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className={`block text-xs font-semibold mb-1 ${
                      isDark ? "text-[#FAF4EA]" : "text-[#3D2514]"
                    }`}
                  >
                    District *
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 ${
                      isDark
                        ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                        : "bg-[#FAF7F2] border border-[#DDD1BE] text-[#23150C]"
                    }`}
                  >
                    {(INDIAN_STATES_DISTRICTS[state] || []).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className={`block text-xs font-semibold mb-1 ${
                      isDark ? "text-[#FAF4EA]" : "text-[#3D2514]"
                    }`}
                  >
                    Pincode * (560xxx for BLR)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="560058"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 ${
                      isDark
                        ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                        : "bg-[#FAF7F2] border border-[#DDD1BE] text-[#23150C]"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label
                  className={`block text-xs font-semibold mb-1 ${
                    isDark ? "text-[#FAF4EA]" : "text-[#3D2514]"
                  }`}
                >
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near Peenya 2nd Stage Water Tank"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E08F35]/40 ${
                    isDark
                      ? "bg-[#150D07] border border-[#362114] text-[#FAF4EA]"
                      : "bg-[#FAF7F2] border border-[#DDD1BE] text-[#23150C]"
                  }`}
                />
              </div>

              {/* Interactive OpenStreetMap */}
              <div className="space-y-1 pt-2">
                <div
                  className={`flex items-center justify-between text-xs ${
                    isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"
                  }`}
                >
                  <span className={`font-semibold ${isDark ? "text-[#FAF4EA]" : "text-[#3D2514]"}`}>
                    Delivery Geolocation Pin (OpenStreetMap):
                  </span>
                  <span className="text-[11px] font-mono">
                    {coords[0].toFixed(4)}, {coords[1].toFixed(4)}
                  </span>
                </div>
                <div
                  ref={mapContainerRef}
                  className={`w-full h-36 rounded-xl border overflow-hidden shadow-inner ${
                    isDark ? "bg-[#140D07] border-[#362114]" : "bg-[#EFE9DF] border-[#E3D4C0]"
                  }`}
                />
              </div>

              {/* Delivery Service Confirmation */}
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-3 ${
                  isBangalore
                    ? isDark
                      ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-200"
                      : "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : isDark
                    ? "bg-blue-950/40 border-blue-800/40 text-blue-200"
                    : "bg-blue-50 border-blue-200 text-blue-900"
                }`}
              >
                {isBangalore ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <Truck className="w-5 h-5 text-blue-500 shrink-0" />
                )}
                <div>
                  <p className="font-bold">
                    {isBangalore
                      ? "Direct Bengaluru Facility Doorstep Delivery (24–72 hrs)"
                      : "Pan-India Route via Flipkart Assured"}
                  </p>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    {isBangalore
                      ? "Packed hygienically in Peenya and dispatched fresh."
                      : "Shipped with tracking via authorized logistics."}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div
              className={`rounded-2xl border p-6 shadow-2xs space-y-4 ${
                isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
              }`}
            >
              <div
                className={`flex items-center gap-2 border-b pb-3 ${
                  isDark ? "border-[#2D1B10]" : "border-[#EFE8DC]"
                }`}
              >
                <CreditCard className="w-4 h-4 text-[#E08F35]" />
                <h2
                  className={`text-base font-bold font-serif ${
                    isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                  }`}
                >
                  Choose Payment Method
                </h2>
              </div>

              <div className="space-y-3">
                {/* Option 1: PhonePe Official */}
                <label
                  className={`p-4 rounded-xl border flex items-start justify-between cursor-pointer transition-all ${
                    paymentMethod === "phonepe"
                      ? isDark
                        ? "bg-amber-950/40 border-[#E08F35] ring-2 ring-[#E08F35]/30"
                        : "bg-amber-50/70 border-[#E08F35] ring-2 ring-[#E08F35]/30"
                      : isDark
                      ? "border-[#362114] hover:border-[#4D2E1A]"
                      : "border-[#E8DEC8] hover:border-[#DDD1BE]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "phonepe"}
                      onChange={() => setPaymentMethod("phonepe")}
                      className="mt-1 text-[#E08F35] focus:ring-[#E08F35]"
                    />
                    <div>
                      <span
                        className={`text-xs font-bold flex items-center gap-2 ${
                          isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                        }`}
                      >
                        <span>PhonePe Official PG (UPI, Cards, NetBanking)</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                          Recommended
                        </span>
                      </span>
                      <p className={`text-[11px] mt-0.5 ${isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"}`}>
                        Instant 256-bit bank-grade encryption via PhonePe Gateway
                      </p>
                    </div>
                  </div>
                  <Lock className="w-4 h-4 text-[#8C7A6B] shrink-0" />
                </label>

                {/* Option 2: Cash On Delivery */}
                <label
                  className={`p-4 rounded-xl border flex items-start justify-between cursor-pointer transition-all ${
                    paymentMethod === "cod"
                      ? isDark
                        ? "bg-amber-950/40 border-[#E08F35] ring-2 ring-[#E08F35]/30"
                        : "bg-amber-50/70 border-[#E08F35] ring-2 ring-[#E08F35]/30"
                      : isDark
                      ? "border-[#362114] hover:border-[#4D2E1A]"
                      : "border-[#E8DEC8] hover:border-[#DDD1BE]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                      className="mt-1 text-[#E08F35] focus:ring-[#E08F35]"
                    />
                    <div>
                      <span
                        className={`text-xs font-bold flex items-center gap-2 ${
                          isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                        }`}
                      >
                        <span>Cash on Delivery (Bengaluru only)</span>
                      </span>
                      <p className={`text-[11px] mt-0.5 ${isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"}`}>
                        Pay cash or scan QR upon doorstep arrival
                      </p>
                    </div>
                  </div>
                  <Banknote className="w-4 h-4 text-[#8C7A6B] shrink-0" />
                </label>

                {/* Option 3: WhatsApp Direct */}
                <label
                  className={`p-4 rounded-xl border flex items-start justify-between cursor-pointer transition-all ${
                    paymentMethod === "whatsapp"
                      ? isDark
                        ? "bg-amber-950/40 border-[#E08F35] ring-2 ring-[#E08F35]/30"
                        : "bg-amber-50/70 border-[#E08F35] ring-2 ring-[#E08F35]/30"
                      : isDark
                      ? "border-[#362114] hover:border-[#4D2E1A]"
                      : "border-[#E8DEC8] hover:border-[#DDD1BE]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "whatsapp"}
                      onChange={() => setPaymentMethod("whatsapp")}
                      className="mt-1 text-[#E08F35] focus:ring-[#E08F35]"
                    />
                    <div>
                      <span
                        className={`text-xs font-bold flex items-center gap-2 ${
                          isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                        }`}
                      >
                        <span>WhatsApp Direct Instant Order</span>
                      </span>
                      <p className={`text-[11px] mt-0.5 ${isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"}`}>
                        Order directly with founder Manoj M R via WhatsApp
                      </p>
                    </div>
                  </div>
                  <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Place Order */}
          <div className="lg:col-span-5 space-y-4">
            <div
              className={`rounded-2xl border p-6 shadow-2xs space-y-4 sticky top-24 ${
                isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
              }`}
            >
              <h2
                className={`text-base font-bold font-serif border-b pb-3 ${
                  isDark ? "text-[#FAF4EA] border-[#2D1B10]" : "text-[#23150C] border-[#EFE8DC]"
                }`}
              >
                Items to Dispatch ({cart.length})
              </h2>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <img
                        src={item.image}
                        alt={item.title}
                        className={`w-9 h-9 object-contain rounded p-0.5 ${
                          isDark ? "bg-[#150D07]" : "bg-[#FAF6EE]"
                        }`}
                      />
                      <div>
                        <p
                          className={`font-bold truncate max-w-[160px] ${
                            isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                          }`}
                        >
                          {item.title}
                        </p>
                        <p className={`text-[10px] ${isDark ? "text-[#A8907E]" : "text-[#7A5E48]"}`}>
                          {item.variant} x {item.quantity}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-extrabold ${
                        isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                      }`}
                    >
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              <div
                className={`pt-3 border-t space-y-2 text-xs ${
                  isDark ? "border-[#2D1B10]" : "border-[#EFE8DC]"
                }`}
              >
                <div
                  className={`flex items-center justify-between ${
                    isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"
                  }`}
                >
                  <span>Items Subtotal</span>
                  <span
                    className={`font-bold ${
                      isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                    }`}
                  >
                    ₹{subtotal}
                  </span>
                </div>

                {discount > 0 && (
                  <div className="flex items-center justify-between text-emerald-600 font-medium">
                    <span>10% Bottle QR Loyalty Discount</span>
                    <span className="font-bold">-₹{discount}</span>
                  </div>
                )}

                <div
                  className={`flex items-center justify-between ${
                    isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"
                  }`}
                >
                  <span>Bangalore Doorstep Delivery</span>
                  <span
                    className={`font-bold ${
                      isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                    }`}
                  >
                    {shippingFee === 0 ? "FREE" : `₹${shippingFee}`}
                  </span>
                </div>

                <div
                  className={`pt-3 border-t flex items-center justify-between ${
                    isDark ? "border-[#2D1B10]" : "border-[#EFE8DC]"
                  }`}
                >
                  <span
                    className={`text-sm font-bold ${
                      isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                    }`}
                  >
                    Total Payable
                  </span>
                  <span
                    className={`text-2xl font-black font-serif ${
                      isDark ? "text-amber-300" : "text-[#C8751B]"
                    }`}
                  >
                    ₹{total}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing || cart.length === 0}
                className="w-full py-4 rounded-xl bg-[#5E3210] hover:bg-[#43230A] disabled:opacity-50 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Connecting with PhonePe Gateway...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-amber-300" />
                    <span>
                      {paymentMethod === "whatsapp"
                        ? "Send Order via WhatsApp"
                        : `Confirm & Pay ₹${total}`}
                    </span>
                  </>
                )}
              </button>

              <div
                className={`text-[10px] space-y-1 text-center pt-2 ${
                  isDark ? "text-[#A8907E]" : "text-[#8C7A6B]"
                }`}
              >
                <p>FSSAI: {BUSINESS_CONFIG.FSSAI_LICENSE} • GSTIN: {BUSINESS_CONFIG.GSTIN}</p>
                <p>Facility: 118, Raghavendra Layout, Thigalarapalya, Peenya 2nd Stage</p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
