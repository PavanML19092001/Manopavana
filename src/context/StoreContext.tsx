import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from "react";
import { User as FirebaseUser, onAuthStateChanged, signOut } from "firebase/auth";
import {
  Address,
  CartItem,
  ComboProduct,
  CustomerReview,
  LoyaltyState,
  Order,
  Product,
  StoreCMSConfig,
} from "../types";
import {
  BUSINESS_CONFIG,
  CUSTOMER_REVIEWS,
  PRODUCTS,
  COMBOS,
  MEDIA_ASSETS,
} from "../constants";
import {
  auth,
  db,
  saveOrderToFirestore,
  updateFirestoreOrderStatus,
  subscribeUserOrders,
  subscribeAllOrders,
  subscribeReviews,
  addReviewToFirestore,
  deleteReviewFromFirestore,
  syncCustomerDoc,
  subscribeStoreConfig,
  saveStoreConfigToFirestore,
} from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { sendOrderConfirmationEmail } from "../services/emailService";

interface StoreContextType {
  // Cart
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  cartCount: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  freeShippingProgress: number;
  freeShippingShortfall: number;

  // Buy Now direct checkout (leaves regular cart intact)
  buyNowItem: CartItem | null;
  setBuyNowItem: (item: CartItem | null) => void;
  startBuyNow: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  clearBuyNow: () => void;

  // Catalog Products & Combos (synchronized with live CMS prices and stock)
  products: Product[];
  combos: ComboProduct[];

  // Address & Location Guard
  address: Address;
  updateAddress: (newAddr: Partial<Address>) => void;
  reverseGeocodeAndSaveAddress: (lat: number, lng: number) => Promise<Partial<Address> | null>;
  isLocationModalOpen: boolean;
  setLocationModalOpen: (open: boolean) => void;

  // Firebase Auth
  currentUser: FirebaseUser | null;
  isLoginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  logoutUser: () => Promise<void>;

  // Loyalty Program
  loyalty: LoyaltyState;
  activateLoyalty: (oilId: string) => void;
  clearLoyalty: () => void;
  loyaltyRemainingText: string;
  isQuizModalOpen: boolean;
  quizProduct: Product | null;
  openLoyaltyQuiz: (product?: Product) => void;
  closeLoyaltyQuiz: () => void;

  // Audio Engine
  isPlayingAudio: boolean;
  toggleAudio: () => void;

  // Orders
  orders: Order[];
  adminOrders: Order[];
  saveOrder: (order: Order) => Promise<void>;
  getOrder: (refOrId: string) => Order | undefined;
  updateOrderStatus: (orderId: string, status: Order["orderStatus"]) => Promise<void>;
  updateOrderDetails: (orderRef: string, updates: Partial<Order>) => Promise<void>;
  deleteOrder: (orderRef: string) => Promise<void>;

  // Payment lifecycle modals
  paymentFailedOrder: Order | null;
  setPaymentFailedOrder: (order: Order | null) => void;
  orderSuccessRef: string | null;
  setOrderSuccessRef: (ref: string | null) => void;
  loadOrderToCartAndRetry: (order: Order) => void;
  switchOrderToCOD: (orderRef: string) => Promise<void>;
  markOrderAsExpired: (orderRef: string) => Promise<void>;

  // Customer Reviews
  reviews: CustomerReview[];
  submitReview: (rev: Omit<CustomerReview, "id">) => Promise<void>;
  deleteReview: (reviewId: string, pin: string) => Promise<boolean>;

  // Admin CMS
  cmsConfig: StoreCMSConfig;
  updateCMSConfig: (updater: (prev: StoreCMSConfig) => StoreCMSConfig) => void;
  isAdminAuthenticated: boolean;
  authenticateAdmin: (pin: string) => boolean;
  logoutAdmin: () => void;

  // Modals
  activePolicyModal: "terms" | "shipping" | "returns" | "privacy" | null;
  setActivePolicyModal: (modal: "terms" | "shipping" | "returns" | "privacy" | null) => void;

  // Notification Toast
  toastMessage: string | null;
  showToast: (msg: string) => void;

  // Theme Mode (Blend, Light, Dark)
  themeMode: "blend" | "light" | "dark";
  setThemeMode: (mode: "blend" | "light" | "dark") => void;
}

const DEFAULT_ADDRESS: Address = {
  fullName: "",
  phone: "",
  email: "",
  addressLine1: "",
  landmark: "",
  city: "Bengaluru",
  district: "Bengaluru Urban",
  state: "Karnataka",
  pincode: "560058",
  lat: BUSINESS_CONFIG.DEFAULT_COORDINATES[0],
  lng: BUSINESS_CONFIG.DEFAULT_COORDINATES[1],
  isBangalore: true,
};

