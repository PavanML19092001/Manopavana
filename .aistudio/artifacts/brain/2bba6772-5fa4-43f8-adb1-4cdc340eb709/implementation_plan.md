# Implementation Plan - Shadowfax 360 Logistics Integration

## Overview
Integrated **Shadowfax 360** as an additional delivery partner alongside existing **Delhivery Express** and **Ekart Logistics**. Configured with live production token `48633752221ffdbb5c741f940b44936e6e240d7b` (Client ID: 30046, Warehouse: Manopavana, Bengaluru 560058), defaulting to `"Regular"` (Surface Express) delivery mode as confirmed.

## Completed Changes
1. **API Endpoints (`functions/api.js` & `vite.config.ts`)**:
   - `shadowfax_test_connection`: Authenticates with `dale.shadowfax.in/api/v3/clients/orders/`, verifying live token health and facility info.
   - `shadowfax_check_pincode`: Validates 6-digit destination pin and estimates delivery timeline.
   - `shadowfax_create_shipment`: Manifests orders via Shadowfax Forward Logistics API v3 (`POST /api/v3/clients/orders/`) with pickup, return, customer, and product details. Detects insufficient wallet balance with direct dashboard recharge instructions.
   - `shadowfax_track`: Links to `https://tracker.shadowfax.in/?order_id=...`.
   - `shadowfax_packing_slip`: Generates authentic 4" x 6" thermal shipping labels with Shadowfax 360 branding, barcode, routing pincode, and order metadata.

2. **Admin Dashboard (`src/pages/AdminPage.tsx`)**:
   - Added `Ping Shadowfax API` button to Diagnostics Bar with live connection test and portal link.
   - 3-Way courier partner selector: `[ Delhivery Express ]` · `[ Ekart Logistics ]` · `[ Shadowfax 360 ]`.
   - In active order card: Verify Shadowfax Pin, `⚡ 1-Click Shadowfax Manifest`, and manual AWB input (`customShadowfaxAwb`).
   - Booked shipment banner displays `Shipment Booked (Shadowfax 360)`, AWB number, Print Label, Track Shadowfax, and Reset / Switch Courier options.

3. **Customer Orders View (`src/pages/OrdersPage.tsx`)**:
   - Real-time detection of Shadowfax shipments (`SF...` AWB or courier name).
   - "Track on Shadowfax 360" button directing customers to the official Shadowfax tracking portal.
