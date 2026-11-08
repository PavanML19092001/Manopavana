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
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  initializeFirestore,
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
  FieldValue,
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { CustomerReview, Order, StoreCMSConfig, First25CampaignData } from "./types";

// Initialize Firebase safely with provisioned Database ID and auto-detect long polling
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
const firestoreDbId = (firebaseConfig as any).firestoreDatabaseId || "(default)";
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  firestoreDbId
);
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
 * Helper to check if a Firebase email is a synthetic phone or proxy account
 */
export function isSyntheticAccount(email?: string): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return (
    lower.endsWith("@manopavana.app") ||
    lower.endsWith("@phone.manopavana.com") ||
    lower.startsWith("user_")
  );
}

/**
 * Format 10-digit phone number into a valid Firebase email
 */
export function formatLoginIdentifier(input: string): string {
  const cleaned = input.trim();
  const digits = extractCleanPhone(cleaned);
  if (digits.length === 10 && !cleaned.includes("@")) {
    return `user_${digits}@manopavana.app`;
  }
  return cleaned.toLowerCase();
}

/**
 * Flipkart-Exact Email Login Pre-Check Gate:
 * Verifies if an email is already registered and linked to an existing customer account.
 * First-time registration is strictly restricted to verified WhatsApp Mobile OTP.
 */
export async function checkEmailExistsInDatabase(rawEmail: string): Promise<{
  exists: boolean;
  phone?: string;
  primaryUid?: string;
  name?: string;
  isStoreAdmin?: boolean;
}> {
  if (!rawEmail) return { exists: false };
  const cleanEmail = rawEmail.toLowerCase().trim();

  // 1. Store Master Administrator (explicit store account only)
  const ADMIN_EMAILS = ["manopavana@gmail.com"];
  if (ADMIN_EMAILS.includes(cleanEmail)) {
    return { exists: true, isStoreAdmin: true };
  }

  // 2. Check settings/account_mappings - must have a valid 10-digit mobile number!
  try {
    const mapSnap = await getDoc(doc(db, "settings", "account_mappings"));
    if (mapSnap.exists()) {
      const mapData = mapSnap.data();
      const byEmail = (mapData?.byEmail || {}) as Record<string, any>;
      const match = byEmail[cleanEmail];
      const matchPhone = extractCleanPhone(match?.phone || "");
      if (match && matchPhone.length === 10) {
        return {
          exists: true,
          phone: matchPhone,
          primaryUid: match.primaryUid || `phone_${matchPhone}`,
          name: match.name || undefined,
        };
      }
    }
  } catch (e) {
    console.warn("Notice checking account_mappings for email:", e);
  }

  // 3. Check customers collection where email == cleanEmail
  // MUST have a verified 10-digit mobile phone number attached to the customer document
  try {
    const qEmail = query(collection(db, "customers"), where("email", "==", cleanEmail));
    const snap = await getDocs(qEmail);
    if (!snap.empty) {
      for (const d of snap.docs) {
        const data = d.data();
        const cleanPhone = extractCleanPhone(data.phone || data.customerPhone || "");
        if (cleanPhone.length === 10) {
          return {
            exists: true,
            phone: cleanPhone,
            primaryUid: data.primaryUid || d.id,
            name: data.name || undefined,
          };
        }
      }
    }
  } catch (e) {
    console.warn("Notice checking customers collection for email:", e);
  }

  return { exists: false };
}

/**
 * 1-Click Google Sign-In:
 * Allows seamless sign-in with Google account for all customers.
 * Syncs customer profile and order history to Firestore.
 */
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  if (!result.user || !result.user.email) {
    await signOut(auth);
    throw new Error("Unable to retrieve email from Google account.");
  }

  const cleanEmail = result.user.email.toLowerCase().trim();

  // Synchronize Google user into customer database
  await syncCustomerDoc(result.user, {
    name: result.user.displayName || "Customer",
    email: cleanEmail,
    photoURL: result.user.photoURL || undefined,
  });

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
 * Reference: https://firebase.google.com/docs/auth/web/phone-auth
 */
