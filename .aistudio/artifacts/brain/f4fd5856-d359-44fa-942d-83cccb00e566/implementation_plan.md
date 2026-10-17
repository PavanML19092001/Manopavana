# Architecture & Implementation Plan: Pure Firestore Sync, Comprehensive CMS & Bengaluru Logistics

## Title & Summary
Complete data persistence migration from `localStorage` to real-time Cloud Firestore, enabling seamless cross-device synchronization between laptop and mobile for customer orders, cart, and addresses. Introduces an exclusive, comprehensive CMS management portal for `manopavana@gmail.com` with PIN `1917` verification (with Cloudflare encryption guidance), customer storefront preview mode, updated Firestore security rules, and instant Bengaluru intra-city delivery integration.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Key Decisions Confirmed with User in Phase 1:**
> - **Cross-Device Persistence**: Completely eliminate client-side `localStorage` dependencies for orders, customer delivery addresses, and active shopping cart; all user state will read and write directly to Cloud Firestore in real time.
> - **Admin Experience for `manopavana@gmail.com`**: When logging in as `manopavana@gmail.com`, the user is greeted by the secure PIN gate (`1917`). Once unlocked, the view seamlessly transforms into the exclusive **MANOPAVANA Master CMS Portal**, with an intuitive top-bar toggle to switch into **Storefront Customer Preview** mode whenever desired.
> - **Bengaluru Hyper-Local Logistics**: Integrated **Borzo (WeFast)** as the recommended instant self-serve API alternative to Porter (instant API key generation, zero enterprise contracts, budget-friendly per-delivery rates starting at ₹40-50 across Bangalore), alongside an instant 1-tap booking dispatch card.
> - **Firestore Security Rules**: Provided revised and hardened Firestore rules to guarantee cross-device order creation and allow real-time payment status updates without permission denials.

---

## 1. Overview & Core Concept

- **What It Does**: 
  1. Migrates order persistence, cart synchronization, and customer address profiles to Firestore documents (`orders/{orderId}` and `customers/{userId}`). A customer placing an order or adding an oil bottle to their cart on a laptop will see it appear instantly on their mobile phone in real time.
  2. Reconfigures the application experience for store owner `manopavana@gmail.com`: entering the PIN (`1917`) unlocks a dedicated, master administration interface where every single parameter of the website (pricing, inventory stock toggles, hero headings, announcement ticker, delivery thresholds, facility contact details, courier tokens) can be adjusted and saved directly to Firestore `settings/storefront_config`.
  3. Provides a live **Storefront Preview** toggle in the admin header so the store owner can seamlessly inspect the storefront from a customer's perspective without logging out.
  4. Fixes the root cause of orders "disappearing" by aligning the order payload fields (`customerUid`, `firebaseUid`, `customerEmail`) with the exact Firestore security rules.
- **Target Audience**: Store owner (`manopavana@gmail.com`) for store operations and dispatch, and retail customers purchasing pure wood-pressed artisanal oils across Bengaluru and pan-India.
- **Key Value**: 100% reliable cross-device data consistency across mobile and desktop, zero order loss, full site content control without code deployments, and automated courier fulfillment.

---

## 2. User Experience & Visual Design

### Key User Flows

```
[Customer on Laptop] ──> Signs In (Phone/Google) ──> Adds Oils to Cart ──> Firestore Syncs
                                                                                │
                                                                   [Real-Time Firestore]
                                                                                │
[Customer on Mobile] <── Opens App <── Cart & Address Instantly Present <───────┘
         │
         └──> Completes Checkout (COD / PhonePe) ──> Order Saved to `orders/{orderId}`
                                                                │
                                                                ▼
                                                [Customer Account: Orders Visible]
                                                [Admin CMS: Live Dispatch Queue]
```

