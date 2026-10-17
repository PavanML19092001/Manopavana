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
  LogIn,
  Zap,
} from "lucide-react";
import L from "leaflet";
import { useStore, LabeledAddress } from "../context/StoreContext";
import {
  INDIAN_STATES_DISTRICTS,
  BUSINESS_CONFIG,
  PHONEPE_CONFIG,
} from "../constants";
import { Order } from "../types";
import { updateFirestoreOrderStatus, getOrderFromFirestore, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
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
    savedAddresses,
    selectSavedAddress,
    saveNewAddress,
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

  // Multi-address book selector state
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    savedAddresses && savedAddresses.length > 0 ? savedAddresses[0].id : "new"
  );
  const [addressLabel, setAddressLabel] = useState<"Home" | "Work" | "Other">("Home");
  const [isAddingNewAddress, setIsAddingNewAddress] = useState<boolean>(
    !savedAddresses || savedAddresses.length === 0
  );

  // Address Form State with customer pre-fill
  const [fullName, setFullName] = useState(() => address.fullName || currentUser?.displayName || "");
  const [phone, setPhone] = useState(() => {
    if (address.phone) return address.phone;
    if (currentUser?.phoneNumber) return currentUser.phoneNumber.replace(/\D/g, "").slice(-10);
    if (currentUser?.email && currentUser.email.endsWith("@phone.manopavana.com")) {
      return currentUser.email.split("@")[0];
    }
    return "";
  });
  const [addressLine1, setAddressLine1] = useState(address.addressLine1 || "");
  const [landmark, setLandmark] = useState(address.landmark || "");
  const [state, setState] = useState(address.state || "Karnataka");
  const [district, setDistrict] = useState(address.district || "Bengaluru Urban");
  const [pincode, setPincode] = useState(address.pincode || "560058");
  const [coords, setCoords] = useState<[number, number]>([
    Number.isFinite(address.lat) ? (address.lat as number) : 12.9716,
    Number.isFinite(address.lng) ? (address.lng as number) : 77.5946,
  ]);
  const [isLocating, setIsLocating] = useState(false);
  const [iframePaymentUrl, setIframePaymentUrl] = useState<string | null>(null);
  const [pendingPhonePeRef, setPendingPhonePeRef] = useState<string | null>(null);

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<"phonepe" | "cod">("phonepe");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [lastAttemptedOrder, setLastAttemptedOrder] = useState<Order | null>(null);

  // Free COD bot/accidental order safeguard (random math sum)
  const [codChallenge, setCodChallenge] = useState<{ a: number; b: number }>({ a: 3, b: 5 });
  const [codAnswerInput, setCodAnswerInput] = useState<string>("");
  const [codError, setCodError] = useState<string | null>(null);

  // Generate random numbers for COD challenge whenever COD is chosen
  useEffect(() => {
    if (paymentMethod === "cod") {
      setCodChallenge({
        a: Math.floor(Math.random() * 8) + 2,
        b: Math.floor(Math.random() * 8) + 1,
      });
      setCodAnswerInput("");
      setCodError(null);
    }
  }, [paymentMethod]);

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

  // 1. Auto-fill from Auth & Address updates
  useEffect(() => {
    if (currentUser) {
      if (!fullName && currentUser.displayName) setFullName(currentUser.displayName);
      const cleanPhone = currentUser.phoneNumber
        ? currentUser.phoneNumber.replace(/\D/g, "").slice(-10)
        : currentUser.email?.endsWith("@phone.manopavana.com")
        ? currentUser.email.split("@")[0]
        : "";
      if (!phone && cleanPhone) setPhone(cleanPhone);
    }
    if (address) {
      if (address.fullName && !fullName) setFullName(address.fullName);
      if (address.phone && !phone) setPhone(address.phone);
      if (address.addressLine1 && !addressLine1) setAddressLine1(address.addressLine1);
      if (address.landmark && !landmark) setLandmark(address.landmark);
      if (address.state) setState(address.state);
      if (address.district) setDistrict(address.district);
      if (address.pincode && (!pincode || pincode === "560058")) setPincode(address.pincode);
      if (Number.isFinite(address.lat) && Number.isFinite(address.lng)) {
        const lat = address.lat as number;
        const lng = address.lng as number;
        setCoords([lat, lng]);
        safeUpdateMapCenter(lat, lng, 15);
      }
    }
  }, [address, currentUser]);

  // 2. Direct Firestore Customer Profile Sync on mount
  useEffect(() => {
    if (!currentUser?.uid) return;
    let isMounted = true;
    async function loadCustomerFromFirestore() {
      try {
        const snap = await getDoc(doc(db, "customers", currentUser!.uid));
        if (snap.exists() && isMounted) {
          const data = snap.data();
          if (data.name && !fullName) setFullName(data.name);
          if (data.phone && !phone) setPhone(data.phone);
          if (data.savedAddress && typeof data.savedAddress === "object") {
            const s = data.savedAddress;
            if (s.fullName) setFullName(s.fullName);
            if (s.phone) setPhone(s.phone);
            if (s.addressLine1) setAddressLine1(s.addressLine1);
            if (s.landmark) setLandmark(s.landmark);
            if (s.pincode) setPincode(s.pincode);
            if (s.district) setDistrict(s.district);
            if (s.state) setState(s.state);
            if (Number.isFinite(s.lat) && Number.isFinite(s.lng)) {
              setCoords([s.lat, s.lng]);
              safeUpdateMapCenter(s.lat, s.lng, 15);
            }
          }
        }
      } catch (err) {
        console.warn("Notice loading customer from Firestore:", err);
      }
    }
    loadCustomerFromFirestore();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid]);

  // If user returns from cancelled/uncompleted online payment with empty bag, auto-recover items
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

  // Check URL query parameters for return from PhonePe
  const orderRefQuery = searchParams.get("orderRef");
  useEffect(() => {
    if (orderRefQuery) {
      async function syncReturnedOrder(ref: string) {
        try {
          const ord = await getOrderFromFirestore(ref);
          if (ord) setLastAttemptedOrder(ord);
        } catch {}
      }
      syncReturnedOrder(orderRefQuery);
    }
  }, [orderRefQuery]);

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

  // Leaflet Map Setup in Checkout
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

          map.on("click", async (e: L.LeafletMouseEvent) => {
            try {
              const { lat, lng } = e.latlng;
              if (Number.isFinite(lat) && Number.isFinite(lng)) {
                setCoords([lat, lng]);
                marker.setLatLng([lat, lng]);
                updateAddress({ lat, lng });
                showToast("Pin placed on map! Updating address...");
                const partial = await reverseGeocodeAndSaveAddress(lat, lng);
                if (partial) {
                  if (partial.addressLine1) setAddressLine1(partial.addressLine1);
                  if (partial.pincode) setPincode(partial.pincode);
                  if (partial.state) setState(partial.state);
                  if (partial.district) setDistrict(partial.district);
                  if (partial.landmark) setLandmark(partial.landmark);
                  showToast("Address & district auto-populated from pin!");
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
                showToast("Pin dragged! Street address & district updated.");
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
            showToast("GPS coordinates retrieved! Auto-filling address...");
            const partial = await reverseGeocodeAndSaveAddress(lat, lng);
            if (partial) {
              if (partial.addressLine1) setAddressLine1(partial.addressLine1);
              if (partial.pincode) setPincode(partial.pincode);
              if (partial.state) setState(partial.state);
              if (partial.district) setDistrict(partial.district);
              if (partial.landmark) setLandmark(partial.landmark);
              showToast("Address & district auto-populated from GPS!");
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

    if (!currentUser) {
      showToast("Please sign in or create an account to place an order.");
      setLoginModalOpen(true);
      return;
    }

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

    // Save newly typed address to address book if selected
    if (isAddingNewAddress) {
      saveNewAddress({
        ...finalAddress,
        label: addressLabel,
      });
    }

    const finalCustomerUid = currentUser.uid;

    if (effectiveMethod === "cod") {
      // Math challenge safeguard verification
      const expected = codChallenge.a + codChallenge.b;
      if (parseInt(codAnswerInput.trim(), 10) !== expected) {
        setCodError(`Incorrect verification answer. What is ${codChallenge.a} + ${codChallenge.b}?`);
        showToast("Please enter the correct verification answer to place a COD order.");
        return;
      }

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

        await saveOrder(newOrder);
        sendOrderConfirmationEmail(newOrder).catch((e) => console.warn("Email alert notice:", e));

        if (isBuyNowMode) {
          clearBuyNow();
        } else {
          clearCart();
        }

        setOrderSuccessRef(orderRef);
        showToast("Order placed successfully with Cash on Delivery!");
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
          const isIframe = window.self !== window.top;
          if (isIframe) {
            setPendingPhonePeRef(phonePeOrderRef);
            setIframePaymentUrl(data.redirectUrl);
            setIsProcessing(false);
            try {
              window.open(data.redirectUrl, "_blank");
            } catch {}
            return;
          } else {
            window.location.href = data.redirectUrl;
            return;
          }
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

        {/* Guest Sign-in Required Banner */}
        {!currentUser && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/15 border-2 border-[#E08F35]/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E08F35]/20 border border-[#E08F35]/40 flex items-center justify-center text-[#E08F35] shrink-0">
                <Lock className="w-5 h-5 text-[#E08F35]" />
              </div>
              <div>
                <p className="font-bold text-sm text-[#1F120A] dark:text-[#FAF4EA]">
                  Sign In Required to Place Order
                </p>
                <p className="text-[#6A523E] dark:text-[#D6C4B0] mt-0.5">
                  Guests cannot place or track orders. Please sign in or create an account to complete your purchase and track delivery.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLoginModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs shrink-0 flex items-center gap-2 cursor-pointer shadow-sm transition-all hover:brightness-110"
            >
              <LogIn className="w-4 h-4 text-amber-300" />
              <span>Sign In / Register</span>
            </button>
          </div>
        )}

        {/* Logged-in Customer Confirmation Banner */}
        {currentUser && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-between gap-4 text-xs shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-xs text-[#1F120A] dark:text-[#FAF4EA]">
                  Account Synced & Details Pre-Filled
                </p>
                <p className="text-[11px] text-[#6A523E] dark:text-[#D6C4B0] mt-0.5">
                  Logged in as <strong className="text-emerald-700 dark:text-emerald-300">{fullName || currentUser.displayName || phone || currentUser.email}</strong>. Delivery address loaded from Firestore.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30 shrink-0">
              ✓ Firestore Synced
            </span>
          </div>
        )}

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
              <span>Retry Payment</span>
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

              {/* Saved Address Cards */}
              {savedAddresses && savedAddresses.length > 0 && (
                <div className="space-y-3 pb-2">
                  <label className={`block text-xs font-bold ${isDark ? "text-[#FAF4EA]" : "text-[#3D2514]"}`}>
                    Select Saved Delivery Address
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedAddresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id && !isAddingNewAddress;
                      return (
                        <div
                          key={addr.id}
                          onClick={() => {
                            setSelectedAddressId(addr.id);
                            setIsAddingNewAddress(false);
                            selectSavedAddress(addr.id);
                            setFullName(addr.fullName || "");
                            setPhone(addr.phone || "");
                            setAddressLine1(addr.addressLine1 || "");
                            setLandmark(addr.landmark || "");
                            setState(addr.state || "Karnataka");
                            setDistrict(addr.district || "Bengaluru Urban");
                            setPincode(addr.pincode || "560058");
                            if (Number.isFinite(addr.lat) && Number.isFinite(addr.lng)) {
                              setCoords([addr.lat!, addr.lng!]);
                              safeUpdateMapCenter(addr.lat!, addr.lng!, 15);
                            }
                          }}
                          className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? isDark
                                ? "bg-amber-950/40 border-[#E08F35] ring-2 ring-[#E08F35]/40"
                                : "bg-amber-50/80 border-[#E08F35] ring-2 ring-[#E08F35]/40"
                              : isDark
                              ? "bg-[#150D07] border-[#362114] hover:border-[#4D2E1A]"
                              : "bg-[#FAF7F2] border-[#E8DEC8] hover:border-[#DDD1BE]"
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold mb-1">
                            <span className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-[#E08F35]/20 text-[#E08F35]">
                                {addr.label}
                              </span>
                              <span className="truncate max-w-[120px]">{addr.fullName}</span>
                            </span>
                            <span className="font-mono text-[11px] text-[#A88D77]">{addr.phone}</span>
                          </div>
                          <p className="text-[11px] text-stone-500 line-clamp-2">
                            {addr.addressLine1}, {addr.district || addr.city} - {addr.pincode}
                          </p>
                        </div>
                      );
                    })}

                    <div
                      onClick={() => {
                        setSelectedAddressId("new");
                        setIsAddingNewAddress(true);
                      }}
                      className={`p-3.5 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 cursor-pointer text-xs font-bold transition-all ${
                        isAddingNewAddress
                          ? "border-[#E08F35] bg-amber-500/10 text-[#E08F35]"
                          : isDark
                          ? "border-[#362114] text-[#A88D77] hover:border-[#E08F35]"
                          : "border-[#DDD1BE] text-[#7A5E48] hover:border-[#E08F35]"
                      }`}
                    >
                      <span>+ Deliver to a Different Address</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Input Container */}
              {isAddingNewAddress && (
                <div className="space-y-4 pt-2 border-t border-stone-200 dark:border-stone-800">
                  {/* Address Label Selector */}
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-[#FAF4EA]" : "text-[#3D2514]"}`}>
                      Address Label
                    </label>
                    <div className="flex gap-2">
                      {(["Home", "Work", "Other"] as const).map((lbl) => (
                        <button
                          key={lbl}
                          type="button"
                          onClick={() => setAddressLabel(lbl)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            addressLabel === lbl
                              ? "bg-[#5E3210] text-white shadow-xs"
                              : isDark
                              ? "bg-[#150D07] border border-[#362114] text-[#A88D77]"
                              : "bg-[#FAF7F2] border border-[#DDD1BE] text-[#5C402D]"
                          }`}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
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
                </div>
              )}

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
                {/* Option 1: Online Payment */}
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
                      className="mt-1 accent-[#E08F35]"
                    />
                    <div>
                      <span
                        className={`text-xs font-bold block ${
                          isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                        }`}
                      >
                        Online Payment (UPI, PhonePe, GPay, Cards, NetBanking)
                      </span>
                      <span
                        className={`text-[11px] block mt-0.5 ${
                          isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"
                        }`}
                      >
                        Instant order confirmation & automated digital receipt
                      </span>
                    </div>
                  </div>
                  <Zap className="w-4 h-4 text-[#E08F35] shrink-0" />
                </label>

                {/* Option 2: Cash on Delivery */}
                <label
                  className={`p-4 rounded-xl border flex flex-col cursor-pointer transition-all ${
                    paymentMethod === "cod"
                      ? isDark
                        ? "bg-amber-950/40 border-[#E08F35] ring-2 ring-[#E08F35]/30"
                        : "bg-amber-50/70 border-[#E08F35] ring-2 ring-[#E08F35]/30"
                      : isDark
                      ? "border-[#362114] hover:border-[#4D2E1A]"
                      : "border-[#E8DEC8] hover:border-[#DDD1BE]"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === "cod"}
                        onChange={() => setPaymentMethod("cod")}
                        className="mt-1 accent-[#E08F35]"
                      />
                      <div>
                        <span
                          className={`text-xs font-bold block ${
                            isDark ? "text-[#FAF4EA]" : "text-[#23150C]"
                          }`}
                        >
                          Cash on Delivery (COD)
                        </span>
                        <span
                          className={`text-[11px] block mt-0.5 ${
                            isDark ? "text-[#D6C4B0]" : "text-[#5C402D]"
                          }`}
                        >
                          Pay cash or UPI directly to our delivery executive at doorstep
                        </span>
                      </div>
                    </div>
                    <Banknote className="w-4 h-4 text-emerald-500 shrink-0" />
                  </div>

                  {/* Math Challenge Box for COD Orders */}
                  {paymentMethod === "cod" && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2 mt-3 ml-7">
                      <p className="font-bold text-[#1F120A] dark:text-[#FAF4EA]">
                        Quick COD Verification (Prevent Accidental Orders):
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm bg-white dark:bg-black/40 px-3 py-1 rounded-lg border border-amber-400">
                          {codChallenge.a} + {codChallenge.b} = ?
                        </span>
                        <input
                          type="number"
                          placeholder="Answer"
                          value={codAnswerInput}
                          onChange={(e) => {
                            setCodAnswerInput(e.target.value);
                            setCodError(null);
                          }}
                          className="w-24 px-3 py-1 text-sm font-bold rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#120A06] text-center"
                        />
                      </div>
                      {codError && (
                        <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold">
                          {codError}
                        </p>
                      )}
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Place Order Button */}
          <div className="lg:col-span-5 space-y-6">
            <div
              className={`rounded-2xl border p-6 shadow-2xs space-y-4 ${
                isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
              }`}
            >
              <h2
                className={`text-base font-bold font-serif border-b pb-3 ${
                  isDark ? "text-[#FAF4EA] border-[#2D1B10]" : "text-[#23150C] border-[#EFE8DC]"
                }`}
              >
                Order Summary ({checkoutItems.length} {checkoutItems.length === 1 ? "item" : "items"})
              </h2>

              {/* Items List */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {checkoutItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-10 h-10 object-contain p-0.5 rounded-lg border bg-white/5 shrink-0"
                      />
                      <div>
                        <p className={`font-bold ${isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}`}>
                          {item.title}
                        </p>
                        <p className="text-[10px] text-stone-500">
                          {item.variant} × {item.quantity}
                        </p>
                      </div>
                    </div>
                    <span className="font-extrabold text-[#E08F35]">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 pt-3 border-t border-stone-200 dark:border-stone-800 text-xs">
                <div className="flex justify-between text-stone-500">
                  <span>Items Subtotal:</span>
                  <span>₹{checkoutSubtotal}</span>
                </div>
                {checkoutDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Loyalty Discount:</span>
                    <span>-₹{checkoutDiscount}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-500">
                  <span>Doorstep Delivery:</span>
                  <span>{checkoutShippingFee === 0 ? "FREE" : `₹${checkoutShippingFee}`}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-stone-200 dark:border-stone-800">
                  <span className={isDark ? "text-[#FAF4EA]" : "text-[#23150C]"}>Total Amount:</span>
                  <span className="text-[#E08F35]">₹{checkoutTotal}</span>
                </div>
              </div>

              {/* Place Order CTA Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#D49A37] via-[#F5BC51] to-[#BF7E16] text-[#140D09] font-serif font-black tracking-wider uppercase shadow-[0_4px_20px_rgba(212,154,55,0.35)] border border-[#FFD885] transition-all flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 disabled:opacity-50 mt-4"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#140D09]" />
                    <span>Processing Order...</span>
                  </>
                ) : paymentMethod === "phonepe" ? (
                  <>
                    <Lock className="w-4 h-4 text-[#140D09]" />
                    <span>Pay ₹{checkoutTotal} Online Securely</span>
                  </>
                ) : (
                  <>
                    <Banknote className="w-4 h-4 text-[#140D09]" />
                    <span>Confirm Cash on Delivery (₹{checkoutTotal})</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-[11px] space-y-1.5 text-stone-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Direct delivery from Peenya 2nd Stage, Bangalore</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>100% pure cold-pressed unrefined natural cooking oils</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};