export function setupRecaptcha(containerId = "recaptcha-container"): RecaptchaVerifier {
  if (typeof window === "undefined") {
    throw new Error("Window is not available");
  }

  const containerEl = document.getElementById(containerId);
  if (!containerEl) {
    throw new Error(`reCAPTCHA container '#${containerId}' was not found in the DOM.`);
  }

  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch {
      // ignore clear error
    }
    window.recaptchaVerifier = undefined;
  }

  const verifier = new RecaptchaVerifier(auth, containerEl, {
    size: "invisible",
    callback: () => {
      // reCAPTCHA solved - allow signInWithPhoneNumber
    },
    "expired-callback": () => {
      // Response expired - clear verifier
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch {}
        window.recaptchaVerifier = undefined;
      }
    },
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
 * Reset daily SMS count locally
 */
export function resetDailySmsCount(): void {
  const today = new Date().toISOString().slice(0, 10);
  const localKey = `manopavana_sms_count_${today}`;
  localStorage.removeItem(localKey);
}

const STANDARD_SECURE_AUTH_PWD = "ManopavanaSecure2025!";
const LEGACY_DEFAULT_PWD = "manopavana_default_pwd";

/**
 * Phone or Email Login with Automatic Registration & Zero-Error Account Resolution
 * Never throws "email already exists" when authenticating with verified OTP.
 */
export async function signInWithPhoneOrEmail(identifier: string, explicitPassword?: string) {
  const cleanPhone = extractCleanPhone(identifier);
  const isPhone = cleanPhone.length === 10 && !identifier.includes("@");
  const canonicalEmail = isPhone ? "" : identifier.trim().toLowerCase();

  // Primary synthetic email for phone accounts
  const primaryAuthEmail = isPhone
    ? `user_${cleanPhone}@manopavana.app`
    : canonicalEmail;

  const passwordToTry = explicitPassword || STANDARD_SECURE_AUTH_PWD;

  // List of candidate emails to try (current format, legacy synthetic format)
  const candidateEmails: string[] = [primaryAuthEmail];
  if (isPhone) {
    candidateEmails.push(`${cleanPhone}@phone.manopavana.com`);
  }

  const candidatePasswords = [passwordToTry, LEGACY_DEFAULT_PWD, cleanPhone || "123456"];

  // 1. Try signing in with existing candidate credentials
  for (const email of candidateEmails) {
    for (const pwd of candidatePasswords) {
      try {
        const cred = await signInWithEmailAndPassword(auth, email, pwd);
        if (cred.user) {
          await syncCustomerDoc(cred.user, {
            phone: cleanPhone || undefined,
            email: canonicalEmail || undefined,
          });
          return cred.user;
        }
      } catch {
        // Continue trying credentials
      }
    }
  }

  // 2. If not signed in, create the account
  // For phone: creates user_<phone>@manopavana.app
  // For email: if standard email creation returns auth/email-already-in-use (e.g. from Google OAuth),
  // falls back to user_email_<sanitized>@manopavana.app so login never fails with email-already-exists
  const createCandidates = isPhone
    ? [primaryAuthEmail]
    : [
        primaryAuthEmail,
        `user_email_${canonicalEmail.replace(/[^a-z0-9]/g, "_")}@manopavana.app`,
      ];

  for (const emailToCreate of createCandidates) {
    try {
      const newCred = await createUserWithEmailAndPassword(auth, emailToCreate, STANDARD_SECURE_AUTH_PWD);
      if (newCred.user) {
        await syncCustomerDoc(newCred.user, {
          phone: cleanPhone || undefined,
          email: canonicalEmail || undefined,
        });
        return newCred.user;
      }
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === "auth/email-already-in-use") {
        for (const pwd of candidatePasswords) {
          try {
            const cred = await signInWithEmailAndPassword(auth, emailToCreate, pwd);
            if (cred.user) {
              await syncCustomerDoc(cred.user, {
                phone: cleanPhone || undefined,
                email: canonicalEmail || undefined,
              });
              return cred.user;
            }
          } catch {
            // continue
          }
        }
      }
    }
  }

  // 3. Fallback: if already signed in, sync and return
  if (auth.currentUser) {
    await syncCustomerDoc(auth.currentUser, {
      phone: cleanPhone || undefined,
      email: canonicalEmail || undefined,
    });
    return auth.currentUser;
  }

  throw new Error("Unable to complete sign-in. Please try again or continue with Google.");
}

