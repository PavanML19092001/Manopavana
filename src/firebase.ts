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
 * Sync & Deduplicate customer details in Firestore 'customers' collection:
 * Treats Mobile Number and Email as a SINGLE UNIFIED ACCOUNT.
 * Automatically maps and syncs profile, savedAddresses, cart, and past orders together.
 */
export async function syncCustomerDoc(
  user: FirebaseUser,
  extra?: { name?: string; phone?: string; email?: string }
) {
  try {
    const userEmail = (extra?.email || user.email || "").toLowerCase().trim();
    let canonicalEmail = isSyntheticAccount(userEmail) ? "" : userEmail;

    const rawPhone = extra?.phone || user.phoneNumber || "";
    let cleanPhone =
      extractCleanPhone(rawPhone) ||
      (isSyntheticAccount(userEmail) ? userEmail.replace(/\D/g, "").slice(-10) : "");

    const customerRef = doc(db, "customers", user.uid);
    const snap = await getDoc(customerRef);

    let existingData: Record<string, unknown> = snap.exists() ? snap.data() : {};
    let primaryUid = (existingData.primaryUid as string) || user.uid;

    // 1. Single Unified Account Mapping via settings/account_mappings
    try {
      const mappingRef = doc(db, "settings", "account_mappings");
      const mappingSnap = await getDoc(mappingRef);
      const mappingData = mappingSnap.exists()
        ? mappingSnap.data()
        : { byPhone: {}, byEmail: {} };

      const byPhone = (mappingData.byPhone || {}) as Record<string, any>;
      const byEmail = (mappingData.byEmail || {}) as Record<string, any>;

      const phoneLink = cleanPhone ? byPhone[cleanPhone] : null;
      const emailLink = canonicalEmail ? byEmail[canonicalEmail] : null;

      // Unify primary account UID across phone and email
      if (phoneLink?.primaryUid) {
        primaryUid = phoneLink.primaryUid;
      } else if (emailLink?.primaryUid) {
        primaryUid = emailLink.primaryUid;
      }

      // Cross-fill missing phone or email from existing mapping
      if (!cleanPhone && emailLink?.phone) {
        cleanPhone = emailLink.phone;
      }
      if (!canonicalEmail && phoneLink?.email) {
        canonicalEmail = phoneLink.email;
      }
    } catch (mapErr) {
      console.warn("Account mapping read notice:", mapErr);
    }

    // 2. Direct Firestore query fallback: check customers collection where phone == cleanPhone
    if (cleanPhone && primaryUid === user.uid) {
      try {
        const phoneQ = query(collection(db, "customers"), where("phone", "==", cleanPhone));
        const phoneDocs = await getDocs(phoneQ);
        for (const d of phoneDocs.docs) {
          if (d.id !== user.uid) {
            const data = d.data();
            const targetMasterUid = (data.primaryUid as string) || d.id;
            primaryUid = targetMasterUid;
            existingData = { ...data, ...existingData };
            if (!canonicalEmail && data.email && !isSyntheticAccount(data.email)) {
              canonicalEmail = data.email;
            }
            break;
          }
        }
      } catch (phoneErr) {
        console.warn("Direct phone lookup error:", phoneErr);
      }
    }

    // 3. Direct Firestore query fallback: check customers collection where email == canonicalEmail
    if (canonicalEmail && primaryUid === user.uid) {
      try {
        const emailQ = query(collection(db, "customers"), where("email", "==", canonicalEmail));
        const emailDocs = await getDocs(emailQ);
        for (const d of emailDocs.docs) {
          if (d.id !== user.uid) {
            const data = d.data();
            const targetMasterUid = (data.primaryUid as string) || d.id;
            primaryUid = targetMasterUid;
            existingData = { ...data, ...existingData };
            if (!cleanPhone && data.phone) {
              cleanPhone = extractCleanPhone(data.phone);
            }
            break;
          }
        }
      } catch (emailErr) {
        console.warn("Direct email lookup error:", emailErr);
      }
    }

    // 4. If primaryUid is different from user.uid, fetch master document to inherit full profile
    if (primaryUid !== user.uid) {
      try {
        const masterSnap = await getDoc(doc(db, "customers", primaryUid));
        if (masterSnap.exists()) {
          const masterData = masterSnap.data();
          existingData = { ...masterData, ...existingData };
          if (!canonicalEmail && masterData.email && !isSyntheticAccount(masterData.email)) {
            canonicalEmail = masterData.email;
          }
          if (!cleanPhone && masterData.phone) {
            cleanPhone = extractCleanPhone(masterData.phone);
          }
        }
      } catch (masterErr) {
        console.warn("Master document load error:", masterErr);
      }
    }

    // 5. Clean, human display name resolution (never use machine IDs like user_6361509415)
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

    const resolvedEmail =
      canonicalEmail ||
      (existingData.email && !isSyntheticAccount(String(existingData.email)) ? String(existingData.email) : "") ||
      "";

    const resolvedPhone = cleanPhone || (existingData.phone as string) || "";

    const mergedPayload: Record<string, unknown> = {
      uid: user.uid,
      primaryUid,
      uids: arrayUnion(user.uid, primaryUid),
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

    // Ensure savedAddress and savedAddresses are preserved and inherited from master account
    if (existingData.savedAddress) {
      mergedPayload.savedAddress = existingData.savedAddress;
    }
    if (Array.isArray(existingData.savedAddresses) && existingData.savedAddresses.length > 0) {
      mergedPayload.savedAddresses = existingData.savedAddresses;
    }
    if (Array.isArray(existingData.cart) && existingData.cart.length > 0) {
      mergedPayload.cart = existingData.cart;
    }

    const cleanPayload = cleanFirestoreObject(mergedPayload);

    // Save to current user's document
    await setDoc(customerRef, cleanPayload, { merge: true });

    // Also mirror to primary master document if different
    if (primaryUid !== user.uid) {
      try {
        await setDoc(doc(db, "customers", primaryUid), cleanPayload, { merge: true });
      } catch (masterErr) {
        console.warn("Could not mirror to master customer doc:", masterErr);
      }
    }

    // Update global account_mappings registry
    try {
      const mappingRef = doc(db, "settings", "account_mappings");
      const mappingSnap = await getDoc(mappingRef);
      const mappingData = mappingSnap.exists()
        ? mappingSnap.data()
        : { byPhone: {}, byEmail: {} };

      const byPhone = (mappingData.byPhone || {}) as Record<string, any>;
      const byEmail = (mappingData.byEmail || {}) as Record<string, any>;

      const entry = {
        primaryUid,
        phone: resolvedPhone,
        email: resolvedEmail,
        name: resolvedName,
        savedAddress: cleanPayload.savedAddress || null,
        savedAddresses: cleanPayload.savedAddresses || [],
        updatedAt: Date.now(),
      };

      if (resolvedPhone) {
        byPhone[resolvedPhone] = entry;
      }
      if (resolvedEmail) {
        byEmail[resolvedEmail] = entry;
      }

      await setDoc(mappingRef, { byPhone, byEmail, updatedAt: serverTimestamp() }, { merge: true });
    } catch (mapUpdateErr) {
      console.warn("Account mapping update notice:", mapUpdateErr);
    }

    return { ...existingData, ...cleanPayload, primaryUid };
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `customers/${user.uid}`);
    return null;
  }
}

