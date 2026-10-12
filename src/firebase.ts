import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  deleteDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { FIREBASE_CONFIG } from "./constants";
import { CustomerReview, Order, StoreCMSConfig } from "./types";

// Initialize Firebase safely
const app = !getApps().length ? initializeApp(FIREBASE_CONFIG) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/**
 * Format 10-digit phone number into a valid Firebase email
 */
export function formatLoginIdentifier(input: string): string {
  const cleaned = input.trim();
  // Check if exactly 10 digits or starts with +91
  const digitsOnly = cleaned.replace(/\D/g, "");
  if (digitsOnly.length === 10) {
    return `${digitsOnly}@phone.manopavana.com`;
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return `${digitsOnly.slice(2)}@phone.manopavana.com`;
  }
  return cleaned;
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
  try {
    const cred = await signInWithEmailAndPassword(auth, formattedEmail, password);
    if (cred.user) {
      await syncCustomerDoc(cred.user, {
        email: formattedEmail,
        phone: identifier.replace(/\D/g, "").slice(-10),
      });
    }
    return cred.user;
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    // If user does not exist yet, automatically create account
    if (
      error.code === "auth/user-not-found" ||
      error.code === "auth/invalid-credential"
    ) {
      const newCred = await createUserWithEmailAndPassword(auth, formattedEmail, password);
      if (newCred.user) {
        await syncCustomerDoc(newCred.user, {
          email: formattedEmail,
          phone: identifier.replace(/\D/g, "").slice(-10),
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
 * Sync customer details to Firestore 'customers' collection
 */
export async function syncCustomerDoc(
  user: FirebaseUser,
  extra?: { name?: string; phone?: string; email?: string }
) {
  try {
    const customerRef = doc(db, "customers", user.uid);
    const snap = await getDoc(customerRef);

    const payload: Record<string, unknown> = {
      uid: user.uid,
      name: extra?.name || user.displayName || "Valued Customer",
      email: extra?.email || user.email || "",
      phone: extra?.phone || user.phoneNumber || "",
      lastLogin: serverTimestamp(),
    };

    if (!snap.exists()) {
      payload.createdAt = serverTimestamp();
      payload.totalOrders = 0;
      payload.totalSpent = 0;
    }

    await setDoc(customerRef, payload, { merge: true });
  } catch (e) {
    console.warn("Could not sync customer record to Firestore:", e);
  }
}

/**
 * Save order document in Firestore 'orders' collection
 */
export async function saveOrderToFirestore(order: Order, userUid?: string) {
  try {
    const orderDocRef = doc(db, "orders", order.orderRef);
    await setDoc(orderDocRef, {
      ...order,
      customerUid: userUid || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (userUid) {
      const customerRef = doc(db, "customers", userUid);
      await setDoc(
        customerRef,
        {
          totalOrders: increment(1),
          totalSpent: increment(order.total),
          lastOrderRef: order.orderRef,
          lastOrderAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn("Firestore saveOrder error:", err);
  }
}

/**
 * Update order status or payment status in Firestore
 */
export async function updateFirestoreOrderStatus(
  orderRef: string,
  updates: Partial<Order>
) {
  try {
    const orderDocRef = doc(db, "orders", orderRef);
    await setDoc(
      orderDocRef,
      {
        ...updates,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Firestore updateOrderStatus error:", err);
  }
}

/**
 * Listen to orders for a specific user in real-time
 */
export function subscribeUserOrders(
  userUid: string,
  phone: string,
  callback: (orders: Order[]) => void
) {
  try {
    const ordersCol = collection(db, "orders");
    // Query by customerUid if present
    const q = query(ordersCol, where("customerUid", "==", userUid));
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
        console.warn("Firestore user orders listener notice:", error);
      }
    );
  } catch (err) {
    console.warn("Failed to subscribe user orders:", err);
    return () => {};
  }
}

/**
 * Listen to all reviews from Firestore 'reviews' collection
 */
export function subscribeReviews(callback: (reviews: CustomerReview[]) => void) {
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
        console.warn("Reviews snapshot notice:", error);
      }
    );
  } catch (err) {
    console.warn("Failed to subscribe reviews:", err);
    return () => {};
  }
}

/**
 * Add a new customer review to Firestore
 */
export async function addReviewToFirestore(review: Omit<CustomerReview, "id">) {
  const reviewsCol = collection(db, "reviews");
  const newDoc = doc(reviewsCol);
  await setDoc(newDoc, {
    ...review,
    createdAt: serverTimestamp(),
  });
  return newDoc.id;
}

/**
 * Delete a review from Firestore (PIN 1234 protected)
 */
export async function deleteReviewFromFirestore(reviewId: string) {
  const reviewDocRef = doc(db, "reviews", reviewId);
  await deleteDoc(reviewDocRef);
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
    console.warn("Firestore saveStoreConfig error:", err);
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
        console.warn("Firestore store_config snapshot notice:", error);
      }
    );
  } catch (err) {
    console.warn("Failed to subscribe store_config:", err);
    return () => {};
  }
}

/**
 * Listen to all orders for admin dispatch queue
 */
export function subscribeAllOrders(callback: (orders: Order[]) => void) {
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
        console.warn("Firestore all orders listener notice:", error);
        // Fallback without orderBy
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
    console.warn("Failed to subscribe all orders:", err);
    return () => {};
  }
}

