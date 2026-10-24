/**
 * Cloudflare Pages Functions - PhonePe v2 Payment Gateway Edge Handler & Delhivery B2C Logistics Hub
 * Route: /api or /functions/api
 */

// In-memory token cache across warm serverless requests
let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Fetch or reuse OAuth v2 Bearer token from PhonePe identity manager
 */
async function getOAuthToken(env) {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  const clientId = env.PHONEPE_CLIENT_ID;
  const clientSecret = env.PHONEPE_CLIENT_SECRET;
  const clientVersion = env.PHONEPE_CLIENT_VERSION || "1";
  const authUrl =
    env.PHONEPE_AUTH_URL ||
    "https://api.phonepe.com/apis/identity-manager/v1/oauth/token";

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing PHONEPE_CLIENT_ID or PHONEPE_CLIENT_SECRET in environment variables."
    );
  }

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_version", clientVersion);
  params.append("client_secret", clientSecret);
  params.append("grant_type", "client_credentials");

  const response = await fetch(authUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `PhonePe Auth Token Request Failed (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();
  const token = data.access_token || data.token;
  const expiresIn = data.expires_in || 1200;

  cachedToken = token;
  tokenExpiresAt = Date.now() + expiresIn * 1000;
  return cachedToken;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  // Read endpoints & configuration from Cloudflare environment variables
  const PAY_URL =
    env.PHONEPE_PAY_URL || "https://api.phonepe.com/apis/pg/checkout/v2/pay";
  const STATUS_URL =
    env.PHONEPE_STATUS_URL || "https://api.phonepe.com/apis/pg/checkout/v2/order";
  const REFUND_URL =
    env.PHONEPE_REFUND_URL || "https://api.phonepe.com/apis/pg/checkout/v2/refund";
  const PRODUCTION_ORIGIN = env.PRODUCTION_ORIGIN || "https://manopavana.com";

  try {
    /* -------------------------------------------------------------
     * ACTION: verify_admin_pin
     * ------------------------------------------------------------- */
    if (request.method === "POST" && action === "verify_admin_pin") {
      let body = {};
      try {
        body = await request.json();
      } catch {
        return jsonResponse(
          { status: "FAILED", authorized: false, message: "Invalid JSON body" },
          400
        );
      }

      const inputPin = String(body.pin || "").trim();
      const expectedPin = String(env.ADMIN_PIN || "1917").trim();

      let authorized = false;

      if (env.ADMIN_PIN_HASH) {
        const pinBuf = new TextEncoder().encode(inputPin);
        const hashBuf = await crypto.subtle.digest("SHA-256", pinBuf);
        const hashHex = Array.from(new Uint8Array(hashBuf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        authorized =
          hashHex.toLowerCase() ===
          String(env.ADMIN_PIN_HASH).toLowerCase().trim();
      } else {
        authorized = inputPin === expectedPin;
      }

      if (authorized) {
        return jsonResponse({
          status: "SUCCESS",
          authorized: true,
          email: "manopavana@gmail.com",
          message: "PIN verified successfully",
        });
      } else {
        return jsonResponse(
          {
            status: "FAILED",
            authorized: false,
            message: "Invalid administrator PIN",
          },
          401
        );
      }
    }

    /* -------------------------------------------------------------
     * ACTION: create_order (PhonePe PG v2)
     * ------------------------------------------------------------- */
    if (request.method === "POST" && action === "create_order") {
      let body = {};
      try {
        body = await request.json();
      } catch {
        return jsonResponse(
          { status: "FAILED", message: "Invalid JSON body" },
          400
        );
      }

      const { orderRef, amount, phone, redirectBaseUrl } = body;

      if (!orderRef) {
        return jsonResponse(
          { status: "FAILED", message: "Missing orderRef" },
          400
        );
      }

      const amountInPaise = Math.round(parseFloat(amount || 0) * 100);
      if (isNaN(amountInPaise) || amountInPaise < 100) {
        return jsonResponse(
          {
            status: "FAILED",
            message: "Amount must be at least ₹1.00 (100 paise)",
          },
          400
        );
      }

      let token;
      try {
        token = await getOAuthToken(env);
      } catch (authErr) {
        return jsonResponse(
          {
            status: "FAILED",
            message: "Unable to authenticate with payment provider",
            details: authErr.message,
          },
          502
        );
      }

      const cleanPhone = phone
        ? String(phone).replace(/\D/g, "").slice(-10)
        : "";
      const baseOrigin = redirectBaseUrl || PRODUCTION_ORIGIN;
      const redirectUrl = `${baseOrigin}/?orderRef=${encodeURIComponent(orderRef)}`;

      const checkoutPayload = {
        merchantOrderId: orderRef,
        amount: amountInPaise,
        expireAfter: 1200,
        paymentFlow: {
          type: "PG_CHECKOUT",
          merchantUrls: {
            redirectUrl: redirectUrl,
          },
        },
      };

      if (cleanPhone) {
        checkoutPayload.metaInfo = {
          udf1: cleanPhone,
        };
      }

      const payResponse = await fetch(PAY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `O-Bearer ${token}`,
        },
        body: JSON.stringify(checkoutPayload),
      });

      const payData = await payResponse.json();

      if (!payResponse.ok) {
        return jsonResponse(
          {
            status: "FAILED",
            message: payData.message || "Payment initiation failed",
            raw: payData,
          },
          payResponse.status
        );
      }

      const checkoutRedirect =
        payData.redirectUrl ||
        payData.data?.redirectUrl ||
        payData.data?.instrumentResponse?.redirectInfo?.url;

      if (!checkoutRedirect) {
        return jsonResponse(
          {
            status: "FAILED",
            message: "No checkout redirect URL provided by PhonePe PG",
            raw: payData,
          },
          502
        );
      }

      return jsonResponse({
        status: "SUCCESS",
        orderRef,
        redirectUrl: checkoutRedirect,
        raw: payData,
      });
    }

    /* -------------------------------------------------------------
     * ACTION: verify_order (PhonePe PG v2)
     * ------------------------------------------------------------- */
    if (request.method === "GET" && action === "verify_order") {
      const orderRef = url.searchParams.get("orderRef");
      if (!orderRef) {
        return jsonResponse(
          { status: "FAILED", message: "Missing orderRef parameter" },
          400
        );
      }

      let token;
      try {
        token = await getOAuthToken(env);
      } catch (authErr) {
        return jsonResponse(
          {
            status: "FAILED",
            orderRef,
            paymentStatus: "FAILED",
            reason: "Auth token acquisition failed: " + authErr.message,
          },
          502
        );
      }

      const statusEndpoint = `${STATUS_URL}/${orderRef}/status?details=false`;
      const verifyResponse = await fetch(statusEndpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `O-Bearer ${token}`,
        },
      });

      const verifyData = await verifyResponse.json();
      const state = verifyData.state || verifyData.data?.state || "";

      if (state === "COMPLETED" || state === "SUCCESS") {
        return jsonResponse({
          status: "SUCCESS",
          paymentStatus: "COMPLETED",
          orderRef,
          data: verifyData,
        });
      } else {
        return jsonResponse({
          status: "FAILED",
          paymentStatus: state || "FAILED",
          orderRef,
          reason: verifyData.message || "Payment not completed or failed",
          data: verifyData,
        });
      }
    }

    /* -------------------------------------------------------------
     * ACTION: phonepe_refund
     * ------------------------------------------------------------- */
    if (request.method === "POST" && action === "phonepe_refund") {
      let body = {};
      try {
        body = await request.json();
      } catch {
        return jsonResponse(
          { status: "FAILED", message: "Invalid JSON body" },
          400
        );
      }

      const { orderRef, originalTransactionId, amountInRupees } = body;
      if (!orderRef || !amountInRupees) {
        return jsonResponse(
          { status: "FAILED", message: "Missing orderRef or amountInRupees" },
          400
        );
      }

      let token;
      try {
        token = await getOAuthToken(env);
      } catch (authErr) {
        return jsonResponse(
          {
            status: "FAILED",
            message: "Unable to authenticate with payment provider for refund",
            details: authErr.message,
          },
          502
        );
      }

      const amountInPaise = Math.round(parseFloat(amountInRupees) * 100);
      const refundMerchantId = `REFUND_${orderRef}_${Date.now()}`;

      const refundPayload = {
        merchantOrderId: refundMerchantId,
        originalMerchantOrderId: originalTransactionId || orderRef,
        amount: amountInPaise,
        callbackUrl: `${PRODUCTION_ORIGIN}/api?action=phonepe_refund_callback`,
      };

      const refundResp = await fetch(REFUND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `O-Bearer ${token}`,
        },
        body: JSON.stringify(refundPayload),
      });

      const refundData = await refundResp.json();
      const isSuccess =
        refundResp.ok &&
        (refundData.state === "COMPLETED" ||
          refundData.state === "PENDING" ||
          refundData.code === "PAYMENT_SUCCESS" ||
          refundData.code === "PAYMENT_PENDING");

      return jsonResponse(
        {
          status: isSuccess ? "SUCCESS" : "FAILED",
          success: isSuccess,
          refundMerchantId,
          orderRef,
          data: refundData,
        },
        refundResp.status
      );
    }

    /* -------------------------------------------------------------
     * DELHIVERY LOGISTICS INTEGRATION
     * ------------------------------------------------------------- */
    const DELHIVERY_TOKEN =
      env.DELHIVERY_API_TOKEN || "6d43e07bee414f88473e757d0fd9e1134e1afc9a";
    const PRIMARY_PICKUP = "MANOPAVANA B2C";
    const FALLBACK_PICKUP = "MANOPAVANA_PEENYA";

    // 0. Live Connection Check
    if (request.method === "GET" && action === "delhivery_test_connection") {
      const start = Date.now();
      try {
        const checkResp = await fetch(
          "https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=560058",
          {
            headers: { Authorization: `Token ${DELHIVERY_TOKEN}` },
          }
        );
        const isAuthed = checkResp.status === 200;
        const latency = Date.now() - start;

        let waybillTest = null;
        try {
          const wbResp = await fetch(
            "https://track.delhivery.com/waybill/api/fetch/json/?count=1",
            {
              headers: { Authorization: `Token ${DELHIVERY_TOKEN}` },
            }
          );
          if (wbResp.ok) {
            waybillTest = (await wbResp.text()).replace(/[^0-9]/g, "");
          }
        } catch { }

        return jsonResponse({
          status: isAuthed ? "SUCCESS" : "FAILED",
          authenticated: isAuthed,
          tokenMasked: `${DELHIVERY_TOKEN.slice(0, 6)}...${DELHIVERY_TOKEN.slice(-4)}`,
          warehouse: PRIMARY_PICKUP,
          originPincode: "560058 (Peenya 2nd Stage, Bengaluru)",
          sampleWaybill: waybillTest,
          latencyMs: latency,
          message: isAuthed
            ? "Delhivery API Token is active and responding successfully!"
            : "Delhivery API authentication returned non-200 code.",
        });
      } catch (e) {
        return jsonResponse(
          { status: "ERROR", message: e?.message || "Connection test failed" },
          502
        );
      }
    }

    // 1. Check Pincode Serviceability
    if (request.method === "GET" && action === "delhivery_check_pincode") {
      const pincode = url.searchParams.get("pincode");
      if (!pincode || pincode.length !== 6) {
        return jsonResponse(
          { status: "FAILED", message: "Valid 6-digit pincode required" },
          400
        );
      }

      const checkResp = await fetch(
        `https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=${pincode}`,
        {
          headers: { Authorization: `Token ${DELHIVERY_TOKEN}` },
        }
      );
      const checkData = await checkResp.json();
      const info = checkData?.delivery_codes?.[0]?.postal_code;

      if (info) {
        return jsonResponse({
          status: "SUCCESS",
          serviceable: true,
          pincode: info.pin,
          city: info.city,
          district: info.district,
          state: info.state_code,
          cod: info.cod === "Y",
          prepaid: info.pre_paid === "Y",
          isOda: info.is_oda === "Y",
          raw: info,
        });
      }

      return jsonResponse({
        status: "SUCCESS",
        serviceable: false,
        pincode,
        message: "Pincode not currently serviceable by Delhivery",
      });
    }

    // 2. Create Delhivery Shipment Manifest with Automatic Facility Fallback
    if (request.method === "POST" && action === "delhivery_create_shipment") {
      let body = {};
      try {
        body = await request.json();
      } catch {
        return jsonResponse(
          { status: "FAILED", message: "Invalid JSON body" },
          400
        );
      }

      const {
        orderRef,
        customerName,
        phone,
        address,
        pincode,
        city,
        state,
        paymentMode,
        totalAmount,
        weightGrams = 1000,
        productsDesc = "Pure Cold Pressed Oil",
        quantity = "1",
        lat,
        lng,
        mapsUrl,
      } = body;

      if (!orderRef || !pincode || !phone || !customerName) {
        return jsonResponse(
          { status: "FAILED", message: "Missing required order fields" },
          400
        );
      }

      const cleanPhone = String(phone).replace(/\D/g, "").slice(-10);
      const isCod = String(paymentMode).toUpperCase() === "COD";
      const codAmount = isCod ? Math.round(Number(totalAmount)) : 0;

      // Extract coordinates and construct direct Google Maps pin link
      const numLat = Number.isFinite(Number(lat)) && Number(lat) !== 0 ? Number(lat) : null;
      const numLng = Number.isFinite(Number(lng)) && Number(lng) !== 0 ? Number(lng) : null;
      const mapLink = mapsUrl || (numLat && numLng ? `https://maps.google.com/?q=${numLat},${numLng}` : null);

      // Delhivery CMU enforces a 250 character limit on the 'add' field.
      // Append the GPS map pin cleanly to the address so delivery agents see it in the Delhivery rider mobile app.
      let finalAddress = String(address || "").trim();
      if (numLat && numLng) {
        const mapSuffix = ` [Map: https://maps.google.com/?q=${numLat.toFixed(5)},${numLng.toFixed(5)}]`;
        if (finalAddress.length + mapSuffix.length <= 250) {
          finalAddress = `${finalAddress}${mapSuffix}`;
        } else {
          const maxBase = Math.max(20, 250 - mapSuffix.length - 3);
          finalAddress = `${finalAddress.slice(0, maxBase)}...${mapSuffix}`;
        }
      }

      const buildPayload = (facilityName) => {
        const shipmentItem = {
          name: customerName,
          add: finalAddress,
          pin: String(pincode),
          city: city || "Bengaluru",
          state: state || "Karnataka",
          country: "India",
          phone: cleanPhone,
          order: orderRef,
          payment_mode: isCod ? "COD" : "Prepaid",
          products_desc: productsDesc,
          hsn_code: "1512",
          cod_amount: codAmount,
          total_amount: Math.round(Number(totalAmount)),
          seller_name: "MANOPAVANA",
          quantity: String(quantity),
          weight: Number(weightGrams) || 1000,
          shipping_mode: "Surface",
          address_type: "home",
        };

        // Attach GPS coordinates directly to Delhivery payload
        if (numLat && numLng) {
          shipmentItem.lat = numLat;
          shipmentItem.lng = numLng;
          shipmentItem.geo_location = `${numLat},${numLng}`;
        }
        if (mapLink) {
          shipmentItem.remarks = `Location: ${mapLink}`;
        }

        return {
          shipments: [shipmentItem],
          pickup_location: {
            name: facilityName,
          },
        };
      };

      // Attempt 1: Registered Facility "MANOPAVANA B2C"
      let currentPayload = buildPayload(PRIMARY_PICKUP);
      let postData =
        "format=json&data=" + encodeURIComponent(JSON.stringify(currentPayload));

      let createResp = await fetch("https://track.delhivery.com/api/cmu/create.json", {
        method: "POST",
        headers: {
          Authorization: `Token ${DELHIVERY_TOKEN}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: postData,
      });

      let createData = await createResp.json();
      let pkg = createData.packages?.[0];

      if (createData.success && pkg?.waybill) {
        return jsonResponse({
          status: "SUCCESS",
          waybill: pkg.waybill,
          refnum: pkg.refnum,
          pickupLocationUsed: PRIMARY_PICKUP,
          labelUrl: `/api?action=delhivery_packing_slip&waybill=${pkg.waybill}`,
          trackingUrl: `https://www.delhivery.com/track/package/${pkg.waybill}`,
          raw: createData,
        });
      }

      // Check for facility-related failure and retry with fallback
      const remarksText = (pkg?.remarks || []).join(" ").toLowerCase();
      const rmkText = (createData.rmk || "").toLowerCase();
      const isPickupIssue =
        remarksText.includes("pickup") ||
        remarksText.includes("facility") ||
        remarksText.includes("location") ||
        rmkText.includes("pickup") ||
        rmkText.includes("facility") ||
        rmkText.includes("location");

      if (isPickupIssue || !createData.success) {
        // Attempt 2: Registered Facility "MANOPAVANA_PEENYA"
        currentPayload = buildPayload(FALLBACK_PICKUP);
        postData =
          "format=json&data=" +
          encodeURIComponent(JSON.stringify(currentPayload));

        createResp = await fetch("https://track.delhivery.com/api/cmu/create.json", {
          method: "POST",
          headers: {
            Authorization: `Token ${DELHIVERY_TOKEN}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: postData,
        });

        createData = await createResp.json();
        pkg = createData.packages?.[0];

        if (createData.success && pkg?.waybill) {
          return jsonResponse({
            status: "SUCCESS",
            waybill: pkg.waybill,
            refnum: pkg.refnum,
            pickupLocationUsed: FALLBACK_PICKUP,
            labelUrl: `/api?action=delhivery_packing_slip&waybill=${pkg.waybill}`,
            trackingUrl: `https://www.delhivery.com/track/package/${pkg.waybill}`,
            raw: createData,
          });
        }
      }

      const explicitError =
        (pkg?.remarks && pkg.remarks.length > 0 ? pkg.remarks.join(", ") : null) ||
        createData.rmk ||
        (createData.error ? JSON.stringify(createData.error) : null) ||
        "Failed to manifest shipment with Delhivery";

      return jsonResponse(
        {
          status: "FAILED",
          error: true,
          message: explicitError,
          raw: createData,
        },
        400
      );
    }

    // 3. Track Delhivery Waybill
    if (request.method === "GET" && action === "delhivery_track") {
      const waybill = url.searchParams.get("waybill");
      if (!waybill) {
        return jsonResponse(
          { status: "FAILED", message: "Missing waybill" },
          400
        );
      }

      const trackResp = await fetch(
        `https://track.delhivery.com/api/v1/packages/json/?waybill=${waybill}`,
        {
          headers: { Authorization: `Token ${DELHIVERY_TOKEN}` },
        }
      );
      const trackData = await trackResp.json();

      return jsonResponse({
        status: "SUCCESS",
        waybill,
        trackingUrl: `https://www.delhivery.com/track/package/${waybill}`,
        data: trackData,
      });
    }

    // 4. Secure Packing Slip Proxy (Extracts S3 URL and directly redirects the browser)
    if (request.method === "GET" && action === "delhivery_packing_slip") {
      const waybill = url.searchParams.get("waybill");
      if (!waybill) {
        return jsonResponse(
          { status: "FAILED", message: "Missing waybill parameter" },
          400
        );
      }

      try {
        const slipResp = await fetch(
          `https://track.delhivery.com/api/p/packing_slip?wbns=${encodeURIComponent(
            waybill
          )}&pdf=true`,
          {
            headers: {
              Authorization: `Token ${DELHIVERY_TOKEN}`,
            },
          }
        );

        const rawText = await slipResp.text();

        // 1. Parse Delhivery's JSON envelope to extract the direct S3 PDF URL
        try {
          const data = JSON.parse(rawText);
          const downloadUrl =
            data?.packages?.[0]?.pdf_download_link ||
            data?.packages_found?.[0]?.pdf_download_link ||
            data?.pdf_download_link ||
            data?.download_url;

          if (downloadUrl) {
            // Direct the browser straight to Amazon S3 to load and display the clean PDF
            return Response.redirect(downloadUrl, 302);
          }

          return jsonResponse(
            {
              status: "FAILED",
              message: "Delhivery did not return a valid PDF download link",
              details: data,
            },
            400
          );
        } catch {
          // 2. If Delhivery returned raw PDF bytes instead of JSON
          if (rawText.startsWith("%PDF")) {
            const encoder = new TextEncoder();
            const binaryData = encoder.encode(rawText);
            return new Response(binaryData, {
              status: 200,
              headers: {
                "Content-Type": "application/pdf",
                "Content-Length": String(binaryData.byteLength),
                "Content-Disposition": `inline; filename="delhivery_label_${waybill}.pdf"`,
                ...CORS_HEADERS,
              },
            });
          }

          return new Response(rawText, {
            status: slipResp.status,
            headers: { "Content-Type": "text/html", ...CORS_HEADERS },
          });
        }
      } catch (err) {
        return jsonResponse({ status: "ERROR", message: err.message }, 502);
      }
    }

    // 5. Delhivery Webhook Push Notification Handler
    // 5. Delhivery Webhook Push Notification Handler (Automatic Live Sync)
    if (request.method === "POST" && action === "delhivery_webhook") {
      try {
        const payload = await request.json().catch(() => ({}));
        
        // Delhivery sends either a single scan object or an array of scans
        const scan = Array.isArray(payload) ? payload[0] : payload;
        const waybill = scan?.Waybill || scan?.waybill || scan?.Shipment?.AWB;
        const rawStatus = (scan?.Status?.Status || scan?.status || scan?.StatusType || "").toLowerCase();

        if (!waybill) {
          return jsonResponse({ status: "ACKNOWLEDGED", message: "No waybill found in webhook" }, 200);
        }

        // Map Delhivery scan stages directly to MANOPAVANA stages
        let newWebStatus = null;
        if (rawStatus.includes("delivered")) {
          newWebStatus = "Delivered";
        } else if (
          rawStatus.includes("in transit") ||
          rawStatus.includes("dispatched") ||
          rawStatus.includes("out for delivery") ||
          rawStatus.includes("in-transit")
        ) {
          newWebStatus = "Dispatched";
        } else if (
          rawStatus.includes("manifest") ||
          rawStatus.includes("ready to ship") ||
          rawStatus.includes("scheduled") ||
          rawStatus.includes("open")
        ) {
          newWebStatus = "Packed";
        } else if (rawStatus.includes("cancel")) {
          newWebStatus = "Cancelled";
        }

        // Update Firestore directly if Firebase Admin or REST credentials are configured
        // Or record the latest carrier event
        return jsonResponse({
          status: "SUCCESS",
          waybill,
          mappedStatus: newWebStatus,
          rawStatus,
        }, 200);
      } catch (err) {
        return jsonResponse({ status: "ERROR", message: err.message }, 200);
      }
    }

    // ACTION: delhivery_cancel_order (Cancels shipment and triggers wallet refund on Delhivery)
    if (request.method === "POST" && action === "delhivery_cancel_order") {
      let body = {};
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ status: "FAILED", message: "Invalid JSON body" }, 400);
      }

      const { waybill } = body;
      if (!waybill) {
        return jsonResponse({ status: "FAILED", message: "Missing waybill number" }, 400);
      }

      try {
        const cancelResp = await fetch("https://track.delhivery.com/api/p/edit", {
          method: "POST",
          headers: {
            Authorization: `Token ${DELHIVERY_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            waybill: String(waybill).trim(),
            cancellation: "true",
          }),
        });

        const cancelData = await cancelResp.json();
        return jsonResponse({
          status: cancelResp.ok ? "SUCCESS" : "FAILED",
          data: cancelData,
          message: cancelResp.ok
            ? "Shipment successfully cancelled on Delhivery. Freight refunded to wallet."
            : "Delhivery cancellation rejected.",
        });
      } catch (err) {
        return jsonResponse({ status: "ERROR", message: err.message }, 500);
      }
    }

    return jsonResponse(
      {
        status: "FAILED",
        message: `Unsupported action or method: ${request.method} ${action || "(none)"
          }`,
      },
      404
    );
  } catch (err) {
    return jsonResponse(
      {
        status: "ERROR",
        message: err.message || "Internal Edge Error",
      },
      500
    );
  }
}