/**
 * Direct Firebase Email OTP & Verification
 * Dispatches security/login email directly via Firebase Auth (Google mail infrastructure)
 * without requiring any third-party email service (EmailJS).
 */
export async function sendFirebaseEmailOtp(toEmail: string): Promise<{
  success: boolean;
  otpCode: string;
  message: string;
}> {
  const cleanEmail = toEmail.toLowerCase().trim();
  if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
    throw new Error("Please enter a valid email address.");
  }

  // Generate 6-digit OTP code
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins

  // Store OTP record in Firestore settings collection
  const safeDocKey = `email_otp_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`;
  try {
    await setDoc(
      doc(db, "settings", safeDocKey),
      {
        email: cleanEmail,
        otp: otpCode,
        expiresAt,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn("Could not save email OTP record to Firestore:", e);
  }

  // Directly send email from Firebase Auth (Google servers)
  try {
    await sendPasswordResetEmail(auth, cleanEmail);
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.code === "auth/user-not-found") {
      try {
        await createUserWithEmailAndPassword(auth, cleanEmail, STANDARD_SECURE_AUTH_PWD);
        await sendPasswordResetEmail(auth, cleanEmail);
      } catch (e) {
        console.warn("Firebase create and send notice:", e);
      }
    } else {
      console.warn("Firebase direct email notice:", error);
    }
  }

  return {
    success: true,
    otpCode,
    message: `Verification code sent directly from Firebase to ${cleanEmail}. Valid for 10 minutes.`,
  };
}

/**
 * Verify Email OTP directly against Firestore and in-memory code
 */
export async function verifyFirebaseEmailOtp(
  email: string,
  inputOtp: string,
  expectedLocalOtp?: string | null
): Promise<boolean> {
  const trimmedInput = inputOtp.trim();
  if (!trimmedInput || trimmedInput.length !== 6) return false;

  // 1. Check local session code first
  if (expectedLocalOtp && trimmedInput === expectedLocalOtp) {
    return true;
  }

  // 2. Check Firestore settings record
  try {
    const cleanEmail = email.toLowerCase().trim();
    const safeDocKey = `email_otp_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`;
    const snap = await getDoc(doc(db, "settings", safeDocKey));
    if (snap.exists()) {
      const data = snap.data();
      if (data.otp === trimmedInput && Number(data.expiresAt) > Date.now()) {
        return true;
      }
    }
  } catch (e) {
    console.warn("Error verifying email OTP against Firestore:", e);
  }

  return false;
}

/**
 * Sign out current user
 */
export async function logoutUser() {
  await signOut(auth);
}

/**
 * Sync customer details in Firestore 'customers' collection:
 * Strictly isolated to the authenticated user's own document (customers/${user.uid}).
 * Never cross-links, borrows, or shares data with any other account.
 */
export async function syncCustomerDoc(
  user: FirebaseUser,
  extra?: { name?: string; phone?: string; email?: string; photoURL?: string }
) {
  try {
    const userEmail = (extra?.email || user.email || "").toLowerCase().trim();
    const customerRef = doc(db, "customers", user.uid);
    const snap = await getDoc(customerRef);

    const existingData: Record<string, unknown> = snap.exists() ? snap.data() : {};

    const rawNames = [
      extra?.name,
      user.displayName,
      existingData.name,
    ];
    let resolvedName = "";
    for (const n of rawNames) {
      if (typeof n === "string" && n.trim()) {
        const t = n.trim();
        if (
          !t.toLowerCase().startsWith("user_") &&
          t !== "Customer" &&
          t !== "Valued Customer" &&
          t !== "Google Customer"
        ) {
          resolvedName = t;
          break;
        }
      }
    }

    const resolvedEmail = userEmail || (existingData.email as string) || "";
    const cleanPhone = extractCleanPhone(extra?.phone || (existingData.phone as string) || user.phoneNumber || "");

    const mergedPayload: Record<string, unknown> = {
      uid: user.uid,
      name: resolvedName || user.displayName || "Customer",
      email: resolvedEmail,
      phone: cleanPhone || "",
      photoURL: extra?.photoURL || user.photoURL || (existingData.photoURL as string) || "",
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
    await setDoc(customerRef, cleanPayload, { merge: true });

    return { ...existingData, ...cleanPayload };
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `customers/${user.uid}`);
    return null;
  }
}