const DEFAULT_CMS_CONFIG: StoreCMSConfig = {
  announcementTicker: "FREE Doorstep Delivery across Bengaluru on orders above ₹500 | 100% Marachekku Cold-Pressed",
  heroHeadline: BUSINESS_CONFIG.HERO_HEADLINE,
  heroSubhead: BUSINESS_CONFIG.HERO_SUBHEAD,
  brandTagline: "Pure by nature, trusted for life",
  brandLogoUrl: MEDIA_ASSETS.logo,
  chekkuVideoUrl: MEDIA_ASSETS.heroVideo,
  freeShippingThreshold: BUSINESS_CONFIG.FREE_SHIPPING_THRESHOLD,
  standardShippingFee: BUSINESS_CONFIG.STANDARD_SHIPPING_FEE,
  prices: {
    groundnut1L: 399,
    groundnut500ml: 189,
    coconut1L: 499,
    coconut500ml: 269,
    sesame1L: 499,
    sesame500ml: 269,
    combo3L: 1299,
    combo1_5L: 699,
  },
  stock: {
    groundnut1L: true,
    groundnut500ml: true,
    coconut1L: true,
    coconut500ml: true,
    sesame1L: true,
    sesame500ml: true,
    combo3L: true,
    combo1_5L: true,
  },
};

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Toast notifications (used across all actions and lifecycle hooks)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Admin Authentication State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("manopavana_admin_auth") === "true";
  });

  const authenticateAdmin = (pin: string) => {
    if (pin.trim() === BUSINESS_CONFIG.ADMIN_PIN) {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem("manopavana_admin_auth", "true");
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem("manopavana_admin_auth");
  };

  // 1. Cart State
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("manopavana_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("manopavana_cart", JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  // Buy Now direct checkout state (persists across page reloads without touching cart)
  const [buyNowItem, setBuyNowItem] = useState<CartItem | null>(() => {
    try {
      const saved = sessionStorage.getItem("manopavana_buynow_item");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const startBuyNow = (item: Omit<CartItem, "quantity">, qty = 1) => {
    const directItem: CartItem = { ...item, quantity: qty };
    setBuyNowItem(directItem);
    try {
      sessionStorage.setItem("manopavana_buynow_item", JSON.stringify(directItem));
    } catch {
      // ignore
    }
  };

  const clearBuyNow = () => {
    setBuyNowItem(null);
    try {
      sessionStorage.removeItem("manopavana_buynow_item");
    } catch {
      // ignore
    }
  };

  // 2. Address & Location Guard
  const [address, setAddress] = useState<Address>(() => {
    try {
      const saved = localStorage.getItem("manopavana_address");
      return saved ? JSON.parse(saved) : DEFAULT_ADDRESS;
    } catch {
      return DEFAULT_ADDRESS;
    }
  });

  const [isLocationModalOpen, setLocationModalOpen] = useState(false);

  // Check on first mount if location exists in localStorage
  // The location modal must NOT open on page refresh if an address has already been saved.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("manopavana_address");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.addressLine1?.trim() && parsed.pincode?.trim()) {
          // Valid address already saved! DO NOT open modal. Auto-populate store.
          setAddress(parsed);
          return;
        }
      }
      // Only trigger location modal on initial arrival if NO address is saved
      setLocationModalOpen(true);
    } catch {
      setLocationModalOpen(true);
    }
  }, []);

  const updateAddress = (newFields: Partial<Address>) => {
    setAddress((prev) => {
      const updated = { ...prev, ...newFields };
      // Check if Bangalore pincode (starts with 560)
      const cleanPin = (updated.pincode || "").trim();
      const isBangalore = cleanPin.startsWith("560") ||
        (updated.district || "").toLowerCase().includes("bengaluru") ||
        (updated.district || "").toLowerCase().includes("bangalore");
      const full: Address = { ...updated, isBangalore };
      try {
        localStorage.setItem("manopavana_address", JSON.stringify(full));
      } catch {
        // ignore
      }

      // If customer is logged in, sync saved address to Firestore customer profile
      if (currentUser?.uid) {
        setDoc(
          doc(db, "customers", currentUser.uid),
          {
            savedAddress: full,
            name: full.fullName || undefined,
            phone: full.phone || undefined,
            email: full.email || undefined,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ).catch(() => {});
      }

      return full;
    });
  };

  /**
   * Reverse geocodes device GPS coordinates into full delivery address
   * and auto-populates the address globally across the app.
   */
  const reverseGeocodeAndSaveAddress = async (lat: number, lng: number): Promise<Partial<Address> | null> => {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "en",
          },
        }
      );
      if (!resp.ok) return null;
      const data = await resp.json();
      if (!data || !data.address) return null;

      const addr = data.address;
      const postcode = (addr.postcode || "").replace(/\D/g, "").slice(0, 6);

      const parts = [
        addr.house_number,
        addr.building,
        addr.road,
        addr.neighbourhood || addr.suburb || addr.residential || addr.quarter,
      ].filter(Boolean);
      const street = parts.join(", ") || (data.display_name ? data.display_name.split(",").slice(0, 3).join(", ") : "");

      const landmark = addr.amenity || addr.shop || addr.landmark || "";
      const district = addr.city_district || addr.district || addr.county || addr.city || "Bengaluru Urban";
      const state = addr.state || "Karnataka";
      const isBLR = postcode.startsWith("560") || district.toLowerCase().includes("bengaluru") || district.toLowerCase().includes("bangalore");

      const partial: Partial<Address> = {
        lat,
        lng,
        addressLine1: street || undefined,
        pincode: postcode || undefined,
        landmark: landmark || undefined,
        district,
        state,
        city: isBLR ? "Bengaluru" : district,
        isBangalore: isBLR,
      };

      updateAddress(partial);
      return partial;
    } catch (err) {
      console.warn("Reverse geocode error:", err);
      return null;
    }
  };

  // 3. Firebase Auth State & Login Modal
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const profile = await syncCustomerDoc(user);
        if (profile && (profile as any).savedAddress) {
          const saved = (profile as any).savedAddress as Partial<Address>;
          if (saved.addressLine1 || saved.phone || saved.fullName) {
            updateAddress(saved);
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const logoutUser = async () => {
    try {
      // 1. Firebase Auth Sign-out
      if (auth) {
        await signOut(auth);
      }
    } catch (err) {
      console.warn("Firebase signout error:", err);
    }
    // 2. Clear stored user session states
    setCurrentUser(null);
    localStorage.removeItem("manopavana_active_user");
    sessionStorage.removeItem("manopavana_admin_auth");
    setIsAdminAuthenticated(false);

    // 3. Show success notification
    showToast("👋 You have logged out successfully.");
  };

  // 4. Loyalty Program
  const [loyalty, setLoyalty] = useState<LoyaltyState>(() => {
    try {
      const saved = localStorage.getItem("manopavana_loyalty");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return {
      isActive: false,
      expiresAt: 0,
      discountPercent: BUSINESS_CONFIG.LOYALTY_DISCOUNT_PERCENT,
    };
  });

  const activateLoyalty = (oilId: string) => {
    const nextState: LoyaltyState = {
      isActive: true,
      expiresAt: Date.now() + BUSINESS_CONFIG.LOYALTY_VALIDITY_MS,
      discountPercent: BUSINESS_CONFIG.LOYALTY_DISCOUNT_PERCENT,
      scannedOil: oilId,
    };
    setLoyalty(nextState);
    try {
      localStorage.setItem("manopavana_loyalty", JSON.stringify(nextState));
    } catch {
      // ignore
    }
    showToast("🎉 10% Bottle QR Loyalty discount unlocked for 7 days!");
  };

  const clearLoyalty = () => {
    const clean: LoyaltyState = {
      isActive: false,
      expiresAt: 0,
      discountPercent: 10,
    };
    setLoyalty(clean);
    try {
      localStorage.removeItem("manopavana_loyalty");
    } catch {
      // ignore
    }
  };

  const [loyaltyRemainingText, setLoyaltyRemainingText] = useState("");

  useEffect(() => {
    const updateCountdown = () => {
      if (!loyalty.isActive || loyalty.expiresAt <= Date.now()) {
        if (loyalty.isActive) clearLoyalty();
        setLoyaltyRemainingText("");
        return;
      }
      const diff = loyalty.expiresAt - Date.now();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setLoyaltyRemainingText(`${days}d ${hours}h ${minutes}m left`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 30000);
    return () => clearInterval(timer);
  }, [loyalty]);

  // Quiz Modal State
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quizProduct, setQuizProduct] = useState<Product | null>(null);

  const openLoyaltyQuiz = (product?: Product) => {
    setQuizProduct(product || PRODUCTS[0]);
    setIsQuizModalOpen(true);
  };

  const closeLoyaltyQuiz = () => {
    setIsQuizModalOpen(false);
  };

  // 5. Audio Engine with Autoplay & First Gesture Interaction Fallback
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio("https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/marada_gaana_beat.mp3");
    audio.loop = true;
    audio.volume = 0.4;
    audio.preload = "auto";
    audio.setAttribute("playsinline", "true");
    audio.setAttribute("webkit-playsinline", "true");
    audioRef.current = audio;

    const events = ["pointerdown", "touchstart", "touchend", "click", "keydown"];

    const triggerPlay = () => {
      if (!audioRef.current) return;
      audioRef.current
        .play()
        .then(() => {
          setIsPlayingAudio(true);
          // Only remove listeners once audio playback successfully starts
          events.forEach((evt) => {
            document.removeEventListener(evt, triggerPlay, true);
            window.removeEventListener(evt, triggerPlay, true);
          });
        })
        .catch(() => {
          // If browser policy blocked this particular event, keep listeners active for next touch
        });
    };

    // 1. Attempt programmatic playback immediately
    triggerPlay();

    // 2. Attach capture listeners so any screen touch on mobile starts playback
    events.forEach((evt) => {
      document.addEventListener(evt, triggerPlay, { capture: true, passive: true });
      window.addEventListener(evt, triggerPlay, { capture: true, passive: true });
    });

    return () => {
      events.forEach((evt) => {
        document.removeEventListener(evt, triggerPlay, true);
        window.removeEventListener(evt, triggerPlay, true);
      });
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlayingAudio(true))
        .catch((err) => {
          console.warn("Audio play prevented:", err);
          setIsPlayingAudio(false);
        });
    }
  };

  // 6. Orders Management
  // Admin orders queue (all orders across store, subscribed only when admin authenticated)
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);

  // User orders: strictly isolated to the currently logged in customer, or guest session
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const guestIds: string[] = JSON.parse(localStorage.getItem("manopavana_guest_order_ids") || "[]");
      const saved = localStorage.getItem("manopavana_orders");
      if (saved && guestIds.length > 0) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((o) => guestIds.includes(o.orderRef) || guestIds.includes(o.id));
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Keep guest orders persisted locally
  useEffect(() => {
    if (!currentUser) {
      try {
        localStorage.setItem("manopavana_orders", JSON.stringify(orders));
      } catch {
        // ignore
      }
    }
  }, [orders, currentUser]);

  // Subscribe to all orders ONLY for store administration (manopavana@gmail.com or admin unlocked)
  useEffect(() => {
    if (isAdminAuthenticated || currentUser?.email === "manopavana@gmail.com") {
      const unsubscribe = subscribeAllOrders((allOrders) => {
        if (allOrders) {
          setAdminOrders(
            [...allOrders].sort(
              (a, b) => (b.timestamp || b.timestampMs || 0) - (a.timestamp || a.timestampMs || 0)
            )
          );
        }
      });
      return () => unsubscribe();
    }
  }, [isAdminAuthenticated, currentUser?.email]);

  // Subscribe strictly to the active user's personal orders in Firestore
  useEffect(() => {
    if (!currentUser) {
      // Unauthenticated visitor: display ONLY orders placed by this device/guest session
      try {
        const guestIds: string[] = JSON.parse(localStorage.getItem("manopavana_guest_order_ids") || "[]");
        const saved = localStorage.getItem("manopavana_orders");
        if (saved && guestIds.length > 0) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setOrders(parsed.filter((o) => guestIds.includes(o.orderRef) || guestIds.includes(o.id)));
            return;
          }
        }
      } catch {}
      setOrders([]);
      return;
    }

    // Authenticated user: load STRICTLY matching orders belonging to this user
    const unsubscribe = subscribeUserOrders(
      currentUser.uid,
      address.phone,
      currentUser.email || undefined,
      (firestoreOrders) => {
        if (firestoreOrders) {
          const userEmail = (currentUser.email || "").toLowerCase().trim();
          const cleanPhone = address.phone ? address.phone.replace(/\D/g, "").slice(-10) : "";

          // Strict user-level filter ensures zero leakage of other customers' orders
          const userOnlyOrders = firestoreOrders.filter((o) => {
            if (o.customerUid && o.customerUid === currentUser.uid) return true;
            if (userEmail && (
              (o.customerEmail && o.customerEmail.toLowerCase() === userEmail) ||
              (o.shippingAddress?.email && o.shippingAddress.email.toLowerCase() === userEmail)
            )) {
              return true;
            }
            if (cleanPhone && cleanPhone.length === 10 && (
              (o.customerPhone && o.customerPhone.replace(/\D/g, "").slice(-10) === cleanPhone) ||
              (o.shippingAddress?.phone && o.shippingAddress.phone.replace(/\D/g, "").slice(-10) === cleanPhone)
            )) {
              return true;
            }
            return false;
          });

          const sorted = userOnlyOrders.sort(
            (a, b) => (b.timestamp || b.timestampMs || 0) - (a.timestamp || a.timestampMs || 0)
          );

          setOrders(sorted);
        }
      }
    );
    return () => unsubscribe();
  }, [currentUser, address.phone]);

  const saveOrder = async (newOrder: Order) => {
    setOrders((prev) => {
      const filtered = prev.filter((o) => o.orderRef !== newOrder.orderRef);
      return [newOrder, ...filtered];
    });

    setAdminOrders((prev) => {
      const filtered = prev.filter((o) => o.orderRef !== newOrder.orderRef);
      return [newOrder, ...filtered];
    });

    // Clear pending tracking keys
    localStorage.removeItem("pending_order_ref");
    localStorage.removeItem("pending_order_timestamp");
    localStorage.removeItem("pending_order_data");

    // Sync to real Firestore collection
    await saveOrderToFirestore(newOrder, currentUser?.uid);
  };

  const getOrder = (refOrId: string): Order | undefined => {
    // 1. Check user orders
    const userMatch = orders.find(
      (o) => o.id === refOrId || o.orderRef === refOrId || o.trackingNumber === refOrId
    );
    if (userMatch) return userMatch;

    // 2. Check admin orders
    const adminMatch = adminOrders.find(
      (o) => o.id === refOrId || o.orderRef === refOrId || o.trackingNumber === refOrId
    );
    if (adminMatch) return adminMatch;

    try {
      const pendingRaw = localStorage.getItem("pending_order_data");
      if (pendingRaw) {
        const p: Order = JSON.parse(pendingRaw);
        if (p.id === refOrId || p.orderRef === refOrId) return p;
      }
    } catch {
      // ignore
    }

    return undefined;
  };

  const updateOrderStatus = async (orderId: string, status: Order["orderStatus"]) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    setOrders((prev) => {
      const updated = prev.map((ord) => (ord.id === orderId ? { ...ord, orderStatus: status } : ord));
      try {
        localStorage.setItem("manopavana_orders", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    if (targetOrder) {
      await updateFirestoreOrderStatus(targetOrder.orderRef, { orderStatus: status });
    }
    showToast(`Order status updated to "${status}"`);
  };

  const updateOrderDetails = async (orderRef: string, updates: Partial<Order>) => {
    setOrders((prev) => {
      const updated = prev.map((ord) => (ord.orderRef === orderRef ? { ...ord, ...updates } : ord));
      try {
        localStorage.setItem("manopavana_orders", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    await updateFirestoreOrderStatus(orderRef, updates);
    showToast(`Order #${orderRef} updated successfully`);
  };

  const deleteOrder = async (orderRef: string) => {
    setOrders((prev) => {
      const updated = prev.filter((ord) => ord.orderRef !== orderRef && ord.id !== orderRef);
      try {
        localStorage.setItem("manopavana_orders", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
    showToast(`Order #${orderRef} removed from queue`);
  };

  // Payment Lifecycle State & Modals
  const [paymentFailedOrder, setPaymentFailedOrder] = useState<Order | null>(null);
  const [orderSuccessRef, setOrderSuccessRef] = useState<string | null>(null);

  const loadOrderToCartAndRetry = (order: Order) => {
    if (order.items && order.items.length > 0) {
      // If it was a direct Buy Now item, restore to buyNowItem so bag items are safe
      if (order.isBuyNow && order.items.length === 1) {
        const it = order.items[0];
        startBuyNow({
          id: it.id,
          productId: it.productId,
          title: it.title,
          subtitle: it.subtitle,
          variant: it.variant,
          price: it.price,
          regularPrice: it.regularPrice,
          image: it.image,
        }, it.quantity);
      } else {
        setCart(order.items);
        try {
          localStorage.setItem("manopavana_cart", JSON.stringify(order.items));
        } catch {
          // ignore
        }
      }
    }
    if (order.shippingAddress) {
      updateAddress(order.shippingAddress);
    }
    showToast("Restored items back into your active bag!");
  };

  const switchOrderToCOD = async (orderRef: string) => {
    let target = getOrder(orderRef);
    if (!target && paymentFailedOrder?.orderRef === orderRef) {
      target = paymentFailedOrder;
    }
    if (!target) {
      try {
        const pendingRaw = localStorage.getItem("pending_order_data");
        if (pendingRaw) target = JSON.parse(pendingRaw);
      } catch {
        // ignore
      }
    }

    // GUARANTEE order items are never blank!
    let itemsToUse = target?.items && target.items.length > 0 ? [...target.items] : [];
    if (itemsToUse.length === 0) {
      if (buyNowItem) {
        itemsToUse = [buyNowItem];
      } else if (cart.length > 0) {
        itemsToUse = [...cart];
      }
    }

    // Safe fallback if cart and target were both empty
    if (itemsToUse.length === 0) {
      itemsToUse = [
        {
          id: "oil-groundnut-1l",
          productId: "oil-groundnut",
          title: "Wood Pressed Groundnut Oil",
          subtitle: "Marachekku Pure • 1L",
          variant: "1L",
          price: 399,
          regularPrice: 450,
          quantity: 1,
          image: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/groundnut_oil_bottle.png",
        },
      ];
    }

    const finalSubtotal =
      target?.subtotal && target.subtotal > 0
        ? target.subtotal
        : itemsToUse.reduce((acc, c) => acc + c.price * c.quantity, 0);
    const finalDiscount =
      target?.discount ??
      (loyalty.isActive ? Math.round((finalSubtotal * loyalty.discountPercent) / 100) : 0);
    const finalShipping =
      target?.shippingFee ??
      (finalSubtotal - finalDiscount >= cmsConfig.freeShippingThreshold ? 0 : cmsConfig.standardShippingFee);
    const finalTotal =
      target?.total && target.total > 0
        ? target.total
        : finalSubtotal - finalDiscount + finalShipping;

    // Guarantee full delivery address details
    const finalShippingAddress: Address = {
      ...address,
      ...(target?.shippingAddress || {}),
      fullName: target?.shippingAddress?.fullName?.trim() || address.fullName.trim() || currentUser?.displayName || "Valued Customer",
      phone: target?.shippingAddress?.phone?.trim() || address.phone.trim() || "N/A",
      email: target?.shippingAddress?.email?.trim() || address.email?.trim() || currentUser?.email || "",
      addressLine1: target?.shippingAddress?.addressLine1?.trim() || address.addressLine1.trim() || "118, Peenya 2nd Stage",
      district: target?.shippingAddress?.district || address.district || "Bengaluru Urban",
      state: target?.shippingAddress?.state || address.state || "Karnataka",
      pincode: target?.shippingAddress?.pincode || address.pincode || "560058",
      city: "Bengaluru",
      isBangalore: true,
      lat: target?.shippingAddress?.lat || address.lat || 12.9716,
      lng: target?.shippingAddress?.lng || address.lng || 77.5946,
    };

    const isDirectBuy = Boolean(
      target?.isBuyNow || (buyNowItem !== null && itemsToUse.length === 1 && itemsToUse[0].id === buyNowItem.id)
    );

    const updated: Order = {
      id: target?.id || `ORD-${Date.now().toString().slice(-4)}`,
      orderRef,
      date: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      timestamp: target?.timestamp || Date.now(),
      timestampMs: target?.timestampMs || Date.now(),
      items: itemsToUse,
      subtotal: finalSubtotal,
      discount: finalDiscount,
      shippingFee: finalShipping,
      total: finalTotal,
      paymentMethod: "cod",
      paymentMode: "COD",
      paymentStatus: "COMPLETED",
      orderStatus: "Placed",
      shippingAddress: finalShippingAddress,
      trackingNumber: target?.trackingNumber || `MV-BLR-${Math.floor(10000 + Math.random() * 90000)}`,
      courier: "MANOPAVANA Peenya Express Carrier",
      customerUid: currentUser?.uid || target?.customerUid || undefined,
      customerPhone: (finalShippingAddress.phone || "").replace(/\D/g, "").slice(-10),
      customerEmail: finalShippingAddress.email || currentUser?.email || undefined,
      isBuyNow: isDirectBuy,
    };

    // Record this orderRef for guest session tracking so the placer can view their own order
    try {
      const guestRefs: string[] = JSON.parse(localStorage.getItem("manopavana_guest_order_ids") || "[]");
      if (!guestRefs.includes(orderRef)) {
        guestRefs.push(orderRef);
        localStorage.setItem("manopavana_guest_order_ids", JSON.stringify(guestRefs));
      }
    } catch {
      // ignore
    }

    // Replace the failed/incomplete attempt with the placed COD order so orders NEVER appear twice
    setOrders((prev) => {
      const filtered = prev.filter((o) => o.orderRef !== orderRef);
      const nextList = [updated, ...filtered];
      try {
        localStorage.setItem("manopavana_orders", JSON.stringify(nextList));
      } catch {
        // ignore
      }
      return nextList;
    });

    localStorage.removeItem("pending_order_ref");
    localStorage.removeItem("pending_order_timestamp");
    localStorage.removeItem("pending_order_data");

    await updateFirestoreOrderStatus(orderRef, {
      paymentMethod: "cod",
      paymentMode: "COD",
      paymentStatus: "COMPLETED",
      orderStatus: "Placed",
    });
    await saveOrderToFirestore(updated, currentUser?.uid);

    await sendOrderConfirmationEmail(updated);

    // If direct Buy Now, preserve user's regular bag!
    if (isDirectBuy) {
      clearBuyNow();
    } else {
      clearCart();
    }

    setPaymentFailedOrder(null);
    setOrderSuccessRef(orderRef);
    showToast("Switched order to Cash on Delivery (COD) successfully!");
  };

  const markOrderAsExpired = async (orderRef: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.orderRef === orderRef
          ? { ...o, orderStatus: "Failed (Expired)" as const, paymentStatus: "FAILED" }
          : o
      )
    );
    try {
      localStorage.setItem("manopavana_orders", JSON.stringify(
        orders.map((o) =>
          o.orderRef === orderRef
            ? { ...o, orderStatus: "Failed (Expired)", paymentStatus: "FAILED" }
            : o
        )
      ));
    } catch {
      // ignore
    }

    await updateFirestoreOrderStatus(orderRef, {
      orderStatus: "Failed (Expired)",
      paymentStatus: "FAILED",
    });
  };

  // 7. Customer Reviews System (Firestore)
  const [reviews, setReviews] = useState<CustomerReview[]>(CUSTOMER_REVIEWS);

  useEffect(() => {
    const unsubscribe = subscribeReviews((firestoreReviews) => {
      if (firestoreReviews && firestoreReviews.length > 0) {
        setReviews(firestoreReviews);
      }
    });
    return () => unsubscribe();
  }, []);

  const submitReview = async (rev: Omit<CustomerReview, "id">) => {
    try {
      const docId = await addReviewToFirestore(rev);
      const newReview: CustomerReview = { id: docId, ...rev };
      setReviews((prev) => [newReview, ...prev]);
      showToast("Thank you! Your verified review has been submitted.");
    } catch (e) {
      console.warn("Failed to submit review to Firestore:", e);
      const fallbackId = `rev-${Date.now()}`;
      setReviews((prev) => [{ id: fallbackId, ...rev }, ...prev]);
      showToast("Review saved locally.");
    }
  };

  const deleteReview = async (reviewId: string, pin: string): Promise<boolean> => {
    if (pin.trim() !== BUSINESS_CONFIG.ADMIN_PIN) {
      showToast("Incorrect Admin PIN. Deletion cancelled.");
      return false;
    }

    try {
      await deleteReviewFromFirestore(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      showToast("Review deleted successfully.");
      return true;
    } catch (e) {
      console.warn("Firestore delete review notice:", e);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      showToast("Review removed.");
      return true;
    }
  };

  // 8. Admin CMS
  const [cmsConfig, setCmsConfig] = useState<StoreCMSConfig>(() => {
    try {
      const saved = localStorage.getItem("manopavana_cms");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          !parsed.brandLogoUrl ||
          parsed.brandLogoUrl === "/logo.svg" ||
          parsed.brandLogoUrl === MEDIA_ASSETS.logoOriginal ||
          typeof parsed.brandLogoUrl === "string" && parsed.brandLogoUrl.includes("logo-clean")
        ) {
          parsed.brandLogoUrl = MEDIA_ASSETS.logo;
        }
        return parsed;
      }
      return DEFAULT_CMS_CONFIG;
    } catch {
      return DEFAULT_CMS_CONFIG;
    }
  });

  // Real-time Firestore snapshot listener on settings/store_config
  useEffect(() => {
    const unsubscribe = subscribeStoreConfig((remoteConfig) => {
      if (remoteConfig) {
        setCmsConfig((prev) => {
          const merged: StoreCMSConfig = {
            ...prev,
            ...remoteConfig,
            prices: { ...prev.prices, ...(remoteConfig.prices || {}) },
            stock: { ...prev.stock, ...(remoteConfig.stock || {}) },
          };
          try {
            localStorage.setItem("manopavana_cms", JSON.stringify(merged));
          } catch {
            // ignore
          }
          return merged;
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const updateCMSConfig = (updater: (prev: StoreCMSConfig) => StoreCMSConfig) => {
    setCmsConfig((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem("manopavana_cms", JSON.stringify(next));
      } catch {
        // ignore
      }
      // Save directly to Firestore for live propagation across all browser tabs & devices
      saveStoreConfigToFirestore(next);
      return next;
    });
  };

  // Derive products and combos live from cmsConfig so prices and stock sync everywhere
  const products: Product[] = useMemo(() => {
    return PRODUCTS.map((p) => {
      if (p.id === "groundnut") {
        return {
          ...p,
          prices: {
            "1L": cmsConfig.prices?.groundnut1L ?? p.prices["1L"],
            "500ml": cmsConfig.prices?.groundnut500ml ?? p.prices["500ml"],
          },
          inStock: {
            "1L": cmsConfig.stock?.groundnut1L ?? p.inStock["1L"],
            "500ml": cmsConfig.stock?.groundnut500ml ?? p.inStock["500ml"],
          },
        };
      }
      if (p.id === "coconut") {
        return {
          ...p,
          prices: {
            "1L": cmsConfig.prices?.coconut1L ?? p.prices["1L"],
            "500ml": cmsConfig.prices?.coconut500ml ?? p.prices["500ml"],
          },
          inStock: {
            "1L": cmsConfig.stock?.coconut1L ?? p.inStock["1L"],
            "500ml": cmsConfig.stock?.coconut500ml ?? p.inStock["500ml"],
          },
        };
      }
      if (p.id === "sesame") {
        return {
          ...p,
          prices: {
            "1L": cmsConfig.prices?.sesame1L ?? p.prices["1L"],
            "500ml": cmsConfig.prices?.sesame500ml ?? p.prices["500ml"],
          },
          inStock: {
            "1L": cmsConfig.stock?.sesame1L ?? p.inStock["1L"],
            "500ml": cmsConfig.stock?.sesame500ml ?? p.inStock["500ml"],
          },
        };
      }
      return p;
    });
  }, [cmsConfig]);

  const combos: ComboProduct[] = useMemo(() => {
    return COMBOS.map((c) => {
      if (c.id === "combo-3l") {
        const reg = cmsConfig.prices?.combo3L ?? c.regularPrice;
        return {
          ...c,
          regularPrice: reg,
          loyaltyPrice: Math.round(reg * 0.9),
          inStock: cmsConfig.stock?.combo3L ?? c.inStock,
        };
      }
      if (c.id === "combo-1.5l") {
        const reg = cmsConfig.prices?.combo1_5L ?? c.regularPrice;
        return {
          ...c,
          regularPrice: reg,
          loyaltyPrice: Math.round(reg * 0.9),
          inStock: cmsConfig.stock?.combo1_5L ?? c.inStock,
        };
      }
      return c;
    });
  }, [cmsConfig]);

  // 9. Modals
  const [activePolicyModal, setActivePolicyModal] = useState<
    "terms" | "shipping" | "returns" | "privacy" | null
  >(null);

  // 11. Theme Mode: 'blend' (default), 'light', or 'dark'
  const [themeMode, setThemeModeState] = useState<"blend" | "light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("manopavana_theme_mode");
      if (saved === "blend" || saved === "light" || saved === "dark") {
        return saved;
      }
      return "blend";
    } catch {
      return "blend";
    }
  });

  const setThemeMode = (mode: "blend" | "light" | "dark") => {
    setThemeModeState(mode);
    try {
      localStorage.setItem("manopavana_theme_mode", mode);
    } catch {
      // ignore
    }
  };

  // Cart operations
  const addToCart = (item: Omit<CartItem, "quantity">, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + qty } : i));
      }
      return [...prev, { ...item, quantity: qty }];
    });
    showToast(`Added "${item.title}" (${item.variant}) to bag`);
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.id === id) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  // Cart Calculations
  const cartCount = useMemo(() => {
    return cart.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [cart]);

  const subtotal = useMemo(() => {
    return cart.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
  }, [cart]);

  const discount = useMemo(() => {
    if (!loyalty.isActive) return 0;
    return Math.round((subtotal * loyalty.discountPercent) / 100);
  }, [subtotal, loyalty]);

  const discountedSubtotal = subtotal - discount;

  const shippingFee = useMemo(() => {
    if (cart.length === 0) return 0;
    return discountedSubtotal >= cmsConfig.freeShippingThreshold ? 0 : cmsConfig.standardShippingFee;
  }, [cart.length, discountedSubtotal, cmsConfig]);

  const total = useMemo(() => {
    if (cart.length === 0) return 0;
    return discountedSubtotal + shippingFee;
  }, [cart.length, discountedSubtotal, shippingFee]);

  const freeShippingProgress = useMemo(() => {
    if (discountedSubtotal >= cmsConfig.freeShippingThreshold) return 100;
    return Math.min(100, Math.round((discountedSubtotal / cmsConfig.freeShippingThreshold) * 100));
  }, [discountedSubtotal, cmsConfig]);

  const freeShippingShortfall = useMemo(() => {
    return Math.max(0, cmsConfig.freeShippingThreshold - discountedSubtotal);
  }, [discountedSubtotal, cmsConfig]);

  return (
    <StoreContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        subtotal,
        discount,
        shippingFee,
        total,
        freeShippingProgress,
        freeShippingShortfall,
        buyNowItem,
        setBuyNowItem,
        startBuyNow,
        clearBuyNow,
        products,
        combos,
        address,
        updateAddress,
        reverseGeocodeAndSaveAddress,
        isLocationModalOpen,
        setLocationModalOpen,
        currentUser,
        isLoginModalOpen,
        setLoginModalOpen,
        logoutUser,
        loyalty,
        activateLoyalty,
        clearLoyalty,
        loyaltyRemainingText,
        isQuizModalOpen,
        quizProduct,
        openLoyaltyQuiz,
        closeLoyaltyQuiz,
        isPlayingAudio,
        toggleAudio,
        orders,
        adminOrders,
        saveOrder,
        getOrder,
        updateOrderStatus,
        updateOrderDetails,
        deleteOrder,
        paymentFailedOrder,
        setPaymentFailedOrder,
        orderSuccessRef,
        setOrderSuccessRef,
        loadOrderToCartAndRetry,
        switchOrderToCOD,
        markOrderAsExpired,
        reviews,
        submitReview,
        deleteReview,
        cmsConfig,
        updateCMSConfig,
        isAdminAuthenticated,
        authenticateAdmin,
        logoutAdmin,
        activePolicyModal,
        setActivePolicyModal,
        toastMessage,
        showToast,
        themeMode,
        setThemeMode,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
};
