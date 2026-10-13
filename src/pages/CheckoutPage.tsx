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
    setOrderSuccessRef,
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
    Number.isFinite(address.lat) ? (address.lat as number) : 12.9716,
    Number.isFinite(address.lng) ? (address.lng as number) : 77.5946,
  ]);
  const [isLocating, setIsLocating] = useState(false);

  const safeUpdateMapCenter = (lat: number, lng: number, zoom = 14) => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    try {
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        mapInstanceRef.current.setView([lat, lng], zoom);
        markerRef.current.setLatLng([lat, lng]);
      }
    } catch (e) {
      console.warn("Map view notice:", e);
    }
  };

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
      if (Number.isFinite(address.lat) && Number.isFinite(address.lng)) {
        const lat = address.lat as number;
        const lng = address.lng as number;
        setCoords([lat, lng]);
        safeUpdateMapCenter(lat, lng, 15);
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
      try {
        if ((mapContainerRef.current as any)._leaflet_id && !mapInstanceRef.current) {
          (mapContainerRef.current as any)._leaflet_id = null;
        }

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

          // Allow clicking directly anywhere on the map to pinpoint delivery spot
          map.on("click", async (e: L.LeafletMouseEvent) => {
            try {
              const { lat, lng } = e.latlng;
              if (Number.isFinite(lat) && Number.isFinite(lng)) {
                setCoords([lat, lng]);
                marker.setLatLng([lat, lng]);
                updateAddress({ lat, lng });
                showToast("📍 Pin placed on map! Updating address...");
                const partial = await reverseGeocodeAndSaveAddress(lat, lng);
                if (partial) {
                  if (partial.addressLine1) setAddressLine1(partial.addressLine1);
                  if (partial.pincode) setPincode(partial.pincode);
                  if (partial.state) setState(partial.state);
                  if (partial.district) setDistrict(partial.district);
                  if (partial.landmark) setLandmark(partial.landmark);
                  showToast("📍 Address & district auto-populated from pin!");
                }
              }
            } catch (err) {
              console.warn("Map click notice:", err);
            }
          });

          marker.on("dragend", async () => {
            try {
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
            } catch (e) {
              console.warn("Marker drag notice:", e);
            }
          });

          mapInstanceRef.current = map;
          markerRef.current = marker;
        } else {
          try {
            mapInstanceRef.current.setView(coords, 14);
            if (markerRef.current) {
              markerRef.current.setLatLng(coords);
            }
          } catch {}
        }
      } catch (err) {
        console.warn("Map setup notice:", err);
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
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            const c: [number, number] = [lat, lng];
            setCoords(c);
            safeUpdateMapCenter(lat, lng, 15);
            showToast("📍 GPS coordinates retrieved! Auto-filling address...");
            const partial = await reverseGeocodeAndSaveAddress(lat, lng);
            if (partial) {
              if (partial.addressLine1) setAddressLine1(partial.addressLine1);
              if (partial.pincode) setPincode(partial.pincode);
              if (partial.state) setState(partial.state);
              if (partial.district) setDistrict(partial.district);
              if (partial.landmark) setLandmark(partial.landmark);
              showToast("📍 Address & district auto-populated from GPS!");
            }
          }
        } catch (e) {
          console.warn("GPS error:", e);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.warn("Geolocation warning:", err.message);
        setIsLocating(false);
        showToast("GPS detection permission denied or timed out");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handlePlaceOrder = async (e?: React.FormEvent, methodChoice?: "phonepe" | "cod") => {
    if (e) e.preventDefault();
    const effectiveMethod = methodChoice || paymentMethod;
    if (methodChoice) setPaymentMethod(methodChoice);

    if (checkoutItems.length === 0) {
      showToast("Your checkout bag is currently empty. Tap an oil bottle below to add it!");
      return;
    }

    if (!fullName.trim()) {
      showToast("Please enter the recipient full name.");
      return;
    }

    const cleanPhone = phone.trim().replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      showToast("Please enter a valid 10-digit WhatsApp phone number.");
      return;
    }

    if (!addressLine1.trim()) {
      showToast("Please enter your flat / house / street delivery address.");
      return;
    }

    const cleanPin = pincode.trim().replace(/\D/g, "").slice(0, 6);
    if (cleanPin.length !== 6) {
      showToast("Please enter a valid 6-digit Indian postal pincode.");
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

    const finalCustomerUid = currentUser?.uid || null;

    if (effectiveMethod === "cod") {
      setIsProcessing(true);
      try {
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
          customerUid: finalCustomerUid,
          customerPhone: cleanPhone,
          customerEmail: customerEmail || null,
          isBuyNow: isBuyNowMode,
        };

        try {
          const guestRefs: string[] = JSON.parse(localStorage.getItem("manopavana_guest_order_ids") || "[]");
          if (!guestRefs.includes(orderRef)) {
            guestRefs.push(orderRef);
            localStorage.setItem("manopavana_guest_order_ids", JSON.stringify(guestRefs));
          }
        } catch {}

        await saveOrder(newOrder);
        // Non-blocking email dispatch
        sendOrderConfirmationEmail(newOrder).catch((e) => console.warn("Email alert notice:", e));

        if (isBuyNowMode) {
          clearBuyNow();
        } else {
          clearCart();
        }

        setOrderSuccessRef(orderRef);
        showToast("🎉 Order placed successfully with Cash on Delivery!");
        navigate(`/account?order=${orderRef}`);
      } catch (err) {
        console.warn("COD placement error:", err);
        showToast("Order could not be saved. Please try again.");
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (effectiveMethod === "phonepe") {
      setIsProcessing(true);
      setPaymentError(null);

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
        customerUid: finalCustomerUid,
        customerPhone: cleanPhone,
        customerEmail: customerEmail || null,
        isBuyNow: isBuyNowMode,
      };

      setLastAttemptedOrder(pendingOrder);

      try {
        const guestRefs: string[] = JSON.parse(localStorage.getItem("manopavana_guest_order_ids") || "[]");
        if (!guestRefs.includes(phonePeOrderRef)) {
          guestRefs.push(phonePeOrderRef);
          localStorage.setItem("manopavana_guest_order_ids", JSON.stringify(guestRefs));
        }
      } catch {}

      localStorage.setItem("pending_order_ref", phonePeOrderRef);
      localStorage.setItem("pending_order_timestamp", Date.now().toString());
      localStorage.setItem("pending_order_data", JSON.stringify(pendingOrder));

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
            phone: cleanPhone,
            redirectBaseUrl: origin,
          }),
        });

        const data = await resp.json();

        if (resp.ok && data.status === "SUCCESS" && data.redirectUrl) {
          window.location.href = data.redirectUrl;
          return;
        } else {
          const errorMsg =
            data.message ||
            data.raw?.message ||
            "PhonePe Payment Gateway is busy. You can complete your order instantly with Cash on Delivery (COD)!";
          setPaymentError(errorMsg);
          showToast(errorMsg);
        }
      } catch (err: unknown) {
        console.error("Payment Initiation Request Error:", err);
        const errorMsg = "Could not contact payment gateway. You can place your order with Cash on Delivery (COD) instantly!";
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
                    {!((INDIAN_STATES_DISTRICTS[state] || []).includes(district)) && district && (
                      <option value={district}>{district}</option>
                    )}
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
                    Delivery Geolocation Pin (Click map or drag pin to choose location):
                  </span>
                  <span className="text-[11px] font-mono">
                    {Number(coords?.[0] || 12.9716).toFixed(4)}, {Number(coords?.[1] || 77.5946).toFixed(4)}
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
                        <span>Cash on Delivery (Doorstep Cash / UPI QR)</span>
                      </span>
                      <p className={`text-[11px] mt-0.5 ${isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"}`}>
                        Pay cash or scan UPI QR upon arrival (Available for all Bengaluru & Pan-India deliveries)
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
                  <span>{isBangalore ? "Bangalore Doorstep Delivery" : "Pan-India Express Delivery (Delhivery)"}</span>
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

              {/* Optional user account note - non-blocking */}
              {!currentUser ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-[11px]">
                      Guest Checkout: Orders tracked via your WhatsApp number.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLoginModalOpen(true)}
                    className="text-[11px] font-bold underline hover:text-amber-300 cursor-pointer shrink-0 ml-2"
                  >
                    Log In
                  </button>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="text-[11px] font-medium">
                    Ordering as: <strong>{currentUser.displayName || currentUser.email || "Valued Customer"}</strong>
                  </span>
                </div>
              )}

              {/* If checkout bag is empty, display instant product selection */}
              {checkoutItems.length === 0 && (
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/40 text-center space-y-3">
                  <p className="text-xs font-bold text-amber-200">Your checkout bag is currently empty.</p>
                  <p className="text-[11px] text-[#D6BEAA]">Choose an authentic wood-pressed oil to order instantly:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        addToCart({
                          id: "groundnut-1L",
                          productId: "groundnut",
                          title: "Wood-Pressed Groundnut Oil",
                          subtitle: "Marachekku Pure • 1L",
                          variant: "1L",
                          price: 399,
                          regularPrice: 399,
                          image: "/public/images/products/groundnut-light.png",
                        }, 1);
                        showToast("Added 1L Groundnut Oil to bag!");
                      }}
                      className="px-2.5 py-2 bg-black/40 hover:bg-black/60 border border-amber-500/40 text-amber-300 text-[11px] font-bold rounded-lg shadow-sm cursor-pointer transition-colors"
                    >
                      + Groundnut 1L (₹399)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        addToCart({
                          id: "coconut-1L",
                          productId: "coconut",
                          title: "Wood-Pressed Coconut Oil",
                          subtitle: "Marachekku Pure • 1L",
                          variant: "1L",
                          price: 499,
                          regularPrice: 499,
                          image: "/public/images/products/coconut-light.png",
                        }, 1);
                        showToast("Added 1L Coconut Oil to bag!");
                      }}
                      className="px-2.5 py-2 bg-black/40 hover:bg-black/60 border border-amber-500/40 text-amber-300 text-[11px] font-bold rounded-lg shadow-sm cursor-pointer transition-colors"
                    >
                      + Coconut 1L (₹499)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        addToCart({
                          id: "sesame-1L",
                          productId: "sesame",
                          title: "Wood-Pressed Sesame Oil",
                          subtitle: "Marachekku Pure • 1L",
                          variant: "1L",
                          price: 499,
                          regularPrice: 499,
                          image: "/public/images/products/sesame-light.png",
                        }, 1);
                        showToast("Added 1L Sesame Oil to bag!");
                      }}
                      className="px-2.5 py-2 bg-black/40 hover:bg-black/60 border border-amber-500/40 text-amber-300 text-[11px] font-bold rounded-lg shadow-sm cursor-pointer transition-colors"
                    >
                      + Sesame 1L (₹499)
                    </button>
                  </div>
                </div>
              )}

              {/* Single Unified Order Action Button matching selected payment method */}
              <div className="pt-1">
                {paymentMethod === "phonepe" ? (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handlePlaceOrder(undefined, "phonepe")}
                    className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-[#D49A37] via-[#F5BC51] to-[#BF7E16] text-[#140D09] font-black font-serif text-xs uppercase tracking-wider shadow-[0_4px_20px_rgba(212,154,55,0.4)] border border-[#FFD885] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#140D09]" />
                        <span>Connecting to PhonePe PG...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 text-[#140D09]" />
                        <span>Pay Online ₹{checkoutTotal} (UPI / Cards / NetBanking)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handlePlaceOrder(undefined, "cod")}
                    className="w-full py-4 px-4 rounded-xl bg-[#5E3210] hover:bg-[#43230A] border border-[#7D451B] text-white font-black font-serif text-xs uppercase tracking-wider shadow-[0_4px_20px_rgba(94,50,16,0.4)] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-200" />
                        <span>Placing Cash on Delivery Order...</span>
                      </>
                    ) : (
                      <>
                        <Banknote className="w-4 h-4 text-emerald-300" />
                        <span>Place Order with Cash on Delivery (₹{checkoutTotal})</span>
                      </>
                    )}
                  </button>
                )}
              </div>

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
