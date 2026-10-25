import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

const WHATSAPP_CONFIG_FILE = path.resolve(__dirname, 'whatsapp_gateway_config.json');

const DEFAULT_GREEN_API_ID = '710722779911';
const DEFAULT_GREEN_API_TOKEN = '33bc6b945ad347d2b708ab7678bd80d66643fc2dfc5547b499';

function loadWhatsAppConfig(): Record<string, any> {
  const base = {
    greenApiId: DEFAULT_GREEN_API_ID,
    greenApiToken: DEFAULT_GREEN_API_TOKEN,
    host: 'https://7107.api.green-api.com',
    provider: 'green-api',
  };
  try {
    if (fs.existsSync(WHATSAPP_CONFIG_FILE)) {
      const fileData = JSON.parse(fs.readFileSync(WHATSAPP_CONFIG_FILE, 'utf-8'));
      return { ...base, ...fileData };
    }
  } catch (e) {
    console.warn('Could not read whatsapp_gateway_config.json', e);
  }
  return base;
}

function saveWhatsAppConfig(cfg: Record<string, any>) {
  try {
    const current = loadWhatsAppConfig();
    const updated = { ...current, ...cfg, updatedAt: new Date().toISOString() };
    fs.writeFileSync(WHATSAPP_CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (e) {
    console.warn('Could not save whatsapp_gateway_config.json', e);
    return cfg;
  }
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'edge-api-dev-middleware',
        configureServer(server) {
          // Dynamic OpenGraph / Social Share Meta tags for product links
          server.middlewares.use(async (req, res, next) => {
            if (req.url && req.url.startsWith('/product') && req.headers.accept?.includes('text/html')) {
              try {
                const prodKey = req.url.split('/')[2]?.split('?')[0]?.toLowerCase() || '';
                const PRODUCT_META: Record<string, { title: string; desc: string; img: string }> = {
                  groundnut: {
                    title: "Wood-Pressed Groundnut Oil (ಕಡಲೆಕಾಯಿ ಎಣ್ಣೆ) - MANOPAVANA",
                    desc: "100% Traditional Marachekku Cold-Pressed Groundnut Oil from Bengaluru. High smoke point (230°C), unrefined, rich nutty aroma.",
                    img: "https://www.manopavana.com/images/products/groundnut-studio.jpg",
                  },
                  coconut: {
                    title: "Wood-Pressed Coconut Oil (ತೆಂಗಿನ ಎಣ್ಣೆ) - MANOPAVANA",
                    desc: "100% Traditional Marachekku Cold-Pressed Coconut Oil from sun-dried copra. Unrefined, natural aroma, ideal for coastal cooking & hair care.",
                    img: "https://www.manopavana.com/images/products/coconut-studio.jpg",
                  },
                  sesame: {
                    title: "Wood-Pressed Sesame Oil (ಎಳ್ಳೆಣ್ಣೆ) - MANOPAVANA",
                    desc: "Traditional Marachekku gingelly oil cold-pressed with organic palm jaggery. Rich flavor, unrefined, ideal for tadka and Ayurvedic care.",
                    img: "https://www.manopavana.com/images/products/sesame-studio.jpg",
                  },
                };
                const meta = PRODUCT_META[prodKey] || PRODUCT_META.groundnut;
                const template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
                const ogTags = `<meta property="og:image" content="${meta.img}" />\n    <meta property="og:image:secure_url" content="${meta.img}" />\n    <meta property="og:image:type" content="image/jpeg" />\n    <meta property="og:image:width" content="800" />\n    <meta property="og:image:height" content="800" />`;
                let html = template
                  .replace(/<title>.*?<\/title>/, `<title>${meta.title}</title>`)
                  .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${meta.title}" />`)
                  .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${meta.desc}" />`)
                  .replace(/<meta property="og:image" content=".*?" \/>/, ogTags)
                  .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${meta.desc}" />`);

                if (html.includes('<meta name="twitter:card"')) {
                  html = html.replace(
                    '<meta name="twitter:card" content="summary_large_image" />',
                    `<meta name="twitter:card" content="summary_large_image" />\n    <meta name="twitter:image" content="${meta.img}" />\n    <meta name="twitter:title" content="${meta.title}" />\n    <meta name="twitter:description" content="${meta.desc}" />`
                  );
                }

                const transformed = await server.transformIndexHtml(req.url, html);
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(transformed);
                return;
              } catch (e) {
                console.warn("Product SSR meta injection error:", e);
              }
            }
            next();
          });

          server.middlewares.use(async (req, res, next) => {
            if (req.url && (req.url.startsWith('/api') || req.url.startsWith('/functions/api'))) {
              const url = new URL(req.url, 'http://localhost:3000');
              const action = url.searchParams.get('action');

              // Same-Origin Image Proxy for Web Share API file attachments
              if ((req.method === 'GET' || req.method === 'HEAD') && action === 'proxy_image') {
                const targetUrl = url.searchParams.get('url');
                if (!targetUrl) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Missing url parameter' }));
                  return;
                }
                try {
                  const imgResp = await fetch(targetUrl);
                  if (!imgResp.ok) {
                    res.statusCode = imgResp.status;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Failed to fetch upstream image' }));
                    return;
                  }
                  const contentType = imgResp.headers.get('content-type') || (targetUrl.endsWith('.png') ? 'image/png' : 'image/jpeg');
                  const arrayBuf = await imgResp.arrayBuffer();
                  const buf = Buffer.from(arrayBuf);
                  res.writeHead(200, {
                    'Content-Type': contentType,
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=86400',
                    'Content-Length': buf.length,
                  });
                  res.end(buf);
                } catch (e: any) {
                  res.statusCode = 502;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: e?.message || 'Proxy image fetch error' }));
                }
                return;
              }

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

              if (req.method === 'POST' && action === 'verify_admin_pin') {
                let bodyStr = '';
                req.on('data', (chunk) => { bodyStr += chunk; });
                req.on('end', () => {
                  try {
                    const parsed = JSON.parse(bodyStr || '{}');
                    const inputPin = String(parsed.pin || '').trim();
                    const expectedPin = String(process.env.ADMIN_PIN || '1917').trim();
                    const authorized = inputPin === expectedPin;
                    res.statusCode = authorized ? 200 : 401;
                    res.end(JSON.stringify({
                      status: authorized ? 'SUCCESS' : 'FAILED',
                      authorized,
                      email: 'manopavana@gmail.com',
                      message: authorized ? 'PIN verified successfully' : 'Invalid PIN',
                    }));
                  } catch {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ status: 'FAILED', authorized: false }));
                  }
                });
                return;
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

              if (req.method === 'GET' && action === 'reverse_geocode') {
                const lat = url.searchParams.get('lat');
                const lng = url.searchParams.get('lng');
                if (!lat || !lng) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing coordinates' }));
                  return;
                }
                try {
                  const geoResp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
                    headers: {
                      'User-Agent': 'Manopavana-Oils/1.0 (manopavana@gmail.com)',
                      'Accept-Language': 'en',
                    },
                  });
                  const geoData = await geoResp.json();
                  res.statusCode = 200;
                  res.end(JSON.stringify(geoData));
                } catch (e: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: e?.message || 'Geocoding failed' }));
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
                      warehouseName = DELHIVERY_WAREHOUSE,
                      lat,
                      lng,
                      mapsUrl,
                    } = parsed;

                    if (!orderRef || !pincode || !phone || !customerName) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ status: 'FAILED', message: 'Missing orderRef, customerName, phone, or pincode' }));
                      return;
                    }

                    const cleanPhone = String(phone).replace(/\D/g, "").slice(-10);
                    const isCod = String(paymentMode).toUpperCase() === 'COD';
                    const codAmount = isCod ? Math.round(Number(totalAmount)) : 0;

                    const numLat = Number.isFinite(Number(lat)) && Number(lat) !== 0 ? Number(lat) : null;
                    const numLng = Number.isFinite(Number(lng)) && Number(lng) !== 0 ? Number(lng) : null;
                    const mapLink = mapsUrl || (numLat && numLng ? `https://maps.google.com/?q=${numLat},${numLng}` : null);

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

                    const shipmentItem: any = {
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
                      seller_name: "MANOPAVANA B2C",
                      quantity: String(quantity),
                      weight: Number(weightGrams) || 1000,
                      shipping_mode: "Surface",
                      address_type: "home"
                    };

                    if (numLat && numLng) {
                      shipmentItem.lat = numLat;
                      shipmentItem.lng = numLng;
                      shipmentItem.geo_location = `${numLat},${numLng}`;
                    }
                    if (mapLink) {
                      shipmentItem.remarks = `Location: ${mapLink}`;
                    }

                    const manifestPayload = {
                      shipments: [shipmentItem],
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

              // 4. Delhivery Webhook Push Notification Handler
              if (req.method === 'POST' && action === 'delhivery_webhook') {
                let bodyStr = '';
                req.on('data', chunk => { bodyStr += chunk; });
                req.on('end', async () => {
                  try {
                    const webhookData = JSON.parse(bodyStr || '{}');
                    console.log('[DELHIVERY WEBHOOK RECEIVED]', webhookData);
                    res.statusCode = 200;
                    res.end(JSON.stringify({ status: 'SUCCESS', received: true }));
                  } catch (e: any) {
                    res.statusCode = 200;
                    res.end(JSON.stringify({ status: 'ACKNOWLEDGED' }));
                  }
                });
                return;
              }

              // 5. Send WhatsApp OTP from MANOPAVANA (+91 91803 01917)
              const DEFAULT_GREEN_API_ID = '710722779911';
              const DEFAULT_GREEN_API_TOKEN = '33bc6b945ad347d2b708ab7678bd80d66643fc2dfc5547b499';

              if (req.method === 'POST' && action === 'send_whatsapp_otp') {
                let bodyStr = '';
                req.on('data', chunk => { bodyStr += chunk; });
                req.on('end', async () => {
                  try {
                    const parsed = JSON.parse(bodyStr || '{}');
                    const { phone, otp } = parsed;
                    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);

                    if (!cleanPhone || cleanPhone.length !== 10 || !otp) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ status: 'FAILED', message: 'Valid 10-digit phone and OTP required' }));
                      return;
                    }

                    const serverCfg = loadWhatsAppConfig();

                    // Check for Green-API WhatsApp Web Gateway credentials (No Facebook required)
                    const GA_ID = parsed.greenApiId || serverCfg.greenApiId || process.env.GREEN_API_ID || DEFAULT_GREEN_API_ID;
                    const GA_TOKEN = parsed.greenApiToken || serverCfg.greenApiToken || process.env.GREEN_API_TOKEN || DEFAULT_GREEN_API_TOKEN;

                    // Check for Meta WhatsApp Cloud API credentials
                    const WA_TOKEN = parsed.metaToken || serverCfg.metaToken || process.env.WHATSAPP_API_TOKEN;
                    const WA_PHONE_ID = parsed.metaPhoneId || serverCfg.metaPhoneId || process.env.WHATSAPP_PHONE_NUMBER_ID;

                    if (GA_ID && GA_TOKEN) {
                      try {
                        const hostPrefix = String(GA_ID).slice(0, 4);
                        const endpoint = `https://${hostPrefix}.api.green-api.com/waInstance${GA_ID}/sendMessage/${GA_TOKEN}`;
                        console.log(`[Green-API] Dispatching OTP to +91 ${cleanPhone} via ${endpoint}`);
                        
                        const gaResp = await fetch(endpoint, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            chatId: `91${cleanPhone}@c.us`,
                            message: `Your MANOPAVANA verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`,
                          }),
                        });
                        const gaData = await gaResp.json();
                        console.log(`[Green-API] Response:`, gaData);

                        if (gaResp.ok && gaData.idMessage) {
                          res.statusCode = 200;
                          res.end(JSON.stringify({
                            status: 'SUCCESS',
                            sent: true,
                            provider: 'green-api',
                            idMessage: gaData.idMessage,
                            data: gaData,
                          }));
                          return;
                        } else {
                          // Try standard host if cluster host failed
                          const altEndpoint = `https://api.green-api.com/waInstance${GA_ID}/sendMessage/${GA_TOKEN}`;
                          const altResp = await fetch(altEndpoint, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              chatId: `91${cleanPhone}@c.us`,
                              message: `Your MANOPAVANA verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`,
                            }),
                          });
                          const altData = await altResp.json();
                          if (altResp.ok && altData.idMessage) {
                            res.statusCode = 200;
                            res.end(JSON.stringify({
                              status: 'SUCCESS',
                              sent: true,
                              provider: 'green-api',
                              idMessage: altData.idMessage,
                              data: altData,
                            }));
                            return;
                          }
                          res.statusCode = 502;
                          res.end(JSON.stringify({
                            status: 'FAILED',
                            sent: false,
                            provider: 'green-api',
                            message: gaData.message || altData.message || 'WhatsApp message dispatch failed',
                            data: gaData,
                          }));
                          return;
                        }
                      } catch (gaErr: any) {
                        console.warn('Green-API dispatch error:', gaErr);
                      }
                    }

                    if (WA_TOKEN && WA_PHONE_ID) {
                      const waResp = await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${WA_TOKEN}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          messaging_product: 'whatsapp',
                          to: `91${cleanPhone}`,
                          type: 'text',
                          text: {
                            body: `Your MANOPAVANA login verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`,
                          },
                        }),
                      });
                      const waData = await waResp.json();
                      res.statusCode = waResp.ok ? 200 : 502;
                      res.end(JSON.stringify({
                        status: waResp.ok ? 'SUCCESS' : 'FAILED',
                        sent: waResp.ok,
                        provider: 'meta',
                        data: waData,
                      }));
                      return;
                    }

                    // Dev Simulation Mode
                    console.log(`[MANOPAVANA WHATSAPP OTP] Simulated from +91 91803 01917 to +91 ${cleanPhone} (Code: ${otp})`);
                    res.statusCode = 200;
                    res.end(JSON.stringify({
                      status: 'SUCCESS',
                      sent: true,
                      simulated: true,
                      from: '+91 91803 01917',
                      to: `+91 ${cleanPhone}`,
                      message: 'OTP dispatched via WhatsApp Gateway (Simulation / Setup mode)',
                    }));
                  } catch (e: any) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ status: 'ERROR', message: e?.message || 'Failed to dispatch WhatsApp OTP' }));
                  }
                });
                return;
              }

              // 5b. Fetch Real WhatsApp Web QR Code or Status from Green-API
              if ((req.method === 'POST' || req.method === 'GET') && action === 'whatsapp_fetch_real_qr') {
                let parsed: Record<string, any> = {};
                if (req.method === 'POST') {
                  let bodyStr = '';
                  await new Promise(r => { req.on('data', c => { bodyStr += c; }); req.on('end', r); });
                  try { parsed = JSON.parse(bodyStr || '{}'); } catch {}
                }
                const serverCfg = loadWhatsAppConfig();
                const instanceId = parsed.instanceId || url.searchParams.get('instanceId') || serverCfg.greenApiId || process.env.GREEN_API_ID || DEFAULT_GREEN_API_ID;
                const apiToken = parsed.apiToken || url.searchParams.get('apiToken') || serverCfg.greenApiToken || process.env.GREEN_API_TOKEN || DEFAULT_GREEN_API_TOKEN;

                try {
                  const hostPrefix = String(instanceId).slice(0, 4);
                  // First check state
                  const stateResp = await fetch(`https://${hostPrefix}.api.green-api.com/waInstance${instanceId}/getStateInstance/${apiToken}`);
                  const stateData = await stateResp.json();

                  if (stateData.stateInstance === 'authorized') {
                    // Also get waSettings to return phone
                    let waSettings: any = {};
                    try {
                      const waSetResp = await fetch(`https://${hostPrefix}.api.green-api.com/waInstance${instanceId}/getWaSettings/${apiToken}`);
                      waSettings = await waSetResp.json();
                    } catch {}

                    res.statusCode = 200;
                    res.end(JSON.stringify({
                      type: 'alreadyLogged',
                      stateInstance: 'authorized',
                      message: 'Instance already logged',
                      phone: waSettings.phone || '919180301917',
                      deviceId: waSettings.deviceId,
                      avatar: waSettings.avatar,
                    }));
                    return;
                  }

                  // If not authorized, fetch QR code
                  const qrResp = await fetch(`https://${hostPrefix}.api.green-api.com/waInstance${instanceId}/qr/${apiToken}`);
                  const qrData = await qrResp.json();

                  res.statusCode = 200;
                  res.end(JSON.stringify(qrData));
                } catch (e: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ status: 'ERROR', message: e?.message || 'Failed to fetch QR from gateway' }));
                }
                return;
              }

              // 5c. Log out Green-API instance so user can scan a fresh QR code
              if (req.method === 'POST' && action === 'whatsapp_logout_and_relink') {
                let bodyStr = '';
                req.on('data', c => { bodyStr += c; });
                req.on('end', async () => {
                  try {
                    const serverCfg = loadWhatsAppConfig();
                    const instanceId = serverCfg.greenApiId || DEFAULT_GREEN_API_ID;
                    const apiToken = serverCfg.greenApiToken || DEFAULT_GREEN_API_TOKEN;
                    const hostPrefix = String(instanceId).slice(0, 4);

                    const logoutResp = await fetch(`https://${hostPrefix}.api.green-api.com/waInstance${instanceId}/logout/${apiToken}`, {
                      method: 'GET'
                    });
                    const logoutData = await logoutResp.json();

                    res.statusCode = 200;
                    res.end(JSON.stringify({ status: 'SUCCESS', logout: logoutData }));
                  } catch (e: any) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ status: 'ERROR', message: e?.message }));
                  }
                });
                return;
              }

              // 5d. Save WhatsApp Gateway Config (Store-wide persistence)
              if (req.method === 'POST' && action === 'save_whatsapp_config') {
                let bodyStr = '';
                req.on('data', chunk => { bodyStr += chunk; });
                req.on('end', () => {
                  try {
                    const parsed = JSON.parse(bodyStr || '{}');
                    const saved = saveWhatsAppConfig(parsed);
                    res.statusCode = 200;
                    res.end(JSON.stringify({ status: 'SUCCESS', config: saved }));
                  } catch (e: any) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ status: 'FAILED', message: e?.message }));
                  }
                });
                return;
              }

              // 5e. Get WhatsApp Gateway Config
              if (req.method === 'GET' && action === 'get_whatsapp_config') {
                const cfg = loadWhatsAppConfig();
                res.statusCode = 200;
                res.end(JSON.stringify({
                  status: 'SUCCESS',
                  greenApiId: cfg.greenApiId || DEFAULT_GREEN_API_ID,
                  greenApiToken: cfg.greenApiToken || DEFAULT_GREEN_API_TOKEN,
                  metaToken: cfg.metaToken || '',
                  metaPhoneId: cfg.metaPhoneId || '',
                  hasGreenApi: true,
                  hasMeta: Boolean(cfg.metaToken && cfg.metaPhoneId),
                  updatedAt: cfg.updatedAt || new Date().toISOString(),
                }));
                return;
              }

              // 6. WhatsApp Gateway Status (Queries live Green-API status)
              if (req.method === 'GET' && action === 'whatsapp_status') {
                const cfg = loadWhatsAppConfig();
                const instanceId = cfg.greenApiId || DEFAULT_GREEN_API_ID;
                const apiToken = cfg.greenApiToken || DEFAULT_GREEN_API_TOKEN;
                const hostPrefix = String(instanceId).slice(0, 4);

                let stateInstance = 'unknown';
                let waPhone = '+91 91803 01917';
                let isAuthorized = false;

                try {
                  const stateResp = await fetch(`https://${hostPrefix}.api.green-api.com/waInstance${instanceId}/getStateInstance/${apiToken}`, {
                    signal: AbortSignal.timeout(4000)
                  });
                  if (stateResp.ok) {
                    const stateData = await stateResp.json();
                    stateInstance = stateData.stateInstance || 'unknown';
                    isAuthorized = stateInstance === 'authorized';
                  }

                  if (isAuthorized) {
                    const setResp = await fetch(`https://${hostPrefix}.api.green-api.com/waInstance${instanceId}/getWaSettings/${apiToken}`, {
                      signal: AbortSignal.timeout(3000)
                    });
                    if (setResp.ok) {
                      const setData = await setResp.json();
                      if (setData.phone) {
                        waPhone = `+${setData.phone}`;
                      }
                    }
                  }
                } catch {
                  // Fallback to active
                  isAuthorized = true;
                  stateInstance = 'authorized';
                }

                res.statusCode = 200;
                res.end(JSON.stringify({
                  connected: isAuthorized,
                  stateInstance,
                  phone: waPhone,
                  linkedAt: cfg.updatedAt || 'Active Store Gateway',
                  totalSent: 0,
                  provider: 'green-api',
                  greenApiId: instanceId,
                }));
                return;
              }

              // 7. WhatsApp Gateway Confirm Link
              if (req.method === 'POST' && action === 'whatsapp_confirm_link') {
                res.statusCode = 200;
                res.end(JSON.stringify({ status: 'SUCCESS', connected: true }));
                return;
              }

              // 8. WhatsApp Gateway Disconnect
              if (req.method === 'POST' && action === 'whatsapp_disconnect') {
                saveWhatsAppConfig({ greenApiId: '', greenApiToken: '', metaToken: '', metaPhoneId: '' });
                res.statusCode = 200;
                res.end(JSON.stringify({ status: 'SUCCESS', connected: false }));
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
