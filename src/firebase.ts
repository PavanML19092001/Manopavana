import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { Order, CustomerReview, StoreCMSConfig } from "./types";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Data Sanitizer: Strips 'undefined' so the Firestore SDK never throws an error
export const cleanPayload = (data: any): any => {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) return data.map(cleanPayload);
  if (typeof data === "object" && !(data instanceof Date)) {
    const res: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      const val = data[key];
      if (val !== undefined) {
        res[key] = cleanPayload(val);
      }
    }
    return res;
  }
  return data;
};

/**
 * 1. AUTHENTICATION SERVICES
 */

// Google Sign-In
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      await syncCustomerDoc(result.user);
    }
    return result.user;
  } catch (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }
};

// Phone / Email Universal Authenticator
export const signInWithPhoneOrEmail = async (
  identifier: string,
  passOrOtp: string,
  displayName?: string
) => {
  const cleanId = (identifier || "").trim().toLowerCase();
  const isPhone = /^\d{10}$/.test(cleanId.replace(/\D/g, ""));
  const emailToUse = isPhone
    ? `${cleanId.replace(/\D/g, "").slice(-10)}@phone.manopavana.com`
    : cleanId;
  const passwordToUse = passOrOtp || "ManoPavana@2026";

  try {
    const cred = await signInWithEmailAndPassword(auth, emailToUse, passwordToUse);
    if (displayName && (!cred.user.displayName || cred.user.displayName !== displayName)) {
      await updateProfile(cred.user, { displayName });
    }
    await syncCustomerDoc(cred.user);
    return cred.user;
  } catch (err: any) {
    // If account does not exist, create it seamlessly
    if (
      err.code === "auth/user-not-found" ||
      err.code === "auth/invalid-credential" ||
      err.code === "auth/wrong-password"
    ) {
      try {
        const newCred = await createUserWithEmailAndPassword(auth, emailToUse, passwordToUse);
        if (displayName) {
          await updateProfile(newCred.user, { displayName });
        }
        await syncCustomerDoc(newCred.user);
        return newCred.user;
      } catch (createErr) {
        console.error("Account creation fallback error:", createErr);
        throw createErr;
      }
    }
    console.error("Authentication error:", err);
    throw err;
  }
};

// Logout
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign-out error:", error);
    throw error;
  }
};

/**
 * 2. CUSTOMER PROFILES (Live cart & saved addresses)
 */
export const syncCustomerDoc = async (user: any) => {
  if (!user || !user.uid) return null;
  const userRef = doc(db, "customers", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    const initialProfile = {
      uid: user.uid,
      email: user.email || "",
      phone: user.phoneNumber || "",
      name: user.displayName || "",
      cart: [],
      savedAddresses: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(userRef, initialProfile, { merge: true });
    return initialProfile;
  }
  return snap.data();
};

/**
 * 3. ORDER SERVICES
 */

// Writes order document directly to /orders/{orderRef}
export const saveOrderToFirestore = async (order: Order, uid?: string | null): Promise<void> => {
  if (!order || !order.orderRef) {
    throw new Error("Missing orderRef in order payload");
  }

  const userUid = uid || order.customerUid || null;

  const sanitizedOrder = cleanPayload({
    ...order,
    customerUid: userUid,
    firebaseUid: userUid, // Satisfies rules: customerUid == uid || firebaseUid == uid
    total: Number(order.total) || 0,
    subtotal: Number(order.subtotal) || 0,
    discount: Number(order.discount) || 0,
    shippingFee: Number(order.shippingFee) || 0,
    orderStatus: order.orderStatus === "Payment Incomplete" ? "Payment Incomplete" : "Placed",
    updatedAt: serverTimestamp(),
  });

  const orderDoc = doc(db, "orders", order.orderRef);
  await setDoc(orderDoc, sanitizedOrder, { merge: true });
};

export const getOrderFromFirestore = async (orderRef: string): Promise<Order | null> => {
  try {
    const snap = await getDoc(doc(db, "orders", orderRef));
    if (snap.exists()) {
      return snap.data() as Order;
    }
  } catch (err) {
    console.error("Firestore getOrder error:", err);
  }
  return null;
};

export const updateFirestoreOrderStatus = async (
  orderRef: string,
  updates: Partial<Order>
): Promise<void> => {
  const sanitized = cleanPayload({
    ...updates,
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "orders", orderRef), sanitized);
};

// Real-time listener for current user: strictly isolated by customerUid
export const subscribeUserOrders = (
  uid: string,
  _legacyArg: any,
  userEmail: string | undefined,
  callback: (orders: Order[]) => void
) => {
  if (!uid) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, "orders"),
    where("customerUid", "==", uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const ordersList: Order[] = [];
      snapshot.forEach((d) => {
        ordersList.push(d.data() as Order);
      });
      ordersList.sort((a, b) => (b.timestamp || b.timestampMs || 0) - (a.timestamp || a.timestampMs || 0));
      callback(ordersList);
    },
    (err) => {
      console.warn("User orders subscription notice:", err);
    }
  );
};

// Real-time listener for Admin only (manopavana@gmail.com)
export const subscribeAllOrders = (callback: (orders: Order[]) => void) => {
  const q = collection(db, "orders");
  return onSnapshot(
    q,
    (snapshot) => {
      const all: Order[] = [];
      snapshot.forEach((d) => {
        all.push(d.data() as Order);
      });
      all.sort((a, b) => (b.timestamp || b.timestampMs || 0) - (a.timestamp || a.timestampMs || 0));
      callback(all);
    },
    (err) => {
      console.warn("Admin orders subscription notice:", err);
    }
  );
};

/**
 * 4. STORE CMS CONFIGURATION
 */
export const subscribeStoreConfig = (callback: (cfg: Partial<StoreCMSConfig> | null) => void) => {
  const cfgDoc = doc(db, "settings", "store_cms");
  return onSnapshot(
    cfgDoc,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as Partial<StoreCMSConfig>);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn("Store config subscription notice:", err);
    }
  );
};

export const saveStoreConfigToFirestore = async (cfg: StoreCMSConfig) => {
  const clean = cleanPayload(cfg);
  await setDoc(doc(db, "settings", "store_cms"), clean, { merge: true });
};

/**
 * 5. CUSTOMER REVIEWS
 */
export const subscribeReviews = (callback: (reviews: CustomerReview[]) => void) => {
  const q = collection(db, "reviews");
  return onSnapshot(
    q,
    (snapshot) => {
      const list: CustomerReview[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as CustomerReview);
      });
      callback(list);
    },
    (err) => {
      console.warn("Reviews subscription notice:", err);
    }
  );
};

export const addReviewToFirestore = async (rev: Omit<CustomerReview, "id">): Promise<string> => {
  const clean = cleanPayload(rev);
  const ref = await addDoc(collection(db, "reviews"), {
    ...clean,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const deleteReviewFromFirestore = async (reviewId: string): Promise<void> => {
  await deleteDoc(doc(db, "reviews", reviewId));
};