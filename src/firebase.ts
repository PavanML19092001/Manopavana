import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  User as FirebaseUser,
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
  Unsubscribe,
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { CustomerReview, Order, StoreCMSConfig } from "./types";

// Initialize Firebase app safely
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

// Check live database connectivity
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore offline notice. Please verify network connectivity.");
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
 * Ensure an authenticated session exists (signs in anonymously if no session)
 */
export async function ensureAuthenticatedSession(): Promise<FirebaseUser> {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  const cred = await signInAnonymously(auth);
  return cred.user;
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
 * Sign out current user and initialize a clean anonymous guest session
 */
export async function logoutUser() {
  await signOut(auth);
  await signInAnonymously(auth);
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

  if (
    (obj as any)._methodName ||
    (obj as any).constructor?.name === "FieldValueImpl" ||
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
 * Link past guest orders matching phone or email to customer UID
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
 * Sync & Deduplicate customer details in Firestore 'customers' collection
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

    if (existingData.savedAddress) {
      mergedPayload.savedAddress = existingData.savedAddress;
    }
    if (Array.isArray(existingData.savedAddresses)) {
      mergedPayload.savedAddresses = existingData.savedAddresses;
    }
    if (Array.isArray(existingData.cart)) {
      mergedPayload.cart = existingData.cart;
    }

    const cleanPayload = cleanFirestoreObject(mergedPayload);
    await setDoc(matchedDocRef, cleanPayload, { merge: true });
    if (matchedDocRef.id !== user.uid) {
      await setDoc(customerRef, cleanPayload, { merge: true });
    }

    if (resolvedPhone || resolvedEmail) {
      linkPastOrdersToCustomer(user.uid, resolvedPhone, resolvedEmail);
    }

    return { ...existingData, ...cleanPayload };
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `customers/${user.uid}`);
    return null;
  }
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
 * Save order document directly to Firestore 'orders' collection
 */
export async function saveOrderToFirestore(order: Order, userUid?: string): Promise<boolean> {
  try {
    const orderDocRef = doc(db, "orders", order.orderRef);
    const cleanPhone = extractCleanPhone(order.shippingAddress?.phone);
    const cleanEmail = (order.shippingAddress?.email || "").toLowerCase().trim();

    const uid = userUid || order.customerUid || (order as any).firebaseUid || auth.currentUser?.uid || null;
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

    await Promise.race([
      setDoc(orderDocRef, sanitizedPayload, { merge: true }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore save timeout")), 5000)),
    ]);

    if (uid) {
      const customerRef = doc(db, "customers", uid);
      setDoc(
        customerRef,
        {
          totalOrders: increment(1),
          totalSpent: increment(order.total || 0),
          lastOrderRef: order.orderRef,
          lastOrderAt: serverTimestamp(),
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
 * Update order status or details in Firestore
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

    await Promise.race([
      setDoc(orderDocRef, cleanUpdates, { merge: true }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore update timeout")), 5000)),
    ]);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orders/${orderRef}`);
    return false;
  }
}

/**
 * Listen to orders for a specific user in real-time directly from Firestore
 */
export function subscribeUserOrders(
  userUid: string | undefined,
  phone: string | undefined,
  email: string | undefined,
  callback: (orders: Order[]) => void
): Unsubscribe {
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
            aggregatedMap.set(d.id, data);
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
            aggregatedMap.set(d.id, data);
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
export function subscribeReviews(callback: (reviews: CustomerReview[]) => void): Unsubscribe {
  try {
    const reviewsCol = collection(db, "reviews");
    const q = query(reviewsCol, orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: CustomerReview[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as Omit<CustomerReview, "id">) });
        });
        callback(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "reviews");
        // Fallback without ordering
        return onSnapshot(reviewsCol, (fallbackSnap) => {
          const fallbackList: CustomerReview[] = [];
          fallbackSnap.forEach((d) => {
            fallbackList.push({ id: d.id, ...(d.data() as Omit<CustomerReview, "id">) });
          });
          callback(fallbackList);
        });
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
export function subscribeStoreConfig(callback: (config: StoreCMSConfig) => void): Unsubscribe {
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
 * Listen to all orders for admin dispatch queue
 */
export function subscribeAllOrders(callback: (orders: Order[]) => void): Unsubscribe {
  try {
    const ordersCol = collection(db, "orders");
    const q = query(ordersCol, orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as Order);
        });
        callback(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "orders");
        return onSnapshot(ordersCol, (snapshot) => {
          const list: Order[] = [];
          snapshot.forEach((d) => {
            list.push(d.data() as Order);
          });
          callback(list);
        });
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, "orders");
    return () => {};
  }
}