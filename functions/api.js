/**
 * Cloudflare Pages Functions - PhonePe v2 Payment Gateway Edge Handler
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
  const authUrl = env.PHONEPE_AUTH_URL || "https://api.phonepe.com/apis/identity-manager/v1/oauth/token";

  if (!clientId || !clientSecret) {
    throw new Error("Missing PHONEPE_CLIENT_ID or PHONEPE_CLIENT_SECRET in environment variables.");
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
    throw new Error(`PhonePe Auth Token Request Failed (${response.status}): ${errorText}`);
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
  const PAY_URL = env.PHONEPE_PAY_URL || "https://api.phonepe.com/apis/pg/checkout/v2/pay";
  const STATUS_URL = env.PHONEPE_STATUS_URL || "https://api.phonepe.com/apis/pg/checkout/v2/order";
  const PRODUCTION_ORIGIN = env.PRODUCTION_ORIGIN || "https://manopavana.com";

  try {
    /* -------------------------------------------------------------
     * ACTION: create_order (Initiate PG v2 payment)
     * ------------------------------------------------------------- */
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
        token = await getOAuthToken(env);
      } catch (authErr) {
        return jsonResponse({
          status: "FAILED",
          message: "Unable to authenticate with payment provider",
          details: authErr.message,
        }, 502);
      }

      const cleanPhone = phone ? String(phone).replace(/\D/g, "").slice(-10) : "";
      const baseOrigin = redirectBaseUrl || PRODUCTION_ORIGIN;
      const redirectUrl = `${baseOrigin}/?orderRef=${encodeURIComponent(orderRef)}`;

      // Official PhonePe PG v2 checkout payload schema
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
          "Authorization": `O-Bearer ${token}`,
        },
        body: JSON.stringify(checkoutPayload),
      });

      const payData = await payResponse.json();

      if (!payResponse.ok) {
        return jsonResponse({
          status: "FAILED",
          message: payData.message || "Payment initiation failed",
          raw: payData,
        }, payResponse.status);
      }

      const checkoutRedirect =
        payData.redirectUrl ||
        payData.data?.redirectUrl ||
        payData.data?.instrumentResponse?.redirectInfo?.url;

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

    /* -------------------------------------------------------------
     * ACTION: verify_order (Check transaction status)
     * ------------------------------------------------------------- */
    if (request.method === "GET" && action === "verify_order") {
      const orderRef = url.searchParams.get("orderRef");
      if (!orderRef) {
        return jsonResponse({ status: "FAILED", message: "Missing orderRef parameter" }, 400);
      }

      let token;
      try {
        token = await getOAuthToken(env);
      } catch (authErr) {
        return jsonResponse({
          status: "FAILED",
          orderRef,
          paymentStatus: "FAILED",
          reason: "Auth token acquisition failed: " + authErr.message,
        }, 502);
      }

      const statusEndpoint = `${STATUS_URL}/${orderRef}/status?details=false`;
      const verifyResponse = await fetch(statusEndpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `O-Bearer ${token}`,
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

    return jsonResponse({
      status: "FAILED",
      message: `Unsupported action or method: ${request.method} ${action || "(none)"}`,
    }, 404);
  } catch (err) {
    return jsonResponse({
      status: "ERROR",
      message: err.message || "Internal Edge Error",
    }, 500);
  }
}