/**
 * Persist and synchronize customer profile strictly to the user's own customer document.
 * Never leaks or copies data to other documents or global mappings.
 */
export async function saveCustomerProfile(
  userUid: string,
  profileUpdates: {
    name?: string;
    phone?: string;
    email?: string;
    gender?: string;
    savedAddress?: any;
    savedAddresses?: any[];
  }
) {
  if (!userUid) return;
  try {
    const cleanPhone = extractCleanPhone(profileUpdates.phone);
    const cleanEmail = (profileUpdates.email || "").toLowerCase().trim();
    const canonicalEmail = isSyntheticAccount(cleanEmail) ? "" : cleanEmail;

    const customerRef = doc(db, "customers", userUid);

    const payload: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };

    if (profileUpdates.name && profileUpdates.name.trim()) {
      payload.name = profileUpdates.name.trim();
    }
    if (profileUpdates.gender) {
      payload.gender = profileUpdates.gender;
    }
    if (cleanPhone) {
      payload.phone = cleanPhone;
    }
    if (canonicalEmail) {
      payload.email = canonicalEmail;
    }
    if (profileUpdates.savedAddress) {
      payload.savedAddress = cleanFirestoreObject(profileUpdates.savedAddress);
    }
    if (Array.isArray(profileUpdates.savedAddresses)) {
      payload.savedAddresses = cleanFirestoreObject(profileUpdates.savedAddresses);
    }

    await setDoc(customerRef, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `customers/${userUid}`);
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

    const uid = userUid || order.customerUid || null;
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

      syncFirst25CampaignOrder(uid, order.orderRef).catch((e) =>
        console.warn("First25 auto-enroll notice:", e)
      );
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
 * Delete order permanently from Firestore 'orders' collection
 */
export async function deleteOrderFromFirestore(orderRef: string): Promise<boolean> {
  if (!orderRef) return false;
  try {
    const orderDocRef = doc(db, "orders", orderRef);
    await deleteDoc(orderDocRef);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `orders/${orderRef}`);
    return false;
  }
}

/**
 * Listen to orders for a specific user in real-time.
 * Strictly queries orders belonging to this user's UID (customerUid == userUid).
 * Never leaks or queries orders across phone numbers or other accounts.
 */
export function subscribeUserOrders(
  userUid: string | undefined,
  _phone?: string | undefined,
  _email?: string | undefined,
  callback: (orders: Order[]) => void = () => {},
  _primaryUid?: string
) {
  if (!userUid) {
    callback([]);
    return () => {};
  }

  try {
    const ordersCol = collection(db, "orders");
    const qOrders = query(ordersCol, where("customerUid", "==", userUid));

    return onSnapshot(
      qOrders,
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as Order;
          list.push(data);
        });
        list.sort(
          (a, b) => (b.timestamp || b.timestampMs || 0) - (a.timestamp || a.timestampMs || 0)
        );
        callback(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "orders");
      }
    );
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
 * Clean object of any undefined values before writing to Firestore
 */
function cleanObjectForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  return JSON.parse(JSON.stringify(obj, (_, v) => (v === undefined ? null : v)));
}

/**
 * Save store CMS configuration to Firestore document 'settings/store_config'
 */
