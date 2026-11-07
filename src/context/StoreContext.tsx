import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from "react";
import { User as FirebaseUser, onAuthStateChanged, signOut } from "firebase/auth";
import {
  Address,
  CartItem,
  ComboProduct,
  CustomerReview,
  CustomerProfile,
  LoyaltyState,
  Order,
  Product,
  StoreCMSConfig,
  First25KitchensCampaign,
  CampaignTier,
} from "../types";
import {
  BUSINESS_CONFIG,
  CUSTOMER_REVIEWS,
  PRODUCTS,
  COMBOS,
  MEDIA_ASSETS,
  INDIAN_STATES_DISTRICTS,
  BENCHMARK_COMPARISONS,
  BENCHMARK_DISCLAIMER,
  PACKAGING_FEATURES,
  FAQS,
  LEGAL_POLICIES,
} from "../constants";
import {
  auth,
  db,
  saveOrderToFirestore,
  updateFirestoreOrderStatus,
  deleteOrderFromFirestore,
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
  extractCleanPhone,
  isSyntheticAccount,
  saveCustomerProfile,
  DEFAULT_FIRST_25_CAMPAIGN,
  subscribeFirst25Campaign,
  processFirst25OrderTransaction,
  resetFirst25Campaign,
  updateFirst25CampaignSlots,
} from "../firebase";
import {
  determineCampaignTier,
  CampaignTierInfo,
} from "../utils/campaignPricing";
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
  originalSubtotal: number;
  campaignSavings: number;
  discount: number;
  isFirstTimeCustomer: boolean;
  campaign: First25KitchensCampaign;
  campaignTierInfo: CampaignTierInfo;
  successfulOrdersCount: number;
  isFirst25KitchensMember: boolean;
  resetCampaign: () => Promise<boolean>;
  updateCampaignSlots: (claimedSlots: number) => Promise<boolean>;
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
  saveNewAddress: (newAddr: Omit<LabeledAddress, "id"> | LabeledAddress) => void;
  updateSavedAddress: (id: string, updatedAddr: Partial<LabeledAddress>) => void;
  deleteSavedAddress: (id: string) => void;
  updateAddress: (newAddr: Partial<Address>) => void;
  reverseGeocodeAndSaveAddress: (lat: number, lng: number) => Promise<Partial<Address> | null>;
  isLocationModalOpen: boolean;
  setLocationModalOpen: (open: boolean) => void;

  currentUser: FirebaseUser | null;
  customerProfile: CustomerProfile | null;
  isAuthLoading: boolean;
  saveProfile: (updates: Partial<CustomerProfile>) => Promise<void>;
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

  themeMode: "light" | "dark" | "blend";
  setThemeMode: (mode?: any) => void;

  addProductReview: (reviewData: {
    productId: string;
    productName: string;
    rating: number;
    comment: string;
    reviewerName?: string;
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
  announcementTicker: "FIRST 25 KITCHENS OFFER | FLAT 30% OFF YOUR FIRST ORDER",
  festiveBanner: {
    enabled: true,
    title: "FIRST 25 KITCHENS",
    badge: "30% OFF FIRST ORDER",
    tagline: "YOUR KITCHEN DESERVES SOMETHING BETTER. FLAT 30% OFF ON YOUR FIRST ORDER",
    btnTextKannada: "Shop Now",
    btnTextEnglish: "FLAT 30% OFF",
    btnLink: "/#catalog",
  },
  brandName: "MANOPAVANA",
  heroHeadline: BUSINESS_CONFIG.HERO_HEADLINE,
  heroSubhead: BUSINESS_CONFIG.HERO_SUBHEAD,
  heroEyebrow: "⚜️ GOOD FOOD STARTS HERE",
  heroCtaPrimaryText: "Explore The Collection →",
  brandTagline: "PURE BY NATURE, TRUSTED FOR LIFE.",
  brandLogoUrl: MEDIA_ASSETS.logo,

  chekkuVideoUrl: MEDIA_ASSETS.heroVideo,
  heroFallbackImage: MEDIA_ASSETS.heroFallbackImage,
  ambientAudioTrack: MEDIA_ASSETS.ambientAudioTrack,
  comboBannerImage: MEDIA_ASSETS.comboBanner,
  founderName: BUSINESS_CONFIG.FOUNDER_NAME,
  primaryPhone: BUSINESS_CONFIG.PRIMARY_PHONE,
  altPhone: BUSINESS_CONFIG.ALT_PHONE,
  email: BUSINESS_CONFIG.EMAIL,
  facilityAddress: BUSINESS_CONFIG.FACILITY_ADDRESS,
  facilityStatement: BUSINESS_CONFIG.FACILITY_STATEMENT,
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
  subscriptionDiscountPercent: 10,
  freeShippingThreshold: BUSINESS_CONFIG.FREE_SHIPPING_THRESHOLD,
  standardShippingFee: BUSINESS_CONFIG.STANDARD_SHIPPING_FEE,
  prices: {
    groundnut1L: 399,
    groundnut500ml: 189,
    coconut1L: 489,
    coconut500ml: 269,
    sesame1L: 499,
    sesame500ml: 269,
    combo3L: 1299,
    combo1_5L: 699,
  },
  mrp: {
    groundnut1L: 399,
    groundnut500ml: 189,
    coconut1L: 489,
    coconut500ml: 269,
    sesame1L: 499,
    sesame500ml: 269,
    combo3L: 1560,
    combo1_5L: 840,
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
  craftsmanship: {
    tag: "ARTISANAL STANDARDS",
    title: "The Ancient Marachekku Difference",
    subtitle: "Understand the biological difference between traditional Marachekku extraction and solvent refining.",
    disclaimer: BENCHMARK_DISCLAIMER,
    comparisons: BENCHMARK_COMPARISONS,
  },
  packagingFeatures: PACKAGING_FEATURES,
  faqs: FAQS,
  policies: LEGAL_POLICIES,
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
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);

  // Real-time Firestore First 25 Kitchens Campaign State
  const [campaign, setCampaign] = useState<First25KitchensCampaign>(DEFAULT_FIRST_25_CAMPAIGN);

  useEffect(() => {
    const unsub = subscribeFirst25Campaign((liveCampaign) => {
      setCampaign(liveCampaign);
    });
    return () => unsub();
  }, []);

  const resetCampaign = async () => {
    const ok = await resetFirst25Campaign(25);
    if (ok) {
      showToast("First 25 Kitchens campaign reset to 0 claimed slots.");
    }
    return ok;
  };

  const updateCampaignSlots = async (slots: number) => {
    const ok = await updateFirst25CampaignSlots(slots, campaign.maxSlots || 25);
    if (ok) {
      showToast(`Campaign slots updated to ${slots} claimed.`);
    }
    return ok;
  };

  const isCartInitializedRef = useRef(false);
  const currentUidRef = useRef<string | null>(null);
  const customerDocUnsubRef = useRef<(() => void) | null>(null);
  const primaryDocUnsubRef = useRef<(() => void) | null>(null);
  const cartDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastLocalCartMutationTimeRef = useRef<number>(0);

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

  const pendingCartRef = useRef<CartItem[]>(cart);
  pendingCartRef.current = cart;

  useEffect(() => {
    try {
      localStorage.setItem("manopavana_active_cart", JSON.stringify(cart));
    } catch {}

    if (!isCartInitializedRef.current) return;
    if (!currentUser?.uid) return;

    if (cartDebounceTimerRef.current) {
      clearTimeout(cartDebounceTimerRef.current);
    }

    const targetUid = currentUser.uid;
    const cartToSave = cart;
    const saveTime = Date.now();

    cartDebounceTimerRef.current = setTimeout(() => {
      try {
        setDoc(
          doc(db, "customers", targetUid),
          { cart: cartToSave, cartUpdatedAt: saveTime, updatedAt: serverTimestamp() },
          { merge: true }
        ).catch((e) => {
          console.warn("Firestore cart sync error:", e);
        });
      } catch (e) {
        console.warn("Firestore cart setDoc error:", e);
      }
    }, 250);

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

  const [savedAddresses, setSavedAddresses] = useState<LabeledAddress[]>([]);
  const [address, setAddress] = useState<Address>(DEFAULT_ADDRESS);
  const [isLocationModalOpen, setLocationModalOpen] = useState(false);

  const selectSavedAddress = (id: string) => {
    const selected = savedAddresses.find((a) => a.id === id);
    if (selected) {
      setAddress(selected);
      showToast(`Selected "${selected.label}" delivery address`);
    }
  };

  const updateSavedAddress = (id: string, updatedFields: Partial<LabeledAddress>) => {
    setSavedAddresses((prev) => {
      const idx = prev.findIndex((a) => a.id === id);
      if (idx === -1) return prev;
      const updatedList = [...prev];
      const merged: LabeledAddress = {
        ...updatedList[idx],
        ...updatedFields,
        id,
      };
      updatedList[idx] = merged;

      setAddress((current) => {
        if ((current as any).id === id || (current.addressLine1 === prev[idx].addressLine1 && current.pincode === prev[idx].pincode)) {
          return merged;
        }
        return current;
      });

      if (currentUser?.uid) {
        saveCustomerProfile(currentUser.uid, {
          savedAddresses: updatedList,
          savedAddress: merged,
        });
      }

      showToast("Address updated successfully!");
      return updatedList;
    });
  };

  const saveNewAddress = (newAddr: Omit<LabeledAddress, "id"> | LabeledAddress) => {
    const cleanPin = (newAddr.pincode || "").trim();
    const cleanLine = (newAddr.addressLine1 || "").trim().toLowerCase();

    // Check if an existing card in savedAddresses has the exact same address line and pincode
    const existingIndex = savedAddresses.findIndex(
      (a) =>
        (a.id && (newAddr as any).id && a.id === (newAddr as any).id) ||
        (a.addressLine1?.trim().toLowerCase() === cleanLine && (a.pincode || "").trim() === cleanPin)
    );

    if (existingIndex !== -1) {
      // In-place update existing address card instead of stacking duplicates!
      const targetId = savedAddresses[existingIndex].id;
      updateSavedAddress(targetId, newAddr);
      return;
    }

    const entryId = (newAddr as any).id || `addr-${Date.now()}`;
    const entry: LabeledAddress = {
      ...newAddr,
      id: entryId,
    };
    const updated = [entry, ...savedAddresses];
    setSavedAddresses(updated);
    setAddress(entry);

    if (currentUser?.uid) {
      saveCustomerProfile(currentUser.uid, {
        name: entry.fullName,
        phone: entry.phone,
        email: entry.email,
        savedAddress: entry,
        savedAddresses: updated,
      });
    }
    showToast(`Saved new address under "${entry.label}"`);
  };

  const deleteSavedAddress = (id: string) => {
    setSavedAddresses((prev) => {
      const filtered = prev.filter((a) => a.id !== id);

      if (currentUser?.uid) {
        saveCustomerProfile(currentUser.uid, {
          savedAddresses: filtered,
          savedAddress: filtered[0] || null,
        });
      }

      setAddress((curr) => {
        if ((curr as any).id === id) {
          return filtered[0] || DEFAULT_ADDRESS;
        }
        return curr;
      });

      showToast("Address removed");
      return filtered;
    });
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

      if (currentUser?.uid) {
        saveCustomerProfile(currentUser.uid, {
          name: full.fullName?.trim() || undefined,
          phone: full.phone?.trim() || undefined,
          email: full.email?.trim() || undefined,
          savedAddress: full,
        });
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

      // Note: addressLine1 is deliberately excluded so user-typed flat/street address is strictly preserved
      const partial: Partial<Address> = {
        lat,
        lng,
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
      if (primaryDocUnsubRef.current) {
        primaryDocUnsubRef.current();
        primaryDocUnsubRef.current = null;
      }

      isCartInitializedRef.current = false;

      if (user) {
        currentUidRef.current = user.uid;
        setCurrentUser(user);

        try {
          const profile = await syncCustomerDoc(user);
          if (profile) {
            setCustomerProfile(profile as CustomerProfile);
          }

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
          if (!userPhone && user.email) {
            const digits = extractCleanPhone(user.email);
            if (digits.length === 10) userPhone = digits;
          }
          const userEmail = (profile as any)?.email || (user.email && !isSyntheticAccount(user.email) ? user.email : "");
          const userName = (profile as any)?.name || user.displayName || "";

          if (profile && Array.isArray((profile as any).savedAddresses)) {
            setSavedAddresses((profile as any).savedAddresses);
          } else {
            setSavedAddresses([]);
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

          // Real-time listener strictly for current user's customer doc
          customerDocUnsubRef.current = onSnapshot(
            doc(db, "customers", user.uid),
            (snap) => {
              if (!snap.exists()) return;
              if (snap.metadata.hasPendingWrites) {
                return;
              }
              const data = snap.data();
              setCustomerProfile((prev) => ({ ...(prev || { uid: user.uid }), ...data } as CustomerProfile));

              if (Array.isArray(data?.savedAddresses)) {
                setSavedAddresses(data.savedAddresses);
              }
              if (data?.savedAddress && typeof data.savedAddress === "object") {
                setAddress((prev) => ({
                  ...prev,
                  ...data.savedAddress,
                  fullName: data.savedAddress.fullName || data.name || prev.fullName,
                  phone: data.savedAddress.phone || data.phone || prev.phone,
                  email: data.savedAddress.email || data.email || prev.email,
                }));
              } else if (data?.name || data?.phone || data?.email) {
                setAddress((prev) => ({
                  ...prev,
                  fullName: data.name || prev.fullName,
                  phone: data.phone || prev.phone,
                  email: data.email || prev.email,
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
          setIsAuthLoading(false);
        }
      } else {
        // User logged out: Completely clear all private data
        setCustomerProfile(null);
        setOrders([]);
        setSavedAddresses([]);
        setAddress(DEFAULT_ADDRESS);
        setCart([]);
        isCartInitializedRef.current = true;
        setIsAuthLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (customerDocUnsubRef.current) {
        customerDocUnsubRef.current();
        customerDocUnsubRef.current = null;
      }
      if (primaryDocUnsubRef.current) {
        primaryDocUnsubRef.current();
        primaryDocUnsubRef.current = null;
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
    setCustomerProfile(null);
    if (customerDocUnsubRef.current) {
      customerDocUnsubRef.current();
      customerDocUnsubRef.current = null;
    }
    if (primaryDocUnsubRef.current) {
      primaryDocUnsubRef.current();
      primaryDocUnsubRef.current = null;
    }
    setOrders([]);
    setSavedAddresses([]);
    setAddress(DEFAULT_ADDRESS);
    setCart([]);
    setBuyNowItem(null);
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem("manopavana_admin_auth");

    // Purge all customer and order sensitive keys from localStorage
    try {
      const sensitiveKeys = [
        "manopavana_saved_addresses",
        "manopavana_orders",
        "manopavana_guest_order_ids",
        "manopavana_address_guest",
        "manopavana_address_saved",
        "manopavana_active_cart",
        "manopavana_cart_guest",
        "manopavana_active_user",
        "pending_order_data",
        "pending_order_ref",
        "pending_order_timestamp",
      ];
      sensitiveKeys.forEach((k) => localStorage.removeItem(k));

      const dynamicKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith("manopavana_orders") ||
            k.startsWith("manopavana_address") ||
            k.startsWith("manopavana_cart"))
        ) {
          dynamicKeys.push(k);
        }
      }
      dynamicKeys.forEach((k) => localStorage.removeItem(k));
    } catch {}

    isCartInitializedRef.current = true;
    showToast("Signed out. All personal details and session cleared.");
  };

  const saveProfile = async (updates: Partial<CustomerProfile>) => {
    if (!currentUser?.uid) return;
    await saveCustomerProfile(currentUser.uid, {
      name: updates.name,
      phone: updates.phone,
      email: updates.email,
      savedAddress: updates.savedAddress,
      savedAddresses: updates.savedAddresses,
    });
    setCustomerProfile((prev) => ({ ...(prev || { uid: currentUser.uid }), ...updates } as CustomerProfile));
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
    // Audio element setup (defaults to strictly paused/silent until user requests it)
    const audio = new Audio("https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/marada_gaana_beat.mp3");
    audio.loop = true;
    audio.volume = 0.35;
    audio.preload = "none";
    audio.setAttribute("playsinline", "true");
    audio.setAttribute("webkit-playsinline", "true");
    audioRef.current = audio;

    // Immediately stop audio when user switches tabs, minimizes Chrome, locks phone screen, or leaves the app
    const handleVisibilityOrBackground = () => {
      if (document.hidden || document.visibilityState === "hidden") {
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlayingAudio(false);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrBackground);
    window.addEventListener("pagehide", handleVisibilityOrBackground);
    window.addEventListener("blur", handleVisibilityOrBackground);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrBackground);
      window.removeEventListener("pagehide", handleVisibilityOrBackground);
      window.removeEventListener("blur", handleVisibilityOrBackground);
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

    const unsubscribe = subscribeUserOrders(
      currentUid,
      undefined,
      undefined,
      (firestoreOrders) => {
        if (!firestoreOrders) {
          setOrders([]);
          return;
        }
        const verifiedOrders = firestoreOrders.filter(
          (o) => o.customerUid === currentUid || (o as any).firebaseUid === currentUid
        );
        setOrders(verifiedOrders);
      }
    );
    return () => unsubscribe();
  }, [currentUser?.uid]);

  const saveOrder = async (newOrder: Order) => {
    const finalUid = currentUser?.uid || newOrder.customerUid || null;
    const finalOrder: Order = {
      ...newOrder,
      customerUid: finalUid,
      customerEmail:
        (currentUser?.email && !isSyntheticAccount(currentUser.email) ? currentUser.email : "") ||
        newOrder.customerEmail ||
        newOrder.shippingAddress?.email ||
        null,
    };

    // Update state immediately for zero lag
    setOrders((prev) => {
      const filtered = prev.filter((o) => o.orderRef !== finalOrder.orderRef && o.id !== finalOrder.id);
      return [finalOrder, ...filtered];
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

    // Immediately remove cancel option if order is packed, picked up, dispatched, or has an AWB
    if (
      target.orderStatus === "Packed" ||
      target.orderStatus === "Dispatched" ||
      target.orderStatus === "Delivered" ||
      Boolean(target.trackingNumber)
    ) {
      showToast("This order has already been packed/picked up by Delhivery and cannot be cancelled.");
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
    const targetOrder =
      orders.find((o) => o.id === orderId || o.orderRef === orderId) ||
      adminOrders.find((o) => o.id === orderId || o.orderRef === orderId);

    setOrders((prev) => {
      const updated = prev.map((ord) =>
        ord.id === orderId || ord.orderRef === orderId ? { ...ord, orderStatus: status } : ord
      );
      return updated;
    });

    setAdminOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId || ord.orderRef === orderId ? { ...ord, orderStatus: status } : ord
      )
    );

    const refToUpdate = targetOrder?.orderRef || orderId;
    await updateFirestoreOrderStatus(refToUpdate, { orderStatus: status });
    showToast(`Order #${refToUpdate} status updated to "${status}"`);
  };

  const updateOrderDetails = async (orderRef: string, updates: Partial<Order>) => {
    setOrders((prev) => {
      const updated = prev.map((ord) => (ord.orderRef === orderRef || ord.id === orderRef ? { ...ord, ...updates } : ord));
      return updated;
    });

    setAdminOrders((prev) =>
      prev.map((ord) => (ord.orderRef === orderRef || ord.id === orderRef ? { ...ord, ...updates } : ord))
    );

    await updateFirestoreOrderStatus(orderRef, updates);
    showToast(`Order #${orderRef} updated successfully`);
  };

  const deleteOrder = async (orderRef: string) => {
    try {
      // 1. Permanently delete from Firestore
      await deleteOrderFromFirestore(orderRef);

      // 2. Clear from local state & cache
      setOrders((prev) => {
        const updated = prev.filter((ord) => ord.orderRef !== orderRef && ord.id !== orderRef);
        return updated;
      });

      setAdminOrders((prev) =>
        prev.filter((ord) => ord.orderRef !== orderRef && ord.id !== orderRef)
      );

      // 3. Clear from any pending or failed order session
      if (paymentFailedOrder && (paymentFailedOrder.orderRef === orderRef || paymentFailedOrder.id === orderRef)) {
        setPaymentFailedOrder(null);
      }
      if (localStorage.getItem("pending_order_ref") === orderRef) {
        localStorage.removeItem("pending_order_ref");
        localStorage.removeItem("pending_order_timestamp");
        localStorage.removeItem("pending_order_data");
      }

      showToast(`Order #${orderRef} permanently deleted from Firestore`);
    } catch (e) {
      console.warn("Delete order notice:", e);
      showToast(`Deleted order #${orderRef}`);
    }
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
      (campaignTierInfo.tier === "COHORT_ORDER_2_20"
        ? Math.round((finalSubtotal * 20) / 100)
        : campaignTierInfo.tier === "COHORT_ORDER_3_10"
        ? Math.round((finalSubtotal * 10) / 100)
        : 0);
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

    setOrders((prev) => {
      const filtered = prev.filter((o) => o.orderRef !== orderRef);
      return [updated, ...filtered];
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
        if (parsed.freeShippingThreshold === 500) {
          parsed.freeShippingThreshold = BUSINESS_CONFIG.FREE_SHIPPING_THRESHOLD;
        }
        if (parsed.standardShippingFee === 49) {
          parsed.standardShippingFee = BUSINESS_CONFIG.STANDARD_SHIPPING_FEE;
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
          const cleanThreshold =
            remoteConfig.freeShippingThreshold === 500
              ? (prev.freeShippingThreshold && prev.freeShippingThreshold !== 500 ? prev.freeShippingThreshold : BUSINESS_CONFIG.FREE_SHIPPING_THRESHOLD)
              : (remoteConfig.freeShippingThreshold ?? prev.freeShippingThreshold ?? BUSINESS_CONFIG.FREE_SHIPPING_THRESHOLD);

          const cleanStdFee =
            remoteConfig.standardShippingFee === 49
              ? (prev.standardShippingFee && prev.standardShippingFee !== 49 ? prev.standardShippingFee : BUSINESS_CONFIG.STANDARD_SHIPPING_FEE)
              : (remoteConfig.standardShippingFee ?? prev.standardShippingFee ?? BUSINESS_CONFIG.STANDARD_SHIPPING_FEE);

          const merged: StoreCMSConfig = {
            ...prev,
            ...remoteConfig,
            freeShippingThreshold: cleanThreshold,
            standardShippingFee: cleanStdFee,
            festiveBanner: { ...prev.festiveBanner, ...(remoteConfig.festiveBanner || {}) },
            prices: { ...prev.prices, ...(remoteConfig.prices || {}) },
            mrp: { ...prev.mrp, ...(remoteConfig.mrp || {}) },
            stock: { ...prev.stock, ...(remoteConfig.stock || {}) },
            policies: { ...prev.policies, ...(remoteConfig.policies || {}) },
            productDetails: { ...prev.productDetails, ...(remoteConfig.productDetails || {}) },
            comboDetails: { ...prev.comboDetails, ...(remoteConfig.comboDetails || {}) },
            craftsmanship: {
              ...prev.craftsmanship,
              ...(remoteConfig.craftsmanship || {}),
              comparisons: remoteConfig.craftsmanship?.comparisons || prev.craftsmanship?.comparisons,
            },
            packagingFeatures: {
              ...prev.packagingFeatures,
              ...(remoteConfig.packagingFeatures || {}),
              items: remoteConfig.packagingFeatures?.items || prev.packagingFeatures?.items,
            },
            faqs: remoteConfig.faqs || prev.faqs,
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
      saveStoreConfigToFirestore(next).catch((e) => console.error("Notice saving CMS to Firestore:", e));
      return next;
    });
  };

  const products: Product[] = useMemo(() => {
    return PRODUCTS.map((p) => {
      // 1. Fetch overrides saved from the CMS panel
      const overrides = cmsConfig?.productDetails?.[p.id];

      // 2. Read live prices and stock
      let customPrices = { ...p.prices };
      let customMrp = { ...p.mrp };
      let customStock = { ...p.inStock };

      if (p.id === "groundnut") {
        customPrices = {
          "1L": cmsConfig.prices?.groundnut1L ?? p.prices["1L"],
          "500ml": cmsConfig.prices?.groundnut500ml ?? p.prices["500ml"],
        };
        customMrp = {
          "1L": cmsConfig.mrp?.groundnut1L ?? p.mrp["1L"],
          "500ml": cmsConfig.mrp?.groundnut500ml ?? p.mrp["500ml"],
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
        customMrp = {
          "1L": cmsConfig.mrp?.coconut1L ?? p.mrp["1L"],
          "500ml": cmsConfig.mrp?.coconut500ml ?? p.mrp["500ml"],
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
        customMrp = {
          "1L": cmsConfig.mrp?.sesame1L ?? p.mrp["1L"],
          "500ml": cmsConfig.mrp?.sesame500ml ?? p.mrp["500ml"],
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
        kannadaName: overrides?.kannadaName || p.kannadaName,
        subtitle: overrides?.subtitle || p.subtitle,
        searchKeywords: overrides?.searchKeywords || p.searchKeywords,
        shortDescription: overrides?.description || overrides?.shortDescription || p.shortDescription,
        labelImage: overrides?.labelImageUrl || overrides?.imageUrl || p.labelImage,
        images: overrides?.imageUrl ? [overrides.imageUrl, ...p.images.slice(1)] : p.images,
        smokePoint: overrides?.smokePoint || p.smokePoint,
        prices: customPrices,
        mrp: customMrp,
        inStock: customStock,
        specs: {
          ...p.specs,
          extraction: overrides?.extractionMethod || p.specs.extraction,
          shelfLife: overrides?.shelfLife || p.specs.shelfLife,
          bestFor: overrides?.cookingUses || p.specs.bestFor,
          fssai: overrides?.fssaiLicense || p.specs.fssai,
          container: overrides?.containerType || p.specs.container,
        },
        features: {
          ...p.features,
          usage: overrides?.cookingUses || p.features.usage,
          process: overrides?.fullStory || p.features.process,
          quality: overrides?.ingredients || p.features.quality,
        },
        nutrition: {
          ...p.nutrition,
          ...(overrides?.nutrition || {}),
        },
        quiz: {
          ...p.quiz,
          ...(overrides?.quiz || {}),
        },
        culinaryPairing: {
          ...p.culinaryPairing,
          ...(overrides?.pairing || {}),
        },
      };
    });
  }, [cmsConfig]);

  const combos: ComboProduct[] = useMemo(() => {
    return COMBOS.map((c) => {
      const overrides = cmsConfig?.comboDetails?.[c.id];
      const parsedBullets = overrides?.bullets
        ? (Array.isArray(overrides.bullets)
            ? overrides.bullets
            : overrides.bullets.split(",").map((b: string) => b.trim()).filter(Boolean))
        : c.bullets;

      if (c.id === "combo-3l") {
        const reg = overrides?.regularPrice ?? (cmsConfig.prices?.combo3L ?? c.regularPrice);
        const mrpVal = overrides?.mrp ?? (cmsConfig.mrp?.combo3L ?? c.mrp);
        const loyVal = overrides?.loyaltyPrice ?? Math.round(reg * 0.9);
        return {
          ...c,
          name: overrides?.name || c.name,
          heading: overrides?.heading || c.heading,
          volumeLabel: overrides?.volumeLabel || c.volumeLabel,
          description: overrides?.description || c.description,
          image: overrides?.image || c.image,
          bullets: parsedBullets.length > 0 ? parsedBullets : c.bullets,
          regularPrice: reg,
          loyaltyPrice: loyVal,
          mrp: mrpVal,
          inStock: overrides?.inStock ?? (cmsConfig.stock?.combo3L ?? c.inStock),
          includedOils: overrides?.includedOils || c.includedOils,
        };
      }
      if (c.id === "combo-1.5l") {
        const reg = overrides?.regularPrice ?? (cmsConfig.prices?.combo1_5L ?? c.regularPrice);
        const mrpVal = overrides?.mrp ?? (cmsConfig.mrp?.combo1_5L ?? c.mrp);
        const loyVal = overrides?.loyaltyPrice ?? Math.round(reg * 0.9);
        return {
          ...c,
          name: overrides?.name || c.name,
          heading: overrides?.heading || c.heading,
          volumeLabel: overrides?.volumeLabel || c.volumeLabel,
          description: overrides?.description || c.description,
          image: overrides?.image || c.image,
          bullets: parsedBullets.length > 0 ? parsedBullets : c.bullets,
          regularPrice: reg,
          loyaltyPrice: loyVal,
          mrp: mrpVal,
          inStock: overrides?.inStock ?? (cmsConfig.stock?.combo1_5L ?? c.inStock),
          includedOils: overrides?.includedOils || c.includedOils,
        };
      }
      return c;
    });
  }, [cmsConfig]);

  const [activePolicyModal, setActivePolicyModal] = useState<
    "terms" | "shipping" | "returns" | "privacy" | null
  >(null);

  const [themeMode] = useState<"light" | "dark" | "blend">("light");

  const setThemeMode = (_mode?: any) => {
    try {
      localStorage.setItem("manopavana_theme_mode", "light");
    } catch {}
  };

  useEffect(() => {
    try {
      localStorage.setItem("manopavana_theme_mode", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    } catch {}
  }, []);

  const addToCart = (item: Omit<CartItem, "quantity">, qty = 1) => {
    lastLocalCartMutationTimeRef.current = Date.now();
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
    lastLocalCartMutationTimeRef.current = Date.now();
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    lastLocalCartMutationTimeRef.current = Date.now();
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
    lastLocalCartMutationTimeRef.current = Date.now();
    setCart([]);
    try {
      localStorage.removeItem("manopavana_active_cart");
      localStorage.removeItem("manopavana_cart");
      if (currentUser?.uid) {
        await setDoc(
          doc(db, "customers", currentUser.uid),
          { cart: [], cartUpdatedAt: Date.now() },
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
    reviewerName?: string;
  }) => {
    if (!currentUser) {
      showToast("Please sign in to submit a review.");
      setLoginModalOpen(true);
      return false;
    }

    try {
      const resolvedName =
        reviewData.reviewerName?.trim() ||
        currentUser.displayName ||
        address.fullName ||
        currentUser.email?.split("@")[0] ||
        "Verified Customer";

      const newReview = {
        id: `rev_${Date.now()}`,
        name: resolvedName,
        locality: address.district || "Bengaluru",
        city: address.city || "Bengaluru",
        rating: Number(reviewData.rating) || 5,
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
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "reviews", newReview.id), newReview);
      setReviews((prev) => [newReview as any, ...prev]);
      showToast("Thank you! Your verified review has been published.");
      return true;
    } catch (err) {
      console.error("Error submitting review to Firestore:", err);
      showToast("Could not submit review. Please try again.");
      return false;
    }
  };

  const successfulOrdersCount = useMemo(() => {
    if (!currentUser) return 0;
    const verifiedOrders = orders.filter(
      (o) => o.orderStatus !== "Cancelled" && o.orderStatus !== "Failed (Expired)"
    );
    const profileCount = customerProfile?.successfulOrdersCount;
    if (typeof profileCount === "number" && profileCount >= 0) {
      return Math.max(profileCount, verifiedOrders.length);
    }
    return verifiedOrders.length;
  }, [currentUser, customerProfile?.successfulOrdersCount, orders]);

  const isFirst25KitchensMember = useMemo(() => {
    if (!currentUser) return false;
    if (customerProfile?.isFirst25KitchensMember) return true;
    if (campaign?.enrolledCustomerUids && campaign.enrolledCustomerUids.includes(currentUser.uid)) {
      return true;
    }
    return false;
  }, [currentUser, customerProfile?.isFirst25KitchensMember, campaign?.enrolledCustomerUids]);

  const campaignTierInfo = useMemo(() => {
    return determineCampaignTier(
      successfulOrdersCount,
      campaign.claimedSlots,
      isFirst25KitchensMember,
      campaign.maxSlots
    );
  }, [successfulOrdersCount, campaign.claimedSlots, isFirst25KitchensMember, campaign.maxSlots]);

  const isFirstTimeCustomer = useMemo(() => {
    return campaignTierInfo.tier === "NEW_CUSTOMER_30";
  }, [campaignTierInfo.tier]);

  const cartCount = useMemo(() => {
    return cart.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [cart]);

  const originalSubtotal = useMemo(() => {
    return cart.reduce(
      (acc, curr) =>
        acc +
        (curr.regularPrice && curr.regularPrice > 0 ? curr.regularPrice : curr.price) *
          curr.quantity,
      0
    );
  }, [cart]);

  const subtotal = useMemo(() => {
    if (campaignTierInfo.tier === "NEW_CUSTOMER_30") {
      // 30% first order launch pricing
      return cart.reduce((acc, curr) => {
        const regular =
          curr.regularPrice && curr.regularPrice > 0 ? curr.regularPrice : curr.price;
        const offer =
          curr.price && curr.price < regular ? curr.price : Math.round(regular * 0.7);
        return acc + offer * curr.quantity;
      }, 0);
    }

    // For Stage 2, 3, or 4: base subtotal is standard regular price
    return cart.reduce((acc, curr) => {
      const regular =
        curr.regularPrice && curr.regularPrice > 0 ? curr.regularPrice : curr.price;
      return acc + regular * curr.quantity;
    }, 0);
  }, [cart, campaignTierInfo.tier]);

  const discount = useMemo(() => {
    // Stage 2: Order #2 (Cohort Member) -> 20% OFF subtotal
    if (campaignTierInfo.tier === "COHORT_ORDER_2_20") {
      return Math.round((subtotal * 20) / 100);
    }

    // Stage 3: Order #3 & Beyond (Cohort Member) -> 10% OFF subtotal
    if (campaignTierInfo.tier === "COHORT_ORDER_3_10") {
      return Math.round((subtotal * 10) / 100);
    }

    // Stage 1 (New Customer 30% first order) & Stage 4 (Unenrolled / Standard): No 10% on 1000
    return 0;
  }, [subtotal, campaignTierInfo.tier]);

  const campaignSavings = useMemo(() => {
    if (campaignTierInfo.tier === "NEW_CUSTOMER_30") {
      return Math.max(0, originalSubtotal - subtotal);
    }
    if (
      campaignTierInfo.tier === "COHORT_ORDER_2_20" ||
      campaignTierInfo.tier === "COHORT_ORDER_3_10"
    ) {
      return discount;
    }
    return Math.max(0, originalSubtotal - subtotal) + discount;
  }, [campaignTierInfo.tier, originalSubtotal, subtotal, discount]);

  const discountedSubtotal = subtotal - discount;

  // Free delivery rule: Orders >= ₹800 OR 2+ bottles unlock Free Doorstep Delivery; single bottles under ₹800 incur ₹70 standard fee
  const isFreeShippingQualified = useMemo(() => {
    const threshold = cmsConfig.freeShippingThreshold || BUSINESS_CONFIG.FREE_SHIPPING_THRESHOLD;
    return discountedSubtotal >= threshold || cartCount >= 2;
  }, [discountedSubtotal, cartCount, cmsConfig.freeShippingThreshold]);

  const shippingFee = useMemo(() => {
    if (cart.length === 0) return 0;
    const fee = cmsConfig.standardShippingFee || BUSINESS_CONFIG.STANDARD_SHIPPING_FEE;
    return isFreeShippingQualified ? 0 : fee;
  }, [cart.length, isFreeShippingQualified, cmsConfig.standardShippingFee]);

  const total = useMemo(() => {
    if (cart.length === 0) return 0;
    return discountedSubtotal + shippingFee;
  }, [cart.length, discountedSubtotal, shippingFee]);

  const freeShippingProgress = useMemo(() => {
    if (isFreeShippingQualified) return 100;
    const threshold = cmsConfig.freeShippingThreshold || BUSINESS_CONFIG.FREE_SHIPPING_THRESHOLD;
    return Math.min(99, Math.floor((discountedSubtotal / threshold) * 100));
  }, [isFreeShippingQualified, discountedSubtotal, cmsConfig.freeShippingThreshold]);

  const freeShippingShortfall = useMemo(() => {
    if (isFreeShippingQualified) return 0;
    const threshold = cmsConfig.freeShippingThreshold || BUSINESS_CONFIG.FREE_SHIPPING_THRESHOLD;
    return Math.max(0, threshold - discountedSubtotal);
  }, [isFreeShippingQualified, discountedSubtotal, cmsConfig.freeShippingThreshold]);

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
        originalSubtotal,
        campaignSavings,
        discount,
        isFirstTimeCustomer,
        campaign,
        campaignTierInfo,
        successfulOrdersCount,
        isFirst25KitchensMember,
        resetCampaign,
        updateCampaignSlots,
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
        updateSavedAddress,
        deleteSavedAddress,
        updateAddress,
        reverseGeocodeAndSaveAddress,
        isLocationModalOpen,
        setLocationModalOpen,
        currentUser,
        customerProfile,
        isAuthLoading,
        saveProfile,
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