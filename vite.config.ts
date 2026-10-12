import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'edge-api-dev-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && (req.url.startsWith('/api') || req.url.startsWith('/functions/api'))) {
              const url = new URL(req.url, 'http://localhost:3000');
              const action = url.searchParams.get('action');

              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');

              let cachedToken: string | null = null;
              let tokenExpiresAt = 0;

              async function getPhonePeToken() {
                const now = Date.now();
                if (cachedToken && tokenExpiresAt > now + 60000) return cachedToken;
                const params = new URLSearchParams();
                params.append("client_id", "SU2609091606384536532802");
                params.append("client_version", "1");
                params.append("client_secret", "4c8a116b-8cfc-46ad-beda-1572fe0acc2f");
                params.append("grant_type", "client_credentials");

                const r = await fetch("https://api.phonepe.com/apis/identity-manager/v1/oauth/token", {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body: params.toString(),
                });
                if (!r.ok) {
                  const txt = await r.text();
                  throw new Error(`PhonePe Auth Failed: ${txt}`);
                }
                const d = await r.json();
                cachedToken = d.access_token || d.token;
                tokenExpiresAt = Date.now() + (d.expires_in || 1200) * 1000;
                return cachedToken;
              }

              if (req.method === 'POST' && action === 'create_order') {
                let bodyStr = '';
                req.on('data', chunk => { bodyStr += chunk; });
                req.on('end', async () => {
                  try {
                    const parsed = JSON.parse(bodyStr || '{}');
                    const orderRef = parsed.orderRef;
                    const amountInPaise = Math.round(parseFloat(parsed.amount || 0) * 100);

                    if (!orderRef || isNaN(amountInPaise) || amountInPaise < 100) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ status: 'FAILED', message: 'Invalid orderRef or amount' }));
                      return;
                    }

                    const token = await getPhonePeToken();
                    const redirectUrl = `${parsed.redirectBaseUrl || 'https://manopavana.com'}/?orderRef=${encodeURIComponent(orderRef)}`;

                    const payload = {
                      merchantId: "M22I0LXKSWR86",
                      merchantTransactionId: orderRef,
                      merchantUserId: parsed.phone ? `USR_${parsed.phone}` : `USR_${Date.now()}`,
                      amount: amountInPaise,
                      redirectUrl: redirectUrl,
                      redirectMode: "REDIRECT",
                      callbackUrl: `https://manopavana.com/api?action=webhook`,
                      mobileNumber: parsed.phone ? String(parsed.phone).replace(/\D/g, "").slice(-10) : undefined,
                      paymentInstrument: { type: "PAY_PAGE" },
                    };

                    const payResp = await fetch("https://api.phonepe.com/apis/pg/checkout/v2/pay", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `O-Bearer ${token}`,
                      },
                      body: JSON.stringify(payload),
                    });

                    const payData = await payResp.json();
                    const instrumentResponse = payData.data?.instrumentResponse;
                    const checkoutRedirect =
                      instrumentResponse?.redirectInfo?.url ||
                      payData.redirectUrl ||
                      instrumentResponse?.redirectUrl ||
                      payData.data?.redirectUrl;

                    if (!payResp.ok || (!checkoutRedirect && payData.code !== "PAYMENT_INITIATED")) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({
                        status: 'FAILED',
                        message: payData.message || 'Payment initiation failed',
                        raw: payData,
                      }));
                      return;
                    }

                    res.statusCode = 200;
                    res.end(JSON.stringify({
                      status: 'SUCCESS',
                      orderRef,
                      redirectUrl: checkoutRedirect || redirectUrl,
                      raw: payData,
                    }));
                  } catch (e: any) {
                    res.statusCode = 502;
                    res.end(JSON.stringify({ status: 'FAILED', message: e?.message || 'Server error' }));
                  }
                });
                return;
              }

              if (req.method === 'GET' && action === 'verify_order') {
                const orderRef = url.searchParams.get('orderRef');
                if (!orderRef) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ status: 'FAILED', message: 'Missing orderRef' }));
                  return;
                }

                try {
                  const token = await getPhonePeToken();
                  const verifyResp = await fetch(`https://api.phonepe.com/apis/pg/checkout/v2/order/M22I0LXKSWR86/${orderRef}/status`, {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `O-Bearer ${token}`,
                    },
                  });
                  const verifyData = await verifyResp.json();
                  const code = verifyData.code || '';
                  const state = verifyData.data?.state || '';

                  if (code === 'PAYMENT_SUCCESS' || state === 'COMPLETED' || state === 'SUCCESS') {
                    res.statusCode = 200;
                    res.end(JSON.stringify({
                      status: 'SUCCESS',
                      paymentStatus: 'COMPLETED',
                      orderRef,
                      data: verifyData.data,
                    }));
                  } else {
                    res.statusCode = 200;
                    res.end(JSON.stringify({
                      status: 'FAILED',
                      paymentStatus: 'FAILED',
                      orderRef,
                      reason: verifyData.message || 'Payment not completed',
                      data: verifyData,
                    }));
                  }
                } catch (e: any) {
                  res.statusCode = 502;
                  res.end(JSON.stringify({ status: 'ERROR', message: e?.message || 'Verification error' }));
                }
                return;
              }

              res.statusCode = 200;
              res.end(JSON.stringify({ status: 'ONLINE', service: 'MANOPAVANA Edge PG' }));
              return;
            }
            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