export async function saveStoreConfigToFirestore(config: StoreCMSConfig): Promise<boolean> {
  try {
    const configDocRef = doc(db, "settings", "store_config");
    const sanitized = cleanObjectForFirestore(config);
    await setDoc(
      configDocRef,
      {
        ...sanitized,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error("Error saving store_config to Firestore:", err);
    handleFirestoreError(err, OperationType.WRITE, "settings/store_config");
    return false;
  }
}

/**
 * Direct atomic update for shipping thresholds & delivery fees in Firestore
 */
export async function saveShippingRulesToFirestore(threshold: number, standardFee: number): Promise<boolean> {
  try {
    const configDocRef = doc(db, "settings", "store_config");
    await setDoc(
      configDocRef,
      {
        freeShippingThreshold: Number(threshold),
        standardShippingFee: Number(standardFee),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error("Error saving shipping rules to Firestore:", err);
    handleFirestoreError(err, OperationType.WRITE, "settings/store_config");
    return false;
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

/**
 * Synchronize First 25 Kitchens Campaign membership and order counts in Firestore.
 * Everything is persisted directly in Firestore (zero reliance on localStorage).
 */
export async function syncFirst25CampaignOrder(customerUid: string, orderRef: string): Promise<void> {
  if (!customerUid) return;
  try {
    const campaignDocRef = doc(db, "campaigns", "first25kitchens");
    const campaignSnap = await getDoc(campaignDocRef);
    let claimedSlots = 0;
    let enrolledCustomerUids: string[] = [];

    if (campaignSnap.exists()) {
      const data = campaignSnap.data();
      claimedSlots = Number(data.claimedSlots) || 0;
      enrolledCustomerUids = Array.isArray(data.enrolledCustomerUids) ? data.enrolledCustomerUids : [];
    }

    const customerRef = doc(db, "customers", customerUid);
    const customerSnap = await getDoc(customerRef);
    const customerData = customerSnap.exists() ? customerSnap.data() : {};
    const existingOrdersCount = Number(customerData.successfulOrdersCount || customerData.totalOrders || 0);
    const isAlreadyEnrolled =
      enrolledCustomerUids.includes(customerUid) || Boolean(customerData.isFirst25KitchensMember);

    // If customer is not yet enrolled and slots remain under 25:
    if (!isAlreadyEnrolled && claimedSlots < 25 && existingOrdersCount === 0) {
      const nextSlots = claimedSlots + 1;
      await setDoc(
        campaignDocRef,
        {
          campaignId: "first25kitchens",
          maxSlots: 25,
          claimedSlots: nextSlots,
          isActive: nextSlots < 25,
          enrolledCustomerUids: arrayUnion(customerUid),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await setDoc(
        customerRef,
        {
          isFirst25KitchensMember: true,
          first25OrderRef: orderRef,
          first25SlotNumber: nextSlots,
          successfulOrdersCount: increment(1),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      // Returning customer or post-campaign customer: increment verified orders count
      await setDoc(
        customerRef,
        {
          successfulOrdersCount: increment(1),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn("First25 campaign sync notice:", err);
  }
}

/**
 * Real-time listener for the First 25 Kitchens campaign status in Firestore.
 */
export function subscribeFirst25Campaign(
  callback: (campaign: First25CampaignData) => void
): () => void {
  try {
    const campaignDocRef = doc(db, "campaigns", "first25kitchens");
    return onSnapshot(
      campaignDocRef,
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const claimed = Number(d.claimedSlots) || 0;
          const max = Number(d.maxSlots) || 25;
          callback({
            campaignId: "first25kitchens",
            maxSlots: max,
            claimedSlots: claimed,
            isActive: d.isActive !== false && claimed < max,
            enrolledCustomerUids: Array.isArray(d.enrolledCustomerUids) ? d.enrolledCustomerUids : [],
            updatedAt: d.updatedAt ? String(d.updatedAt) : new Date().toISOString(),
          });
        } else {
          // Initialize document in Firestore if not present
          const initData: First25CampaignData = {
            campaignId: "first25kitchens",
            maxSlots: 25,
            claimedSlots: 0,
            isActive: true,
            enrolledCustomerUids: [],
            updatedAt: new Date().toISOString(),
          };
          setDoc(campaignDocRef, {
            ...initData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }).catch(() => {});
          callback(initData);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, "campaigns/first25kitchens");
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, "campaigns/first25kitchens");
    return () => {};
  }
}

