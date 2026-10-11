const PHONEPE_ENDPOINTS = {
  AUTH_URL: "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
  PAY_URL: "https://api.phonepe.com/apis/pg/checkout/v2/pay",
  STATUS_URL: "https://api.phonepe.com/apis/pg/checkout/v2/order"
};

let cachedToken = null;
let tokenExpiry = 0;

// Fetch or reuse valid OAuth token
async function getAccessToken(env) {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const tokenPayload = new URLSearchParams({
    client_id: env.PHONEPE_CLIENT_ID,
    client_version: "1",
    client_secret: env.PHONEPE_CLIENT_SECRET,
    grant_type: "client_credentials"
  });

  const res = await fetch(PHONEPE_ENDPOINTS.AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenPayload.toString()
  });

  if (!res.ok) {
    throw new Error("PhonePe OAuth failed: " + await res.text());
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = now + 1200 * 1000; // Cache for 20 minutes
  return cachedToken;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. CREATE PHONEPE CHECKOUT SESSION
    if (action === "create_order") {
      const body = await request.json();
      const baseRef = String(body.orderRef || ("MP_" + Date.now())).trim();
      const merchantOrderId = baseRef.replace(/[^a-zA-Z0-9_-]/g, "").substring(0, 35);
      const amountInPaise = Math.round(parseFloat(body.amount || 0) * 100);

      const cleanPhone = String(body.phone || "9999999999").replace(/\D/g, "");
      const mobile10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : "9999999999";
      const redirectBase = body.redirectBaseUrl || url.origin;
      const returnUrl = `${redirectBase.replace(/\/$/, "")}/?orderRef=${encodeURIComponent(baseRef)}`;

      const token = await getAccessToken(env);
      const v2Payload = {
        merchantOrderId: merchantOrderId,
        amount: amountInPaise,
        expireAfter: 1200,
        paymentFlow: {
          type: "PG_CHECKOUT",
          message: `Payment for order #${baseRef}`,
          merchantUrls: { redirectUrl: returnUrl }
        },
        prefillUserLoginDetails: { phoneNumber: mobile10 }
      };

      const res = await fetch(PHONEPE_ENDPOINTS.PAY_URL, {
        method: "POST",
        headers: {
          "Authorization": `O-Bearer ${token}`,
          "Content-Type": "application/json",
          "accept": "application/json"
        },
        body: JSON.stringify(v2Payload)
      });

      const resJson = await res.json();
      const redirectUrl = resJson.redirectUrl ||
        (resJson.data && resJson.data.redirectUrl) ||
        (resJson.data && resJson.data.instrumentResponse && resJson.data.instrumentResponse.redirectInfo && resJson.data.instrumentResponse.redirectInfo.url);

      if (redirectUrl) {
        return new Response(JSON.stringify({ status: "SUCCESS", orderRef: baseRef, redirectUrl }), { headers: corsHeaders });
      }
      return new Response(JSON.stringify({ status: "ERROR", message: resJson.message || "Session declined by gateway" }), { headers: corsHeaders });
    }

    // 2. VERIFY PHONEPE PAYMENT STATUS
    if (action === "verify_order") {
      const orderRef = url.searchParams.get("orderRef");
      if (!orderRef) throw new Error("Missing orderRef");

      const merchantOrderId = orderRef.replace(/[^a-zA-Z0-9_-]/g, "").substring(0, 35);
      const token = await getAccessToken(env);
      const statusUrl = `${PHONEPE_ENDPOINTS.STATUS_URL}/${encodeURIComponent(merchantOrderId)}/status`;

      const res = await fetch(statusUrl, {
        method: "GET",
        headers: {
          "Authorization": `O-Bearer ${token}`,
          "accept": "application/json"
        }
      });

      const resJson = await res.json();
      const state = resJson.state || (resJson.data && resJson.data.state) || "";

      if (state === "COMPLETED" || state === "SUCCESS") {
        return new Response(JSON.stringify({ status: "SUCCESS", paymentStatus: "COMPLETED", orderRef }), { headers: corsHeaders });
      }
      return new Response(JSON.stringify({ status: "FAILED", paymentStatus: "FAILED", orderRef, reason: resJson.message || "Payment incomplete" }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ status: "ONLINE" }), { headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ status: "ERROR", message: err.message }), { status: 500, headers: corsHeaders });
  }
}
