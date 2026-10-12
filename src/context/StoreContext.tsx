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

  // Catalog Products & Combos (synchronized with live CMS prices and stock)
  products: Product[];
  combos: ComboProduct[];

  // Address & Location Guard
  address: Address;
  updateAddress: (newAddr: Partial<Address>) => void;
  isLocationModalOpen: boolean;
  setLocationModalOpen: (open: boolean) => void;
  isFlipkartModalOpen: boolean;
  setFlipkartModalOpen: (open: boolean) => void;

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
  saveOrder: (order: Order) => Promise<void>;
  getOrder: (refOrId: string) => Order | undefined;
  updateOrderStatus: (orderId: string, status: Order["orderStatus"]) => Promise<void>;

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
  const [isFlipkartModalOpen, setFlipkartModalOpen] = useState(false);

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
      const isBangalore = updated.pincode.trim().startsWith("560");
      const full = { ...updated, isBangalore };
      try {
        localStorage.setItem("manopavana_address", JSON.stringify(full));
      } catch {
        // ignore
      }
      return full;
    });
  };

  // 3. Firebase Auth State & Login Modal
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        syncCustomerDoc(user);
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
    audioRef.current = audio;

    const startAudioOnGesture = () => {
      if (!audioRef.current) return;
      audioRef.current
        .play()
        .then(() => setIsPlayingAudio(true))
        .catch(() => {});
      ["click", "touchstart", "scroll", "keydown"].forEach((evt) =>
        window.removeEventListener(evt, startAudioOnGesture)
      );
    };

    // 1. Attempt programmatic audio playback on page load
    audio
      .play()
      .then(() => setIsPlayingAudio(true))
      .catch(() => {
        // Autoplay policy prevented playback without gesture
      });

    // 2. Attach one-time global user gesture listener on window
    ["click", "touchstart", "scroll", "keydown"].forEach((evt) =>
      window.addEventListener(evt, startAudioOnGesture, { passive: true })
    );

    return () => {
      ["click", "touchstart", "scroll", "keydown"].forEach((evt) =>
        window.removeEventListener(evt, startAudioOnGesture)
      );
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

  // 6. Orders Management (Zero seeded orders - strictly empty initially)
  const [orders, setOrders] = useState<Order[]>([]);

  // Subscribe to real Firestore orders: all orders for store admin, or user-specific orders
  useEffect(() => {
    if (!currentUser) {
      setOrders([]);
      return;
    }

    if (currentUser.email === "manopavana@gmail.com") {
      const unsubscribe = subscribeAllOrders((allOrders) => {
        if (allOrders) {
          const sorted = [...allOrders].sort((a, b) => b.timestamp - a.timestamp);
          setOrders(sorted);
        }
      });
      return () => unsubscribe();
    }

    const unsubscribe = subscribeUserOrders(
      currentUser.uid,
      address.phone,
      (firestoreOrders) => {
        if (firestoreOrders) {
          const sorted = [...firestoreOrders].sort((a, b) => b.timestamp - a.timestamp);
          setOrders(sorted);
        }
      }
    );
    return () => unsubscribe();
  }, [currentUser, address.phone]);

  const saveOrder = async (newOrder: Order) => {
    setOrders((prev) => {
      const updated = [newOrder, ...prev.filter((o) => o.orderRef !== newOrder.orderRef)];
      try {
        localStorage.setItem("manopavana_orders", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    // Sync to real Firestore collection
    await saveOrderToFirestore(newOrder, currentUser?.uid);
  };

  const getOrder = (refOrId: string) => {
    return orders.find(
      (o) => o.id === refOrId || o.orderRef === refOrId || o.trackingNumber === refOrId
    );
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

  // Payment Lifecycle State & Modals
  const [paymentFailedOrder, setPaymentFailedOrder] = useState<Order | null>(null);
  const [orderSuccessRef, setOrderSuccessRef] = useState<string | null>(null);

  const loadOrderToCartAndRetry = (order: Order) => {
    setCart(order.items);
    updateAddress(order.shippingAddress);
    showToast("Restored items back into your active bag!");
  };

  const switchOrderToCOD = async (orderRef: string) => {
    const target = orders.find((o) => o.orderRef === orderRef);
    const updated: Order = target
      ? {
          ...target,
          paymentMethod: "cod",
          paymentMode: "COD",
          paymentStatus: "COMPLETED",
          orderStatus: "Placed",
        }
      : {
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
          shippingAddress: address,
        };

    setOrders((prev) =>
      prev.map((o) => (o.orderRef === orderRef ? updated : o))
    );
    try {
      localStorage.setItem("manopavana_orders", JSON.stringify(
        orders.map((o) => (o.orderRef === orderRef ? updated : o))
      ));
    } catch {
      // ignore
    }

    await updateFirestoreOrderStatus(orderRef, {
      paymentMethod: "cod",
      paymentMode: "COD",
      paymentStatus: "COMPLETED",
      orderStatus: "Placed",
    });

    await sendOrderConfirmationEmail(updated);
    clearCart();
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

  // 9. Modals
  const [activePolicyModal, setActivePolicyModal] = useState<
    "terms" | "shipping" | "returns" | "privacy" | null
  >(null);

  // 10. Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

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
        products,
        combos,
        address,
        updateAddress,
        isLocationModalOpen,
        setLocationModalOpen,
        isFlipkartModalOpen,
        setFlipkartModalOpen,
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
        saveOrder,
        getOrder,
        updateOrderStatus,
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
