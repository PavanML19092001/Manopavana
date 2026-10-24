export type BottleVolume = "1L" | "500ml";

export interface ProductFeatures {
  aroma: string;
  texture?: string;
  cooking?: string;
  extraction?: string;
  usage?: string;
  process?: string;
  quality?: string;
}

export interface ProductSpecs {
  extraction: string;
  processing: string;
  fssai: string;
  facility: string;
  container: string;
  bestFor: string;
  shelfLife: string;
  standards: string;
}

export interface ProductNutrition {
  energy: string;
  carbohydrates: string;
  totalFat: string;
  saturatedFat: string;
  monoUnsaturatedFat: string;
  polyUnsaturatedFat: string;
  transFat: string;
  cholesterol: string;
  protein: string;
  totalSugar: string;
  dietaryFiber: string;
  moisture: string;
  totalAsh: string;
}

export interface ProductQuiz {
  question: string;
  correctAnswer: string;
  options: string[];
}

export interface CulinaryPairing {
  title: string;
  description: string;
}

export interface Product {
  id: "groundnut" | "coconut" | "sesame";
  name: string;
  kannadaName: string;
  subtitle?: string;
  searchKeywords: string;
  shortDescription: string;
  prices: {
    "1L": number;
    "500ml": number;
  };
  mrp: {
    "1L": number;
    "500ml": number;
  };
  inStock: {
    "1L": boolean;
    "500ml": boolean;
  };
  features: ProductFeatures;
  specs: ProductSpecs;
  nutrition: ProductNutrition;
  culinaryPairing: CulinaryPairing;
  labelImage: string;
  images: string[];
  quiz: ProductQuiz;
  smokePoint?: string;
}

export interface ComboProduct {
  id: "combo-3l" | "combo-1.5l";
  name: string;
  heading: string;
  volumeLabel: string;
  searchKeywords: string;
  regularPrice: number;
  loyaltyPrice: number;
  mrp: number;
  description: string;
  image: string;
  bullets: string[];
  inStock: boolean;
  includedOils: string[];
}

export interface CartItem {
  id: string; // unique item id e.g. groundnut-1L
  productId: string;
  isCombo?: boolean;
  title: string;
  subtitle: string;
  variant: BottleVolume | "3L Trio" | "1.5L Trio";
  price: number;
  regularPrice: number;
  quantity: number;
  image: string;
}

export interface Address {
  fullName: string;
  phone: string;
  email?: string;
  addressLine1: string;
  landmark: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  lat?: number;
  lng?: number;
  isBangalore: boolean;
}

export type OrderStatus =
  | "Placed"
  | "Payment Incomplete"
  | "Packed"
  | "Dispatched"
  | "Delivered"
  | "Failed (Expired)"
  | "Cancelled";

export interface Order {
  id: string;
  orderRef: string;
  date: string;
  timestamp: number;
  timestampMs?: number;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  paymentMethod: "online" | "phonepe" | "cod";
  paymentMode?: "ONLINE" | "PHONEPE" | "PHONEPE_PAID" | "COD" | string;
  paymentStatus: "PENDING" | "COMPLETED" | "FAILED" | "PHONEPE_PAID" | string;
  orderStatus: OrderStatus;
  shippingAddress: Address;
  trackingNumber?: string;
  courier?: string;
  notes?: string;
  customerUid?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  isBuyNow?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface CustomerReview {
  id: string;
  name: string;
  locality: string;
  city: string;
  rating: number;
  comment: string;
  product: string;
  date: string;
  verified: boolean;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: "quality" | "shipping" | "storage" | "usage";
}

export interface LoyaltyState {
  isActive: boolean;
  expiresAt: number;
  discountPercent: number;
  scannedOil?: string;
}

export interface PolicyContent {
  title: string;
  content: string;
}

export interface ProductDetailOverride {
  name?: string;
  subtitle?: string;
  description?: string;
  shortDescription?: string;
  fullStory?: string;
  imageUrl?: string;
  benefits?: string | string[];
  cookingUses?: string;
  smokePoint?: string;
  extractionMethod?: string;
  ingredients?: string;
  shelfLife?: string;
  [key: string]: any;
}

export interface StoreCMSConfig {
  announcementTicker: string;
  heroHeadline: string;
  heroSubhead: string;
  brandTagline: string;
  brandLogoUrl: string;
  chekkuVideoUrl: string;
  founderName?: string;
  primaryPhone?: string;
  altPhone?: string;
  email?: string;
  facilityAddress?: string;
  fssaiLicense?: string;
  gstin?: string;
  heroHighlights?: string[];
  bangaloreDeliveryNotice?: string;
  borzoApiKey?: string;
  borzoClientId?: string;
  delhiveryWarehouse?: string;
  delhiveryOriginPincode?: string;
  delhiveryTokenMasked?: string;
  loyaltyDiscountPercent?: number;
  loyaltyValidityDays?: number;
  freeShippingThreshold: number;
  standardShippingFee: number;
  prices: {
    groundnut1L: number;
    groundnut500ml: number;
    coconut1L: number;
    coconut500ml: number;
    sesame1L: number;
    sesame500ml: number;
    combo3L: number;
    combo1_5L: number;
  };
  stock: {
    groundnut1L: boolean;
    groundnut500ml: boolean;
    coconut1L: boolean;
    coconut500ml: boolean;
    sesame1L: boolean;
    sesame500ml: boolean;
    combo3L: boolean;
    combo1_5L: boolean;
  };

  // Editable A-to-Z Legal Policies
  policies?: {
    terms?: PolicyContent;
    shipping?: PolicyContent;
    returns?: PolicyContent;
    privacy?: PolicyContent;
    [key: string]: PolicyContent | undefined;
  };

  // Editable A-to-Z Product Metadata Overrides (keyed by product ID: groundnut, coconut, sesame, combo-3l, combo-1.5l)
  productDetails?: Record<string, ProductDetailOverride>;

  [key: string]: any;
}