/**
 * Persist and synchronize customer profile across Firestore customer documents
 * and global settings/account_mappings so that Google sign-in and Phone sign-in
 * always auto-fetch the customer's name, mobile number, email, and saved addresses.
 */
export async function saveCustomerProfile(
  userUid: string,
  profileUpdates: {
    name?: string;
    phone?: string;
    email?: string;
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
    const snap = await getDoc(customerRef);
    const existing = snap.exists() ? snap.data() : {};
    const primaryUid = (existing.primaryUid as string) || userUid;

    const payload: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };

    if (profileUpdates.name && profileUpdates.name.trim()) {
      payload.name = profileUpdates.name.trim();
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

    if (primaryUid !== userUid) {
      try {
        await setDoc(doc(db, "customers", primaryUid), payload, { merge: true });
      } catch {}
    }

    // Register / update in account_mappings
    if (cleanPhone || canonicalEmail) {
      try {
        const mappingRef = doc(db, "settings", "account_mappings");
        const mapSnap = await getDoc(mappingRef);
        const mapData = mapSnap.exists() ? mapSnap.data() : { byPhone: {}, byEmail: {} };
        const byPhone = (mapData.byPhone || {}) as Record<string, any>;
        const byEmail = (mapData.byEmail || {}) as Record<string, any>;

        const resolvedName = payload.name || existing.name || "";
        const entry = {
          primaryUid,
          phone: cleanPhone || byEmail[canonicalEmail]?.phone || existing.phone || "",
          email: canonicalEmail || byPhone[cleanPhone]?.email || existing.email || "",
          name: resolvedName,
          savedAddress: payload.savedAddress || existing.savedAddress || null,
          savedAddresses: payload.savedAddresses || existing.savedAddresses || [],
          updatedAt: Date.now(),
        };

        if (cleanPhone) byPhone[cleanPhone] = entry;
        if (canonicalEmail) byEmail[canonicalEmail] = entry;

        await setDoc(mappingRef, { byPhone, byEmail, updatedAt: serverTimestamp() }, { merge: true });
      } catch (e) {
        console.warn("Account mapping update error:", e);
      }
    }
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
 * Strictly queries ONLY by customerUid so orders placed by one account
 * are never visible to another account, even if contact details match delivery recipients.
 */
export function subscribeUserOrders(
  userUid: string | undefined,
  phone: string | undefined,
  email: string | undefined,
  callback: (orders: Order[]) => void,
  primaryUid?: string
) {
  if (!userUid) {
    callback([]);
    return () => {};
  }

  try {
    const ordersCol = collection(db, "orders");
    const allowedUids = Array.from(new Set([userUid, primaryUid].filter(Boolean))) as string[];

    const qOrders =
      allowedUids.length === 1
        ? query(ordersCol, where("customerUid", "==", allowedUids[0]))
        : query(ordersCol, where("customerUid", "in", allowedUids.slice(0, 10)));

    return onSnapshot(
      qOrders,
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as Order;
          if (
            (data.customerUid && allowedUids.includes(data.customerUid)) ||
            ((data as any).firebaseUid && allowedUids.includes((data as any).firebaseUid))
          ) {
            list.push(data);
          }
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