### Store Owner (manopavana@gmail.com) Master Experience
1. **Authentication**: Store owner logs in using `manopavana@gmail.com`.
2. **Security PIN Gate**: App presents the high-security PIN gate with PIN input `1917`.
3. **Master CMS Transformation**: The entire browser view transitions exclusively into the **MANOPAVANA Master CMS Portal**:
   - **Store Header**: Clean admin top-bar with Facility Status, Cloudflare Security indicator, and a prominent button **"👁️ Preview Storefront as Customer"**.
   - **Catalog & Inventory Controller**: Real-time stock status (In Stock / Sold Out toggle) and pricing for all bottle variants (1L, 500ml, Combos).
   - **Storefront Copy & Announcements**: Live editor for top announcement ticker, brand headings, facility location text, customer support WhatsApp number, and FSSAI/GSTIN licenses.
   - **Logistics & Dispatch Hub**:
     - **Delhivery Logistics Engine**: Real-time shipment booking, AWB tracking generation, and shipment status diagnostics.
     - **Bengaluru Local Delivery (Borzo / Hyperlocal)**: Quick booking module, pickup-to-drop routing, distance fee estimator, and 1-click Porter/Borzo driver assignment card.
   - **Live Storewide Orders Queue**: Visual Kanban list of all orders across India, with live status updates (Placed $\to$ Packed $\to$ Dispatched $\to$ Delivered), Google Maps pin-drop, and 1-click WhatsApp customer dispatch messages.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Pure Cloud Firestore Persistence (Zero localStorage Dependency)
- **Chosen Approach**: Remove all reliance on browser `localStorage` for orders, cart, and address data. On auth state change, initialize real-time Firestore listeners (`onSnapshot`) on `customers/{user.uid}` and `orders` where `customerUid == user.uid`.
- **Why**: `localStorage` is device-isolated; an order or cart saved in a laptop browser storage can never be seen on a mobile browser. Real-time Firestore sync ensures that any change made on one device instantly reflects on every device logged into that account.
- **Preventing Order Disappearance**: Previously, guest orders or orders with mismatched UID keys failed Firestore creation under strict security rules and only existed in temporary browser cache. By strictly requiring authenticated checkout and saving `customerUid` & `firebaseUid`, orders are permanently stored in Firestore cloud database.

### Decision 2: Admin PIN (1917) & Cloudflare Encryption Architecture
- **Chosen Approach**: Implement a salted cryptographic hash verification in client code (SHA-256 hash of `1917` with environment variable support) and configure Cloudflare Pages / Workers environment variable `ADMIN_PIN_HASH` / `ADMIN_PIN`.
- **Why**: Hardcoding plaintext passwords in public frontend code is a security vulnerability. Using a cryptographic hash ensures the raw PIN cannot be reverse-engineered from source inspect, while Cloudflare environment secrets protect backend routes.
- **Guidance Provided**: Complete step-by-step documentation for adding the encrypted variable inside Cloudflare Dashboard $\to$ Pages $\to$ Settings $\to$ Environment Variables.

### Decision 3: Bengaluru Delivery Partner — Borzo (WeFast)
- **Chosen Approach**: Integrate **Borzo (WeFast)** as the recommended Bengaluru local delivery solution alongside 1-click Porter drop details.
- **Why**: 
  - Unlike Porter Enterprise which requires sales callbacks and enterprise onboarding, Borzo allows instant self-serve merchant account creation and immediate API key generation.
  - Highly budget-friendly in Bengaluru (starts ~₹40 for bike deliveries up to 5kg).
  - Provides instant bike messenger pickup from Peenya 2nd Stage directly to any customer doorstep in Bengaluru in under 60–90 minutes.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Cloud Firestore                               │
│                                                                        │
│   customers/{userId}          orders/{orderId}     settings/storefront │
│  ┌──────────────────┐       ┌─────────────────┐   ┌──────────────────┐ │
│  │ profile          │       │ orderRef        │   │ pricing          │ │
│  │ savedAddress     │       │ customerUid     │   │ stockStatus      │ │
│  │ cart [items...]  │       │ items, total    │   │ announcementText │ │
│  └────────┬─────────┘       │ orderStatus     │   │ logisticsConfig  │ │
│           │                 └────────┬────────┘   └────────┬─────────┘ │
└───────────┼──────────────────────────┼─────────────────────┼───────────┘
            │                          │                     │
            ▼                          ▼                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        StoreContext (React Engine)                     │
