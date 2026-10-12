/**
 * Cloudflare Pages Functions - PhonePe v2 Payment Gateway Edge Handler
 * Route: /api or /functions/api
 */

const PHONEPE_CONFIG = {
  CLIENT_ID: "SU2609091606384536532802",
  CLIENT_VERSION: "1",
  CLIENT_SECRET: "4c8a116b-8cfc-46ad-beda-1572fe0acc2f",
  MERCHANT_ID: "M22I0LXKSWR86",
  AUTH_URL: "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
  PAY_URL: "https://api.phonepe.com/apis/pg/checkout/v2/pay",
  STATUS_URL: "https://api.phonepe.com/apis/pg/checkout/v2/order",
  PRODUCTION_ORIGIN: "https://manopavana.com",
};

// In-memory token cache for serverless edge execution
let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Fetch or reuse in-memory OAuth v2 Bearer token (valid 20 minutes / 1200s)
 */
async function getOAuthToken() {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  const params = new URLSearchParams();
  params.append("client_id", PHONEPE_CONFIG.CLIENT_ID);
  params.append("client_version", PHONEPE_CONFIG.CLIENT_VERSION);
  params.append("client_secret", PHONEPE_CONFIG.CLIENT_SECRET);
  params.append("grant_type", "client_credentials");

  const response = await fetch(PHONEPE_CONFIG.AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PhonePe Auth Token Request Failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const token = data.access_token || data.token;
  const expiresIn = data.expires_in || 1200; // default 20 minutes

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
  const { request } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  try {
    if (request.method === "POST" && action === "create_order") {
      let body = {};
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ status: "FAILED", message: "Invalid JSON body" }, 400);
      }

      const { orderRef, amount, phone, redirectBaseUrl } = body;

      if (!orderRef) {
        return jsonResponse({ status: "FAILED", message: "Missing orderRef" }, 400);
      }

      const amountInPaise = Math.round(parseFloat(amount || 0) * 100);
      if (isNaN(amountInPaise) || amountInPaise < 100) {
        return jsonResponse({ status: "FAILED", message: "Amount must be at least ₹1.00 (100 paise)" }, 400);
      }

      let token;
      try {
        token = await getOAuthToken();
      } catch (authErr) {
        console.error("PhonePe OAuth Error:", authErr);
        // Fallback or detailed error response
        return jsonResponse({
          status: "FAILED",
          message: "Unable to authenticate with payment provider",
          details: authErr.message
        }, 502);
      }

      const redirectUrl = `${redirectBaseUrl || PHONEPE_CONFIG.PRODUCTION_ORIGIN}/?orderRef=${encodeURIComponent(orderRef)}`;

      const checkoutPayload = {
        merchantId: PHONEPE_CONFIG.MERCHANT_ID,
        merchantTransactionId: orderRef,
        merchantUserId: phone ? `USR_${phone}` : `USR_${Date.now()}`,
        amount: amountInPaise,
        redirectUrl: redirectUrl,
        redirectMode: "REDIRECT",
        callbackUrl: `${PHONEPE_CONFIG.PRODUCTION_ORIGIN}/api?action=webhook`,
        mobileNumber: phone ? String(phone).replace(/\D/g, "").slice(-10) : undefined,
        paymentInstrument: {
          type: "PAY_PAGE",
        },
      };

      const payResponse = await fetch(PHONEPE_CONFIG.PAY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `O-Bearer ${token}`,
        },
        body: JSON.stringify(checkoutPayload),
      });

      const payData = await payResponse.json();

      if (!payResponse.ok || payData.code !== "PAYMENT_INITIATED" && payData.success !== true) {
        const errorMsg = payData.message || "Payment initiation failed";
        return jsonResponse({
          status: "FAILED",
          message: errorMsg,
          raw: payData
        }, 400);
      }

      const instrumentResponse = payData.data?.instrumentResponse;
      const checkoutRedirect =
        instrumentResponse?.redirectInfo?.url ||
        payData.redirectUrl ||
        instrumentResponse?.redirectUrl ||
        payData.data?.redirectUrl;

      if (!checkoutRedirect) {
        return jsonResponse({
          status: "FAILED",
          message: "No checkout redirect URL provided by PhonePe PG",
          raw: payData,
        }, 502);
      }

      return jsonResponse({
        status: "SUCCESS",
        orderRef,
        redirectUrl: checkoutRedirect,
        raw: payData,
      });
    }

    if (request.method === "GET" && action === "verify_order") {
      const orderRef = url.searchParams.get("orderRef");
      if (!orderRef) {
        return jsonResponse({ status: "FAILED", message: "Missing orderRef query parameter" }, 400);
      }

      let token;
      try {
        token = await getOAuthToken();
      } catch (authErr) {
        console.error("PhonePe OAuth Error:", authErr);
        return jsonResponse({
          status: "FAILED",
          orderRef,
          paymentStatus: "FAILED",
          reason: "Auth token acquisition failed: " + authErr.message
        }, 502);
      }

      const statusEndpoint = `${PHONEPE_CONFIG.STATUS_URL}/${PHONEPE_CONFIG.MERCHANT_ID}/${orderRef}/status`;
      const verifyResponse = await fetch(statusEndpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `O-Bearer ${token}`,
        },
      });

      const verifyData = await verifyResponse.json();
      const code = verifyData.code || "";
      const state = verifyData.data?.state || "";

      if (code === "PAYMENT_SUCCESS" || state === "COMPLETED" || state === "SUCCESS") {
        return jsonResponse({
          status: "SUCCESS",
          paymentStatus: "COMPLETED",
          orderRef,
          data: verifyData.data,
        });
      } else {
        return jsonResponse({
          status: "FAILED",
          paymentStatus: "FAILED",
          orderRef,
          reason: verifyData.message || "Payment not completed or failed",
          data: verifyData,
        });
      }
    }

    return jsonResponse({
      status: "FAILED",
      message: `Unsupported action or method: ${request.method} ${action || "(none)"}`
    }, 404);
  } catch (err) {
    console.error("Cloudflare Edge Function Error:", err);
    return jsonResponse({
      status: "ERROR",
      message: err.message || "Internal Edge Error"
    }, 500);
  }
}
