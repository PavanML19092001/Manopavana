# MANOPAVANA - Complete Storefront & Firestore Order Recovery Plan

Comprehensive implementation blueprint to resolve all cart persistence, checkout execution, payment verification, and CMS tracking issues using the newly provisioned Firebase Firestore database (`manopavana-d399e`).

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The database has been provisioned into project `manopavana-d399e` with dedicated Firestore database ID `ai-studio-manopavana-c4bbbfd8-8641-4d13-b2db-ed6e779795f8`. The critical architectural updates outlined below will be deployed upon approval.

- **Firestore Database Connection**: Use `getFirestore(app, firebaseConfig.firestoreDatabaseId)` from `firebase-applet-config.json` instead of defaulting to `(default)`.
- **Cart & Profile State**: Store and sync cart items, contact details, and delivery addresses in Firestore (`customers/{uid}`) with real-time snapshots. Cart items will remain saved across page refreshes until an order is placed.
- **Payment Incomplete Recovery**: When returning from PhonePe after cancellation or failure, fetch the complete order details directly from Firestore (`orders/{orderRef}`) so the modal always displays the exact items, quantities, and totals.
- **Order Dispatch & Tracking**: Provide robust handlers for saving tracking details, rider notes, and Delhivery AWBs in the Admin CMS portal.

---

## 1. Overview & Core Concept

MANOPAVANA is an artisanal wood-pressed edible oils brand from Bengaluru. Customers can purchase groundnut, coconut, and sesame oils, participate in a bottle QR loyalty program, and choose between instant Online Payment (PhonePe PG v2) and Cash on Delivery (COD).

This update fixes:
1. **Cart Persistence**: Items added to bag survive page refreshes and browser restarts via Firestore synchronization.
2. **Customer Auto-fill**: Logged-in customer details (name, WhatsApp number, address) automatically populate checkout fields without repetitive typing.
3. **Payment Failure Display**: Eliminates the "0 items / Total: ₹0" bug in the payment incomplete modal by querying the persisted order from Firestore.
4. **Checkout Execution**: Unblocks both Online and COD checkout flows for Cart and Buy Now options, with graceful fallback handling for iframe environments.
5. **CMS Tracking Button**: Ensures the "Save Tracking Details" action successfully persists courier info, rider notes, and AWBs to Firestore.

---

## 2. User Experience & Visual Design

### Key User Flows

```
[Storefront / Product Page]
       │
       ▼ (Add to Bag / Buy Now)
[Persistent Cart in Firestore]
       │
       ▼ (Proceed to Checkout)
[Checkout Page: Pre-filled Name, Phone & Saved Address]
       │
       ├─── Option A: Cash on Delivery (COD) ───► Instant Placed Order ──► [Account / Tracker]
       │
       └─── Option B: Online Payment (PhonePe)
                 │
                 ├─── User Completes Payment ──► Payment Verified ──► [Success Modal / Tracker]
                 │
                 └─── User Cancels / Fails ──► [Recovery Modal: Exact Items, Retain Bag, Switch to COD]
```

### Visual & Interactive Feedback
- **Payment Incomplete Modal**: Clean dark luxury container displaying exact oil bottles, volume variants, subtotal, discount, and grand total. Two prominent CTAs:
  - **⚡ Retry Online Payment**: Restores items and starts a fresh payment session.
  - **💵 Switch to Cash on Delivery (COD)**: Immediately converts the pending order to Placed COD with zero data re-entry.
- **Checkout Pre-fill**: Badge indicating "Logged in as [Name/Phone]" with address and phone pre-populated from customer profile.
- **CMS Order Action**: Visible success feedback when tracking details, rider notes, or Delhivery AWBs are saved.

---

## 3. Key Product Decisions & Trade-Offs

