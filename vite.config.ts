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

                    const checkoutPayload: any = {
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

                    if (parsed.phone) {
                      const cleanP = String(parsed.phone).replace(/\D/g, "").slice(-10);
                      if (cleanP) {
                        checkoutPayload.metaInfo = { udf1: cleanP };
                      }
                    }

                    const payResp = await fetch("https://api.phonepe.com/apis/pg/checkout/v2/pay", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `O-Bearer ${token}`,
                      },
                      body: JSON.stringify(checkoutPayload),
                    });

                    const payData = await payResp.json();
                    const checkoutRedirect =
                      payData.redirectUrl ||
                      payData.data?.redirectUrl ||
                      payData.data?.instrumentResponse?.redirectInfo?.url ||
                      payData.instrumentResponse?.redirectInfo?.url;

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
                  const verifyResp = await fetch(`https://api.phonepe.com/apis/pg/checkout/v2/order/${orderRef}/status?details=false`, {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `O-Bearer ${token}`,
                    },
                  });
                  const verifyData = await verifyResp.json();
                  const code = verifyData.code || '';
                  const state = verifyData.state || verifyData.data?.state || '';

                  if (code === 'PAYMENT_SUCCESS' || state === 'COMPLETED' || state === 'SUCCESS') {
                    res.statusCode = 200;
                    res.end(JSON.stringify({
                      status: 'SUCCESS',
                      paymentStatus: 'COMPLETED',
                      orderRef,
                      data: verifyData.data || verifyData,
                    }));
                  } else {
                    res.statusCode = 200;
                    res.end(JSON.stringify({
                      status: 'FAILED',
                      paymentStatus: state || 'FAILED',
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

              /* -------------------------------------------------------------
               * DELHIVERY LOGISTICS INTEGRATION
               * Token: 6d43e07bee414f88473e757d0fd9e1134e1afc9a
               * Warehouse: MANOPAVANA_PEENYA
               * ------------------------------------------------------------- */
              const DELHIVERY_TOKEN = process.env.DELHIVERY_API_TOKEN || "6d43e07bee414f88473e757d0fd9e1134e1afc9a";
              const DELHIVERY_WAREHOUSE = process.env.DELHIVERY_WAREHOUSE_NAME || "MANOPAVANA_PEENYA";

              // 0. Live Connection & Token Health Check
              if (req.method === 'GET' && action === 'delhivery_test_connection') {
                const start = Date.now();
                try {
                  const checkResp = await fetch(`https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=560058`, {
                    headers: { 'Authorization': `Token ${DELHIVERY_TOKEN}` }
                  });
                  const isAuthed = checkResp.status === 200;
                  const latency = Date.now() - start;

                  let waybillTest = null;
                  try {
                    const wbResp = await fetch("https://track.delhivery.com/waybill/api/fetch/json/?count=1", {
                      headers: { 'Authorization': `Token ${DELHIVERY_TOKEN}` }
                    });
                    if (wbResp.ok) {
                      waybillTest = (await wbResp.text()).replace(/[^0-9]/g, "");
                    }
                  } catch {}

                  res.statusCode = 200;
                  res.end(JSON.stringify({
                    status: isAuthed ? 'SUCCESS' : 'FAILED',
                    authenticated: isAuthed,
                    tokenMasked: `${DELHIVERY_TOKEN.slice(0, 6)}...${DELHIVERY_TOKEN.slice(-4)}`,
                    warehouse: DELHIVERY_WAREHOUSE,
                    originPincode: "560058 (Peenya 2nd Stage, Bengaluru)",
                    sampleWaybill: waybillTest,
                    latencyMs: latency,
                    message: isAuthed
                      ? "Delhivery API Token is active and responding successfully!"
                      : "Delhivery API authentication returned non-200 code."
                  }));
                } catch (e: any) {
                  res.statusCode = 502;
                  res.end(JSON.stringify({ status: 'ERROR', message: e?.message || 'Connection test failed' }));
                }
                return;
              }

              // 0b. Fetch Fresh Waybill (AWB) from Delhivery
              if (req.method === 'GET' && action === 'delhivery_fetch_waybill') {
                try {
                  const wbResp = await fetch("https://track.delhivery.com/waybill/api/fetch/json/?count=1", {
                    headers: { 'Authorization': `Token ${DELHIVERY_TOKEN}` }
                  });
                  const wbText = await wbResp.text();
                  const cleanWb = wbText.replace(/[^0-9]/g, "");
                  res.statusCode = 200;
                  res.end(JSON.stringify({
                    status: 'SUCCESS',
                    waybill: cleanWb || wbText,
                    raw: wbText
                  }));
                } catch (e: any) {
                  res.statusCode = 502;
                  res.end(JSON.stringify({ status: 'ERROR', message: e?.message || 'Waybill fetch error' }));
                }
                return;
              }

              // 1. Check Pincode Serviceability
              if (req.method === 'GET' && action === 'delhivery_check_pincode') {
                const pincode = url.searchParams.get('pincode');
                if (!pincode || pincode.length !== 6) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ status: 'FAILED', message: 'Valid 6-digit pincode required' }));
                  return;
                }

                try {
                  const checkResp = await fetch(`https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=${pincode}`, {
                    headers: { 'Authorization': `Token ${DELHIVERY_TOKEN}` }
                  });
                  const checkData = await checkResp.json();
                  const info = checkData?.delivery_codes?.[0]?.postal_code;

                  if (info) {
                    res.statusCode = 200;
                    res.end(JSON.stringify({
                      status: 'SUCCESS',
                      serviceable: true,
                      pincode: info.pin,
                      city: info.city,
                      district: info.district,
                      state: info.state_code,
                      cod: info.cod === 'Y',
                      prepaid: info.pre_paid === 'Y',
                      isOda: info.is_oda === 'Y',
                      raw: info
                    }));
                  } else {
                    res.statusCode = 200;
                    res.end(JSON.stringify({
                      status: 'SUCCESS',
                      serviceable: false,
                      pincode,
                      message: 'Pincode not currently serviceable by Delhivery'
                    }));
                  }
                } catch (e: any) {
                  res.statusCode = 502;
                  res.end(JSON.stringify({ status: 'ERROR', message: e?.message || 'Delhivery API error' }));
                }
                return;
              }

              // 2. Create Delhivery Shipment Manifest
              if (req.method === 'POST' && action === 'delhivery_create_shipment') {
                let bodyStr = '';
                req.on('data', chunk => { bodyStr += chunk; });
                req.on('end', async () => {
                  try {
                    const parsed = JSON.parse(bodyStr || '{}');
                    const {
                      orderRef,
                      customerName,
                      phone,
                      address,
                      pincode,
                      city,
                      state,
                      paymentMode, // 'Prepaid' or 'COD'
                      totalAmount,
                      weightGrams = 1000,
                      productsDesc = "Pure Cold Pressed Oil",
                      quantity = "1",
                      warehouseName = DELHIVERY_WAREHOUSE
                    } = parsed;

                    if (!orderRef || !pincode || !phone || !customerName) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ status: 'FAILED', message: 'Missing orderRef, customerName, phone, or pincode' }));
                      return;
                    }

                    const cleanPhone = String(phone).replace(/\D/g, "").slice(-10);
                    const isCod = String(paymentMode).toUpperCase() === 'COD';
                    const codAmount = isCod ? Math.round(Number(totalAmount)) : 0;

                    const manifestPayload = {
                      shipments: [{
                        name: customerName,
                        add: address,
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
                        seller_name: "MANOPAVANA B2C",
                        quantity: String(quantity),
                        weight: Number(weightGrams) || 1000,
                        shipping_mode: "Surface",
                        address_type: "home"
                      }],
                      pickup_location: {
                        name: warehouseName
                      }
                    };

                    const postData = "format=json&data=" + encodeURIComponent(JSON.stringify(manifestPayload));

                    const createResp = await fetch("https://track.delhivery.com/api/cmu/create.json", {
                      method: "POST",
                      headers: {
                        "Authorization": `Token ${DELHIVERY_TOKEN}`,
                        "Content-Type": "application/x-www-form-urlencoded"
                      },
                      body: postData
                    });

                    const createData = await createResp.json();
                    const pkg = createData.packages?.[0];

                    if (createData.success && pkg?.waybill) {
                      res.statusCode = 200;
                      res.end(JSON.stringify({
                        status: 'SUCCESS',
                        waybill: pkg.waybill,
                        refnum: pkg.refnum,
                        labelUrl: `https://track.delhivery.com/api/p/packing_slip?wbns=${pkg.waybill}&pdf=true`,
                        trackingUrl: `https://www.delhivery.com/track/package/${pkg.waybill}`,
                        raw: createData
                      }));
                      return;
                    }

                    // Check if failure is due to balance or configuration
                    const remarkMsg = pkg?.remarks?.join(", ") || createData.rmk || "Shipment manifest creation failed";
                    const isInsufficientBalance = remarkMsg.toLowerCase().includes("insufficient balance");

                    // If insufficient balance in prepaid wallet, also offer waybill fetch as fallback so admin can still ship
                    let fallbackWaybill = null;
                    if (isInsufficientBalance) {
                      try {
                        const wbResp = await fetch("https://track.delhivery.com/waybill/api/fetch/json/?count=1", {
                          headers: { 'Authorization': `Token ${DELHIVERY_TOKEN}` }
                        });
                        if (wbResp.ok) {
                          const wbText = await wbResp.text();
                          fallbackWaybill = wbText.replace(/[^0-9]/g, "");
                        }
                      } catch {
                        // ignore fallback error
                      }
                    }

                    res.statusCode = 200;
                    res.end(JSON.stringify({
                      status: 'PARTIAL_OR_FAILED',
                      error: true,
                      message: remarkMsg,
                      isInsufficientBalance,
                      insufficientBalanceHelp: isInsufficientBalance ? "Your Delhivery One account has ₹0 wallet balance. Please recharge ₹200-₹500 in your Delhivery One dashboard (one.delhivery.com -> Wallet Recharge) to auto-manifest." : null,
                      fallbackWaybill,
                      labelUrl: fallbackWaybill ? `https://track.delhivery.com/api/p/packing_slip?wbns=${fallbackWaybill}&pdf=true` : null,
                      trackingUrl: fallbackWaybill ? `https://www.delhivery.com/track/package/${fallbackWaybill}` : null,
                      raw: createData
                    }));
                  } catch (e: any) {
                    res.statusCode = 502;
                    res.end(JSON.stringify({ status: 'ERROR', message: e?.message || 'Server error creating shipment' }));
                  }
                });
                return;
              }

              // 3. Track Delhivery Waybill
              if (req.method === 'GET' && action === 'delhivery_track') {
                const waybill = url.searchParams.get('waybill');
                if (!waybill) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ status: 'FAILED', message: 'Missing waybill parameter' }));
                  return;
                }

                try {
                  const trackResp = await fetch(`https://track.delhivery.com/api/v1/packages/json/?waybill=${waybill}`, {
                    headers: { 'Authorization': `Token ${DELHIVERY_TOKEN}` }
                  });
                  const trackData = await trackResp.json();
                  res.statusCode = 200;
                  res.end(JSON.stringify({
                    status: 'SUCCESS',
                    waybill,
                    trackingUrl: `https://www.delhivery.com/track/package/${waybill}`,
                    data: trackData
                  }));
                } catch (e: any) {
                  res.statusCode = 502;
                  res.end(JSON.stringify({ status: 'ERROR', message: e?.message || 'Tracking error' }));
                }
                return;
              }

              res.statusCode = 200;
              res.end(JSON.stringify({ status: 'ONLINE', service: 'MANOPAVANA Edge PG & Delhivery Logistics' }));
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
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