│                                                                        │
│   onAuthStateChanged(user)                                             │
│     ├── subscribe(customers/user.uid) ──> setCart, setAddress          │
│     ├── subscribe(orders, customerUid) ──> setOrders (Strict Exclusivity│
│     └── if (manopavana@gmail.com) ──> subscribeAllOrders, setAdminOrders│
└────────────────────────────────────────────────────────────────────────┘
            │                                                │
   [Regular Customers]                            [manopavana@gmail.com]
            │                                                │
            ▼                                                ▼
  Storefront & Mobile / Laptop                    PIN Gate (1917)
  Cross-Device Synced Orders & Cart                          │
                                                             ▼
                                                  Master CMS Portal View
                                                  (with Storefront Preview Toggle)
```

### Revised Firestore Security Rules

To ensure orders and status updates never fail or get rejected by Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null && request.auth.token.email == "manopavana@gmail.com";
    }

    // Customer Profiles: Each customer can only read/write their own document
    match /customers/{userId} {
      allow read, write: if (request.auth != null && request.auth.uid == userId) || isAdmin();
    }

    // Orders Collection: Authenticated Only with Strict Owner Access
    match /orders/{orderId} {
      // Must be authenticated and the order must belong to their UID (or admin)
      allow read: if isAdmin() || (
        request.auth != null && (
          resource.data.customerUid == request.auth.uid ||
          resource.data.firebaseUid == request.auth.uid
        )
      );

      // Must be logged in with matching customerUid
      allow create: if isAdmin() || (
        request.auth != null && (
          request.resource.data.customerUid == request.auth.uid ||
          request.resource.data.firebaseUid == request.auth.uid
        )
      );

      // Allow Admin, or Customer owner to update their own order (e.g. COD conversion / payment status)
      allow update: if isAdmin() || (
        request.auth != null && (
          resource.data.customerUid == request.auth.uid ||
          resource.data.firebaseUid == request.auth.uid
        )
      );

      // Only Admin can delete orders
      allow delete: if isAdmin();
    }

    // Storefront CMS Configuration (Public to read, Admin to edit)
    match /settings/{document=**} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Customer Reviews
    match /reviews/{reviewId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if isAdmin();
    }

    // Catalog & Inventory
    match /products/{productId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /inventory/{itemId} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

---

## 5. Step-by-Step Implementation Strategy

1. **Firestore Client Persistence (`src/context/StoreContext.tsx` & `src/firebase.ts`)**:
   - Completely eliminate `localStorage` reading/writing for `orders`, `address`, and `cart`.
   - In `saveOrderToFirestore`, ensure both `customerUid` and `firebaseUid` are set to `currentUser.uid`.
   - On customer sign-in, bind real-time Firestore listeners for both `customers/{uid}` and `orders` where `customerUid == uid`.
2. **Master CMS Portal Integration (`src/pages/AdminPage.tsx` & `src/App.tsx`)**:
   - Update PIN verification to `1917` with secure SHA-256 hash validation and Cloudflare environment variable integration.
   - When authenticated as `manopavana@gmail.com` and PIN unlocked, show the Master CMS Portal as the primary application view, equipped with an intuitive header toggle: **"👁️ Switch to Storefront Preview"** / **"⚙️ Back to Master CMS"**.
   - Expand editable CMS options to cover:
     - All product prices, descriptions, and stock statuses.
     - Top announcement ticker text and marquee speed.
     - Facility address, GSTIN, FSSAI, WhatsApp support number.
     - Bangalore delivery threshold and courier API parameters.
3. **Logistics & Bengaluru Delivery Integration**:
   - **Delhivery Logistics Engine**: Ensure Delhivery token, warehouse origin pincode (`560058`), and sample waybill generation operate reliably in the CMS lab.
   - **Borzo (WeFast) Local Delivery Hub**: Add the dedicated Borzo intra-city booking card and configuration tab with step-by-step merchant registration guidance.
   - Retain the 1-click **Copy Drop Details for Porter / Borzo Rider** action.
4. **Cloudflare Security & Environment Variable Guide**:
   - Provide clear, simple instructions in the summary for configuring encrypted secrets in Cloudflare Pages.
5. **Compilation & Verification**:
   - Run `compile_applet` and `lint_applet` to confirm clean compilation and zero errors.