| Decision | Chosen Approach | Rationale | Alternatives Passed |
|---|---|---|---|
| **Firestore Database Binding** | Bind to provisioned `firestoreDatabaseId` from `firebase-applet-config.json` | The project uses a named database; defaulting to `(default)` causes silent connection timeouts | Relying on unconfigured default database |
| **Cart Persistence** | Dual-layer sync: Firestore `customers/{uid}.cart` + instant local backup | Prevents empty cart on refresh; works instantly even before network snapshot resolves | Pure in-memory state or localStorage only |
| **Payment Return Verification** | Fetch order document by `orderRef` from Firestore upon return | Guarantees 100% accurate items and totals even if in-memory state was reset during redirect | Falling back to empty in-memory cart |
| **Iframe Payment Redirect** | Multi-target navigation (`window.top` + fallback launch card) | Avoids iframe `X-Frame-Options` blocks when opening external PhonePe PG | Blind `window.location.href` inside sandboxed iframe |
| **Customer Data Isolation** | User-scoped queries (`customerUid == uid`) and ABAC Firestore rules | Ensures customer privacy while allowing admin full visibility on dispatch queue | Shared order keys or open rules |

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   React Storefront                     │
│  Navbar ── ProductPage ── CartPage ── CheckoutPage     │
└───────────┬────────────────────────────────┬───────────┘
            │                                │
            ▼                                ▼
┌───────────────────────┐        ┌───────────────────────┐
│     StoreContext      │        │  App.tsx Return Hook  │
│ - cart state          │        │ - detects ?orderRef   │
│ - currentUser         │        │ - queries Firestore   │
│ - address auto-fill   │        │ - displays recovery   │
└───────────┬───────────┘        └───────────┬───────────┘
            │                                │
            ▼                                ▼
┌────────────────────────────────────────────────────────┐
│                  src/firebase.ts                       │
│ - initializeApp(firebaseConfig)                        │
│ - getFirestore(app, firebaseConfig.firestoreDatabaseId)│
│ - syncCustomerDoc / getDoc(orderRef)                   │
│ - saveOrderToFirestore / updateFirestoreOrderStatus    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│           Firestore (manopavana-d399e)                 │
│  /customers/{uid}       -> profile, cart, savedAddress │
│  /orders/{orderRef}     -> complete order record       │
│  /reviews/{reviewId}    -> verified reviews            │
│  /settings/store_config -> live CMS config & pricing   │
└────────────────────────────────────────────────────────┘
```

### Planned File Modifications

1. **`firebase-blueprint.json`**:
   - Define formal schemas for `customers`, `orders`, `reviews`, and `settings`.
2. **`firestore.rules`**:
   - Hardened ABAC security rules with `request.auth.token.email_verified` and role checks for `manopavana@gmail.com`.
   - Deploy rules via `fax.DeployRules` RPC.
3. **`src/firebase.ts`**:
   - Initialize Firestore with `firebaseConfig.firestoreDatabaseId`.
   - Implement `getOrderFromFirestore(orderRef)` to fetch accurate order data on return.
   - Clean Firestore payloads with sentinel preservation (`serverTimestamp`).
   - Add structured `handleFirestoreError`.
4. **`src/context/StoreContext.tsx`**:
   - Initialize `cart` from persistent cache.
   - Auto-save cart to Firestore on mutations; prevent premature empty array overwrites.
   - Auto-load customer profile (`name`, `phone`, `savedAddress`) on login into checkout state.
   - Do not clear cart until order placement is finalized.
5. **`src/App.tsx`**:
   - Update return handler to fetch order from Firestore on payment return, ensuring `paymentFailedOrder` has full items and totals.
6. **`src/pages/CheckoutPage.tsx`**:
   - Ensure "Pay Online" and "Place Order (COD)" execute cleanly without hanging.
   - Support Buy Now direct mode without affecting existing cart.
   - Handle iframe-safe gateway redirection.
7. **`src/pages/AdminPage.tsx`**:
   - Fix "Save Tracking Details" for Bengaluru local deliveries and custom AWB saving for outside Bengaluru orders.
