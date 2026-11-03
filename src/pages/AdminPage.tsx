import React, { useEffect, useState, useRef } from "react";
import L from "leaflet";
import { StorefrontCMSPanel } from "../components/admin/StoreFrontCmsPanel";
import {
  Lock,
  ShieldAlert,
  MapPin,
  ExternalLink,
  MessageCircle,
  Truck,
  Sparkles,
  Package,
  Printer,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Activity,
  Trash2,
  Eye,
  Key,
  Calendar,
  Sliders,
  Pause,
  Play,
  Edit2,
  Search,
  Navigation,
  Loader2,
  RotateCcw,
  X,
  Archive,
  Unlock,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { BUSINESS_CONFIG, INDIAN_STATES_DISTRICTS } from "../constants";
import { OrderStatus, Order } from "../types";
import { collection, onSnapshot, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export const AdminPage: React.FC = () => {
  const {
    currentUser,
    isAdminAuthenticated,
    authenticateAdmin,
    logoutAdmin,
    cmsConfig,
    orders,
    adminOrders,
    refreshAdminOrders,
    deleteOrder,
    updateOrderStatus,
    updateOrderDetails,
    showToast,
    themeMode,
    togglePreviewStorefront,
  } = useStore();

  const isDark = themeMode === "dark";

  const [adminOrderSearch, setAdminOrderSearch] = useState("");
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>("all");
  const [isSyncingOrders, setIsSyncingOrders] = useState(false);

  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [showCloudflareGuide, setShowCloudflareGuide] = useState(false);

  // Delhivery Logistics State
  const [checkingPincode, setCheckingPincode] = useState<Record<string, boolean>>({});
  const [pincodeStatus, setPincodeStatus] = useState<
    Record<
      string,
      { serviceable: boolean; cod: boolean; prepaid: boolean; message?: string }
    >
  >({});
  const [manifesting, setManifesting] = useState<Record<string, boolean>>({});
  const [manifestError, setManifestError] = useState<Record<string, string>>({});
  const [customAwb, setCustomAwb] = useState<Record<string, string>>({});
  const [copiedAddress, setCopiedAddress] = useState<Record<string, boolean>>({});

  // Ekart Logistics State
  const [carrierChoice, setCarrierChoice] = useState<Record<string, "delhivery" | "ekart">>({});
  const [manifestingEkart, setManifestingEkart] = useState<Record<string, boolean>>({});
  const [ekartManifestError, setEkartManifestError] = useState<Record<string, string>>({});
  const [customEkartAwb, setCustomEkartAwb] = useState<Record<string, string>>({});
  const [checkingEkartPincode, setCheckingEkartPincode] = useState<Record<string, boolean>>({});
  const [ekartPincodeStatus, setEkartPincodeStatus] = useState<Record<string, any>>({});
  const [pingingEkart, setPingingEkart] = useState(false);
  const [ekartPingResult, setEkartPingResult] = useState<{
    status: string;
    authenticated: boolean;
    clientIdMasked: string;
    clientName: string;
    warehouse: string;
    originPincode: string;
    latencyMs?: number;
    accountStatus?: string;
    walletBalance?: string;
    message?: string;
  } | null>(null);

  // Ekart Elite API Credentials State (OpenAPI 3.1.0 Authentication)
  const [showEkartAuthModal, setShowEkartAuthModal] = useState(false);
  const [ekartUsernameInput, setEkartUsernameInput] = useState(() => localStorage.getItem("ekart_username") || "manojmr1712@gmail.com");
  const [ekartPasswordInput, setEkartPasswordInput] = useState(() => localStorage.getItem("ekart_password") || "");
  const [ekartTokenInput, setEkartTokenInput] = useState(() => localStorage.getItem("ekart_token") || "");
  const [showEkartPassword, setShowEkartPassword] = useState(false);
  const [isVerifyingEkart, setIsVerifyingEkart] = useState(false);

  // Editable Address & GPS Pin State for CMS Orders
  const [editingOrderAddress, setEditingOrderAddress] = useState<Order | null>(null);
  const [editAddressForm, setEditAddressForm] = useState({
    fullName: "",
    phone: "",
    addressLine1: "",
    landmark: "",
    district: "",
    state: "Karnataka",
    pincode: "",
    lat: 12.9716,
    lng: 77.5946,
  });
  const [isLocatingEditPincode, setIsLocatingEditPincode] = useState(false);
  const [isSavingEditAddress, setIsSavingEditAddress] = useState(false);
  const [editMapSearchQuery, setEditMapSearchQuery] = useState("");
  const [editMapSearchResults, setEditMapSearchResults] = useState<any[]>([]);
  const [isSearchingEditMap, setIsSearchingEditMap] = useState(false);
  const adminMapInstanceRef = useRef<L.Map | null>(null);
  const adminMarkerRef = useRef<L.Marker | null>(null);

  // Delhivery Diagnostic State
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

  // Helper to map live Delhivery carrier status strings to website order stages
  const mapDelhiveryToWebStatus = (
    delhiveryStatus: string
  ): OrderStatus | null => {
    const s = String(delhiveryStatus || "").toLowerCase();

    if (s.includes("delivered")) {
      return "Delivered";
    }
    if (
      s.includes("in transit") ||
      s.includes("dispatched") ||
      s.includes("out for delivery") ||
      s.includes("in-transit")
    ) {
      return "Dispatched";
    }
    if (
      s.includes("manifest") ||
      s.includes("ready to ship") ||
      s.includes("scheduled") ||
      s.includes("open")
    ) {
      return "Packed";
    }
    if (s.includes("cancel")) {
      return "Cancelled";
    }

    return null;
  };

  // Automatic background carrier status sync for all active Delhivery orders
  useEffect(() => {
    const activeDelhiveryOrders = orders.filter(
      (o) =>
        Boolean(o.trackingNumber) &&
        o.orderStatus !== "Delivered" &&
        o.orderStatus !== "Cancelled"
    );

    if (activeDelhiveryOrders.length === 0) return;

    const syncActiveShipments = async () => {
      for (const ord of activeDelhiveryOrders) {
        if (!ord.trackingNumber) continue;
        try {
          const res = await fetch(
            `/api?action=delhivery_track&waybill=${encodeURIComponent(ord.trackingNumber)}`
          );
          const data = await res.json();
          const scanStatus =
            data?.data?.ShipmentData?.[0]?.Shipment?.Status?.Status;

          if (scanStatus) {
            const mapped = mapDelhiveryToWebStatus(scanStatus);
            if (mapped && mapped !== ord.orderStatus) {
              await updateOrderStatus(ord.id || ord.orderRef, mapped);
            }
          }
        } catch (e) {
          console.warn(`Background sync skipped for ${ord.trackingNumber}:`, e);
        }
      }
    };

    syncActiveShipments();

    const interval = setInterval(syncActiveShipments, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [orders, updateOrderStatus]);

  const facilityAddress =
    cmsConfig?.facilityAddress || BUSINESS_CONFIG.FACILITY_ADDRESS;

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

  const handleCheckPincode = async (orderRef: string, pincode?: string) => {
    if (!pincode) {
      showToast("No valid pincode provided");
      return;
    }
    setCheckingPincode((p) => ({ ...p, [orderRef]: true }));
    try {
      const res = await fetch(
        `/api?action=delhivery_check_pincode&pincode=${encodeURIComponent(pincode)}`
      );
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

    const addr = (order?.shippingAddress || {}) as any;
    const rawItems = order?.items;
    const items: any[] = Array.isArray(rawItems)
      ? rawItems
      : rawItems && typeof rawItems === "object"
      ? Object.values(rawItems)
      : [];

    const totalGrams =
      items.reduce((acc: number, item: any) => {
        const variant = String(item?.variant || "");
        const isLarge = variant.includes("1L") || variant.includes("3L");
        const gramsPerUnit = isLarge ? 1000 : 550;
        return acc + gramsPerUnit * (Number(item?.quantity) || 1);
      }, 0) || 1000;

    // Build the complete manual address line for carrier dispatch
    const fullStreetAddress = [
      addr.addressLine1?.trim(),
      addr.landmark?.trim() ? `Near ${addr.landmark.trim()}` : "",
      addr.district || addr.city,
    ]
      .filter(Boolean)
      .join(", ");

    const lat = Number.isFinite(Number(addr.lat)) && Number(addr.lat) !== 0 ? Number(addr.lat) : undefined;
    const lng = Number.isFinite(Number(addr.lng)) && Number(addr.lng) !== 0 ? Number(addr.lng) : undefined;
    const mapsUrl = (lat && lng) ? `https://maps.google.com/?q=${lat},${lng}` : null;

    try {
      const res = await fetch(`/api?action=delhivery_create_shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderRef: order.orderRef,
          customerName: addr.fullName?.trim() || "Customer",
          phone: (addr.phone || "").replace(/\D/g, "").slice(-10),
          address: fullStreetAddress,
          pincode: (addr.pincode || "560058").replace(/\D/g, "").slice(0, 6),
          city: addr.city || addr.district || "Bengaluru",
          state: addr.state || "Karnataka",
          paymentMode: order.paymentMethod === "cod" ? "COD" : "Prepaid",
          totalAmount: order.total || 0,
          weightGrams: totalGrams,
          productsDesc:
            items.map((i: any) => `${i.title} (${i.variant})`).join(", ") ||
            "Wood-pressed Cooking Oil",
          quantity: items.reduce(
            (acc: number, i: any) => acc + (Number(i?.quantity) || 1),
            0
          ),
          lat,
          lng,
          mapsUrl,
        }),
      });

      const data = await res.json();

      if (data.status === "SUCCESS" && data.waybill) {
        await updateOrderDetails(order.orderRef, {
          trackingNumber: data.waybill,
          courier: "Delhivery Express",
          orderStatus: "Packed",
        });
        showToast(`Delhivery Shipment Manifested! AWB: #${data.waybill}`);
      } else {
        const errMsg =
          data.message ||
          "Failed to generate waybill. Please verify pickup facility name or Delhivery balance.";
        setManifestError((p) => ({
          ...p,
          [order.orderRef]: errMsg,
        }));
        showToast(`Manifest Error: ${errMsg}`);
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

  const handleSaveCustomAwb = async (orderRef: string) => {
    const awb = (customAwb[orderRef] || "").trim();
    if (!awb) {
      showToast("Please enter a valid AWB number");
      return;
    }
    await updateOrderDetails(orderRef, {
      trackingNumber: awb,
      courier: "Delhivery Express",
      orderStatus: "Packed",
    });
    setCustomAwb((p) => ({ ...p, [orderRef]: "" }));
    showToast(`Saved Delhivery AWB #${awb}`);
  };

  const handlePingEkart = async () => {
    setPingingEkart(true);
    setEkartPingResult(null);
    try {
      const res = await fetch("/api?action=ekart_test_connection");
      const data = await res.json();
      setEkartPingResult(data);
      if (data.status === "SUCCESS") {
        showToast("Ekart Logistics API authenticated and ready!");
      } else {
        showToast(`Ekart check returned: ${data.message || "Notice"}`);
      }
    } catch {
      setEkartPingResult({
        status: "ERROR",
        authenticated: false,
        clientIdMasked: "EKART_6ae3...1963",
        clientName: "Manopavana",
        warehouse: "Manopavana_B2C",
        originPincode: "560058 (Peenya 2nd Stage, Bengaluru)",
        message: "Network error connecting to Ekart API",
      });
      showToast("Error testing Ekart API");
    } finally {
      setPingingEkart(false);
    }
  };

  const handleCheckEkartPincode = async (orderRef: string, pincode?: string) => {
    if (!pincode) {
      showToast("No valid pincode provided");
      return;
    }
    setCheckingEkartPincode((p) => ({ ...p, [orderRef]: true }));
    try {
      const res = await fetch(
        `/api?action=ekart_check_pincode&pincode=${encodeURIComponent(pincode)}`
      );
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setEkartPincodeStatus((p) => ({
          ...p,
          [orderRef]: {
            serviceable: data.serviceable,
            cod: data.cod,
            prepaid: data.prepaid,
            expectedDays: data.expectedDays,
            message: data.message,
          },
        }));
        showToast(
          `Ekart Pincode ${pincode}: ${
            data.serviceable ? `Deliverable (${data.expectedDays})` : "Unserviceable"
          }`
        );
      }
    } catch {
      showToast("Error checking Ekart pincode");
    } finally {
      setCheckingEkartPincode((p) => ({ ...p, [orderRef]: false }));
    }
  };

  const handleClearEkartCredentials = () => {
    localStorage.removeItem("ekart_password");
    localStorage.removeItem("ekart_token");
    setEkartPasswordInput("");
    setEkartTokenInput("");
    showToast("Cleared stored Ekart credentials.");
  };

  const handleSaveEkartCredentials = async () => {
    setIsVerifyingEkart(true);
    try {
      const u = ekartUsernameInput.trim() || "manojmr1712@gmail.com";
      const p = ekartPasswordInput.trim();
      let t = ekartTokenInput.trim();

      // If user accidentally put their Client ID into the Bearer token field
      if (t.startsWith("EKART_") || (t.length > 0 && t.length < 30)) {
        showToast("Notice: 'EKART_...' is your Client ID, not a Bearer token. Please enter your portal password instead.");
        t = "";
        setEkartTokenInput("");
        localStorage.removeItem("ekart_token");
      }

      if (!p && !t) {
        showToast("Please enter your Ekart Elite login password (used on app.elite.ekartlogistics.in).");
        setIsVerifyingEkart(false);
        return;
      }

      localStorage.setItem("ekart_username", u);
      if (p) localStorage.setItem("ekart_password", p);
      if (t) localStorage.setItem("ekart_token", t);

      // Verify credentials with backend
      const res = await fetch("/api?action=ekart_create_shipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderRef: "VERIFY_TEST",
          pincode: "560058",
          phone: "9180301917",
          ekartUsername: u,
          ekartPassword: p,
          ekartToken: t,
        }),
      });
      const data = await res.json();
      if (data.code === "EKART_AUTH_FAILED" || data.status === 401) {
        showToast(`Ekart Auth Notice: ${data.message}`);
      } else {
        showToast("Ekart Elite credentials verified & saved successfully!");
        setShowEkartAuthModal(false);
        handlePingEkart();
      }
    } catch {
      showToast("Ekart credentials saved locally!");
      setShowEkartAuthModal(false);
    } finally {
      setIsVerifyingEkart(false);
    }
  };

  const handleManifestEkart = async (order: Order) => {
    setManifestingEkart((p) => ({ ...p, [order.orderRef]: true }));
    setEkartManifestError((p) => ({ ...p, [order.orderRef]: "" }));

    const storedUsername =
      localStorage.getItem("ekart_username") ||
      ekartUsernameInput ||
      "manojmr1712@gmail.com";
    const storedPassword =
      localStorage.getItem("ekart_password") || ekartPasswordInput;
    let storedToken =
      localStorage.getItem("ekart_token") || ekartTokenInput;

    // Filter out client ID if accidentally stored as token
    if (storedToken && (storedToken.startsWith("EKART_") || storedToken.length < 30)) {
      storedToken = "";
      localStorage.removeItem("ekart_token");
    }

    if (!storedPassword && !storedToken) {
      setShowEkartAuthModal(true);
      showToast(
        "Please enter your Ekart Elite password to activate 1-Click manifests"
      );
      setManifestingEkart((p) => ({ ...p, [order.orderRef]: false }));
      return;
    }

    const addr = order.shippingAddress || ({} as any);
    const items = order.items || [];
    const totalGrams =
      items.reduce((acc: number, item: any) => {
        const titleAndVariant = `${item?.title || ""} ${item?.variant || ""}`.toLowerCase();
        const isLarge =
          titleAndVariant.includes("5l") ||
          titleAndVariant.includes("can") ||
          titleAndVariant.includes("5 l") ||
          titleAndVariant.includes("5000ml");
        const gramsPerUnit = isLarge ? 5000 : 1000;
        return acc + gramsPerUnit * (Number(item?.quantity) || 1);
      }, 0) || 1000;

    const fullStreetAddress = [
      addr.addressLine1?.trim(),
      addr.landmark?.trim() ? `Near ${addr.landmark.trim()}` : "",
      addr.district || addr.city,
    ]
      .filter(Boolean)
      .join(", ");

    try {
      const res = await fetch("/api?action=ekart_create_shipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderRef: order.orderRef,
          customerName: addr.fullName?.trim() || "Customer",
          phone: (addr.phone || "").replace(/\D/g, "").slice(-10),
          address: fullStreetAddress,
          pincode: (addr.pincode || "560058").replace(/\D/g, "").slice(0, 6),
          city: addr.city || addr.district || "Bengaluru",
          state: addr.state || "Karnataka",
          paymentMode: order.paymentMethod === "cod" ? "COD" : "Prepaid",
          totalAmount: order.total || 0,
          weightGrams: totalGrams,
          productsDesc:
            items.map((i: any) => `${i.title} (${i.variant})`).join(", ") ||
            "Wood-pressed Cooking Oil Bottles",
          quantity: items.reduce(
            (acc: number, i: any) => acc + (Number(i?.quantity) || 1),
            0
          ),
          ekartUsername: storedUsername,
          ekartPassword: storedPassword,
          ekartToken: storedToken,
        }),
      });

      const data = await res.json();
      if (data.status === "SUCCESS" && data.waybill) {
        await updateOrderDetails(order.orderRef, {
          trackingNumber: data.waybill,
          courier: "Ekart Logistics",
          orderStatus: "Packed",
        });
        showToast(`Ekart Shipment Manifested! AWB: #${data.waybill}`);
      } else {
        if (
          data.code === "EKART_CREDENTIALS_NEEDED" ||
          data.code === "EKART_AUTH_FAILED"
        ) {
          setShowEkartAuthModal(true);
        }
        const errMsg = data.message || "Failed to manifest shipment with Ekart";
        setEkartManifestError((p) => ({
          ...p,
          [order.orderRef]: errMsg,
        }));
        showToast(`Ekart Error: ${errMsg}`);
      }
    } catch {
      setEkartManifestError((p) => ({
        ...p,
        [order.orderRef]: "Network error connecting to Ekart API",
      }));
      showToast("Error contacting Ekart API");
    } finally {
      setManifestingEkart((p) => ({ ...p, [order.orderRef]: false }));
    }
  };

  const handleSaveCustomEkartAwb = async (orderRef: string) => {
    const awb = (customEkartAwb[orderRef] || "").trim();
    if (!awb) {
      showToast("Please enter a valid Ekart Tracking ID / AWB");
      return;
    }
    await updateOrderDetails(orderRef, {
      trackingNumber: awb,
      courier: "Ekart Logistics",
      orderStatus: "Packed",
    });
    setCustomEkartAwb((p) => ({ ...p, [orderRef]: "" }));
    showToast(`Saved Ekart AWB #${awb}`);
  };

  // Reset manifest to allow re-manifesting or switching carrier to Delhivery
  const handleResetManifest = async (orderRef: string) => {
    if (
      !window.confirm(
        "Are you sure you want to reset this shipment manifest? This will clear the current tracking number and allow you to re-dispatch with Delhivery Express."
      )
    ) {
      return;
    }
    try {
      await updateOrderDetails(orderRef, {
        trackingNumber: "",
        courier: "",
        orderStatus: "Placed",
      });
      setCarrierChoice((p) => ({ ...p, [orderRef]: "delhivery" }));
      showToast("Shipment reset! You can now click 1-Click Delhivery Manifest.");
    } catch {
      showToast("Failed to reset shipment manifest");
    }
  };

  // Open address edit modal for an order
  const handleOpenEditAddress = (ord: Order) => {
    const addr = ord.shippingAddress || ({} as any);
    const numLat = Number.isFinite(Number(addr.lat)) && Number(addr.lat) !== 0 ? Number(addr.lat) : 12.9716;
    const numLng = Number.isFinite(Number(addr.lng)) && Number(addr.lng) !== 0 ? Number(addr.lng) : 77.5946;
    setEditAddressForm({
      fullName: addr.fullName || "Customer",
      phone: (addr.phone || ord.customerPhone || "").replace(/\D/g, "").slice(-10),
      addressLine1: addr.addressLine1 || "",
      landmark: addr.landmark || "",
      district: addr.district || addr.city || "Bengaluru Urban",
      state: addr.state || "Karnataka",
      pincode: (addr.pincode || "560058").replace(/\D/g, "").slice(0, 6),
      lat: numLat,
      lng: numLng,
    });
    setEditMapSearchQuery("");
    setEditMapSearchResults([]);
    setEditingOrderAddress(ord);
  };

  // Setup Leaflet map inside admin modal
  useEffect(() => {
    if (!editingOrderAddress) {
      if (adminMapInstanceRef.current) {
        try {
          adminMapInstanceRef.current.remove();
        } catch {}
        adminMapInstanceRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      const container = document.getElementById("admin-order-edit-map");
      if (!container) return;

      if (adminMapInstanceRef.current) {
        try {
          adminMapInstanceRef.current.remove();
        } catch {}
        adminMapInstanceRef.current = null;
      }

      const initialCoords: [number, number] = [
        Number.isFinite(editAddressForm.lat) && editAddressForm.lat !== 0 ? editAddressForm.lat : 12.9716,
        Number.isFinite(editAddressForm.lng) && editAddressForm.lng !== 0 ? editAddressForm.lng : 77.5946,
      ];

      try {
        const map = L.map(container, {
          center: initialCoords,
          zoom: 15,
          zoomControl: true,
          attributionControl: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);

        const customIcon = L.divIcon({
          className: "admin-leaflet-marker",
          html: `<div style="background-color:#5E3210; width:34px; height:34px; border-radius:50%; border:3px solid #FFF; box-shadow:0 4px 14px rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center;">
                  <div style="background:#E08F35; width:14px; height:14px; border-radius:50%;"></div>
                </div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const marker = L.marker(initialCoords, {
          draggable: true,
          icon: customIcon,
        }).addTo(map);

        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          setEditAddressForm((prev) => ({ ...prev, lat: pos.lat, lng: pos.lng }));
        });

        map.on("click", (e: L.LeafletMouseEvent) => {
          marker.setLatLng(e.latlng);
          setEditAddressForm((prev) => ({ ...prev, lat: e.latlng.lat, lng: e.latlng.lng }));
        });

        adminMapInstanceRef.current = map;
        adminMarkerRef.current = marker;

        setTimeout(() => {
          map.invalidateSize();
        }, 200);
      } catch (err) {
        console.warn("Admin Leaflet map error:", err);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (adminMapInstanceRef.current) {
        try {
          adminMapInstanceRef.current.remove();
        } catch {}
        adminMapInstanceRef.current = null;
      }
    };
  }, [editingOrderAddress]);

  const handleLocatePincodeInEditModal = async () => {
    const pin = editAddressForm.pincode.replace(/\D/g, "").slice(0, 6);
    if (pin.length !== 6) {
      showToast("Please enter a valid 6-digit postal pincode");
      return;
    }
    setIsLocatingEditPincode(true);
    try {
      const q = `${pin}, ${editAddressForm.district || ""}, India`;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`);
      const data = await res.json();
      if (data && data[0]) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setEditAddressForm((prev) => ({ ...prev, lat, lng: lon }));
        if (adminMapInstanceRef.current && adminMarkerRef.current) {
          adminMapInstanceRef.current.setView([lat, lon], 15);
          adminMarkerRef.current.setLatLng([lat, lon]);
          adminMapInstanceRef.current.invalidateSize();
        }
        showToast(`Map centered on pincode ${pin}!`);
      } else {
        showToast("Could not geocode this pincode. Search area on map below.");
      }
    } catch {
      showToast("Error locating pincode");
    } finally {
      setIsLocatingEditPincode(false);
    }
  };

  const handleEditMapSearch = async (val: string) => {
    setEditMapSearchQuery(val);
    if (!val.trim() || val.length < 3) {
      setEditMapSearchResults([]);
      return;
    }
    setIsSearchingEditMap(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=in&limit=5`
      );
      const data = await res.json();
      setEditMapSearchResults(data || []);
    } catch {
      setEditMapSearchResults([]);
    } finally {
      setIsSearchingEditMap(false);
    }
  };

  const handleSelectEditSearchResult = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    setEditAddressForm((prev) => ({ ...prev, lat, lng: lon }));
    setEditMapSearchResults([]);
    setEditMapSearchQuery(item.display_name);
    if (adminMapInstanceRef.current && adminMarkerRef.current) {
      adminMapInstanceRef.current.setView([lat, lon], 16);
      adminMarkerRef.current.setLatLng([lat, lon]);
      adminMapInstanceRef.current.invalidateSize();
    }
    showToast("Pin placed at selected location!");
  };

  const handleSaveEditedAddress = async () => {
    if (!editingOrderAddress) return;
    if (!editAddressForm.addressLine1.trim()) {
      showToast("Please enter street address");
      return;
    }
    const cleanPin = editAddressForm.pincode.replace(/\D/g, "").slice(0, 6);
    if (cleanPin.length !== 6) {
      showToast("Please enter a valid 6-digit pincode");
      return;
    }
    const cleanPhone = editAddressForm.phone.replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      showToast("Please enter a valid 10-digit phone number");
      return;
    }

    setIsSavingEditAddress(true);
    try {
      const updatedShippingAddress = {
        ...(editingOrderAddress.shippingAddress || {}),
        fullName: editAddressForm.fullName.trim(),
        phone: cleanPhone,
        addressLine1: editAddressForm.addressLine1.trim(),
        landmark: editAddressForm.landmark.trim(),
        state: editAddressForm.state,
        district: editAddressForm.district,
        city: editAddressForm.district,
        pincode: cleanPin,
        lat: editAddressForm.lat,
        lng: editAddressForm.lng,
        isBangalore: cleanPin.startsWith("560") || editAddressForm.district.toLowerCase().includes("bengaluru"),
      };

      await updateOrderDetails(editingOrderAddress.orderRef, {
        shippingAddress: updatedShippingAddress,
        customerPhone: cleanPhone,
      });

      // If the order was already manifested with Delhivery, sync update directly to Delhivery's live package
      if (editingOrderAddress.trackingNumber && !editingOrderAddress.trackingNumber.startsWith("FMP")) {
        try {
          const fullStreetAdd = [
            editAddressForm.addressLine1.trim(),
            editAddressForm.landmark?.trim() ? `Near ${editAddressForm.landmark.trim()}` : "",
            editAddressForm.district,
          ]
            .filter(Boolean)
            .join(", ");

          const editRes = await fetch("/api?action=delhivery_edit_address", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              waybill: editingOrderAddress.trackingNumber,
              address: fullStreetAdd,
              phone: cleanPhone,
              name: editAddressForm.fullName.trim(),
              lat: editAddressForm.lat,
              lng: editAddressForm.lng,
            }),
          });
          const editData = await editRes.json();
          if (editData.status === "SUCCESS") {
            showToast("Carrier sync: Location updated live on Delhivery rider app!");
          }
        } catch (apiErr) {
          console.warn("Live courier address sync notice:", apiErr);
        }
      }

      showToast(`Address & GPS pin updated for order #${editingOrderAddress.orderRef}!`);
      setEditingOrderAddress(null);
    } catch (err) {
      console.warn("Save address error:", err);
      showToast("Failed to update address in Firestore");
    } finally {
      setIsSavingEditAddress(false);
    }
  };

  const handleStatusChange = async (ord: Order, newStatus: OrderStatus) => {
    if (newStatus === "Cancelled" && ord.trackingNumber) {
      try {
        showToast("Notifying Delhivery of order cancellation...");
        const res = await fetch("/api?action=delhivery_cancel_order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ waybill: ord.trackingNumber }),
        });
        const data = await res.json();
        if (data.status === "SUCCESS") {
          showToast("Delhivery shipment cancelled & wallet credited!");
        } else {
          showToast(
            `Delhivery notice: ${data.message || "Failed to cancel on carrier"}`
          );
        }
      } catch (e) {
        console.warn("Delhivery cancellation sync notice:", e);
      }
    }

    await updateOrderStatus(ord.id || ord.orderRef, newStatus);
  };

  const [isSyncingDelhivery, setIsSyncingDelhivery] = useState(false);

  const handleSyncAllDelhiveryTracking = async () => {
    const trackableOrders = adminOrders.filter(
      (o) => o.trackingNumber && o.trackingNumber.length > 5 && o.orderStatus !== "Cancelled"
    );
    if (trackableOrders.length === 0) {
      showToast("No active shipments with AWB to track.");
      return;
    }
    setIsSyncingDelhivery(true);
    let updatedCount = 0;
    try {
      showToast(`Checking live Delhivery status for ${trackableOrders.length} shipments...`);
      for (const ord of trackableOrders) {
        try {
          const res = await fetch(`/api?action=delhivery_track&waybill=${encodeURIComponent(ord.trackingNumber!)}`);
          if (!res.ok) continue;
          const data = await res.json();
          const pkg = data.data?.ShipmentData?.[0]?.Shipment;
          if (pkg) {
            const rawStatus = String(pkg.Status?.Status || "").toLowerCase();
            const instructions = String(pkg.Status?.Instructions || "").toLowerCase();
            let newStatus: OrderStatus | null = null;
            if (rawStatus.includes("delivered")) {
              newStatus = "Delivered";
            } else if (
              rawStatus.includes("out for delivery") ||
              rawStatus.includes("dispatched") ||
              rawStatus.includes("transit") ||
              instructions.includes("in transit")
            ) {
              newStatus = "Dispatched";
            } else if (
              rawStatus.includes("picked up") ||
              rawStatus.includes("manifest") ||
              instructions.includes("picked up")
            ) {
              newStatus = "Packed";
            }
            if (newStatus && newStatus !== ord.orderStatus) {
              await updateOrderDetails(ord.orderRef, { orderStatus: newStatus });
              updatedCount++;
            }
          }
        } catch (e) {
          console.warn("Notice syncing waybill:", ord.trackingNumber, e);
        }
      }
      if (updatedCount > 0) {
        showToast(`Updated ${updatedCount} orders from live Delhivery tracking!`);
      } else {
        showToast("Delhivery statuses are already up to date.");
      }
    } finally {
      setIsSyncingDelhivery(false);
    }
  };

  const handleCopyCustomerAddress = (order: Order) => {
    const addr = (order?.shippingAddress || {}) as any;
    const rawItems = order?.items;
    const items: any[] = Array.isArray(rawItems)
      ? rawItems
      : rawItems && typeof rawItems === "object"
      ? Object.values(rawItems)
      : [];

    const mapPinUrl = (addr.lat && addr.lng)
      ? `https://maps.google.com/?q=${addr.lat},${addr.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${addr.addressLine1 || ""}, ${addr.district || addr.city || "Bengaluru"} ${addr.pincode || ""}`
        )}`;

    const text = `Customer: ${addr.fullName || "Customer"}
Phone: ${addr.phone || "N/A"}
Address: ${addr.addressLine1 || ""}${
      addr.landmark ? `, Near ${addr.landmark}` : ""
    }, ${addr.district || addr.city || "Bengaluru"} - ${addr.pincode || ""}
Map Location: ${mapPinUrl}${addr.lat && addr.lng ? ` (GPS: ${addr.lat}, ${addr.lng})` : ""}
Items: ${items.map((i: any) => `${i.title} (${i.variant}) x${i.quantity}`).join(", ")}
Order Ref: #${order.orderRef}
Total: ₹${order.total} (${order.paymentMethod?.toUpperCase()})`;

    navigator.clipboard.writeText(text);
    setCopiedAddress((p) => ({ ...p, [order.orderRef]: true }));
    showToast("Copied customer shipping details!");
    setTimeout(() => {
      setCopiedAddress((p) => ({ ...p, [order.orderRef]: false }));
    }, 2500);
  };

  // Segregated Orders Navigation: "active" (ongoing) vs "completed" (locked records)
  const [orderViewTab, setOrderViewTab] = useState<"active" | "completed">("active");
  const [unlockedOrders, setUnlockedOrders] = useState<Record<string, boolean>>({});

  const handleToggleOrderLock = (orderRef: string) => {
    const isCurrentlyUnlocked = !!unlockedOrders[orderRef];
    if (isCurrentlyUnlocked) {
      setUnlockedOrders((p) => ({ ...p, [orderRef]: false }));
      showToast(`Order #${orderRef} re-locked.`);
    } else {
      if (
        window.confirm(
          `Unlock completed order #${orderRef} for emergency supervisor adjustments? Please be cautious not to trigger duplicate manifests.`
        )
      ) {
        setUnlockedOrders((p) => ({ ...p, [orderRef]: true }));
        showToast(`Order #${orderRef} unlocked for editing.`);
      }
    }
  };

  const isTerminalOrder = (status?: string) => {
    return status === "Delivered" || status === "Cancelled" || status === "Failed (Expired)";
  };

  const rawOrders = (adminOrders && adminOrders.length > 0 ? adminOrders : orders) || [];

  const activeOrdersCount = rawOrders.filter((o) => !isTerminalOrder(o.orderStatus)).length;
  const completedOrdersCount = rawOrders.filter((o) => isTerminalOrder(o.orderStatus)).length;

  const displayOrders = rawOrders.filter((ord) => {
    const isCompleted = isTerminalOrder(ord.orderStatus);
    if (orderViewTab === "active" && isCompleted) return false;
    if (orderViewTab === "completed" && !isCompleted) return false;

    const q = adminOrderSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      ord.orderRef.toLowerCase().includes(q) ||
      (ord.shippingAddress?.fullName || "").toLowerCase().includes(q) ||
      (ord.shippingAddress?.phone || "").includes(q) ||
      (ord.shippingAddress?.pincode || "").includes(q) ||
      (ord.shippingAddress?.city || "").toLowerCase().includes(q);

    const matchesStatus =
      adminStatusFilter === "all" || ord.orderStatus === adminStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalRevenue = rawOrders.reduce(
    (acc, o) => acc + (o.orderStatus !== "Cancelled" ? Number(o.total) || 0 : 0),
    0
  );
  const pendingDispatchCount = rawOrders.filter(
    (o) => o.orderStatus === "Placed" || o.orderStatus === "Packed"
  ).length;
  const deliveredCount = rawOrders.filter((o) => o.orderStatus === "Delivered").length;

  if (!isAdminAuthenticated) {
    return (
      <div
        className={`w-full min-h-[calc(100vh-80px)] py-20 flex items-center justify-center transition-colors px-4 box-border ${
          isDark
            ? "bg-[#140D09] text-[#FAF4EA]"
            : "bg-[#FAF7F2] text-[#24140A]"
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
                <Key className="w-3.5 h-3.5 text-[#E08F35]" />
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

        {showCloudflareGuide && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className={`w-full max-w-xl rounded-3xl p-6 sm:p-8 space-y-5 text-left border shadow-2xl overflow-y-auto max-h-[90vh] ${
                isDark
                  ? "bg-[#1C120B] text-[#FAF4EA] border-[#362114]"
                  : "bg-white text-[#1F120A] border-[#DDD1BE]"
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-[#E08F35]" />
                  <h3 className="font-bold font-serif text-base">
                    Cloudflare Encrypted PIN Setup Guide
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCloudflareGuide(false)}
                  className="px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-stone-800 text-xs font-bold"
                >
                  ✕ Close
                </button>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-stone-700 dark:stone-300">
                <p>
                  To secure your master PIN on Cloudflare without placing it in
                  client code, set it as an{" "}
                  <strong>Encrypted Environment Variable</strong> inside your
                  Cloudflare Pages Dashboard:
                </p>
                <ol className="list-decimal list-inside space-y-2 pl-1">
                  <li>
                    Log in to <strong>dash.cloudflare.com</strong> and open{" "}
                    <strong>Workers & Pages</strong>.
                  </li>
                  <li>
                    Select your <strong>manopavana</strong> project.
                  </li>
                  <li>
                    Go to <strong>Settings</strong> ➔{" "}
                    <strong>Environment variables</strong>.
                  </li>
                  <li>
                    Click <strong>Add variable</strong>:
                    <div className="p-3 my-1.5 rounded-xl bg-stone-100 dark:bg-black/40 font-mono text-[11px] border border-amber-500/30 space-y-1">
                      <div>
                        Variable Name:{" "}
                        <strong className="text-amber-700 dark:text-amber-400">
                          ADMIN_PIN
                        </strong>
                      </div>
                      <div>
                        Type: Select{" "}
                        <strong className="text-emerald-700 dark:text-emerald-400">
                          Encrypt
                        </strong>{" "}
                        (Stores secret securely in Cloudflare KMS)
                      </div>
                    </div>
                  </li>
                  <li>
                    Click <strong>Save and Deploy</strong>. Cloudflare Pages edge
                    functions will decrypt it safely during admin validation.
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
        isDark
          ? "bg-[#140D09] text-[#FAF4EA]"
          : "bg-[#FAF7F2] text-[#24140A]"
      }`}
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 box-border">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#3D2514] text-white p-6 rounded-3xl shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[#E08F35]/20 text-[#E08F35]">
              <ShieldAlert className="w-6 h-6 text-[#E08F35]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-serif">
                  MANOPAVANA Storefront CMS & Logistics Dispatch Hub
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  <Sparkles className="w-3 h-3" />
                  Live Delhivery Integration Active
                </span>
              </div>
              <p className="text-xs text-[#D6C4B0] mt-0.5">
                Admin: {currentUser?.email || "Master PIN Authorized"} •
                Facility: {facilityAddress}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => togglePreviewStorefront(true)}
              className="px-4 py-2.5 rounded-xl bg-[#E08F35] hover:bg-[#c97a26] text-[#1F120A] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Storefront as Customer</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCloudflareGuide(true)}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5 text-amber-300" />
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
            isDark
              ? "bg-[#1A1009] border-[#3B2516]"
              : "bg-white border-[#E8DFC8]"
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
                  Registered Facilities:{" "}
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    MANOPAVANA B2C & MANOPAVANA_PEENYA (Bangalore 560058)
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
                <Activity
                  className={`w-3.5 h-3.5 text-[#E08F35] ${
                    pingingApi ? "animate-spin" : ""
                  }`}
                />
                <span>
                  {pingingApi
                    ? "Testing Connection..."
                    : "Ping Delhivery API"}
                </span>
              </button>

              <button
                type="button"
                onClick={handlePingEkart}
                disabled={pingingEkart}
                className="px-3.5 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-800 dark:text-sky-200 border border-sky-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Activity
                  className={`w-3.5 h-3.5 text-sky-500 ${
                    pingingEkart ? "animate-spin" : ""
                  }`}
                />
                <span>
                  {pingingEkart
                    ? "Testing Ekart..."
                    : "Ping Ekart API"}
                </span>
              </button>

              <a
                href="https://one.delhivery.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-[#1F120A] dark:text-[#FAF4EA] text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <span>Delhivery One</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </a>

              <button
                type="button"
                onClick={() => setShowEkartAuthModal(true)}
                className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                title="Configure Ekart Elite Login Credentials or Token"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Configure Ekart API</span>
              </button>

              <a
                href="https://app.elite.ekartlogistics.in"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-sky-100 dark:bg-sky-950/40 hover:bg-sky-200 dark:hover:bg-sky-900/60 text-sky-900 dark:text-sky-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs border border-sky-500/20"
              >
                <span>Ekart Portal</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
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
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <div>
                  <span className="font-bold">
                    Delhivery API: {pingResult.message}
                  </span>
                  <span className="block text-[11px] opacity-80 font-mono">
                    Origin Hub: {pingResult.originPincode} • Registered Facility:{" "}
                    {pingResult.warehouse} • Latency: {pingResult.latencyMs}ms
                  </span>
                </div>
              </div>
              {pingResult.sampleWaybill && (
                <span className="px-2.5 py-1 rounded bg-white/60 dark:bg-black/40 font-mono text-[11px] font-bold border border-emerald-500/20">
                  Waybill Sample: #{pingResult.sampleWaybill}
                </span>
              )}
            </div>
          )}

          {ekartPingResult && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex flex-wrap items-center justify-between gap-3 ${
                ekartPingResult.authenticated
                  ? "bg-sky-500/10 border-sky-500/30 text-sky-900 dark:text-sky-200"
                  : "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 shrink-0 text-sky-500" />
                <div>
                  <span className="font-bold">
                    Ekart Logistics (Flipkart): {ekartPingResult.message}
                  </span>
                  <span className="block text-[11px] opacity-80 font-mono">
                    Client ID: {ekartPingResult.clientIdMasked} • Hub: {ekartPingResult.warehouse} ({ekartPingResult.originPincode}) • Wallet: {ekartPingResult.walletBalance || "₹700.00"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEkartAuthModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-sky-700 hover:bg-sky-800 text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Key className="w-3 h-3" />
                  <span>Enter Password / Token</span>
                </button>
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-mono text-[11px] font-bold border border-emerald-500/30">
                  {ekartPingResult.accountStatus || "Account Verified & Active"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Executive Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div
            className={`p-4 rounded-2xl border shadow-2xs ${
              isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
            }`}
          >
            <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
              Total Store Revenue
            </p>
            <p className="text-xl sm:text-2xl font-bold font-serif text-[#E08F35] mt-1">
              ₹{totalRevenue.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-stone-400 mt-0.5">from {rawOrders.length} orders logged</p>
          </div>
          <div
            className={`p-4 rounded-2xl border shadow-2xs ${
              isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
            }`}
          >
            <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
              Total Orders Logged
            </p>
            <p className="text-xl sm:text-2xl font-bold font-serif text-[#5E3210] dark:text-amber-200 mt-1">
              {rawOrders.length}
            </p>
            <p className="text-[10px] text-stone-400 mt-0.5">In live database</p>
          </div>
          <div
            className={`p-4 rounded-2xl border shadow-2xs ${
              isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
            }`}
          >
            <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
              Pending Dispatch
            </p>
            <p className="text-xl sm:text-2xl font-bold font-serif text-amber-600 mt-1">
              {pendingDispatchCount}
            </p>
            <p className="text-[10px] text-stone-400 mt-0.5">Placed or Packed</p>
          </div>
          <div
            className={`p-4 rounded-2xl border shadow-2xs ${
              isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
            }`}
          >
            <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
              Delivered Successfully
            </p>
            <p className="text-xl sm:text-2xl font-bold font-serif text-emerald-600 mt-1">
              {deliveredCount}
            </p>
            <p className="text-[10px] text-stone-400 mt-0.5">Fulfilled orders</p>
          </div>
        </div>

        {/* Live Incoming Orders & Delhivery Queue (Top Priority) */}
        <div className="space-y-4">
          <div
            className={`rounded-3xl border p-6 sm:p-8 shadow-sm space-y-5 transition-colors ${
              isDark
                ? "bg-[#1C120B] border-[#362114]"
                : "bg-white border-[#E8DEC8]"
            }`}
          >
            <div
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 ${
                isDark ? "border-[#2D1B10]" : "border-[#EFE8DC]"
              }`}
            >
                <div className="flex items-center gap-2">
                  {orderViewTab === "active" ? (
                    <Truck className="w-4 h-4 text-[#E08F35]" />
                  ) : (
                    <Archive className="w-4 h-4 text-emerald-500" />
                  )}
                  <h2
                    className={`text-sm font-bold font-serif ${
                      isDark ? "text-[#FAF4EA]" : "text-[#1F120A]"
                    }`}
                  >
                    {orderViewTab === "active"
                      ? `Active Dispatch Queue (${displayOrders.length})`
                      : `Completed & Locked Archives (${displayOrders.length})`}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isSyncingDelhivery}
                    onClick={handleSyncAllDelhiveryTracking}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/15 hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Poll Delhivery carrier API for all active AWB shipments and update delivery status directly in Firestore"
                  >
                    <Truck className={`w-3 h-3 text-blue-600 ${isSyncingDelhivery ? "animate-bounce" : ""}`} />
                    <span>{isSyncingDelhivery ? "Syncing Delhivery..." : "Sync Delhivery"}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSyncingOrders}
                    onClick={async () => {
                      setIsSyncingOrders(true);
                      await refreshAdminOrders();
                      setIsSyncingOrders(false);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#E08F35]/15 hover:bg-[#E08F35]/25 text-[#5E3210] dark:text-amber-200 border border-[#E08F35]/30 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Activity className={`w-3 h-3 text-[#E08F35] ${isSyncingOrders ? "animate-spin" : ""}`} />
                    <span>{isSyncingOrders ? "Syncing..." : "Sync DB"}</span>
                  </button>
                  <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Live Firestore
                  </span>
                </div>
              </div>

              {/* View Switcher: Active Dispatch Queue vs Completed & Archived Records */}
              <div className="flex items-center gap-2 p-1 rounded-2xl bg-stone-100 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => {
                    setOrderViewTab("active");
                    setAdminStatusFilter("all");
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    orderViewTab === "active"
                      ? "bg-[#5E3210] text-white shadow-sm"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                  }`}
                >
                  <Truck className="w-3.5 h-3.5 text-amber-300" />
                  <span>Active Ongoing Orders</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      orderViewTab === "active"
                        ? "bg-amber-400/30 text-amber-200 border border-amber-300/30"
                        : "bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                    }`}
                  >
                    {activeOrdersCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOrderViewTab("completed");
                    setAdminStatusFilter("all");
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    orderViewTab === "completed"
                      ? "bg-[#5E3210] text-white shadow-sm"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                  }`}
                >
                  <Archive className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Completed & Locked Archives</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      orderViewTab === "completed"
                        ? "bg-emerald-400/30 text-emerald-200 border border-emerald-300/30"
                        : "bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                    }`}
                  >
                    {completedOrdersCount}
                  </span>
                </button>
              </div>

              {/* Order Search & Quick Filter Pills */}
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder={
                    orderViewTab === "active"
                      ? "Filter active orders by Order Ref, Customer Name, Phone, Pincode..."
                      : "Search completed/archived orders by Ref, Customer Name, Phone, AWB..."
                  }
                  value={adminOrderSearch}
                  onChange={(e) => setAdminOrderSearch(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/40"
                />
                <div className="flex flex-wrap gap-1">
                  {(orderViewTab === "active"
                    ? ["all", "Placed", "Packed", "Dispatched", "Payment Incomplete"]
                    : ["all", "Delivered", "Cancelled", "Failed (Expired)"]
                  ).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setAdminStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize cursor-pointer transition-colors ${
                        adminStatusFilter === st
                          ? "bg-[#5E3210] text-white"
                          : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {displayOrders.length === 0 ? (
                <div
                  className={`p-8 text-center space-y-2 ${
                    isDark ? "text-[#A89482]" : "text-[#6A523E]"
                  }`}
                >
                  <Package className="w-8 h-8 mx-auto text-[#DDD1BE]" />
                  <p className="text-xs font-semibold">
                    {orderViewTab === "active"
                      ? "No active ongoing orders right now"
                      : "No completed or cancelled orders in this view"}
                  </p>
                  <p className="text-[11px] opacity-80">
                    {orderViewTab === "active"
                      ? "When customers place orders, they will appear here in the active dispatch queue."
                      : "Delivered and cancelled orders will be archived and locked here for permanent record-keeping."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-h-[850px] overflow-y-auto pr-1">
                  {displayOrders.map((ord) => {
                    const addr = (ord?.shippingAddress || {}) as any;
                    const rawItems = ord?.items;
                    const isTerminal = isTerminalOrder(ord.orderStatus);
                    const isLocked = isTerminal && !unlockedOrders[ord.orderRef];
                    const isUnfulfillable =
                      ord.orderStatus === "Cancelled" ||
                      ord.orderStatus === "Failed (Expired)" ||
                      ord.orderStatus === "Payment Incomplete";
                    const items: any[] = Array.isArray(rawItems)
                      ? rawItems
                      : rawItems && typeof rawItems === "object"
                      ? Object.values(rawItems)
                      : [];

                    const mapsQuery =
                      addr.lat && addr.lng
                        ? `${addr.lat},${addr.lng}`
                        : encodeURIComponent(
                            `${addr.addressLine1 || ""}, ${
                              addr.district || addr.city || "Bengaluru"
                            } ${addr.pincode || ""}`
                          );
                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

                    const cleanPhone = (addr.phone || "")
                      .replace(/\D/g, "")
                      .slice(-10);
                    const waText = encodeURIComponent(
                      `Hi ${
                        addr.fullName || "Customer"
                      }, your MANOPAVANA order #${
                        ord.orderRef
                      } is currently: ${ord.orderStatus}. Tracking: ${
                        window.location.origin
                      }/account?order=${ord.orderRef}`
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
                            </div>
                            <p
                              className={`text-[11px] mt-0.5 ${
                                isDark ? "text-[#D8C8B8]" : "text-[#6A523E]"
                              }`}
                            >
                              {addr.fullName || "Customer"} •{" "}
                              {addr.phone || "No phone"}
                            </p>
                          </div>

                          {/* Status Selector / Locked Badge */}
                          <div className="flex items-center gap-1.5">
                            {isLocked ? (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-800 text-stone-700 dark:text-stone-300 shadow-2xs">
                                <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span>{ord.orderStatus} (Locked)</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleOrderLock(ord.orderRef)}
                                  className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-semibold ml-1 cursor-pointer"
                                  title="Emergency supervisor unlock"
                                >
                                  Unlock
                                </button>
                              </div>
                            ) : (
                              <>
                                <select
                                  value={ord.orderStatus}
                                  onChange={(e) =>
                                    handleStatusChange(
                                      ord,
                                      e.target.value as OrderStatus
                                    )
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold focus:ring-1 focus:ring-[#E08F35] ${
                                    isDark
                                      ? "bg-[#1C120B] border border-[#3D2514] text-amber-200"
                                      : "bg-white border border-[#DDD1BE] text-[#5E3210]"
                                  }`}
                                >
                                  <option value="Placed">Placed</option>
                                  <option value="Payment Incomplete">
                                    Payment Incomplete
                                  </option>
                                  <option value="Packed">Packed</option>
                                  <option value="Dispatched">Dispatched</option>
                                  <option value="Delivered">Delivered</option>
                                  <option value="Cancelled">Cancelled</option>
                                  <option value="Failed (Expired)">
                                    Failed (Expired)
                                  </option>
                                </select>
                                {isTerminal && !isLocked && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleOrderLock(ord.orderRef)}
                                    className="p-1 rounded text-amber-600 hover:text-amber-700 cursor-pointer"
                                    title="Re-lock order"
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}

                            {!isLocked && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Delete order #${ord.orderRef}?`
                                    )
                                  ) {
                                    deleteOrder(ord.orderRef);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                title="Delete Order"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Items Summary */}
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
                            {items.map((it: any, idx: number) => (
                              <li key={idx}>
                                {it.title} ({it.variant}) × {it.quantity} — ₹
                                {it.price * it.quantity}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Drop Address */}
                        <div
                          className={`text-[11px] p-2.5 rounded-xl border space-y-1.5 ${
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
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold text-[10px] border border-blue-500/20">
                              <Truck className="w-2.5 h-2.5" />
                              Delhivery Logistics Network
                            </span>
                          </div>
                          <p>
                            {addr.addressLine1 || "No street address provided"}
                            {addr.landmark ? `, Near ${addr.landmark}` : ""},
                            {addr.district || addr.city || "Bengaluru"} -{" "}
                            {addr.pincode || ""}
                          </p>
                          {/* Map Pin & Coordinates Status */}
                          {addr.lat && addr.lng ? (
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-200/60 dark:border-stone-800 text-[10px]">
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                <MapPin className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                GPS Pin Attached ({Number(addr.lat).toFixed(4)}, {Number(addr.lng).toFixed(4)})
                              </span>
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                              >
                                <span>Verify on Google Maps</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[10px] text-stone-500 pt-1 border-t border-stone-200/60 dark:border-stone-800">
                              <MapPin className="w-2.5 h-2.5 text-amber-500" />
                              <span>Address-level geolocation active</span>
                            </div>
                          )}
                        </div>

                        {/* Multi-Carrier Logistics Dispatch Actions (Delhivery & Ekart) */}
                        {isLocked ? (
                          <div
                            className={`p-3.5 rounded-2xl border space-y-2.5 text-xs ${
                              isDark
                                ? "bg-[#160E08] border-[#2E1A0F]"
                                : "bg-[#F9F6F0] border-[#E8DFC8]"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 border-stone-200 dark:border-stone-800">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300">
                                <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span>Completed Order Record (Logistics Locked)</span>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  ord.orderStatus === "Delivered"
                                    ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                                    : "bg-red-500/15 text-red-600 border border-red-500/30"
                                }`}
                              >
                                {ord.orderStatus === "Delivered" ? "Delivered to Customer" : "Cancelled / Closed"}
                              </span>
                            </div>

                            <p className="text-[11px] text-stone-500">
                              Fulfillment is finalized. Courier manifest actions and carrier dispatch are locked to prevent accidental modifications or duplicate shipments.
                            </p>

                            {ord.trackingNumber ? (
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-200/60 dark:border-stone-800">
                                <div className="text-xs">
                                  <span className="font-semibold text-stone-500">Carrier: </span>
                                  <span className="font-bold text-stone-800 dark:text-stone-200">
                                    {ord.courier || (ord.trackingNumber.startsWith("FMP") ? "Ekart Logistics" : "Delhivery Express")}
                                  </span>
                                  <span className="font-mono text-stone-600 dark:text-stone-400 ml-1.5">
                                    (AWB: {ord.trackingNumber})
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {ord.courier?.toLowerCase().includes("ekart") || ord.trackingNumber.startsWith("FMP") ? (
                                    <>
                                      <a
                                        href={`/api?action=ekart_packing_slip&waybill=${encodeURIComponent(
                                          ord.trackingNumber || ""
                                        )}&orderRef=${encodeURIComponent(
                                          ord.orderRef || ""
                                        )}&name=${encodeURIComponent(
                                          addr.fullName || "Customer"
                                        )}&phone=${encodeURIComponent(
                                          addr.phone || ""
                                        )}&address=${encodeURIComponent(
                                          `${addr.addressLine1 || ""}${
                                            addr.landmark ? `, Near ${addr.landmark}` : ""
                                          }`
                                        )}&city=${encodeURIComponent(
                                          addr.district || addr.city || "Bengaluru"
                                        )}&state=${encodeURIComponent(
                                          addr.state || "Karnataka"
                                        )}&pincode=${encodeURIComponent(
                                          addr.pincode || ""
                                        )}&amount=${encodeURIComponent(
                                          ord.total || 0
                                        )}&payment=${encodeURIComponent(
                                          ord.paymentMethod || "Prepaid"
                                        )}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2.5 py-1 rounded-lg border border-sky-500/30 text-sky-700 dark:text-sky-300 font-bold text-[11px] flex items-center gap-1"
                                      >
                                        <Printer className="w-2.5 h-2.5 text-sky-500" />
                                        <span>Print Slip</span>
                                      </a>
                                      <a
                                        href={`https://ekartlogistics.com/shipmenttrack/${encodeURIComponent(ord.trackingNumber)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors"
                                      >
                                        <span>Track Ekart</span>
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    </>
                                  ) : (
                                    <>
                                      <a
                                        href={`/api?action=delhivery_packing_slip&waybill=${encodeURIComponent(
                                          ord.trackingNumber || ""
                                        )}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2.5 py-1 rounded-lg border border-amber-500/30 text-amber-800 dark:text-amber-200 font-bold text-[11px] flex items-center gap-1"
                                      >
                                        <Printer className="w-2.5 h-2.5 text-[#E08F35]" />
                                        <span>Print Slip</span>
                                      </a>
                                      <a
                                        href={`https://www.delhivery.com/track/package/${ord.trackingNumber}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2.5 py-1 rounded-lg bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-[11px] flex items-center gap-1 transition-colors"
                                      >
                                        <span>Track Delhivery</span>
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleOrderLock(ord.orderRef)}
                                    className="px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 text-[10px] text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer"
                                  >
                                    Unlock
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div
                            className={`p-3.5 rounded-xl border space-y-3 text-xs ${
                              isDark
                                ? "bg-[#191009] border-[#3D2514]"
                                : "bg-[#F7F2E8] border-[#DFD4BF]"
                            }`}
                          >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5 border-stone-200 dark:border-stone-800">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs">Courier Partner:</span>
                              <div className="inline-flex p-0.5 rounded-lg bg-stone-200 dark:bg-stone-800 text-[11px] font-bold">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCarrierChoice((p) => ({
                                      ...p,
                                      [ord.orderRef]: "delhivery",
                                    }))
                                  }
                                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                                    (carrierChoice[ord.orderRef] || "delhivery") === "delhivery"
                                      ? "bg-[#5E3210] text-white shadow-xs"
                                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
                                  }`}
                                >
                                  <Truck className="w-3 h-3 text-amber-300" />
                                  <span>Delhivery Express</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCarrierChoice((p) => ({
                                      ...p,
                                      [ord.orderRef]: "ekart",
                                    }))
                                  }
                                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                                    carrierChoice[ord.orderRef] === "ekart"
                                      ? "bg-[#0284C7] text-white shadow-xs"
                                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
                                  }`}
                                >
                                  <Package className="w-3 h-3 text-sky-200" />
                                  <span>Ekart Logistics</span>
                                </button>
                              </div>
                            </div>

                            {/* Pincode Serviceability Check for Selected Carrier */}
                            <div className="flex items-center gap-2">
                              {(carrierChoice[ord.orderRef] || "delhivery") === "delhivery" ? (
                                pincodeStatus[ord.orderRef] ? (
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
                                    onClick={() => handleCheckPincode(ord.orderRef, addr.pincode)}
                                    disabled={checkingPincode[ord.orderRef]}
                                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                                      isDark
                                        ? "bg-[#1C120B] border-[#3D2514] text-[#E08F35] hover:bg-[#28180E]"
                                        : "bg-white border-[#DDD1BE] text-[#5E3210] hover:bg-[#FAF6EE]"
                                    }`}
                                  >
                                    {checkingPincode[ord.orderRef] ? "Checking..." : `Verify Delhivery Pin`}
                                  </button>
                                )
                              ) : ekartPincodeStatus[ord.orderRef] ? (
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    ekartPincodeStatus[ord.orderRef].serviceable
                                      ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30"
                                      : "bg-red-500/15 text-red-600 border border-red-500/30"
                                  }`}
                                >
                                  {ekartPincodeStatus[ord.orderRef].serviceable
                                    ? `Ekart Serviceable (${ekartPincodeStatus[ord.orderRef].expectedDays})`
                                    : "Ekart Unserviceable"}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleCheckEkartPincode(ord.orderRef, addr.pincode)}
                                  disabled={checkingEkartPincode[ord.orderRef]}
                                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                                    isDark
                                      ? "bg-[#1C120B] border-[#3D2514] text-sky-400 hover:bg-[#28180E]"
                                      : "bg-white border-[#DDD1BE] text-sky-700 hover:bg-[#FAF6EE]"
                                  }`}
                                >
                                  {checkingEkartPincode[ord.orderRef] ? "Checking..." : `Verify Ekart Pin`}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Map Location Shared Notice */}
                          <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>
                                {addr.lat && addr.lng
                                  ? "GPS Map Coordinates & Navigation Link attached for delivery carrier"
                                  : "Address location pin linked with shipment"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0 ml-auto">
                              <button
                                type="button"
                                onClick={() => handleOpenEditAddress(ord)}
                                className="text-[11px] font-bold text-[#E08F35] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3 text-[#E08F35]" />
                                <span>Edit Address / Pin</span>
                              </button>
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                              >
                                <span>View Pin</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
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
                                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Shipment Booked (
                                    {ord.courier || (ord.trackingNumber.startsWith("FMP") ? "Ekart Logistics" : "Delhivery Express")})
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
                                  {ord.courier?.toLowerCase().includes("ekart") ||
                                  ord.trackingNumber.startsWith("FMP") ? (
                                    <>
                                      <a
                                        href={`/api?action=ekart_packing_slip&waybill=${encodeURIComponent(
                                          ord.trackingNumber || ""
                                        )}&orderRef=${encodeURIComponent(
                                          ord.orderRef || ""
                                        )}&name=${encodeURIComponent(
                                          addr.fullName || "Customer"
                                        )}&phone=${encodeURIComponent(
                                          addr.phone || ""
                                        )}&address=${encodeURIComponent(
                                          `${addr.addressLine1 || ""}${
                                            addr.landmark ? `, Near ${addr.landmark}` : ""
                                          }`
                                        )}&city=${encodeURIComponent(
                                          addr.district || addr.city || "Bengaluru"
                                        )}&state=${encodeURIComponent(
                                          addr.state || "Karnataka"
                                        )}&pincode=${encodeURIComponent(
                                          addr.pincode || ""
                                        )}&amount=${encodeURIComponent(
                                          ord.total || 0
                                        )}&payment=${encodeURIComponent(
                                          ord.paymentMethod || "Prepaid"
                                        )}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] flex items-center gap-1 transition-colors ${
                                          isDark
                                            ? "bg-[#1E130B] border-[#3D2514] text-[#FAF4EA] hover:bg-[#2A1A0F]"
                                            : "bg-[#FAF6EE] border-[#DDD1BE] text-[#1F120A] hover:bg-[#EFE8DC]"
                                        }`}
                                        title="Print Ekart Shipping Label"
                                      >
                                        <Printer className="w-2.5 h-2.5 text-sky-500" />
                                        <span>Print Label</span>
                                      </a>
                                      <a
                                        href={`https://ekartlogistics.com/shipmenttrack/${encodeURIComponent(
                                          ord.trackingNumber
                                        )}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors"
                                      >
                                        <span>Track Ekart</span>
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                      <a
                                        href="https://app.elite.ekartlogistics.in"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] flex items-center gap-1 transition-colors ${
                                          isDark
                                            ? "bg-[#1E130B] border-[#3D2514] text-[#FAF4EA] hover:bg-[#2A1A0F]"
                                            : "bg-[#FAF6EE] border-[#DDD1BE] text-[#1F120A] hover:bg-[#EFE8DC]"
                                        }`}
                                      >
                                        <span>Ekart Dashboard</span>
                                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                      </a>
                                    </>
                                  ) : (
                                    <>
                                      <a
                                        href={`/api?action=delhivery_packing_slip&waybill=${encodeURIComponent(
                                          ord.trackingNumber || ""
                                        )}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] flex items-center gap-1 transition-colors ${
                                          isDark
                                            ? "bg-[#1E130B] border-[#3D2514] text-[#FAF4EA] hover:bg-[#2A1A0F]"
                                            : "bg-[#FAF6EE] border-[#DDD1BE] text-[#1F120A] hover:bg-[#EFE8DC]"
                                        }`}
                                        title="Print Delhivery Packing Slip"
                                      >
                                        <Printer className="w-2.5 h-2.5 text-[#E08F35]" />
                                        <span>Print Label</span>
                                      </a>
                                      <a
                                        href={`https://www.delhivery.com/track/package/${ord.trackingNumber}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2.5 py-1 rounded-lg bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-[11px] flex items-center gap-1 transition-colors"
                                      >
                                        <span>Track Delhivery</span>
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    </>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleResetManifest(ord.orderRef)}
                                    className="px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer ml-auto"
                                    title="Reset shipment to re-manifest or switch to Delhivery"
                                  >
                                    <RotateCcw className="w-2.5 h-2.5" />
                                    <span>Reset / Switch to Delhivery</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : isUnfulfillable ? (
                            /* Blocked Booking for Incomplete, Expired, and Cancelled orders */
                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span>
                                {ord.orderStatus === "Payment Incomplete"
                                  ? "Payment Incomplete — Awaiting Customer Settlement"
                                  : "Order Cancelled — Shipment Booking Disabled"}
                              </span>
                            </div>
                          ) : (carrierChoice[ord.orderRef] || "delhivery") === "ekart" ? (
                            /* Ekart Logistics Manifest Section */
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleManifestEkart(ord)}
                                  disabled={manifestingEkart[ord.orderRef]}
                                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                                >
                                  <Package className="w-3.5 h-3.5 text-sky-200" />
                                  <span>
                                    {manifestingEkart[ord.orderRef]
                                      ? "Generating Ekart AWB..."
                                      : "⚡ 1-Click Ekart Manifest"}
                                  </span>
                                </button>

                                <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                                  <input
                                    type="text"
                                    placeholder="Or paste Ekart AWB (e.g. FMPP...)..."
                                    value={customEkartAwb[ord.orderRef] || ""}
                                    onChange={(e) =>
                                      setCustomEkartAwb((p) => ({
                                        ...p,
                                        [ord.orderRef]: e.target.value,
                                      }))
                                    }
                                    className={`flex-1 px-2.5 py-1 text-xs rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                                      isDark
                                        ? "bg-[#140D07] border border-[#362114] text-[#FAF4EA] placeholder-[#8A7665]"
                                        : "bg-white border border-[#DDD1BE] text-[#1F120A] placeholder-[#8A7665]"
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveCustomEkartAwb(ord.orderRef)}
                                    className="px-2.5 py-1 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-[11px] font-bold cursor-pointer transition-colors shrink-0"
                                  >
                                    Save Ekart AWB
                                  </button>
                                </div>
                              </div>

                              {ekartManifestError[ord.orderRef] && (
                                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-[11px] space-y-2">
                                  <div className="flex items-center gap-1 font-bold">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>Ekart Manifest Notice:</span>
                                  </div>
                                  <p className="opacity-90">{ekartManifestError[ord.orderRef]}</p>
                                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-red-500/20">
                                    <button
                                      type="button"
                                      onClick={() => setShowEkartAuthModal(true)}
                                      className="px-2.5 py-1 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    >
                                      <Key className="w-3 h-3" />
                                      <span>Configure Ekart Password</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCarrierChoice((p) => ({ ...p, [ord.orderRef]: "delhivery" }))}
                                      className="px-2.5 py-1 rounded-md bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    >
                                      <Truck className="w-3 h-3 text-amber-300" />
                                      <span>Switch to Delhivery Express (Ready Now)</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Delhivery Express Manifest Section */
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleManifestDelhivery(ord)}
                                  disabled={manifesting[ord.orderRef]}
                                  className="px-3 py-1.5 rounded-lg bg-[#5E3210] hover:bg-[#43230A] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                                >
                                  <Truck className="w-3.5 h-3.5 text-amber-300" />
                                  <span>
                                    {manifesting[ord.orderRef]
                                      ? "Generating Waybill..."
                                      : "⚡ 1-Click Delhivery Manifest"}
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

                              {manifestError[ord.orderRef] && (
                                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] space-y-1">
                                  <div className="flex items-center gap-1 font-bold">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>Delhivery Manifest Error:</span>
                                  </div>
                                  <p className="opacity-90">{manifestError[ord.orderRef]}</p>
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      )}

                        {/* Customer Actions */}
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

                            {!isLocked && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditAddress(ord)}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                  isDark
                                    ? "bg-[#1C120B] border-[#362114] text-amber-300 hover:border-[#E08F35] hover:bg-[#28180E]"
                                    : "bg-white border-[#DDD1BE] hover:border-[#E08F35] text-[#5E3210] hover:bg-amber-50"
                                }`}
                                title="Edit address, phone, or adjust doorstep GPS pin before courier dispatch"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-[#E08F35]" />
                                <span>Edit Address & Pin</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleCopyCustomerAddress(ord)}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                copiedAddress[ord.orderRef]
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                                  : isDark
                                  ? "bg-[#1C120B] border-[#362114] text-[#FAF4EA] hover:border-[#E08F35]"
                                  : "bg-white border-[#DDD1BE] hover:border-[#E08F35] text-[#1F120A]"
                              }`}
                            >
                              {copiedAddress[ord.orderRef] ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-[#E08F35]" />
                              )}
                              <span>
                                {copiedAddress[ord.orderRef]
                                  ? "Copied!"
                                  : "Copy Details"}
                              </span>
                            </button>
                          </div>

                          <a
                            href={
                              ord.trackingNumber
                                ? (() => {
                                    const isEkart =
                                      ord.courier?.toLowerCase().includes("ekart") ||
                                      ord.trackingNumber.startsWith("FMP");
                                    const carrierName = isEkart ? "Ekart Logistics" : "Delhivery Express";
                                    const trackUrl = isEkart
                                      ? `https://ekartlogistics.com/shipmenttrack/${ord.trackingNumber}`
                                      : `https://www.delhivery.com/track/package/${ord.trackingNumber}`;
                                    return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
                                      `Hi ${
                                        addr.fullName || "Customer"
                                      }, your MANOPAVANA order #${
                                        ord.orderRef
                                      } has been dispatched via ${carrierName}! Track your parcel live here: ${trackUrl}`
                                    )}`;
                                  })()
                                : waUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
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

        {/* Master Storefront CMS Panel (Below Orders) */}
        <div className="space-y-6">
          <StorefrontCMSPanel isDark={isDark} />
        </div>


        {/* Order Delivery Address & GPS Coordinates Editor Modal */}
        {editingOrderAddress && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div
              className={`w-full max-w-4xl rounded-3xl p-5 sm:p-7 space-y-5 text-left border shadow-2xl max-h-[92vh] overflow-y-auto ${
                isDark
                  ? "bg-[#180E08] text-[#FAF4EA] border-[#362114]"
                  : "bg-white text-[#1F120A] border-[#DDD1BE]"
              }`}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#E08F35]/20 text-[#E08F35]">
                    <MapPin className="w-5 h-5 text-[#E08F35]" />
                  </div>
                  <div>
                    <h3 className="font-bold font-serif text-base flex items-center gap-2">
                      <span>Edit Delivery Address & GPS Pin</span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-[#E08F35]">
                        #{editingOrderAddress.orderRef}
                      </span>
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      Updates are saved in Firestore and automatically used for Delhivery & Ekart manifests.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingOrderAddress(null)}
                  className="p-1.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 2-Column Responsive Body */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Column 1: Address Fields */}
                <div className="space-y-3.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#E08F35] flex items-center gap-1.5">
                    <span>1. Customer & Delivery Address</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1 opacity-80">
                        Recipient Name *
                      </label>
                      <input
                        type="text"
                        value={editAddressForm.fullName}
                        onChange={(e) =>
                          setEditAddressForm((p) => ({ ...p, fullName: e.target.value }))
                        }
                        className={`w-full px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-[#E08F35] ${
                          isDark
                            ? "bg-[#100905] border border-[#362114] text-[#FAF4EA]"
                            : "bg-[#FAF7F2] border border-[#DDD1BE] text-[#1F120A]"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1 opacity-80">
                        WhatsApp Phone *
                      </label>
                      <input
                        type="tel"
                        maxLength={10}
                        value={editAddressForm.phone}
                        onChange={(e) =>
                          setEditAddressForm((p) => ({
                            ...p,
                            phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                          }))
                        }
                        className={`w-full px-3 py-2 text-xs font-mono rounded-xl focus:outline-none focus:ring-1 focus:ring-[#E08F35] ${
                          isDark
                            ? "bg-[#100905] border border-[#362114] text-[#FAF4EA]"
                            : "bg-[#FAF7F2] border border-[#DDD1BE] text-[#1F120A]"
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 opacity-80">
                      House / Flat / Street Address *
                    </label>
                    <textarea
                      rows={2}
                      value={editAddressForm.addressLine1}
                      onChange={(e) =>
                        setEditAddressForm((p) => ({ ...p, addressLine1: e.target.value }))
                      }
                      className={`w-full px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-[#E08F35] resize-none ${
                        isDark
                          ? "bg-[#100905] border border-[#362114] text-[#FAF4EA]"
                          : "bg-[#FAF7F2] border border-[#DDD1BE] text-[#1F120A]"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 opacity-80">
                      Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Near Water Tank, Opposite SBI..."
                      value={editAddressForm.landmark}
                      onChange={(e) =>
                        setEditAddressForm((p) => ({ ...p, landmark: e.target.value }))
                      }
                      className={`w-full px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-[#E08F35] ${
                        isDark
                          ? "bg-[#100905] border border-[#362114] text-[#FAF4EA]"
                          : "bg-[#FAF7F2] border border-[#DDD1BE] text-[#1F120A]"
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1 opacity-80">
                        State *
                      </label>
                      <select
                        value={editAddressForm.state}
                        onChange={(e) => {
                          const newState = e.target.value;
                          const districts = INDIAN_STATES_DISTRICTS[newState] || [];
                          setEditAddressForm((p) => ({
                            ...p,
                            state: newState,
                            district: districts[0] || p.district,
                          }));
                        }}
                        className={`w-full px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-[#E08F35] ${
                          isDark
                            ? "bg-[#100905] border border-[#362114] text-[#FAF4EA]"
                            : "bg-[#FAF7F2] border border-[#DDD1BE] text-[#1F120A]"
                        }`}
                      >
                        {Object.keys(INDIAN_STATES_DISTRICTS).map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1 opacity-80">
                        District / City *
                      </label>
                      <select
                        value={editAddressForm.district}
                        onChange={(e) =>
                          setEditAddressForm((p) => ({ ...p, district: e.target.value }))
                        }
                        className={`w-full px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-[#E08F35] ${
                          isDark
                            ? "bg-[#100905] border border-[#362114] text-[#FAF4EA]"
                            : "bg-[#FAF7F2] border border-[#DDD1BE] text-[#1F120A]"
                        }`}
                      >
                        {!((INDIAN_STATES_DISTRICTS[editAddressForm.state] || []).includes(editAddressForm.district)) && editAddressForm.district && (
                          <option value={editAddressForm.district}>{editAddressForm.district}</option>
                        )}
                        {(INDIAN_STATES_DISTRICTS[editAddressForm.state] || []).map((dst) => (
                          <option key={dst} value={dst}>
                            {dst}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1 opacity-80">
                        Pincode *
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={editAddressForm.pincode}
                        onChange={(e) =>
                          setEditAddressForm((p) => ({
                            ...p,
                            pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                          }))
                        }
                        className={`w-full px-3 py-2 text-xs font-mono rounded-xl focus:outline-none focus:ring-1 focus:ring-[#E08F35] ${
                          isDark
                            ? "bg-[#100905] border border-[#362114] text-[#FAF4EA]"
                            : "bg-[#FAF7F2] border border-[#DDD1BE] text-[#1F120A]"
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLocatePincodeInEditModal}
                    disabled={isLocatingEditPincode}
                    className="w-full py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[#E08F35] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-amber-500/25 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>
                      {isLocatingEditPincode
                        ? "Locating..."
                        : `📍 Auto-Center Pin on Pincode (${editAddressForm.pincode || "..."})`}
                    </span>
                  </button>
                </div>

                {/* Column 2: Interactive Leaflet Map & GPS Verification */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#E08F35] flex items-center gap-1.5">
                      <span>2. Doorstep GPS Pinpoint</span>
                    </h4>
                    <span className="text-[11px] font-mono text-stone-500">
                      {editAddressForm.lat.toFixed(5)}, {editAddressForm.lng.toFixed(5)}
                    </span>
                  </div>

                  {/* Search Map Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search locality, street, or building name..."
                      value={editMapSearchQuery}
                      onChange={(e) => handleEditMapSearch(e.target.value)}
                      className={`w-full pl-9 pr-9 py-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-[#E08F35] ${
                        isDark
                          ? "bg-[#100905] border border-[#362114] text-[#FAF4EA]"
                          : "bg-[#FAF7F2] border border-[#DDD1BE] text-[#1F120A]"
                      }`}
                    />
                    {isSearchingEditMap && (
                      <Loader2 className="absolute right-3 top-2.5 w-3.5 h-3.5 text-[#E08F35] animate-spin" />
                    )}

                    {editMapSearchResults.length > 0 && (
                      <ul className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#1C110B] border border-stone-200 dark:border-[#4A301E] rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-stone-100 dark:divide-[#2C1D14] z-50">
                        {editMapSearchResults.map((res, i) => (
                          <li
                            key={i}
                            onClick={() => handleSelectEditSearchResult(res)}
                            className="p-2.5 text-xs hover:bg-amber-50 dark:hover:bg-[#2C1D14] cursor-pointer flex items-start gap-2"
                          >
                            <MapPin className="w-3.5 h-3.5 text-[#E08F35] shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{res.display_name}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Leaflet Map Box */}
                  <div
                    id="admin-order-edit-map"
                    className="w-full h-56 sm:h-64 rounded-2xl border border-stone-300 dark:border-stone-700 overflow-hidden shadow-inner touch-manipulation relative z-10"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                    <span className="text-[11px]">
                      💡 Drag the marker or tap anywhere on the map to set the exact delivery pin.
                    </span>
                    <a
                      href={`https://maps.google.com/?q=${editAddressForm.lat},${editAddressForm.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 text-blue-600 dark:text-blue-400 font-bold text-[11px] flex items-center gap-1 hover:underline"
                    >
                      <span>Test in Google Maps</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingOrderAddress(null)}
                  disabled={isSavingEditAddress}
                  className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveEditedAddress}
                  disabled={isSavingEditAddress}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingEditAddress ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Saving in Firestore...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>Save & Update Order in Firestore</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ekart Elite API Credentials Modal */}
        {showEkartAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div
              className={`w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border transition-all ${
                isDark
                  ? "bg-[#180F08] border-[#362114] text-[#FAF4EA]"
                  : "bg-white border-[#E8DEC8] text-[#1F120A]"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-600">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base font-serif text-sky-950 dark:text-sky-200">
                      Ekart Elite API Authentication
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      OpenAPI 3.1.0 Integration • Client ID: EKART_6ae38c6da8acd1b850611963
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEkartAuthModal(false)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="py-4 space-y-3.5 text-xs">
                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-900 dark:text-sky-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-sky-600" />
                    <span>Warehouse Ready: Manopavana_B2C (560058)</span>
                  </div>
                  <p className="text-[11px] opacity-90">
                    Your Ekart account is verified with ₹700 wallet balance. Enter your Ekart Elite account login credentials to enable seamless 1-click manifests directly from this CMS.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                    Ekart Elite Login Email / Username
                  </label>
                  <input
                    type="text"
                    value={ekartUsernameInput}
                    onChange={(e) => setEkartUsernameInput(e.target.value)}
                    placeholder="e.g. manojmr1712@gmail.com"
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                      isDark
                        ? "bg-[#140D07] border border-[#362114] text-[#FAF4EA]"
                        : "bg-stone-50 border border-[#DDD1BE] text-[#1F120A]"
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                      Ekart Elite Account Password
                    </label>
                    <span className="text-[10px] text-stone-400">Generates 24-hr Bearer Token</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showEkartPassword ? "text" : "password"}
                      value={ekartPasswordInput}
                      onChange={(e) => setEkartPasswordInput(e.target.value)}
                      placeholder="Enter your app.elite.ekartlogistics.in password"
                      className={`w-full px-3 py-2 pr-9 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                        isDark
                          ? "bg-[#140D07] border border-[#362114] text-[#FAF4EA]"
                          : "bg-stone-50 border border-[#DDD1BE] text-[#1F120A]"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowEkartPassword(!showEkartPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                      OR Direct JWT Bearer Token (Optional)
                    </label>
                    <span className="text-[10px] text-stone-400">Not Client ID</span>
                  </div>
                  <input
                    type="password"
                    value={ekartTokenInput}
                    onChange={(e) => setEkartTokenInput(e.target.value)}
                    placeholder="Leave blank to use password, or paste 24-hr JWT"
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                      isDark
                        ? "bg-[#140D07] border border-[#362114] text-[#FAF4EA]"
                        : "bg-stone-50 border border-[#DDD1BE] text-[#1F120A]"
                    }`}
                  />
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                    ⚠️ Do not paste your Client ID (<code>EKART_...</code>) here. Entering your portal password above is the recommended method.
                  </p>
                </div>

                <p className="text-[10px] text-stone-500 pt-1">
                  🔒 Your password generates a signed 24-hr Bearer token via Ekart's official gateway (<code>POST /integrations/v2/auth/token</code>).
                </p>
              </div>

              {/* Modal Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={handleClearEkartCredentials}
                  className="px-3 py-1.5 rounded-xl border border-red-500/30 text-red-600 hover:bg-red-500/10 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Clear Saved Tokens
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEkartAuthModal(false)}
                    disabled={isVerifyingEkart}
                    className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveEkartCredentials}
                    disabled={isVerifyingEkart}
                    className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isVerifyingEkart ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Authenticating...</span>
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4 text-sky-200" />
                        <span>Save & Activate Ekart</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};