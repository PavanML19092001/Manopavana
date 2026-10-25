import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  deleteDoc,
  serverTimestamp,
  increment,
  arrayUnion,
  getDocFromServer,
  FieldValue,
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { CustomerReview, Order, StoreCMSConfig } from "./types";

// Initialize Firebase safely with provisioned Database ID
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn("Firestore Error: ", JSON.stringify(errInfo));
}

// Test live database connectivity at boot
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore offline notice. Please verify network.");
    }
  }
}
testFirestoreConnection();

/**
 * Clean phone number to 10 digits
 */
export function extractCleanPhone(input?: string): string {
  if (!input) return "";
  const digitsOnly = input.replace(/\D/g, "");
  if (digitsOnly.length === 10) return digitsOnly;
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) return digitsOnly.slice(2);
  return digitsOnly.slice(-10);
}

/**
 * Format 10-digit phone number into a valid Firebase email
 */
export function formatLoginIdentifier(input: string): string {
  const cleaned = input.trim();
  const digits = extractCleanPhone(cleaned);
  if (digits.length === 10 && !cleaned.includes("@")) {
    return `${digits}@phone.manopavana.com`;
  }
  return cleaned.toLowerCase();
}

/**
 * 1-Click Google Sign-In
 */
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  if (result.user) {
    await syncCustomerDoc(result.user, {
      name: result.user.displayName || "Google Customer",
      email: result.user.email || undefined,
      phone: result.user.phoneNumber || undefined,
    });
  }
  return result.user;
}

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

/**
 * Initialize or reset invisible reCAPTCHA verifier for Phone Auth
 */
export function setupRecaptcha(containerId = "recaptcha-container"): RecaptchaVerifier {
  if (typeof window === "undefined") {
    throw new Error("Window is not available");
  }
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch {
      // ignore clear error
    }
  }
  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {},
    "expired-callback": () => {},
  });
  window.recaptchaVerifier = verifier;
  return verifier;
}

/**
 * Send Firebase SMS OTP to Indian mobile number (+91)
 */
export async function sendPhoneOtp(
  rawPhone: string,
  containerId = "recaptcha-container"
): Promise<ConfirmationResult> {
  const digits = extractCleanPhone(rawPhone);
  if (digits.length !== 10) {
    throw new Error("Please enter a valid 10-digit Indian mobile number.");
  }
  const formattedPhone = `+91${digits}`;
  const appVerifier = setupRecaptcha(containerId);
  const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
  window.confirmationResult = confirmationResult;
  return confirmationResult;
}

/**
 * Confirm SMS OTP and sync customer profile to Firestore
 */
export async function confirmPhoneOtp(
  confirmationResult: ConfirmationResult,
  otp: string,
  rawPhone?: string
) {
  const userCredential = await confirmationResult.confirm(otp.trim());
  if (userCredential.user) {
    const cleanPhone = extractCleanPhone(rawPhone || userCredential.user.phoneNumber || "");
    await syncCustomerDoc(userCredential.user, {
      phone: cleanPhone || undefined,
      name: userCredential.user.displayName || "Customer",
    });
  }
  return userCredential.user;
}

/**
 * Get daily SMS count for Firebase Phone Auth (10 free SMS/day limit without billing)
 */
export async function getDailySmsCount(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const localKey = `manopavana_sms_count_${today}`;
  let count = parseInt(localStorage.getItem(localKey) || "0", 10);

  try {
    const quotaDoc = await getDoc(doc(db, "settings", `sms_quota_${today}`));
    if (quotaDoc.exists()) {
      const remoteCount = quotaDoc.data()?.count || 0;
      count = Math.max(count, remoteCount);
      localStorage.setItem(localKey, String(count));
    }
  } catch {
    // ignore offline or permissions error
  }
  return count;
}

/**
 * Increment daily SMS count when an SMS OTP is requested
 */
