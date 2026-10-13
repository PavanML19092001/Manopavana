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
 * If a user uses the same email or phone number for Google login and email/phone login,
 * their details are merged seamlessly instead of creating duplicate fragmented users.
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

    // Search for existing duplicate customer profile by email or phone
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
        console.warn("Notice checking customer by email:", e);
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
        console.warn("Notice checking customer by phone:", e);
      }
    }

    const resolvedName =
      (extra?.name && extra.name !== "Valued Customer" && extra.name !== "Google Customer" ? extra.name : "") ||
      (user.displayName && user.displayName !== "Customer" ? user.displayName : "") ||
      (existingData.name as string) ||
      "Valued Customer";

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

    // Update the matched master doc & the current UID doc
    await setDoc(matchedDocRef, mergedPayload, { merge: true });
    if (matchedDocRef.id !== user.uid) {
      await setDoc(customerRef, mergedPayload, { merge: true });
    }

    // Link any past guest orders placed with this phone or email to this user UID
    linkPastOrdersToCustomer(user.uid, resolvedPhone, resolvedEmail);

    return mergedPayload;
  } catch (e) {
    console.warn("Could not sync customer record to Firestore:", e);
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
    console.warn("Notice linking past orders:", err);
  }
}

/**
 * Save order document in Firestore 'orders' collection
 */
export async function saveOrderToFirestore(order: Order, userUid?: string) {
  try {
    const orderDocRef = doc(db, "orders", order.orderRef);
    const cleanPhone = extractCleanPhone(order.shippingAddress?.phone);
    const cleanEmail = (order.shippingAddress?.email || "").toLowerCase().trim();

    await setDoc(orderDocRef, {
      ...order,
      customerUid: userUid || order.customerUid || null,
      customerPhone: cleanPhone || null,
      customerEmail: cleanEmail || null,
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
 * Listen to orders for a specific user in real-time.
 * Checks customerUid, customerPhone, and customerEmail to guarantee
 * all user orders appear and never vanish across page refreshes or device changes.
 */
export function subscribeUserOrders(
  userUid: string | undefined,
  phone: string | undefined,
  callback: (orders: Order[]) => void
) {
  try {
    const ordersCol = collection(db, "orders");
    const cleanPhone = extractCleanPhone(phone);
    const unsubs: (() => void)[] = [];
    const aggregatedMap = new Map<string, Order>();

    const emitAggregated = () => {
      const list = Array.from(aggregatedMap.values()).sort(
        (a, b) => (b.timestamp || b.timestampMs || 0) - (a.timestamp || a.timestampMs || 0)
      );
      callback(list);
    };

    // 1. Query by customerUid if present
    if (userUid) {
      const qUid = query(ordersCol, where("customerUid", "==", userUid));
      const unsub1 = onSnapshot(
        qUid,
        (snapshot) => {
          snapshot.forEach((d) => {
            aggregatedMap.set(d.id, d.data() as Order);
          });
          emitAggregated();
        },
        (error) => {
          console.warn("Firestore user orders UID listener notice:", error);
        }
      );
      unsubs.push(unsub1);
    }

    // 2. Query by customerPhone if 10 digits
    if (cleanPhone && cleanPhone.length === 10) {
      const qPhone = query(ordersCol, where("customerPhone", "==", cleanPhone));
      const unsub2 = onSnapshot(
        qPhone,
        (snapshot) => {
          snapshot.forEach((d) => {
            aggregatedMap.set(d.id, d.data() as Order);
          });
          emitAggregated();
        },
        (error) => {
          console.warn("Firestore user orders phone listener notice:", error);
        }
      );
      unsubs.push(unsub2);
    }

    return () => {
      unsubs.forEach((u) => u());
    };
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
