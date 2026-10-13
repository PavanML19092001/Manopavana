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
  User,
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
    buyNowItem,
    startBuyNow,
    clearBuyNow,
    cmsConfig,
    loyalty,
    address,
    updateAddress,
    reverseGeocodeAndSaveAddress,
    saveOrder,
    clearCart,
    showToast,
    setLoginModalOpen,
    getOrder,
    currentUser,
    themeMode,
  } = useStore();

  const isDark = themeMode === "dark";

  // Check if Buy Now direct mode is active (ordering single item without touching cart)
  const isBuyNowMode = searchParams.get("mode") === "buynow" && buyNowItem !== null;
  const checkoutItems = isBuyNowMode && buyNowItem ? [buyNowItem] : cart;

  const checkoutSubtotal = checkoutItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
  const checkoutDiscount = loyalty.isActive
    ? Math.round((checkoutSubtotal * loyalty.discountPercent) / 100)
    : 0;
  const checkoutDiscountedSubtotal = checkoutSubtotal - checkoutDiscount;
  const checkoutShippingFee =
    checkoutItems.length === 0
      ? 0
      : checkoutDiscountedSubtotal >= (cmsConfig?.freeShippingThreshold || BUSINESS_CONFIG.FREE_SHIPPING_THRESHOLD)
      ? 0
      : (cmsConfig?.standardShippingFee || BUSINESS_CONFIG.STANDARD_SHIPPING_FEE);
  const checkoutTotal =
    checkoutItems.length === 0 ? 0 : checkoutDiscountedSubtotal + checkoutShippingFee;

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
  const [isLocating, setIsLocating] = useState(false);

  // Auto-sync form state whenever address is updated globally anywhere across the app
  useEffect(() => {
    if (address) {
      if (address.fullName) setFullName(address.fullName);
      if (address.phone) setPhone(address.phone);
      if (address.addressLine1) setAddressLine1(address.addressLine1);
      if (address.landmark) setLandmark(address.landmark);
      if (address.state) setState(address.state);
      if (address.district) setDistrict(address.district);
      if (address.pincode) setPincode(address.pincode);
      if (address.lat && address.lng) {
        setCoords([address.lat, address.lng]);
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([address.lat, address.lng], 15);
          markerRef.current.setLatLng([address.lat, address.lng]);
        }
      }
    }
  }, [address]);

  // If user returns from cancelled/uncompleted online payment with empty bag, auto-recover items!
  useEffect(() => {
    if (checkoutItems.length === 0) {
      try {
        const pendingRaw = localStorage.getItem("pending_order_data");
        if (pendingRaw) {
          const ord: Order = JSON.parse(pendingRaw);
          if (ord.items && ord.items.length > 0) {
            setLastAttemptedOrder(ord);
            if (ord.isBuyNow && ord.items.length === 1) {
              const it = ord.items[0];
              startBuyNow(it, it.quantity);
            } else {
              ord.items.forEach((it) => {
                addToCart(it, it.quantity);
              });
            }
            if (ord.shippingAddress) {
              updateAddress(ord.shippingAddress);
            }
            showToast("Recovered your ordered items into checkout bag!");
          }
        }
      } catch {
        // ignore
      }
    }
  }, [checkoutItems.length]);

  // Payment method: "phonepe" (Online Payment) or "cod" (Cash on Delivery)
  const [paymentMethod, setPaymentMethod] = useState<"phonepe" | "cod">("phonepe");
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

          showToast("Payment verified online! Order confirmed.");
          clearCart();
          clearBuyNow();
          navigate(`/account?order=${ref}`);
          return;
        }
      }

      // Incomplete or cancelled payment handling
      setPaymentError(
        "Online transaction was not completed or was cancelled. Your items are safe. You can retry with Online Payment or switch to Cash on Delivery."
      );
      // Retrieve stored pending order
      const existing = getOrder(ref);
      if (existing) {
        setLastAttemptedOrder(existing);
      }
    } catch (e) {
      console.warn("Verification notice:", e);
      setPaymentError("Could not verify online payment status. You can retry with Online Payment or select Cash on Delivery.");
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
      if (orderToRestore.isBuyNow && orderToRestore.items.length === 1) {
        const it = orderToRestore.items[0];
        startBuyNow(it, it.quantity);
      } else {
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
      }
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

        marker.on("dragend", async () => {
          const latLng = marker.getLatLng();
          setCoords([latLng.lat, latLng.lng]);
          updateAddress({ lat: latLng.lat, lng: latLng.lng });
          const partial = await reverseGeocodeAndSaveAddress(latLng.lat, latLng.lng);
          if (partial) {
            if (partial.addressLine1) setAddressLine1(partial.addressLine1);
            if (partial.pincode) setPincode(partial.pincode);
            if (partial.state) setState(partial.state);
            if (partial.district) setDistrict(partial.district);
            if (partial.landmark) setLandmark(partial.landmark);
            showToast("📍 Pin dragged! Street address & district updated.");
          }
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
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setCoords(c);
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView(c, 15);
          markerRef.current.setLatLng(c);
        }
        showToast("📍 GPS coordinates retrieved! Auto-filling address...");
        const partial = await reverseGeocodeAndSaveAddress(c[0], c[1]);
        if (partial) {
          if (partial.addressLine1) setAddressLine1(partial.addressLine1);
          if (partial.pincode) setPincode(partial.pincode);
          if (partial.state) setState(partial.state);
          if (partial.district) setDistrict(partial.district);
          if (partial.landmark) setLandmark(partial.landmark);
          showToast("📍 Address & pincode auto-populated from GPS!");
        }
        setIsLocating(false);
      },
      (err) => {
        console.warn("Geolocation warning:", err.message);
        setIsLocating(false);
        showToast("GPS detection permission denied or timed out");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (checkoutItems.length === 0) {
      showToast("Your checkout bag is empty. Add items first.");
      navigate("/");
      return;
    }

    // MANDATORY AUTHENTICATION GUARD:
    // Only logged-in users can place orders so orders are strictly linked to their account
    if (!currentUser) {
      showToast("Please log in or sign up first to place your order.");
      setLoginModalOpen(true);
      return;
    }

    if (!fullName.trim() || !phone.trim() || !addressLine1.trim() || !pincode.trim()) {
      showToast("Please fill in all required shipping address details.");
      return;
    }

    const cleanPin = pincode.trim().replace(/\D/g, "").slice(0, 6);
    if (cleanPin.length !== 6) {
      showToast("Please enter a valid 6-digit Indian pincode.");
      return;
    }
    const cleanPhone = phone.trim().replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      showToast("Please enter a valid 10-digit mobile number.");
      return;
    }

    const isBLR =
      cleanPin.startsWith("560") ||
      district.toLowerCase().includes("bengaluru") ||
      district.toLowerCase().includes("bangalore");

    const customerEmail = address.email?.trim() || currentUser?.email?.trim() || "";
    const finalAddress = {
      fullName: fullName.trim(),
      phone: cleanPhone,
      email: customerEmail,
      addressLine1: addressLine1.trim(),
      landmark: landmark.trim(),
      district,
      state,
      pincode: cleanPin,
      city: isBLR ? "Bengaluru" : (district || "India"),
      lat: coords[0],
      lng: coords[1],
      isBangalore: isBLR,
    };
    updateAddress(finalAddress);

    if (paymentMethod === "cod") {
      // If there was an incomplete online payment attempt, mark it replaced so orders never show twice!
      const prevPendingRef = localStorage.getItem("pending_order_ref") || lastAttemptedOrder?.orderRef;
      if (prevPendingRef) {
        updateFirestoreOrderStatus(prevPendingRef, {
          orderStatus: "Replaced by COD" as any,
          paymentStatus: "REPLACED",
        }).catch(() => {});
      }

      const orderRef = `MV-${Date.now().toString().slice(-6)}`;
      const newOrder: Order = {
        id: `ORD-${Date.now().toString().slice(-4)}`,
        orderRef,
        date: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        timestamp: Date.now(),
        timestampMs: Date.now(),
        items: [...checkoutItems],
        subtotal: checkoutSubtotal,
        discount: checkoutDiscount,
        shippingFee: checkoutShippingFee,
        total: checkoutTotal,
        paymentMethod: "cod",
        paymentMode: "COD",
        paymentStatus: "COMPLETED",
        orderStatus: "Placed",
        shippingAddress: finalAddress,
        trackingNumber: isBLR
          ? `MV-BLR-${Math.floor(10000 + Math.random() * 90000)}`
          : `MV-DLH-${Math.floor(10000 + Math.random() * 90000)}`,
        courier: isBLR ? "MANOPAVANA Peenya Express Carrier" : "Delhivery Express Logistics",
        customerUid: currentUser.uid,
        customerPhone: cleanPhone,
        customerEmail: customerEmail || undefined,
        isBuyNow: isBuyNowMode,
      };

      await saveOrder(newOrder);
      await sendOrderConfirmationEmail(newOrder);

      // If direct Buy Now session, clear ONLY buyNowItem so regular bag items remain untouched!
      if (isBuyNowMode) {
        clearBuyNow();
      } else {
        clearCart();
      }

      showToast("Order placed successfully with Cash on Delivery!");
      navigate(`/account?order=${orderRef}`);
      return;
    }

    if (paymentMethod === "phonepe") {
      setIsProcessing(true);
      setPaymentError(null);

      // 1. Strictly generate orderRef format: MP_timestamp_random
      const phonePeOrderRef = "MP_" + Date.now() + "_" + Math.floor(100 + Math.random() * 900);

      const pendingOrder: Order = {
        id: `ORD-${Date.now().toString().slice(-4)}`,
        orderRef: phonePeOrderRef,
        date: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        timestamp: Date.now(),
        timestampMs: Date.now(),
        items: [...checkoutItems],
        subtotal: checkoutSubtotal,
        discount: checkoutDiscount,
        shippingFee: checkoutShippingFee,
        total: checkoutTotal,
        paymentMethod: "phonepe",
        paymentMode: "PHONEPE",
        paymentStatus: "PENDING",
        orderStatus: "Payment Incomplete",
        shippingAddress: finalAddress,
        trackingNumber: isBLR
          ? `MV-BLR-${Math.floor(10000 + Math.random() * 90000)}`
          : `MV-DLH-${Math.floor(10000 + Math.random() * 90000)}`,
        courier: isBLR ? "MANOPAVANA Peenya Express Carrier" : "Delhivery Express Logistics",
        customerUid: currentUser.uid,
        customerPhone: cleanPhone,
        customerEmail: customerEmail || undefined,
        isBuyNow: isBuyNowMode,
      };

      setLastAttemptedOrder(pendingOrder);

      localStorage.setItem("pending_order_ref", phonePeOrderRef);
      localStorage.setItem("pending_order_timestamp", Date.now().toString());
      localStorage.setItem("pending_order_data", JSON.stringify(pendingOrder));

      // Persist as pending order in Firestore
      await saveOrder(pendingOrder);

      try {
        const origin = window.location.origin;

        const resp = await fetch("/api?action=create_order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderRef: phonePeOrderRef,
            amount: checkoutTotal,
            phone: phone,
            redirectBaseUrl: origin,
          }),
        });

        const data = await resp.json();

        if (resp.ok && data.status === "SUCCESS" && data.redirectUrl) {
          // Do NOT clear buyNowItem here; only clear upon verified completion
          window.location.href = data.redirectUrl;
          return;
        } else {
          const errorMsg =
            data.message ||
            data.raw?.message ||
            "Unable to initiate transaction with payment gateway. Please try again or select Cash on Delivery.";
          setPaymentError(errorMsg);
          showToast(errorMsg);
        }
      } catch (err: unknown) {
        console.error("Payment Initiation Request Error:", err);
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Connection error contacting payment gateway. Please verify network or select Cash on Delivery.";
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

        {/* Direct Buy indicator banner */}
        {isBuyNowMode && buyNowItem && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/70 to-[#361E10] border-2 border-[#E08F35]/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200 shadow-md">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-lg bg-[#E08F35] text-black font-black text-[10px] tracking-wider uppercase">
                Direct Buy
              </span>
              <div>
                <p className="font-bold text-white">
                  Ordering {buyNowItem.title} ({buyNowItem.variant}) only
                </p>
                <p className="text-[11px] text-[#D6C4B0] mt-0.5">
                  Your regular bag ({cart.length} item{cart.length === 1 ? "" : "s"}) remains safely preserved.
                </p>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  clearBuyNow();
                  navigate("/checkout");
                }}
                className="px-3 py-1.5 rounded-lg bg-black/40 hover:bg-black/60 border border-amber-500/40 text-amber-300 font-bold text-xs transition-colors shrink-0 cursor-pointer"
              >
                Checkout Full Bag Instead ({cart.length}) →
              </button>
            )}
          </div>
        )}

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

        {/* Pan-India Delivery route badge if outside Bangalore */}
        {!isBangalore && pincode && (
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between gap-3 text-xs text-blue-900 dark:text-blue-200">
            <div className="flex items-center gap-2.5">
              <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                Pincode <strong>{pincode}</strong> is outside Bengaluru — fulfilled directly via <strong>Delhivery Express Logistics</strong> with live order tracking on our website!
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white shrink-0">
              Pan-India Delivery
            </span>
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
                      : "Pan-India Route via Delhivery Express Logistics (2–4 Days)"}
                  </p>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    {isBangalore
                      ? "Packed hygienically in Peenya and dispatched fresh via direct carrier."
                      : "Shipped with real-time Delhivery waybill tracking right here on our website."}
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
                {/* Option 1: Online Payment (UPI, Cards, NetBanking, Wallets) */}
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
                        <span>Online Payment (UPI, Cards, NetBanking, Wallets)</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                          Recommended
                        </span>
                      </span>
                      <p className={`text-[11px] mt-0.5 ${isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"}`}>
                        Instant bank-grade encrypted checkout via UPI, Cards, NetBanking & Wallets
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
                        Pay cash or scan UPI QR upon doorstep arrival
                      </p>
                    </div>
                  </div>
                  <Banknote className="w-4 h-4 text-[#8C7A6B] shrink-0" />
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
                Items to Dispatch ({checkoutItems.length})
              </h2>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {checkoutItems.map((item) => (
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
                    ₹{checkoutSubtotal}
                  </span>
                </div>

                {checkoutDiscount > 0 && (
                  <div className="flex items-center justify-between text-emerald-600 font-medium">
                    <span>10% Bottle QR Loyalty Discount</span>
                    <span className="font-bold">-₹{checkoutDiscount}</span>
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
                    {checkoutShippingFee === 0 ? "FREE" : `₹${checkoutShippingFee}`}
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
                    ₹{checkoutTotal}
                  </span>
                </div>
              </div>

              {/* Login requirement banner if user is not logged in */}
              {!currentUser && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Login Required to Place Order</span>
                  </div>
                  <p className="text-[11px] opacity-90 leading-relaxed">
                    Please log in or sign up before completing checkout. Your orders, live courier tracking, and invoices are securely tied to your registered account.
                  </p>
                  <button
                    type="button"
                    onClick={() => setLoginModalOpen(true)}
                    className="w-full py-2.5 rounded-lg bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
                  >
                    <User className="w-3.5 h-3.5 text-amber-300" />
                    <span>Log In / Sign Up to Continue</span>
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing || checkoutItems.length === 0}
                className="w-full py-4 rounded-xl bg-[#5E3210] hover:bg-[#43230A] disabled:opacity-50 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Connecting to Secure Payment Gateway...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-amber-300" />
                    <span>
                      {paymentMethod === "cod"
                        ? `Place Order with Cash on Delivery (₹${checkoutTotal})`
                        : `Confirm & Pay Online ₹${checkoutTotal}`}
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