export async function incrementDailySmsCount(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const localKey = `manopavana_sms_count_${today}`;
  const nextCount = parseInt(localStorage.getItem(localKey) || "0", 10) + 1;
  localStorage.setItem(localKey, String(nextCount));

  try {
    await setDoc(
      doc(db, "settings", `sms_quota_${today}`),
      {
        count: increment(1),
        date: today,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch {
    // ignore
  }
  return nextCount;
}



/**
 * Phone or Email Login with Automatic Registration fallback
 */
export async function signInWithPhoneOrEmail(identifier: string, password = "manopavana_default_pwd") {
  const formattedEmail = formatLoginIdentifier(identifier);
  const cleanPhone = extractCleanPhone(identifier);

  try {
    const cred = await signInWithEmailAndPassword(auth, formattedEmail, password);
    if (cred.user) {
      await syncCustomerDoc(cred.user, {
        email: !formattedEmail.endsWith("@phone.manopavana.com") ? formattedEmail : undefined,
        phone: cleanPhone || undefined,
      });
    }
    return cred.user;
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    // If user does not exist yet, automatically create account
    if (
      error.code === "auth/user-not-found" ||
      error.code === "auth/invalid-credential" ||
      error.code === "auth/invalid-login-credentials"
    ) {
      const newCred = await createUserWithEmailAndPassword(auth, formattedEmail, password);
      if (newCred.user) {
        await syncCustomerDoc(newCred.user, {
          email: !formattedEmail.endsWith("@phone.manopavana.com") ? formattedEmail : undefined,
          phone: cleanPhone || undefined,
        });
      }
      return newCred.user;
    }
    throw err;
  }
}

/**
 * Sign out current user
 */
export async function logoutUser() {
  await signOut(auth);
}

/**
 * Sync & Deduplicate customer details in Firestore 'customers' collection:
 * Merges profile, savedAddress, and cart seamlessly.
 */
export async function syncCustomerDoc(
  user: FirebaseUser,
  extra?: { name?: string; phone?: string; email?: string }
) {
  try {
    const userEmail = (extra?.email || user.email || "").toLowerCase().trim();
    const isSyntheticPhoneEmail = userEmail.endsWith("@phone.manopavana.com");
    const canonicalEmail = isSyntheticPhoneEmail ? "" : userEmail;

    const rawPhone = extra?.phone || user.phoneNumber || "";
    const cleanPhone = extractCleanPhone(rawPhone) || (isSyntheticPhoneEmail ? userEmail.split("@")[0] : "");

    const customerRef = doc(db, "customers", user.uid);
    const snap = await getDoc(customerRef);

    let existingData: Record<string, unknown> = snap.exists() ? snap.data() : {};
    let matchedDocRef = customerRef;

    // Search for existing customer profile by email or phone
    const customersCol = collection(db, "customers");

    if (canonicalEmail) {
      try {
        const qEmail = query(customersCol, where("email", "==", canonicalEmail));
        const emailSnap = await getDocs(qEmail);
        if (!emailSnap.empty) {
          const matchDoc = emailSnap.docs[0];
          matchedDocRef = matchDoc.ref;
          existingData = { ...matchDoc.data(), ...existingData };
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, "customers");
      }
    }

    if (cleanPhone && cleanPhone.length === 10) {
      try {
        const qPhone = query(customersCol, where("phone", "==", cleanPhone));
        const phoneSnap = await getDocs(qPhone);
        if (!phoneSnap.empty) {
          const matchDoc = phoneSnap.docs[0];
          matchedDocRef = matchDoc.ref;
          existingData = { ...matchDoc.data(), ...existingData };
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, "customers");
      }
    }

    const resolvedName =
      (extra?.name && extra.name !== "Valued Customer" && extra.name !== "Google Customer" ? extra.name : "") ||
      (user.displayName && user.displayName !== "Customer" ? user.displayName : "") ||
      (existingData.name as string) ||
      "";

    const resolvedEmail = canonicalEmail || (existingData.email as string) || "";
    const resolvedPhone = cleanPhone || (existingData.phone as string) || "";

    const mergedPayload: Record<string, unknown> = {
      uid: user.uid,
      uids: arrayUnion(user.uid),
      name: resolvedName,
      email: resolvedEmail,
      phone: resolvedPhone,
      lastLogin: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!existingData.createdAt) {
      mergedPayload.createdAt = serverTimestamp();
      mergedPayload.totalOrders = 0;
      mergedPayload.totalSpent = 0;
    }

    // Preserve existing savedAddress and cart if already on file
    if (existingData.savedAddress) {
      mergedPayload.savedAddress = existingData.savedAddress;
    }
    if (Array.isArray(existingData.cart)) {
      mergedPayload.cart = existingData.cart;
    }

    const cleanPayload = cleanFirestoreObject(mergedPayload);
    await setDoc(matchedDocRef, cleanPayload, { merge: true });
    if (matchedDocRef.id !== user.uid) {
      await setDoc(customerRef, cleanPayload, { merge: true });
    }

    // Link any past guest orders matching this phone or email to this user UID
    linkPastOrdersToCustomer(user.uid, resolvedPhone, resolvedEmail);

    return { ...existingData, ...cleanPayload };
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `customers/${user.uid}`);
    return null;
  }
}

/**
 * Link past guest orders matching phone or email to the customer's UID
 */
async function linkPastOrdersToCustomer(userUid: string, phone: string, email: string) {
  try {
    const ordersCol = collection(db, "orders");
    const queries = [];
    if (phone && phone.length === 10) {
      queries.push(query(ordersCol, where("customerPhone", "==", phone)));
    }
    if (email && email.includes("@")) {
      queries.push(query(ordersCol, where("customerEmail", "==", email.toLowerCase())));
    }

    for (const q of queries) {
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        const orderData = d.data();
        if (!orderData.customerUid || orderData.customerUid !== userUid) {
          await setDoc(d.ref, { customerUid: userUid, updatedAt: serverTimestamp() }, { merge: true });
        }
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, "orders");
  }
}

/**
 * Sanitize object for Firestore:
 * Preserves Date and Firestore FieldValues (serverTimestamp, increment, arrayUnion)
 * Strips undefined values to prevent SDK errors.
 */
export function cleanFirestoreObject(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (typeof obj !== "object") return obj;
  if (obj instanceof Date) return obj;

  // Preserve Firestore sentinel field values
  if (
    obj instanceof FieldValue ||
    (obj as any)._methodName ||
    (obj as any).constructor?.name?.includes("FieldValue") ||
    (obj as any)._delegate
  ) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanFirestoreObject);
  }

  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) {
      continue;
    } else if (val && typeof val === "object") {
      cleaned[key] = cleanFirestoreObject(val);
    } else {
      cleaned[key] = val;
    }
  }
  return cleaned;
}

