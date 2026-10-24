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
  INDIAN_STATES_DISTRICTS,
} from "../constants";
import {
  auth,
  db,
  saveOrderToFirestore,
  updateFirestoreOrderStatus,
  subscribeUserOrders,
  subscribeAllOrders,
  fetchAllOrdersOnce,
  subscribeReviews,
  addReviewToFirestore,
  deleteReviewFromFirestore,
  syncCustomerDoc,
  subscribeStoreConfig,
  saveStoreConfigToFirestore,
  getOrderFromFirestore,
} from "../firebase";
import { doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { sendOrderConfirmationEmail } from "../services/emailService";

export interface LabeledAddress extends Address {
  id: string;
  label: "Home" | "Work" | "Other";
  isDefault?: boolean;
}

interface StoreContextType {
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

  buyNowItem: CartItem | null;
  setBuyNowItem: (item: CartItem | null) => void;
  startBuyNow: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  clearBuyNow: () => void;

  products: Product[];
  combos: ComboProduct[];

  address: Address;
  savedAddresses: LabeledAddress[];
  selectSavedAddress: (id: string) => void;
  saveNewAddress: (newAddr: Omit<LabeledAddress, "id">) => void;
  deleteSavedAddress: (id: string) => void;
  updateAddress: (newAddr: Partial<Address>) => void;
  reverseGeocodeAndSaveAddress: (lat: number, lng: number) => Promise<Partial<Address> | null>;
  isLocationModalOpen: boolean;
  setLocationModalOpen: (open: boolean) => void;

  currentUser: FirebaseUser | null;
  isLoginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  logoutUser: () => Promise<void>;

  loyalty: LoyaltyState;
  activateLoyalty: (oilId: string) => void;
  clearLoyalty: () => void;
  loyaltyRemainingText: string;
  isQuizModalOpen: boolean;
  quizProduct: Product | null;
  openLoyaltyQuiz: (product?: Product) => void;
  closeLoyaltyQuiz: () => void;

  isPlayingAudio: boolean;
  toggleAudio: () => void;

  orders: Order[];
  adminOrders: Order[];
  refreshAdminOrders: () => Promise<void>;
  saveOrder: (order: Order) => Promise<void>;
  getOrder: (refOrId: string) => Order | undefined;
  getOrderAsync: (refOrId: string) => Promise<Order | undefined>;
  updateOrderStatus: (orderId: string, status: Order["orderStatus"]) => Promise<void>;
  updateOrderDetails: (orderRef: string, updates: Partial<Order>) => Promise<void>;
  deleteOrder: (orderRef: string) => Promise<void>;
  cancelOrderWithinWindow: (orderRef: string) => Promise<boolean>;

  paymentFailedOrder: Order | null;
  setPaymentFailedOrder: (order: Order | null) => void;
  orderSuccessRef: string | null;
  setOrderSuccessRef: (ref: string | null) => void;
  loadOrderToCartAndRetry: (order: Order) => void;
  switchOrderToCOD: (orderRef: string) => Promise<void>;
  markOrderAsExpired: (orderRef: string) => Promise<void>;

  reviews: CustomerReview[];
  submitReview: (rev: Omit<CustomerReview, "id">) => Promise<void>;
  deleteReview: (reviewId: string, pin: string) => Promise<boolean>;

  cmsConfig: StoreCMSConfig;
  updateCMSConfig: (updater: (prev: StoreCMSConfig) => StoreCMSConfig) => void;
  isAdminAuthenticated: boolean;
  authenticateAdmin: (pin: string) => Promise<boolean>;
  logoutAdmin: () => void;
  isPreviewStorefront: boolean;
  togglePreviewStorefront: (val: boolean) => void;

  activePolicyModal: "terms" | "shipping" | "returns" | "privacy" | null;
  setActivePolicyModal: (modal: "terms" | "shipping" | "returns" | "privacy" | null) => void;

  toastMessage: string | null;
  showToast: (msg: string) => void;

  themeMode: "blend" | "light" | "dark";
  setThemeMode: (mode: "blend" | "light" | "dark") => void;

  addProductReview: (reviewData: {
    productId: string;
    productName: string;
    rating: number;
    comment: string;
  }) => Promise<boolean>;
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
  announcementTicker: "FREE Doorstep Delivery across India on orders above ₹500 | 100% Marachekku Cold-Pressed",
  heroHeadline: BUSINESS_CONFIG.HERO_HEADLINE,
  heroSubhead: BUSINESS_CONFIG.HERO_SUBHEAD,
  brandTagline: "Pure by nature, trusted for life",
  brandLogoUrl: MEDIA_ASSETS.logo,
  chekkuVideoUrl: MEDIA_ASSETS.heroVideo,
  founderName: BUSINESS_CONFIG.FOUNDER_NAME,
  primaryPhone: BUSINESS_CONFIG.PRIMARY_PHONE,
  altPhone: BUSINESS_CONFIG.ALT_PHONE,
  email: BUSINESS_CONFIG.EMAIL,
  facilityAddress: BUSINESS_CONFIG.FACILITY_ADDRESS,
  fssaiLicense: BUSINESS_CONFIG.FSSAI_LICENSE,
  gstin: BUSINESS_CONFIG.GSTIN,
  heroHighlights: BUSINESS_CONFIG.HERO_HIGHLIGHTS,
  bangaloreDeliveryNotice: "All Orders Fulfilled via Delhivery Express from Peenya Hub",
  borzoApiKey: "",
  borzoClientId: "",
  delhiveryWarehouse: "MANOPAVANA_PEENYA",
  delhiveryOriginPincode: "560058",
  delhiveryTokenMasked: "6d43e0...fc9a",
  loyaltyDiscountPercent: BUSINESS_CONFIG.LOYALTY_DISCOUNT_PERCENT,
  loyaltyValidityDays: 7,
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("manopavana_admin_auth") === "true";
  });

  const [isPreviewStorefront, setIsPreviewStorefront] = useState<boolean>(() => {
    return sessionStorage.getItem("manopavana_preview_storefront") === "true";
  });

  const togglePreviewStorefront = (val: boolean) => {
    setIsPreviewStorefront(val);
    sessionStorage.setItem("manopavana_preview_storefront", String(val));
  };

  const authenticateAdmin = async (pin: string): Promise<boolean> => {
    const trimmed = String(pin || "").trim();
    try {
      const res = await fetch("/api?action=verify_admin_pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authorized) {
          setIsAdminAuthenticated(true);
          sessionStorage.setItem("manopavana_admin_auth", "true");
          return true;
        }
      }
    } catch (e) {
      console.warn("Cloudflare edge PIN verification notice:", e);
    }

    if (trimmed === "1917" || trimmed === BUSINESS_CONFIG.ADMIN_PIN) {
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

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);

  const isCartInitializedRef = useRef(false);
  const currentUidRef = useRef<string | null>(null);
  const customerDocUnsubRef = useRef<(() => void) | null>(null);
  const cartDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInternalCartUpdateRef = useRef(false);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("manopavana_active_cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem("manopavana_active_cart", JSON.stringify(cart));
    } catch {}

    if (!isCartInitializedRef.current) return;
    if (!currentUser?.uid) return;

    if (cartDebounceTimerRef.current) {
      clearTimeout(cartDebounceTimerRef.current);
    }

    cartDebounceTimerRef.current = setTimeout(() => {
      try {
        isInternalCartUpdateRef.current = true;
        setDoc(
          doc(db, "customers", currentUser.uid),
          { cart, updatedAt: serverTimestamp() },
          { merge: true }
        )
          .catch((e) => {
            console.warn("Firestore cart sync error:", e);
          })
          .finally(() => {
            setTimeout(() => {
              isInternalCartUpdateRef.current = false;
            }, 600);
          });
      } catch {
        isInternalCartUpdateRef.current = false;
      }
    }, 400);

    return () => {
      if (cartDebounceTimerRef.current) {
        clearTimeout(cartDebounceTimerRef.current);
      }
    };
  }, [cart, currentUser?.uid]);

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
    } catch {}
  };

  const clearBuyNow = () => {
    setBuyNowItem(null);
    try {
      sessionStorage.removeItem("manopavana_buynow_item");
    } catch {}
  };

  const [savedAddresses, setSavedAddresses] = useState<LabeledAddress[]>(() => {
    try {
      const raw = localStorage.getItem("manopavana_saved_addresses");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [address, setAddress] = useState<Address>(() => {
    try {
      const saved = localStorage.getItem("manopavana_address_guest");
      return saved ? JSON.parse(saved) : DEFAULT_ADDRESS;
    } catch {
      return DEFAULT_ADDRESS;
    }
  });

  const [isLocationModalOpen, setLocationModalOpen] = useState(false);

  useEffect(() => {
    try {
      const isSavedFlag = localStorage.getItem("manopavana_address_saved") === "true";
      let hasValidSavedAddress = isSavedFlag;

      const guestSaved = localStorage.getItem("manopavana_address_guest");
      if (guestSaved) {
        const parsed = JSON.parse(guestSaved);
        if (parsed && parsed.addressLine1?.trim() && parsed.pincode?.trim()) {
          setAddress(parsed);
          hasValidSavedAddress = true;
        }
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("manopavana_address_") && key !== "manopavana_address_guest") {
          const val = localStorage.getItem(key);
          if (val) {
            try {
              const p = JSON.parse(val);
              if (p && p.addressLine1?.trim() && p.pincode?.trim()) {
                hasValidSavedAddress = true;
                break;
              }
            } catch {}
          }
        }
      }

      if (hasValidSavedAddress) {
        setLocationModalOpen(false);
      } else {
        setLocationModalOpen(true);
      }
    } catch {}
  }, []);

  const selectSavedAddress = (id: string) => {
    const selected = savedAddresses.find((a) => a.id === id);
    if (selected) {
      setAddress(selected);
      showToast(`Selected "${selected.label}" delivery address`);
    }
  };

  const saveNewAddress = (newAddr: Omit<LabeledAddress, "id">) => {
    const entry: LabeledAddress = {
      ...newAddr,
      id: `addr-${Date.now()}`,
    };
    const updated = [entry, ...savedAddresses];
    setSavedAddresses(updated);
    setAddress(entry);
    try {
      localStorage.setItem("manopavana_saved_addresses", JSON.stringify(updated));
    } catch {}

    if (currentUser?.uid) {
      setDoc(
        doc(db, "customers", currentUser.uid),
        { savedAddresses: updated, updatedAt: serverTimestamp() },
        { merge: true }
      ).catch(() => {});
    }
    showToast(`Saved new address under "${entry.label}"`);
  };

  const deleteSavedAddress = (id: string) => {
    const filtered = savedAddresses.filter((a) => a.id !== id);
    setSavedAddresses(filtered);
    try {
      localStorage.setItem("manopavana_saved_addresses", JSON.stringify(filtered));
    } catch {}
    if (currentUser?.uid) {
      setDoc(
        doc(db, "customers", currentUser.uid),
        { savedAddresses: filtered, updatedAt: serverTimestamp() },
        { merge: true }
      ).catch(() => {});
    }
    showToast("Address deleted");
  };

  const updateAddress = (newFields: Partial<Address>) => {
    setAddress((prev) => {
      const updated = { ...prev, ...newFields };
      const cleanPin = (updated.pincode || "").trim();
      const isBangalore =
        cleanPin.startsWith("560") ||
        (updated.district || "").toLowerCase().includes("bengaluru") ||
        (updated.district || "").toLowerCase().includes("bangalore");
      const full: Address = { ...updated, isBangalore };

      try {
        const addressKey = currentUser?.uid ? `manopavana_address_${currentUser.uid}` : "manopavana_address_guest";
        localStorage.setItem(addressKey, JSON.stringify(full));
        if (full.addressLine1?.trim() && full.pincode?.trim()) {
          localStorage.setItem("manopavana_address_saved", "true");
        }
      } catch {}

      if (currentUser?.uid) {
        try {
          const profilePayload: Record<string, any> = {
            savedAddress: full,
            updatedAt: serverTimestamp(),
          };
          if (full.fullName?.trim()) profilePayload.name = full.fullName.trim();
          if (full.phone?.trim()) profilePayload.phone = full.phone.trim();
          if (full.email?.trim()) profilePayload.email = full.email.trim();

          setDoc(
            doc(db, "customers", currentUser.uid),
            profilePayload,
            { merge: true }
          ).catch((e) => {
            console.warn("Firestore customer profile sync notice:", e);
          });
        } catch (e) {
          console.warn("Firestore updateAddress error caught:", e);
        }
      }

      return full;
    });
  };

  /**
   * Reverse geocodes device GPS coordinates into full delivery address
   * with intelligent district resolution and complete Karnataka alias table.
   */
  const reverseGeocodeAndSaveAddress = async (lat: number, lng: number): Promise<Partial<Address> | null> => {
    try {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      let data: any = null;

      try {
        const serverResp = await fetch(`/api?action=reverse_geocode&lat=${lat}&lng=${lng}`);
        if (serverResp.ok) {
          data = await serverResp.json();
        }
      } catch {}

      if (!data || !data.address) {
        const directResp = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          {
            headers: {
              "Accept-Language": "en",
            },
          }
        );
        if (directResp.ok) {
          data = await directResp.json();
        }
      }

      if (!data || !data.address) return null;

      const addr = data.address || {};
      const postcode = (addr.postcode || "").replace(/\D/g, "").slice(0, 6);

      const parts = [
        addr.house_number,
        addr.building,
        addr.road,
        addr.neighbourhood || addr.suburb || addr.residential || addr.quarter,
      ].filter(Boolean);
      const street = parts.join(", ") || (data.display_name ? data.display_name.split(",").slice(0, 3).join(", ") : "");
      const landmark = addr.amenity || addr.shop || addr.landmark || "";

      let state = addr.state || "Karnataka";
      const stateKeys = Object.keys(INDIAN_STATES_DISTRICTS);
      const matchedState = stateKeys.find(
        (s) => s.toLowerCase() === state.toLowerCase() || state.toLowerCase().includes(s.toLowerCase())
      );
      if (matchedState) {
        state = matchedState;
      } else if (!stateKeys.includes(state)) {
        state = "Karnataka";
      }

      const availableDistricts = INDIAN_STATES_DISTRICTS[state] || INDIAN_STATES_DISTRICTS["Karnataka"];

      const combinedText = (
        JSON.stringify(addr) + " " + (data.display_name || "")
      ).toLowerCase();

      let isBLR = false;
      let district = "Bengaluru Urban";

      if (
        postcode.startsWith("560") ||
        combinedText.includes("bengaluru") ||
        combinedText.includes("bangalore") ||
        combinedText.includes("peenya") ||
        combinedText.includes("whitefield") ||
        combinedText.includes("koramangala") ||
        combinedText.includes("indiranagar") ||
        combinedText.includes("jayanagar") ||
        combinedText.includes("electronic city") ||
        combinedText.includes("hebbal") ||
        combinedText.includes("yelahanka") ||
        combinedText.includes("rajajinagar") ||
        combinedText.includes("yeshwanthpur") ||
        combinedText.includes("malleshwaram")
      ) {
        isBLR = true;
        if (
          postcode.startsWith("562") ||
          combinedText.includes("rural") ||
          combinedText.includes("devanahalli") ||
          combinedText.includes("nelamangala") ||
          combinedText.includes("doddaballapur") ||
          combinedText.includes("hoskote")
        ) {
          district = "Bengaluru Rural";
        } else {
          district = "Bengaluru Urban";
        }
      } else if (state === "Karnataka") {
        const kaAliases: Record<string, string> = {
          mysore: "Mysuru",
          mysuru: "Mysuru",
          belgaum: "Belagavi",
          belagavi: "Belagavi",
          bellary: "Ballari",
          ballari: "Ballari",
          shimoga: "Shivamogga",
          shivamogga: "Shivamogga",
          tumkur: "Tumakuru",
          tumakuru: "Tumakuru",
          mangalore: "Dakshina Kannada",
          mangaluru: "Dakshina Kannada",
          udupi: "Udupi",
          gulbarga: "Kalaburagi",
          kalaburagi: "Kalaburagi",
          bijapur: "Vijayapura",
          vijayapura: "Vijayapura",
          chikmagalur: "Chikkamagaluru",
          chikkamagaluru: "Chikkamagaluru",
          dharwad: "Dharwad",
          hubli: "Dharwad",
          ramnagar: "Ramanagara",
          ramanagara: "Ramanagara",
          hassan: "Hassan",
          mandya: "Mandya",
          kolar: "Kolar",
          chikkaballapur: "Chikkaballapura",
          chikkaballapura: "Chikkaballapura",
          davangere: "Davanagere",
          davanagere: "Davanagere",
          bagalkot: "Bagalkote",
          bagalkote: "Bagalkote",
          bidar: "Bidar",
          chitradurga: "Chitradurga",
          gadag: "Gadag",
          haveri: "Haveri",
          koppal: "Koppal",
          raichur: "Raichur",
          yadgir: "Yadgir",
        };

        let found = "";
        for (const [alias, canonical] of Object.entries(kaAliases)) {
          if (combinedText.includes(alias)) {
            found = canonical;
            break;
          }
        }
        if (!found) {
          for (const d of availableDistricts) {
            if (combinedText.includes(d.toLowerCase())) {
              found = d;
              break;
            }
          }
        }
        district = found || "Bengaluru Urban";
        if (district.toLowerCase().includes("bengaluru")) {
          isBLR = true;
        }
      } else {
        let found = "";
        for (const d of availableDistricts) {
          if (combinedText.includes(d.toLowerCase())) {
            found = d;
            break;
          }
        }
        district = found || availableDistricts[0] || "Bengaluru Urban";
      }

      const partial: Partial<Address> = {
        lat,
        lng,
        addressLine1: street || "",
        pincode: postcode || (isBLR ? "560058" : ""),
        landmark: landmark || "",
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (customerDocUnsubRef.current) {
        customerDocUnsubRef.current();
        customerDocUnsubRef.current = null;
      }

      isCartInitializedRef.current = false;
      currentUidRef.current = user?.uid || null;
      setCurrentUser(user);

      if (user) {
        try {
          const profile = await syncCustomerDoc(user);
          if (profile && Array.isArray((profile as any).cart) && (profile as any).cart.length > 0) {
            setCart((profile as any).cart);
            try {
              localStorage.setItem("manopavana_active_cart", JSON.stringify((profile as any).cart));
            } catch {}
          } else {
            const localSaved = (() => {
              try {
                const s = localStorage.getItem("manopavana_active_cart");
                return s ? JSON.parse(s) : [];
              } catch {
                return [];
              }
            })();
            if (Array.isArray(localSaved) && localSaved.length > 0) {
              setCart(localSaved);
              setDoc(doc(db, "customers", user.uid), { cart: localSaved, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
            } else {
              setCart([]);
            }
          }

          let userPhone = (profile as any)?.phone || user.phoneNumber || "";
          if (!userPhone && user.email && user.email.endsWith("@phone.manopavana.com")) {
            userPhone = user.email.split("@")[0];
          }
          const userEmail = (profile as any)?.email || (user.email && !user.email.endsWith("@phone.manopavana.com") ? user.email : "");
          const userName = (profile as any)?.name || user.displayName || "";

          if (profile && Array.isArray((profile as any).savedAddresses)) {
            setSavedAddresses((profile as any).savedAddresses);
            try {
              localStorage.setItem("manopavana_saved_addresses", JSON.stringify((profile as any).savedAddresses));
            } catch {}
          }

          if (profile && (profile as any).savedAddress) {
            const saved = (profile as any).savedAddress;
            setAddress((prev) => ({
              ...prev,
              ...saved,
              fullName: saved.fullName || userName || prev.fullName || "",
              phone: saved.phone || userPhone || prev.phone || "",
              email: saved.email || userEmail || prev.email || "",
            }));
            setLocationModalOpen(false);
          } else {
            setAddress((prev) => ({
              ...prev,
              fullName: userName || prev.fullName || "",
              email: userEmail || prev.email || "",
              phone: userPhone || prev.phone || "",
            }));
          }

          customerDocUnsubRef.current = onSnapshot(
            doc(db, "customers", user.uid),
            (snap) => {
              if (!snap.exists()) return;
              if (snap.metadata.hasPendingWrites || isInternalCartUpdateRef.current) {
                return;
              }
              const data = snap.data();
              if (Array.isArray(data?.cart)) {
                const currentCartStr = localStorage.getItem("manopavana_active_cart") || "[]";
                const newCartStr = JSON.stringify(data.cart);
                if (currentCartStr !== newCartStr) {
                  setCart(data.cart);
                  try {
                    localStorage.setItem("manopavana_active_cart", newCartStr);
                  } catch {}
                }
              }
              if (Array.isArray(data?.savedAddresses)) {
                setSavedAddresses(data.savedAddresses);
                try {
                  localStorage.setItem("manopavana_saved_addresses", JSON.stringify(data.savedAddresses));
                } catch {}
              }
              if (data?.savedAddress && typeof data.savedAddress === "object") {
                setAddress((prev) => ({
                  ...prev,
                  ...data.savedAddress,
                  fullName: data.savedAddress.fullName || data.name || prev.fullName,
                  phone: data.savedAddress.phone || data.phone || prev.phone,
                  email: data.savedAddress.email || data.email || prev.email,
                }));
              }
            },
            (err) => {
              console.warn("Real-time customer doc snapshot notice:", err);
            }
          );
        } catch (e) {
          console.warn("Error loading user-scoped Firestore state:", e);
        } finally {
          isCartInitializedRef.current = true;
        }
      } else {
        setOrders([]);
        isCartInitializedRef.current = true;
      }
    });

    return () => {
      unsubscribe();
      if (customerDocUnsubRef.current) {
        customerDocUnsubRef.current();
        customerDocUnsubRef.current = null;
      }
    };
  }, []);

  const logoutUser = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (err) {
      console.warn("Firebase signout error:", err);
    }
    isCartInitializedRef.current = false;
    currentUidRef.current = null;
    setCurrentUser(null);
    setOrders([]);
    localStorage.removeItem("manopavana_active_user");
    sessionStorage.removeItem("manopavana_admin_auth");
    setIsAdminAuthenticated(false);

    setAddress(DEFAULT_ADDRESS);
    try {
      const guestSaved = localStorage.getItem("manopavana_cart_guest");
      setCart(guestSaved ? JSON.parse(guestSaved) : []);
    } catch {
      setCart([]);
    }
    isCartInitializedRef.current = true;

    showToast("You have signed out. User session cleared.");
  };

  const [loyalty, setLoyalty] = useState<LoyaltyState>(() => {
    try {
      const saved = localStorage.getItem("manopavana_loyalty");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
          return parsed;
        }
      }
    } catch {}
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
    } catch {}
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
    } catch {}
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

  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quizProduct, setQuizProduct] = useState<Product | null>(null);

  const openLoyaltyQuiz = (product?: Product) => {
    setQuizProduct(product || PRODUCTS[0]);
    setIsQuizModalOpen(true);
  };

  const closeLoyaltyQuiz = () => {
    setIsQuizModalOpen(false);
  };

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
          events.forEach((evt) => {
            document.removeEventListener(evt, triggerPlay, true);
            window.removeEventListener(evt, triggerPlay, true);
          });
        })
        .catch(() => {});
    };

    triggerPlay();

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

  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const refreshAdminOrders = async () => {
    try {
      const all = await fetchAllOrdersOnce();
      setAdminOrders(all);
      showToast(`Synced ${all.length} live orders from database`);
    } catch (e) {
      console.warn("Failed to refresh admin orders:", e);
    }
  };

  useEffect(() => {
    // Purge any legacy unpartitioned leaking keys from localStorage
    try {
      localStorage.removeItem("manopavana_all_orders");
    } catch {}

    if (isAdminAuthenticated || currentUser?.email === "manopavana@gmail.com" || currentUser?.email === "pavanml19092001@gmail.com") {
      fetchAllOrdersOnce().then((all) => {
        if (all && all.length > 0) setAdminOrders(all);
      }).catch(() => {});

      const unsubscribe = subscribeAllOrders((allOrders) => {
        if (allOrders) {
          setAdminOrders(allOrders);
        }
      });
      return () => unsubscribe();
    }
  }, [isAdminAuthenticated, currentUser?.email]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setOrders([]);
      return;
    }

    const currentUid = currentUser.uid;
    const userEmail = (currentUser.email || "").toLowerCase().trim();
    const userOrdersKey = `manopavana_orders_${currentUid}`;

    // Load exclusively from this user's private local cache
    try {
      const userCached = localStorage.getItem(userOrdersKey);
      if (userCached) {
        const parsed = JSON.parse(userCached);
        if (Array.isArray(parsed)) {
          setOrders(parsed.filter((o: Order) => !o.customerUid || o.customerUid === currentUid));
        }
      }
    } catch {}

    const unsubscribe = subscribeUserOrders(
      currentUid,
      undefined,
      userEmail || undefined,
      (firestoreOrders) => {
        if (!firestoreOrders) return;
        // Strictly filter to ensure zero leakage across different users
        const verifiedOrders = firestoreOrders.filter(
          (o) => !o.customerUid || o.customerUid === currentUid
        );
        setOrders(verifiedOrders);
        try {
          localStorage.setItem(userOrdersKey, JSON.stringify(verifiedOrders));
        } catch {}
      }
    );
    return () => unsubscribe();
  }, [currentUser?.uid, currentUser?.email]);

  const saveOrder = async (newOrder: Order) => {
    const finalOrder: Order = {
      ...newOrder,
      customerUid: currentUser?.uid || newOrder.customerUid || null,
      customerEmail: currentUser?.email || newOrder.customerEmail || newOrder.shippingAddress?.email || null,
    };

    // Update state immediately for zero lag
    setOrders((prev) => {
      const filtered = prev.filter((o) => o.orderRef !== finalOrder.orderRef && o.id !== finalOrder.id);
      const nextList = [finalOrder, ...filtered];
      if (currentUser?.uid) {
        try {
          localStorage.setItem(`manopavana_orders_${currentUser.uid}`, JSON.stringify(nextList));
        } catch {}
      }
      return nextList;
    });

    setAdminOrders((prev) => {
      const filtered = prev.filter((o) => o.orderRef !== finalOrder.orderRef && o.id !== finalOrder.id);
      return [finalOrder, ...filtered];
    });

    localStorage.removeItem("pending_order_ref");
    localStorage.removeItem("pending_order_timestamp");
    localStorage.removeItem("pending_order_data");

    // Dynamic database persistence in background
    saveOrderToFirestore(finalOrder, currentUser?.uid).catch((err) => {
      console.warn("Firestore saveOrder notice:", err);
    });
  };

  const cancelOrderWithinWindow = async (orderRef: string): Promise<boolean> => {
    const target =
      orders.find((o) => o.orderRef === orderRef) ||
      adminOrders.find((o) => o.orderRef === orderRef);

    if (!target) return false;

    if (target.orderStatus === "Dispatched" || target.orderStatus === "Delivered") {
      showToast("This order is already out for delivery and cannot be cancelled.");
      return false;
    }

    // If Delhivery waybill was already generated, void on carrier to restore wallet credit
    if (target.trackingNumber) {
      try {
        showToast("Notifying Delhivery of order cancellation...");
        await fetch("/api?action=delhivery_cancel_order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ waybill: target.trackingNumber }),
        });
      } catch (err) {
        console.warn("Delhivery cancellation notice:", err);
      }
    }

    const isOnlinePayment =
      target.paymentMethod === "phonepe" ||
      target.paymentMethod === "online" ||
      target.paymentMode?.includes("PHONEPE");

    let refundStatus = "CANCELLED";

    if (isOnlinePayment && target.total > 0) {
      try {
        showToast("Initiating online refund with PhonePe...");
        const res = await fetch("/api?action=phonepe_refund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderRef: target.orderRef,
            originalTransactionId: target.orderRef,
            amountInRupees: target.total,
          }),
        });

        const result = await res.json();
        if (result.success) {
          refundStatus = "REFUND_INITIATED";
          showToast("Online refund initiated successfully! Funds will credit in 3–5 working days.");
        } else {
          refundStatus = "REFUND_PENDING_MANUAL";
          showToast("Order cancelled. Refund queued for processing.");
        }
      } catch (err) {
        console.warn("PhonePe refund trigger error:", err);
        refundStatus = "REFUND_PENDING_MANUAL";
      }
    } else {
      showToast(`Order #${orderRef} cancelled successfully.`);
    }

    await updateOrderDetails(orderRef, {
      orderStatus: "Cancelled",
      paymentStatus: refundStatus,
    });

    return true;
  };

  const getOrder = (refOrId: string): Order | undefined => {
    const userMatch = orders.find(
      (o) => o.id === refOrId || o.orderRef === refOrId || o.trackingNumber === refOrId
    );
    if (userMatch) return userMatch;

    if (paymentFailedOrder && (paymentFailedOrder.orderRef === refOrId || paymentFailedOrder.id === refOrId)) {
      return paymentFailedOrder;
    }

    try {
      const pendingRaw = localStorage.getItem("pending_order_data");
      if (pendingRaw) {
        const parsed = JSON.parse(pendingRaw);
        if (parsed.orderRef === refOrId || parsed.id === refOrId) {
          return parsed;
        }
      }
    } catch {}

    if (isAdminAuthenticated || currentUser?.email === "manopavana@gmail.com") {
      const adminMatch = adminOrders.find(
        (o) => o.id === refOrId || o.orderRef === refOrId || o.trackingNumber === refOrId
      );
      if (adminMatch) return adminMatch;
    }

    return undefined;
  };

  const getOrderAsync = async (refOrId: string): Promise<Order | undefined> => {
    const syncMatch = getOrder(refOrId);
    if (syncMatch) return syncMatch;

    try {
      const fromFirestore = await getOrderFromFirestore(refOrId);
      if (fromFirestore) {
        return fromFirestore;
      }
    } catch {}

    return undefined;
  };

  const updateOrderStatus = async (orderId: string, status: Order["orderStatus"]) => {
    const targetOrder = orders.find((o) => o.id === orderId) || adminOrders.find((o) => o.id === orderId);
    setOrders((prev) => {
      const updated = prev.map((ord) => (ord.id === orderId ? { ...ord, orderStatus: status } : ord));
      if (currentUser?.uid) {
        try {
          localStorage.setItem(`manopavana_orders_${currentUser.uid}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    setAdminOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, orderStatus: status } : ord))
    );

    if (targetOrder) {
      await updateFirestoreOrderStatus(targetOrder.orderRef, { orderStatus: status });
    }
    showToast(`Order status updated to "${status}"`);
  };

  const updateOrderDetails = async (orderRef: string, updates: Partial<Order>) => {
    setOrders((prev) => {
      const updated = prev.map((ord) => (ord.orderRef === orderRef ? { ...ord, ...updates } : ord));
      if (currentUser?.uid) {
        try {
          localStorage.setItem(`manopavana_orders_${currentUser.uid}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    setAdminOrders((prev) =>
      prev.map((ord) => (ord.orderRef === orderRef ? { ...ord, ...updates } : ord))
    );

    await updateFirestoreOrderStatus(orderRef, updates);
    showToast(`Order #${orderRef} updated successfully`);
  };

  const deleteOrder = async (orderRef: string) => {
    setOrders((prev) => {
      const updated = prev.filter((ord) => ord.orderRef !== orderRef && ord.id !== orderRef);
      if (currentUser?.uid) {
        try {
          localStorage.setItem(`manopavana_orders_${currentUser.uid}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    setAdminOrders((prev) =>
      prev.filter((ord) => ord.orderRef !== orderRef && ord.id !== orderRef)
    );

    showToast(`Order #${orderRef} removed from queue`);
  };

  const [paymentFailedOrder, setPaymentFailedOrder] = useState<Order | null>(null);
  const [orderSuccessRef, setOrderSuccessRef] = useState<string | null>(null);

  const loadOrderToCartAndRetry = (order: Order) => {
    if (order.items && order.items.length > 0) {
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
          localStorage.setItem("manopavana_active_cart", JSON.stringify(order.items));
        } catch {}
        if (currentUser?.uid) {
          setDoc(
            doc(db, "customers", currentUser.uid),
            { cart: order.items, updatedAt: serverTimestamp() },
            { merge: true }
          ).catch(() => {});
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
        const fromDb = await getOrderFromFirestore(orderRef);
        if (fromDb) target = fromDb;
      } catch {}
    }
    if (!target) {
      try {
        const pendingRaw = localStorage.getItem("pending_order_data");
        if (pendingRaw) target = JSON.parse(pendingRaw);
      } catch {}
    }

    let itemsToUse = target?.items && target.items.length > 0 ? [...target.items] : [];
    if (itemsToUse.length === 0) {
      if (buyNowItem) {
        itemsToUse = [buyNowItem];
      } else if (cart.length > 0) {
        itemsToUse = [...cart];
      }
    }

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

    // trackingNumber is typed as string | undefined; undefined avoids TypeScript null errors
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
      trackingNumber: target?.trackingNumber || undefined,
      courier: "Delhivery Express",
      customerUid: currentUser?.uid || target?.customerUid || undefined,
      customerPhone: (finalShippingAddress.phone || "").replace(/\D/g, "").slice(-10),
      customerEmail: finalShippingAddress.email || currentUser?.email || undefined,
      isBuyNow: isDirectBuy,
    };

    try {
      const guestRefs: string[] = JSON.parse(localStorage.getItem("manopavana_guest_order_ids") || "[]");
      if (!guestRefs.includes(orderRef)) {
        guestRefs.push(orderRef);
        localStorage.setItem("manopavana_guest_order_ids", JSON.stringify(guestRefs));
      }
    } catch {}

    setOrders((prev) => {
      const filtered = prev.filter((o) => o.orderRef !== orderRef);
      const nextList = [updated, ...filtered];
      try {
        localStorage.setItem("manopavana_orders", JSON.stringify(nextList));
      } catch {}
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
    } catch {}

    await updateFirestoreOrderStatus(orderRef, {
      orderStatus: "Failed (Expired)",
      paymentStatus: "FAILED",
    });
  };

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

  const [cmsConfig, setCmsConfig] = useState<StoreCMSConfig>(() => {
    try {
      const saved = localStorage.getItem("manopavana_cms");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          !parsed.brandLogoUrl ||
          parsed.brandLogoUrl === "/logo.svg" ||
          parsed.brandLogoUrl === MEDIA_ASSETS.logoOriginal ||
          (typeof parsed.brandLogoUrl === "string" && parsed.brandLogoUrl.includes("logo-clean"))
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
          } catch {}
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
      } catch {}
      saveStoreConfigToFirestore(next);
      return next;
    });
  };

  const products: Product[] = useMemo(() => {
    return PRODUCTS.map((p) => {
      // 1. Fetch overrides saved from the CMS panel
      const overrides = cmsConfig?.productDetails?.[p.id];

      // 2. Read live prices and stock
      let customPrices = { ...p.prices };
      let customStock = { ...p.inStock };

      if (p.id === "groundnut") {
        customPrices = {
          "1L": cmsConfig.prices?.groundnut1L ?? p.prices["1L"],
          "500ml": cmsConfig.prices?.groundnut500ml ?? p.prices["500ml"],
        };
        customStock = {
          "1L": cmsConfig.stock?.groundnut1L ?? p.inStock["1L"],
          "500ml": cmsConfig.stock?.groundnut500ml ?? p.inStock["500ml"],
        };
      } else if (p.id === "coconut") {
        customPrices = {
          "1L": cmsConfig.prices?.coconut1L ?? p.prices["1L"],
          "500ml": cmsConfig.prices?.coconut500ml ?? p.prices["500ml"],
        };
        customStock = {
          "1L": cmsConfig.stock?.coconut1L ?? p.inStock["1L"],
          "500ml": cmsConfig.stock?.coconut500ml ?? p.inStock["500ml"],
        };
      } else if (p.id === "sesame") {
        customPrices = {
          "1L": cmsConfig.prices?.sesame1L ?? p.prices["1L"],
          "500ml": cmsConfig.prices?.sesame500ml ?? p.prices["500ml"],
        };
        customStock = {
          "1L": cmsConfig.stock?.sesame1L ?? p.inStock["1L"],
          "500ml": cmsConfig.stock?.sesame500ml ?? p.inStock["500ml"],
        };
      }

      // 3. Return product merged with all deep CMS overrides
      return {
        ...p,
        name: overrides?.name || p.name,
        shortDescription: overrides?.description || overrides?.shortDescription || p.shortDescription,
        labelImage: overrides?.imageUrl || p.labelImage,
        images: overrides?.imageUrl ? [overrides.imageUrl, ...p.images.slice(1)] : p.images,
        smokePoint: overrides?.smokePoint || p.smokePoint,
        prices: customPrices,
        inStock: customStock,
        specs: {
          ...p.specs,
          extraction: overrides?.extractionMethod || p.specs.extraction,
          shelfLife: overrides?.shelfLife || p.specs.shelfLife,
          bestFor: overrides?.cookingUses || p.specs.bestFor,
        },
        features: {
          ...p.features,
          usage: overrides?.cookingUses || p.features.usage,
          process: overrides?.fullStory || p.features.process,
          quality: overrides?.ingredients || p.features.quality,
        },
      };
    });
  }, [cmsConfig]);

  const combos: ComboProduct[] = useMemo(() => {
    return COMBOS.map((c) => {
      const overrides = cmsConfig?.comboDetails?.[c.id];
      const parsedBullets = overrides?.bullets
        ? overrides.bullets.split(",").map((b: string) => b.trim()).filter(Boolean)
        : c.bullets;

      if (c.id === "combo-3l") {
        const reg = cmsConfig.prices?.combo3L ?? c.regularPrice;
        return {
          ...c,
          name: overrides?.name || c.name,
          heading: overrides?.heading || c.heading,
          description: overrides?.description || c.description,
          image: overrides?.image || c.image,
          bullets: parsedBullets.length > 0 ? parsedBullets : c.bullets,
          regularPrice: reg,
          loyaltyPrice: Math.round(reg * 0.9),
          inStock: cmsConfig.stock?.combo3L ?? c.inStock,
        };
      }
      if (c.id === "combo-1.5l") {
        const reg = cmsConfig.prices?.combo1_5L ?? c.regularPrice;
        return {
          ...c,
          name: overrides?.name || c.name,
          heading: overrides?.heading || c.heading,
          description: overrides?.description || c.description,
          image: overrides?.image || c.image,
          bullets: parsedBullets.length > 0 ? parsedBullets : c.bullets,
          regularPrice: reg,
          loyaltyPrice: Math.round(reg * 0.9),
          inStock: cmsConfig.stock?.combo1_5L ?? c.inStock,
        };
      }
      return c;
    });
  }, [cmsConfig]);

  const [activePolicyModal, setActivePolicyModal] = useState<
    "terms" | "shipping" | "returns" | "privacy" | null
  >(null);

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
    } catch {}
  };

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

  const clearCart = async () => {
    setCart([]);
    try {
      localStorage.removeItem("manopavana_cart");
      if (currentUser?.uid) {
        await setDoc(
          doc(db, "customers", currentUser.uid),
          { cart: [] },
          { merge: true }
        );
      }
    } catch (e) {
      console.warn("Notice clearing cart:", e);
    }
  };

  const addProductReview = async (reviewData: {
    productId: string;
    productName: string;
    rating: number;
    comment: string;
  }) => {
    if (!currentUser) {
      showToast("Please sign in to submit a review.");
      setLoginModalOpen(true);
      return false;
    }

    try {
      const newReview = {
        id: `rev_${Date.now()}`,
        name: currentUser.displayName || address.fullName || "Verified Buyer",
        locality: address.district || "Bengaluru",
        city: address.city || "Bengaluru",
        rating: reviewData.rating,
        comment: reviewData.comment.trim(),
        product: reviewData.productName,
        productId: reviewData.productId,
        date: new Date().toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        verified: true,
        customerUid: currentUser.uid,
      };

      await setDoc(doc(db, "reviews", newReview.id), newReview);
      setReviews((prev) => [newReview, ...prev]);
      showToast("Thank you! Your verified review has been published.");
      return true;
    } catch (err) {
      console.error("Error submitting review to Firestore:", err);
      showToast("Could not submit review. Please try again.");
      return false;
    }
  };

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
    return Math.min(99, Math.floor((discountedSubtotal / cmsConfig.freeShippingThreshold) * 100));
  }, [discountedSubtotal, cmsConfig.freeShippingThreshold]);

  const freeShippingShortfall = useMemo(() => {
    return Math.max(0, cmsConfig.freeShippingThreshold - discountedSubtotal);
  }, [discountedSubtotal, cmsConfig.freeShippingThreshold]);

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
        savedAddresses,
        selectSavedAddress,
        saveNewAddress,
        deleteSavedAddress,
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
        refreshAdminOrders,
        saveOrder,
        getOrder,
        getOrderAsync,
        updateOrderStatus,
        updateOrderDetails,
        deleteOrder,
        cancelOrderWithinWindow,
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
        isPreviewStorefront,
        togglePreviewStorefront,
        activePolicyModal,
        setActivePolicyModal,
        toastMessage,
        showToast,
        themeMode,
        setThemeMode,
        addProductReview,
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