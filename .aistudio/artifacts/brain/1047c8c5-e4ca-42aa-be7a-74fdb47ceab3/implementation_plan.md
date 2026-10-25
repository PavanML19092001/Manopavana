# Flipkart-Grade Unified Account Identity & Greeting Resolution

This implementation plan establishes enterprise e-commerce (Flipkart-level) unified account resolution across Google Sign-In and WhatsApp OTP, displaying authentic customer names instead of machine IDs and ensuring seamless order continuity.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed in Phase 1:
> - **Account Linking**: Auto-unify account by verified phone number. When a user authenticates with WhatsApp OTP on a mobile number already recorded in an existing account, the session links to their master customer profile.
> - **Header Greeting**: Display the customer's real name (from Google account or saved profile) rather than synthetic machine IDs like `user_6361509415`. Fall back cleanly to "Valued Customer" if no name has been entered yet.
> - **Account Subtitle**: Display the customer's verified mobile phone (`+91 6361509415`) and linked email (`pavanml19092001@gmail.com`), completely hiding internal synthetic addresses (`@manopavana.app`).

---

### 1. Overview & Core Concept

- **What It Does**: Unifies dual-channel customer logins (Google OAuth and WhatsApp OTP) around a single master customer profile anchored by verified mobile phone number.
- **Target Audience**: Store shoppers who alternate between one-click Google Sign-In on desktop/mobile and WhatsApp OTP login on their smartphone.
- **Key Value**: 
  - Prevents split accounts and lost order histories.
  - Replaces raw machine labels (`Hello, user_6361509415` and `user_6361509415@manopavana.app`) with personalized greetings (`Hello, Pavan` or `Hello, Manoj`).
  - Upholds strict recipient privacy: an order placed by User X with recipient phone Y stays exclusively in User X's order history and is never exposed to User Y.

---

### 2. User Experience & Visual Design

#### A. Header Greeting & Profile Dropdown
- **User Avatar**: Initial of the customer's real name (e.g. "P" for Pavan), styled with warm amber border `#E08F35`.
- **Greeting Line**: `Hello, Pavan M L` (or first name `Hello, Pavan`).
- **Account Identity Subtitle**:
  - Primary line: Verified mobile number `+91 6361509415`.
  - Secondary line: Linked Google email `pavanml19092001@gmail.com` (if present).
  - Synthetic strings (`@manopavana.app`, `user_...`) are stripped from all UI surfaces.

#### B. First-Time Phone User Welcome (Zero-State Grace)
- If a brand-new user signs in via WhatsApp OTP and has never set a name, the header displays:
  - `Hello, Valued Customer`
  - Subtitle: `+91 6361509415 • WhatsApp Verified`
  - A friendly prompt in My Profile encourages entering their name.

#### C. Order History & Address Auto-Hydration
- Orders placed under either Google UID or WhatsApp UID are indexed under the unified `primaryUid`.
- When navigating to **My Orders** (`/account?tab=orders`), the complete order history is immediately visible.
- Saved delivery addresses and active carts sync seamlessly across both authentication methods.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Verified Phone As Identity Bridge**
  - *Chosen Approach*: When a user signs in via WhatsApp OTP, they prove physical possession of the SIM card / WhatsApp account. If that clean 10-digit phone number is registered to an existing customer record, the system links the new auth session to the existing customer profile (`primaryUid`).
  - *Why*: This is the exact pattern used by Flipkart, Swiggy, and Amazon India.
  - *Alternative Considered*: Requiring users to manually type a password or re-authenticate Google when logging in via WhatsApp was rejected because it introduces unnecessary friction.

- **Decision 2: Strict Recipient Order Privacy Protection**
  - *Chosen Approach*: An order's owner is determined strictly by the placing account UID (`order.customerUid`), **not** by the recipient phone in `shippingAddress.phone`.
  - *Why*: If User X orders a gift to friend User Y's phone number, User Y should never see User X's order when User Y logs in with their own account.

- **Decision 3: Global CustomerProfile State in Context**
  - *Chosen Approach*: Lift full `customerProfile` state into `StoreContext` and subscribe in real-time via `onSnapshot` to the resolved `primaryUid`.
  - *Why*: Eliminates dependency on Firebase Auth's static `currentUser` object, enabling instantaneous header and profile updates whenever profile details change.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION FLOW                             │
├──────────────────────────────┬─────────────────────────────────────────┤
│    Google Sign-In (OAuth)    │          WhatsApp OTP (Green-API)       │
│  pavanml19092001@gmail.com   │               6361509415                │
└──────────────┬───────────────┴────────────────────┬────────────────────┘
               │                                    │
               ▼                                    ▼
┌──────────────────────────────┐     ┌───────────────────────────────────┐
│     Firebase Auth User       │     │     Firebase Auth User            │
│   (UID: google_uid_123)      │     │    (UID: phone_uid_456)           │
└──────────────┬───────────────┘     └──────────────┬────────────────────┘
               │                                    │
               ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               FIRESTORE RESOLUTION: syncCustomerDoc()                  │
│  1. Check settings/account_mappings or query customers by phone        │
│  2. If phone 6361509415 matches google_uid_123:                        │
│     -> primaryUid = "google_uid_123"                                   │
│     -> customerDoc[phone_uid_456].primaryUid = "google_uid_123"        │
│     -> Inherit: name ("Pavan M L"), email ("pavanml..."), addresses    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       STORE CONTEXT & NAVBAR UI                        │
│  - customerProfile: { name: "Pavan M L", phone: "6361509415", ... }   │
│  - Header Greeting: "Hello, Pavan M L"                                 │
│  - Header Subtitle: "+91 6361509415 • pavanml19092001@gmail.com"       │
│  - Orders Filter: o.customerUid in [user.uid, primaryUid]              │
└────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Execution Steps:
1. **Extend `StoreContextType`**:
   - Add `customerProfile: CustomerProfile | null` to `StoreContextType` and export it through `useStore()`.
2. **Upgrade `syncCustomerDoc` in `src/firebase.ts`**:
   - When a phone login occurs, query Firestore `customers` where `phone == cleanPhone`.
   - If a matching document exists with a real email or name, set `primaryUid` to that document's UID.
   - Synchronize profile attributes (`name`, `email`, `phone`, `savedAddress`, `savedAddresses`) bidirectionally.
3. **Update `Navbar.tsx` Greeting & Dropdown**:
   - Compute `displayName` from `customerProfile?.name || currentUser?.displayName`.
   - If missing, fall back to `"Valued Customer"` (never machine ID strings).
   - Display formatted phone `+91 ${cleanPhone}` and email in the subtitle.
4. **Update `AccountPage.tsx` Order Filtering**:
   - Match orders where `o.customerUid` matches either `currentUser.uid` or `customerProfile.primaryUid`.
   - Display verified personal details in the profile card.