/**
 * Fetch an order directly by orderRef from Firestore
 */
export async function getOrderFromFirestore(orderRef: string): Promise<Order | null> {
  if (!orderRef) return null;
  try {
    const orderDocRef = doc(db, "orders", orderRef);
    const snap = await getDoc(orderDocRef);
    if (snap.exists()) {
      return snap.data() as Order;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `orders/${orderRef}`);
    return null;
  }
}

/**
 * Save order document in Firestore 'orders' collection dynamically and fast
 */
export async function saveOrderToFirestore(order: Order, userUid?: string): Promise<boolean> {
  try {
    const orderDocRef = doc(db, "orders", order.orderRef);
    const cleanPhone = extractCleanPhone(order.shippingAddress?.phone || order.customerPhone || "");
    const cleanEmail = (order.shippingAddress?.email || order.customerEmail || "").toLowerCase().trim();

    const uid = userUid || order.customerUid || (order as any).firebaseUid || null;
    const rawPayload = {
      ...order,
      customerUid: uid,
      firebaseUid: uid,
      customerPhone: cleanPhone || null,
      customerEmail: cleanEmail || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const sanitizedPayload = cleanFirestoreObject(rawPayload);

    await setDoc(orderDocRef, sanitizedPayload, { merge: true });

    if (uid) {
      const customerRef = doc(db, "customers", uid);
      setDoc(
        customerRef,
        {
          totalOrders: increment(1),
          totalSpent: increment(order.total || 0),
          lastOrderRef: order.orderRef,
          lastOrderAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ).catch(() => {});
    }
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `orders/${order.orderRef}`);
    return false;
  }
}

/**
 * Update order status or payment status in Firestore
 */
export async function updateFirestoreOrderStatus(
  orderRef: string,
  updates: Partial<Order>
): Promise<boolean> {
  try {
    const orderDocRef = doc(db, "orders", orderRef);
    const cleanUpdates = cleanFirestoreObject({
      ...updates,
      updatedAt: serverTimestamp(),
    });

    await setDoc(orderDocRef, cleanUpdates, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orders/${orderRef}`);
    return false;
  }
}

/**
 * Listen to orders for a specific user in real-time.
 */
export function subscribeUserOrders(
  userUid: string | undefined,
  phone: string | undefined,
  email: string | undefined,
  callback: (orders: Order[]) => void
) {
  try {
    const ordersCol = collection(db, "orders");
    const cleanEmail = (email || "").toLowerCase().trim();
    const unsubs: (() => void)[] = [];
    const aggregatedMap = new Map<string, Order>();

    const emitAggregated = () => {
      const list = Array.from(aggregatedMap.values()).sort(
        (a, b) => (b.timestamp || b.timestampMs || 0) - (a.timestamp || a.timestampMs || 0)
      );
      callback(list);
    };

    if (userUid) {
      const qUid = query(ordersCol, where("customerUid", "==", userUid));
      const unsub1 = onSnapshot(
        qUid,
        (snapshot) => {
          snapshot.forEach((d) => {
            const data = d.data() as Order;
            if (!data.customerUid || data.customerUid === userUid || (data as any).firebaseUid === userUid) {
              aggregatedMap.set(d.id, data);
            }
          });
          emitAggregated();
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "orders");
        }
      );
      unsubs.push(unsub1);
    }

    if (cleanEmail && cleanEmail.includes("@") && !cleanEmail.endsWith("@phone.manopavana.com")) {
      const qEmail = query(ordersCol, where("customerEmail", "==", cleanEmail));
      const unsubEmail = onSnapshot(
        qEmail,
        (snapshot) => {
          snapshot.forEach((d) => {
            const data = d.data() as Order;
            if (!data.customerUid || data.customerUid === userUid) {
              aggregatedMap.set(d.id, data);
            }
          });
          emitAggregated();
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "orders");
        }
      );
      unsubs.push(unsubEmail);
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, "orders");
    return () => {};
  }
}

/**
 * Listen to all reviews from Firestore 'reviews' collection
 */
export function subscribeReviews(callback: (reviews: CustomerReview[]) => void) {
  try {
    const reviewsCol = collection(db, "reviews");
    return onSnapshot(
      reviewsCol,
      (snapshot) => {
        const list: CustomerReview[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as Omit<CustomerReview, "id">) });
        });
        list.sort((a, b) => {
          const tA = (a as any).createdAt?.toMillis
            ? (a as any).createdAt.toMillis()
            : (a as any).timestamp || 0;
          const tB = (b as any).createdAt?.toMillis
            ? (b as any).createdAt.toMillis()
            : (b as any).timestamp || 0;
          return tB - tA;
        });
        callback(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "reviews");
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, "reviews");
    return () => {};
  }
}

/**
 * Add a new customer review to Firestore
 */
export async function addReviewToFirestore(review: Omit<CustomerReview, "id">) {
  try {
    const reviewsCol = collection(db, "reviews");
    const newDoc = doc(reviewsCol);
    await setDoc(newDoc, {
      ...review,
      createdAt: serverTimestamp(),
    });
    return newDoc.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "reviews");
    throw err;
  }
}

/**
 * Delete a review from Firestore
 */
export async function deleteReviewFromFirestore(reviewId: string) {
  try {
    const reviewDocRef = doc(db, "reviews", reviewId);
    await deleteDoc(reviewDocRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `reviews/${reviewId}`);
    throw err;
  }
}

/**
 * Save store CMS configuration to Firestore document 'settings/store_config'
 */
export async function saveStoreConfigToFirestore(config: StoreCMSConfig) {
  try {
    const configDocRef = doc(db, "settings", "store_config");
    await setDoc(
      configDocRef,
      {
        ...config,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "settings/store_config");
  }
}

/**
 * Subscribe to store CMS configuration in Firestore 'settings/store_config'
 */
export function subscribeStoreConfig(callback: (config: StoreCMSConfig) => void) {
  try {
    const configDocRef = doc(db, "settings", "store_config");
    return onSnapshot(
      configDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data() as StoreCMSConfig);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "settings/store_config");
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, "settings/store_config");
    return () => {};
  }
}

/**
 * Listen to all orders for admin dispatch queue (real-time stream)
 */
export function subscribeAllOrders(callback: (orders: Order[]) => void) {
  try {
    const ordersCol = collection(db, "orders");
    return onSnapshot(
      ordersCol,
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as Order);
        });
        list.sort((a, b) => {
          const timeA = b.timestampMs || b.timestamp || (b.createdAt && typeof b.createdAt === "object" && (b.createdAt as any).toMillis ? (b.createdAt as any).toMillis() : 0);
          const timeB = a.timestampMs || a.timestamp || (a.createdAt && typeof a.createdAt === "object" && (a.createdAt as any).toMillis ? (a.createdAt as any).toMillis() : 0);
          return timeA - timeB;
        });
        callback(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "orders");
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, "orders");
    return () => {};
  }
}

/**
 * Fetch all orders once directly from Firestore (one-time fetch for admin)
 */
export async function fetchAllOrdersOnce(): Promise<Order[]> {
  try {
    const ordersCol = collection(db, "orders");
    const snap = await getDocs(ordersCol);
    const list: Order[] = [];
    snap.forEach((d) => {
      list.push(d.data() as Order);
    });
    list.sort((a, b) => {
      const timeA = b.timestampMs || b.timestamp || (b.createdAt && typeof b.createdAt === "object" && (b.createdAt as any).toMillis ? (b.createdAt as any).toMillis() : 0);
      const timeB = a.timestampMs || a.timestamp || (a.createdAt && typeof a.createdAt === "object" && (a.createdAt as any).toMillis ? (a.createdAt as any).toMillis() : 0);
      return timeA - timeB;
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, "orders");
    return [];
  }
}
