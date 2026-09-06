// ==========================================
// CONFIGURATION & CLOUD CONSTANTS
// ==========================================
const WHATSAPP_BUSINESS_NUMBER = "919180301917"; // Primary WhatsApp Dispatch Channel
const UPI_MERCHANT_VPA = "8431023984@upi";       // Dedicated Merchant Billing UPI
const UPI_BUSINESS_NAME = "MANOPAVANA";
const FREE_SHIPPING_THRESHOLD = 500;
const STANDARD_DELIVERY_FEE = 49;
const REORDER_DISCOUNT_PERCENT = 10;
const QR_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30-Day Strict Validity Window
const ADMIN_PIN = "1234";

// Dedicated Google Cloud Apps Script Endpoint
const GOOGLE_SCRIPT_API_URL = "https://script.google.com/macros/s/AKfycbwxmCGWSAD_TdW37fu55Vkmvt8o35h3fAXUOC21Y4akgpLQq-WQCslggaa3ZpuCTiwDlA/exec";

let countdownTimerInterval = null;
let currentCalculatedGrandTotal = 0;
let currentOrderRef = "";
let isGiftOrder = false;

// Cloud State Variables
let activeCloudBottleCode = null;
let cloudScanTimestampMs = null;
let isCloudLoyaltyActive = false;

// Master Product Catalog with Cloudinary Assets
const PRODUCT_CATALOG = {
  groundnut: {
    id: "groundnut",
    name: "Wood-Pressed Groundnut Oil",
    badgeTheme: "theme-groundnut",
    bgClass: "oil-groundnut",
    img: "https://res.cloudinary.com/bng9wtel/image/upload/v1788615807/groundnut-oil.jpg",
    gallery: [
      "https://res.cloudinary.com/bng9wtel/image/upload/v1788615807/groundnut-oil.jpg",
      "https://res.cloudinary.com/bng9wtel/image/upload/v1788615840/label-groundnut.jpg"
    ],
    shortDesc: "Traditional single slow-press extraction using heavy wooden pestles (<45°C). Triple cotton cloth filtered with zero chemical bleaches, giving unadulterated nutty aroma and high smoke-point performance.",
    features: [
      { icon: "🌾", label: "Aroma", val: "Naturally Nutty" },
      { icon: "🫓", label: "Texture", val: "Light & Non-Sticky" },
      { icon: "🍳", label: "Cooking", val: "Absorbs Less" }
    ],
    specs: {
      "Extraction Method": "Traditional Wooden Marachekku (<45°C)",
      "Processing Type": "Unrefined, Unbleached & Non-Deodorized",
      "FSSAI License": "Reg. No. 21226008004689",
      "Container Type": "Food-Grade Shatterproof Bottle + Drip-Free Spout",
      "Best For": "Daily Curries, Crispy Dosas, Deep Frying, Sautéing",
      "Shelf Life": "9-12 Months (Store in cool, dark place)",
      "Authenticity Standards": "Zero Mineral Oil, No Argemone, No Added Preservatives"
    },
    nutrition: [
      { name: "Energy", val: "884 kcal" },
      { name: "Total Fats", val: "100 g" },
      { name: "MUFA", val: "48 g" },
      { name: "PUFA", val: "32 g" },
      { name: "Trans Fat", val: "0 g" }
    ],
    sizes: {
      "1L": { id: "groundnut-1l", price: 349, badge: "1 Litre", title: "Wood-Pressed Groundnut Oil (1L)" },
      "500ml": { id: "groundnut-500ml", price: 189, badge: "500 ml", title: "Wood-Pressed Groundnut Oil (500ml)" }
    }
  },
  coconut: {
    id: "coconut",
    name: "Wood-Pressed Coconut Oil",
    badgeTheme: "theme-coconut",
    bgClass: "oil-coconut",
    img: "https://res.cloudinary.com/bng9wtel/image/upload/v1788615797/coconut-oil.jpg",
    gallery: [
      "https://res.cloudinary.com/bng9wtel/image/upload/v1788615797/coconut-oil.jpg",
      "https://res.cloudinary.com/bng9wtel/image/upload/v1788615819/label-coconut.jpg"
    ],
    shortDesc: "Extracted from 100% sulfur-free, sun-dried copra. Packed with natural Lauric acid and medium-chain fatty acids (MCTs). 100% edible-grade with unrefined natural coconut fragrance.",
    features: [
      { icon: "🥥", label: "Aroma", val: "Fresh Copra Scent" },
      { icon: "✨", label: "Extraction", val: "Slow Wood Chekku" },
      { icon: "🌿", label: "Usage", val: "Edible & Multi-Use" }
    ],
    specs: {
      "Extraction Method": "Traditional Wood Chekku (<40°C)",
      "Processing Type": "Raw, Unrefined & Natural Settling",
      "FSSAI License": "Reg. No. 21226008004689",
      "Container Type": "Food-Grade Shatterproof Bottle + Drip-Free Spout",
      "Best For": "Coastal Curries, Kerala Avial, Vegetable Stew, Hair Care",
      "Shelf Life": "9-12 Months",
      "Authenticity Standards": "Zero Liquid Paraffin, No Added Aromas"
    },
    nutrition: [
      { name: "Energy", val: "892 kcal" },
      { name: "Total Fats", val: "99.8 g" },
      { name: "Lauric Acid", val: "49.5 g" },
      { name: "MCTs", val: "62%" },
      { name: "Trans Fat", val: "0 g" }
    ],
    sizes: {
      "1L": { id: "coconut-1l", price: 499, badge: "1 Litre", title: "Wood-Pressed Coconut Oil (1L)" },
      "500ml": { id: "coconut-500ml", price: 269, badge: "500 ml", title: "Wood-Pressed Coconut Oil (500ml)" }
    }
  },
  sesame: {
    id: "sesame",
    name: "Wood-Pressed Sesame Oil",
    badgeTheme: "theme-sesame",
    bgClass: "oil-sesame",
    img: "https://res.cloudinary.com/bng9wtel/image/upload/v1788615861/sesame-oil.jpg",
    gallery: [
      "https://res.cloudinary.com/bng9wtel/image/upload/v1788615861/sesame-oil.jpg",
      "https://res.cloudinary.com/bng9wtel/image/upload/v1788615838/label-sesame.jpg"
    ],
    shortDesc: "Authentic wood-pressed Gingelly oil extracted with natural palm jaggery to harmonize the deep nutty bite. Rich in Sesamol antioxidants, zinc, and heart-healthy unsaturated lipids.",
    features: [
      { icon: "🍯", label: "Aroma", val: "Chekku Scent" },
      { icon: "🪵", label: "Process", val: "Slow Crushed" },
      { icon: "☀️", label: "Quality", val: "Unrefined Extraction" }
    ],
    specs: {
      "Extraction Method": "Slow Wooden Press with Palm Jaggery",
      "Processing Type": "Unbleached, Natural Cloth Filtration",
      "FSSAI License": "Reg. No. 21226008004689",
      "Container Type": "Food-Grade Shatterproof Bottle + Drip-Free Spout",
      "Best For": "Authentic Idli Podi, Puliogare, Rasam Tadka, Oil Pulling",
      "Shelf Life": "9-12 Months",
      "Authenticity Standards": "100% Sesame Extract, Zero Synthetic Fragrances"
    },
    nutrition: [
      { name: "Energy", val: "884 kcal" },
      { name: "Total Fats", val: "100 g" },
      { name: "MUFA", val: "40 g" },
      { name: "PUFA", val: "42 g" },
      { name: "Sesamol", val: "High Antioxidant" }
    ],
    sizes: {
      "1L": { id: "sesame-1l", price: 499, badge: "1 Litre", title: "Wood-Pressed Sesame Oil (1L)" },
      "500ml": { id: "sesame-500ml", price: 269, badge: "500 ml", title: "Wood-Pressed Sesame Oil (500ml)" }
    }
  },
  mustard: {
    id: "mustard",
    name: "Wood-Pressed Mustard Oil",
    badgeTheme: "theme-mustard",
    bgClass: "oil-mustard",
    img: "https://res.cloudinary.com/bng9wtel/image/upload/v1788615845/mustard-oil.jpg",
    gallery: [
      "https://res.cloudinary.com/bng9wtel/image/upload/v1788615845/mustard-oil.jpg",
      "https://res.cloudinary.com/bng9wtel/image/upload/v1788615816/label-mustard.jpg"
    ],
    isPreOrder: true,
    shortDesc: "Freshly cold-pressed on order. Retains signature natural pungency and Sinigrin glucosinolates without chemical enhancements. Perfect for traditional tawa cooking and pickle pickling.",
    features: [
      { icon: "⚡", label: "Aroma", val: "Pungent Kick" },
      { icon: "🪵", label: "Batch", val: "Single Slow Press" },
      { icon: "⏱️", label: "Dispatched", val: "48–72 hrs Fresh Crush" }
    ],
    specs: {
      "Extraction Method": "Single Cold Press Wooden Ghani",
      "Processing Type": "Fresh Micro-Batch Crush on Order",
      "FSSAI License": "Reg. No. 21226008004689",
      "Container Type": "Food-Grade Shatterproof Bottle + Drip-Free Spout",
      "Best For": "North Indian Curries, Baingan Bharta, Artisanal Pickles",
      "Shelf Life": "9-12 Months",
      "Authenticity Standards": "Zero Artificial Pungency Additives"
    },
    nutrition: [
      { name: "Energy", val: "884 kcal" },
      { name: "Total Fats", val: "100 g" },
      { name: "MUFA", val: "60 g" },
      { name: "PUFA", val: "28 g" },
      { name: "Omega 3:6", val: "Naturally Balanced" }
    ],
    sizes: {
      "1L": { id: "mustard-1l", price: 299, badge: "Pre-Order (1L)", title: "Mustard Oil (1L - Pre-Order Fresh Crush)" },
      "500ml": { id: "mustard-500ml", price: 159, badge: "Pre-Order (500ml)", title: "Mustard Oil (500ml - Pre-Order Fresh Crush)" }
    }
  }
};

// Global Shopping Cart State
let cart = JSON.parse(localStorage.getItem("manopavana_cart")) || [];

// Active Modal State
let currentDetailProductKey = null;
let currentDetailSelectedSize = "1L";

// DOM Elements
const productGridContainer = document.getElementById("productGridContainer");
const productDetailModalBackdrop = document.getElementById("productDetailModalBackdrop");
const closeDetailModalBtn = document.getElementById("closeDetailModalBtn");
const modalProductHeaderTitle = document.getElementById("modalProductHeaderTitle");
const modalProductDetailBody = document.getElementById("modalProductDetailBody");

const cartDrawer = document.getElementById("cartDrawer");
const cartBackdrop = document.getElementById("cartBackdrop");
const openCartBtn = document.getElementById("openCartBtn");
const closeCartBtn = document.getElementById("closeCartBtn");
const cartItemsList = document.getElementById("cartItemsList");
const cartCountBadge = document.getElementById("cartCountBadge");
const cartTotalItems = document.getElementById("cartTotalItems");
const cartSubtotal = document.getElementById("cartSubtotal");
const discountRow = document.getElementById("discountRow");
const cartDiscount = document.getElementById("cartDiscount");
const cartDeliveryCharge = document.getElementById("cartDeliveryCharge");
const cartGrandTotal = document.getElementById("cartGrandTotal");
const shippingNote = document.getElementById("shippingNote");
const openCheckoutModalBtn = document.getElementById("openCheckoutModalBtn");

const checkoutModalBackdrop = document.getElementById("checkoutModalBackdrop");
const closeModalBtn = document.getElementById("closeModalBtn");
const submitOrderBtn = document.getElementById("submitOrderBtn");
const formError = document.getElementById("formError");

const payUPIRadio = document.getElementById("payUPI");
const payCODRadio = document.getElementById("payCOD");
const labelPayUPI = document.getElementById("labelPayUPI");
const labelPayCOD = document.getElementById("labelPayCOD");
const upiPaymentBox = document.getElementById("upiPaymentBox");
const upiPayableAmount = document.getElementById("upiPayableAmount");
const dynamicUpiQrImg = document.getElementById("dynamicUpiQrImg");
const mobileUpiDeepLink = document.getElementById("mobileUpiDeepLink");

// ==========================================
// 1. VIDEO AUTOPLAY & AUDIO CONTROLLER
// ==========================================
const heroVideo = document.getElementById("heroVideo");
const heroBgAudio = document.getElementById("heroBgAudio");
const soundToggleBtn = document.getElementById("soundToggleBtn");
const soundIcon = document.getElementById("soundIcon");
const soundText = document.getElementById("soundText");

let isSoundActive = false;

if (heroVideo) {
  heroVideo.muted = true;
  heroVideo.loop = true;
  heroVideo.playsInline = true;
  heroVideo.play().catch(() => {});
}

function enableAudio() {
  if (!heroBgAudio) return;
  heroBgAudio.volume = 1.0;
  heroBgAudio
    .play()
    .then(() => {
      isSoundActive = true;
      if (soundIcon) soundIcon.textContent = "🔊";
      if (soundText) soundText.textContent = "Sound On";
    })
    .catch((err) => {
      console.warn("Audio waiting for gesture:", err);
    });
}

function disableAudio() {
  if (!heroBgAudio) return;
  heroBgAudio.pause();
  isSoundActive = false;
  if (soundIcon) soundIcon.textContent = "🔇";
  if (soundText) soundText.textContent = "Sound Off";
}

function triggerAudioOnFirstInteraction(e) {
  if (soundToggleBtn && soundToggleBtn.contains(e.target)) return;
  enableAudio();
  ["click", "touchstart", "pointerdown"].forEach((evt) => {
    window.removeEventListener(evt, triggerAudioOnFirstInteraction);
    document.removeEventListener(evt, triggerAudioOnFirstInteraction);
  });
}

["click", "touchstart", "pointerdown"].forEach((evt) => {
  window.addEventListener(evt, triggerAudioOnFirstInteraction, { once: true });
  document.addEventListener(evt, triggerAudioOnFirstInteraction, { once: true });
});

if (soundToggleBtn && heroBgAudio) {
  soundToggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!isSoundActive) {
      enableAudio();
    } else {
      disableAudio();
    }
  });
}

if (heroVideo) {
  heroVideo.addEventListener("pause", () => {
    heroVideo.play().catch(() => {});
  });
}

// ==========================================
// 2. CORS-PROOF GOOGLE SHEETS CLOUD CLIENT
// ==========================================
function callGoogleSheetsCloud(params) {
  return new Promise((resolve, reject) => {
    const callbackName = "jsonp_cb_" + Math.round(100000 * Math.random());
    let script = null;

    window[callbackName] = function (data) {
      delete window[callbackName];
      if (script && script.parentNode) script.parentNode.removeChild(script);
      resolve(data);
    };

    const queryString = Object.keys(params)
      .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(params[key]))
      .join("&");

    script = document.createElement("script");
    script.src = `${GOOGLE_SCRIPT_API_URL}?${queryString}&callback=${callbackName}`;
    script.onerror = function () {
      delete window[callbackName];
      if (script && script.parentNode) script.parentNode.removeChild(script);
      reject(new Error("Network error calling Google Sheets"));
    };

    document.body.appendChild(script);
  });
}

async function checkBottleQRScan() {
  const urlParams = new URLSearchParams(window.location.search);
  const rawCode = urlParams.get("code") || (urlParams.get("ref") === "bottle_qr" ? "DEFAULT_BOTTLE" : null);

  if (!rawCode) return;
  const scannedCode = rawCode.trim();

  if (window.history && window.history.replaceState) {
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({ path: cleanUrl }, "", cleanUrl);
  }

  const announcementText = document.getElementById("announcementText");
  if (announcementText) {
    announcementText.innerHTML = `⏳ <strong>Verifying Bottle QR Code with Cloud Database...</strong>`;
  }

  try {
    const checkData = await callGoogleSheetsCloud({ action: "check", code: scannedCode });

    if (checkData.status === "REDEEMED") {
      alert("⚠️ This bottle QR code has already been redeemed for a previous order. Please scan the QR code on your new fresh bottle!");
      resetCloudLoyaltyState();
      return;
    }

    if (!checkData.exists || checkData.status === "NEW") {
      const regData = await callGoogleSheetsCloud({ action: "register", code: scannedCode });

      activeCloudBottleCode = scannedCode;
      cloudScanTimestampMs = regData.firstScannedAt ? new Date(regData.firstScannedAt).getTime() : Date.now();
      isCloudLoyaltyActive = true;
    } else if (checkData.status === "ACTIVE" && checkData.firstScannedAt) {
      const firstScanTime = new Date(checkData.firstScannedAt).getTime();
      const elapsed = Date.now() - firstScanTime;

      if (elapsed >= QR_EXPIRY_MS) {
        alert("⚠️ The 30-day validity window for this bottle QR code has expired. Please scan the QR code on your new bottle!");
        resetCloudLoyaltyState();
        return;
      }

      activeCloudBottleCode = scannedCode;
      cloudScanTimestampMs = firstScanTime;
      isCloudLoyaltyActive = true;
    }

    if (isCloudLoyaltyActive) {
      showLoyaltyToast();
      renderCart();
      startLiveCountdown();
    }
  } catch (err) {
    console.error("Cloud Sheets verification error:", err);
    alert("Unable to verify QR code with the cloud server. Please check your internet connection.");
    resetCloudLoyaltyState();
  }
}

function resetCloudLoyaltyState() {
  activeCloudBottleCode = null;
  cloudScanTimestampMs = null;
  isCloudLoyaltyActive = false;
  renderCart();
  startLiveCountdown();
}

function showLoyaltyToast() {
  const rewardToast = document.getElementById("rewardToast");
  if (rewardToast) {
    setTimeout(() => {
      rewardToast.classList.add("show");
      setTimeout(() => rewardToast.classList.remove("show"), 6500);
    }, 400);
  }
}

function isLoyaltyDiscountValid() {
  if (!isCloudLoyaltyActive || !cloudScanTimestampMs) return false;
  const elapsed = Date.now() - cloudScanTimestampMs;
  return elapsed < QR_EXPIRY_MS;
}

function startLiveCountdown() {
  if (countdownTimerInterval) clearInterval(countdownTimerInterval);

  function updateTimer() {
    const announcementText = document.getElementById("announcementText");
    const topBar = document.getElementById("topAnnouncementBar");
    if (!announcementText || !topBar) return;

    if (isLoyaltyDiscountValid()) {
      const remainingMs = Math.max(0, QR_EXPIRY_MS - (Date.now() - cloudScanTimestampMs));

      if (remainingMs <= 0) {
        resetCloudLoyaltyState();
        announcementText.innerHTML = `🚚 <strong>FREE Doorstep Delivery</strong> on all orders above ₹500 across Bangalore (Delivered in 48–72 hrs)`;
        topBar.classList.remove("loyal-banner");
        clearInterval(countdownTimerInterval);
        return;
      }

      const totalSeconds = Math.floor(remainingMs / 1000);
      const days = Math.floor(totalSeconds / (24 * 3600));
      const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const formattedTime = `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;

      announcementText.innerHTML = `🏷️ <strong>Bottle QR Verified:</strong> 10% Loyalty Discount Active! <span class="countdown-pill">⏱️ ${formattedTime}</span>`;
      topBar.classList.add("loyal-banner");
    } else {
      announcementText.innerHTML = `🚚 <strong>FREE Doorstep Delivery</strong> on all orders above ₹500 across Bangalore (Delivered in 48–72 hrs)`;
      topBar.classList.remove("loyal-banner");
      clearInterval(countdownTimerInterval);
    }
  }

  updateTimer();
  countdownTimerInterval = setInterval(updateTimer, 1000);
}

checkBottleQRScan();
startLiveCountdown();

// ==========================================
// 3. PERSISTENT BOTTLE SHOWCASE PLAYBACK
// ==========================================
const bottleAutoplayVideo = document.getElementById("bottleAutoplayVideo");
const bottleFallbackImg = document.getElementById("bottleFallbackImg");

if (bottleAutoplayVideo) {
  bottleAutoplayVideo.muted = true;
  bottleAutoplayVideo.loop = true;
  bottleAutoplayVideo.playsInline = true;
  bottleAutoplayVideo.play().catch(() => {});

  bottleAutoplayVideo.addEventListener("error", () => {
    bottleAutoplayVideo.style.display = "none";
    if (bottleFallbackImg) bottleFallbackImg.style.display = "block";
  });

  bottleAutoplayVideo.addEventListener("pause", () => {
    bottleAutoplayVideo.play().catch(() => {});
  });
}

// ==========================================
// 4. MAIN PRODUCT CATALOG RENDERING & MODAL
// ==========================================
function getCartItemQuantity(itemId) {
  const item = cart.find((i) => i.id === itemId);
  return item ? item.quantity : 0;
}

function renderStepperButtonHTML(id, title, price, img, quantity, isPreOrder = false) {
  if (quantity > 0) {
    return `
      <div class="stepper-active-box">
        <button class="stepper-btn" onclick="updateQuantity('${id}', -1)" type="button" aria-label="Decrease quantity">−</button>
        <span class="stepper-value">${quantity}</span>
        <button class="stepper-btn" onclick="updateQuantity('${id}', 1)" type="button" aria-label="Increase quantity">+</button>
      </div>
    `;
  }

  const btnClass = isPreOrder ? "btn-buy btn-preorder" : "btn-buy";
  const btnText = isPreOrder ? "Pre-Order Fresh" : "Add to Bag";

  return `
    <button class="${btnClass}" 
      onclick="handleDirectAdd('${id}', '${escapeHtml(title)}', ${price}, '${img}')" 
      type="button">
      ${btnText}
    </button>
  `;
}

function renderProductsGrid() {
  if (!productGridContainer) return;
  productGridContainer.innerHTML = "";

  Object.keys(PRODUCT_CATALOG).forEach((key) => {
    const product = PRODUCT_CATALOG[key];
    const defaultSizeKey = "1L";
    const defaultData = product.sizes[defaultSizeKey];
    const currentQty = getCartItemQuantity(defaultData.id);

    const card = document.createElement("div");
    card.className = `product-card ${product.badgeTheme}`;
    card.id = `card-${product.id}`;

    const featuresHTML = product.features
      .map((f) => `<li>${f.icon} <strong>${f.label}:</strong> ${f.val}</li>`)
      .join("");

    card.innerHTML = `
      <span class="card-badge ${product.isPreOrder ? "badge-preorder" : ""}">${product.isPreOrder ? "Pre-Order" : "Wood Pressed"}</span>
      <div class="card-image-wrap ${product.bgClass}" onclick="openProductDetailModal('${key}')">
        <img src="${product.img}" alt="${product.name}" class="product-img" onerror="this.src='https://placehold.co/200x260/171412/eab308?text=Oil'" />
        <span class="card-quick-hint">Tap for More Details</span>
      </div>
      <div class="card-content">
        <h3 class="card-title-clickable" onclick="openProductDetailModal('${key}')">${product.name}</h3>
        <ul class="product-feature-list">
          ${featuresHTML}
        </ul>
        <div class="card-footer">
          <div class="price-block">
            <span class="price">₹${defaultData.price} <small>/ 1L</small></span>
          </div>
          <div class="stepper-wrap-inline" id="stepper-container-${defaultData.id}">
            ${renderStepperButtonHTML(defaultData.id, defaultData.title, defaultData.price, product.img, currentQty, product.isPreOrder)}
          </div>
        </div>
      </div>
    `;

    productGridContainer.appendChild(card);
  });

  // Refresh combo stepper button
  const comboQty = getCartItemQuantity("combo-3l");
  const comboContainer = document.getElementById("stepper-combo-3l");
  if (comboContainer) {
    comboContainer.innerHTML = renderStepperButtonHTML(
      "combo-3l",
      "Complete 3-Oil Essential Box (3L Trio)",
      1249,
      "https://res.cloudinary.com/bng9wtel/image/upload/v1788615807/groundnut-oil.jpg",
      comboQty,
      false
    );
  }
}

// Product Details Modal Window
function openProductDetailModal(productKey) {
  const product = PRODUCT_CATALOG[productKey];
  if (!product) return;

  currentDetailProductKey = productKey;
  currentDetailSelectedSize = "1L";

  if (modalProductHeaderTitle) {
    modalProductHeaderTitle.textContent = `${product.name} Details`;
  }

  renderProductDetailModalContent();

  if (productDetailModalBackdrop) {
    productDetailModalBackdrop.classList.add("open");
    document.body.style.overflow = "hidden";
  }
}

function closeProductDetailModal() {
  if (productDetailModalBackdrop) {
    productDetailModalBackdrop.classList.remove("open");
    document.body.style.overflow = "";
  }
  currentDetailProductKey = null;
}

if (closeDetailModalBtn) {
  closeDetailModalBtn.addEventListener("click", closeProductDetailModal);
}

if (productDetailModalBackdrop) {
  productDetailModalBackdrop.addEventListener("click", (e) => {
    if (e.target === productDetailModalBackdrop) {
      closeProductDetailModal();
    }
  });
}

function selectModalVariantSize(sizeKey) {
  currentDetailSelectedSize = sizeKey;
  renderProductDetailModalContent();
}

function renderProductDetailModalContent() {
  if (!currentDetailProductKey || !modalProductDetailBody) return;
  const product = PRODUCT_CATALOG[currentDetailProductKey];
  const selectedSizeData = product.sizes[currentDetailSelectedSize];
  const currentQty = getCartItemQuantity(selectedSizeData.id);

  const specRows = Object.entries(product.specs)
    .map(([k, v]) => `<tr><td class="spec-lbl">${k}</td><td class="spec-val">${v}</td></tr>`)
    .join("");

  const nutritionBoxes = product.nutrition
    .map((n) => `<div class="nutri-cell"><span class="nutri-lbl">${n.name}</span><div class="nutri-num">${n.val}</div></div>`)
    .join("");

  const thumbnailsHTML = product.gallery
    .map(
      (imgSrc, idx) => `
      <img src="${imgSrc}" class="detail-thumb-img ${idx === 0 ? "active" : ""}" 
        onclick="switchDetailMainImage('${imgSrc}', this)" alt="Thumbnail" />
    `
    )
    .join("");

  modalProductDetailBody.innerHTML = `
    <div class="detail-top-grid">
      <div class="detail-gallery">
        <div class="detail-main-img-box">
          <img src="${product.gallery[0]}" class="detail-main-img" id="detailMainImg" alt="${product.name}" />
        </div>
        <div class="detail-thumb-strip">
          ${thumbnailsHTML}
        </div>
      </div>

      <div class="detail-info-col">
        <span class="detail-badge-pill">🌿 Wood-Pressed • Lab Tested</span>
        <h2 class="detail-title">${product.name}</h2>
        <p class="detail-short-desc">${product.shortDesc}</p>

        <div class="modal-variant-wrap">
          <span class="modal-variant-label">Choose Volume / Bottle Size:</span>
          <div class="modal-variant-pills">
            <button type="button" class="modal-size-pill ${currentDetailSelectedSize === "1L" ? "active" : ""}" 
              onclick="selectModalVariantSize('1L')">
              1 Litre (₹${product.sizes["1L"].price})
            </button>
            <button type="button" class="modal-size-pill ${currentDetailSelectedSize === "500ml" ? "active" : ""}" 
              onclick="selectModalVariantSize('500ml')">
              500 ml (₹${product.sizes["500ml"].price})
            </button>
          </div>
        </div>

        <div class="modal-action-row">
          <div>
            <span class="price-sub">Payable Price:</span>
            <div class="modal-price-val">₹${selectedSizeData.price}</div>
          </div>
          <div class="stepper-wrap-inline" id="stepper-container-modal-${selectedSizeData.id}">
            ${renderStepperButtonHTML(selectedSizeData.id, selectedSizeData.title, selectedSizeData.price, product.img, currentQty, product.isPreOrder)}
          </div>
        </div>
      </div>
    </div>

    <div class="detail-spec-box">
      <h4>Authenticity & Extraction Specifications</h4>
      <table class="specs-table-grid">
        <tbody>
          ${specRows}
        </tbody>
      </table>
    </div>

    <div class="detail-spec-box">
      <h4>Nutritional Breakdown (Approx. per 100g)</h4>
      <div class="detail-nutrition-grid">
        ${nutritionBoxes}
      </div>
    </div>
  `;
}

window.switchDetailMainImage = function (src, thumbEl) {
  const mainImg = document.getElementById("detailMainImg");
  if (mainImg) mainImg.src = src;

  document.querySelectorAll(".detail-thumb-img").forEach((el) => el.classList.remove("active"));
  if (thumbEl) thumbEl.classList.add("active");
};

// ==========================================
// 5. SHOPPING CART ENGINE & SYNC
// ==========================================
function saveCart() {
  localStorage.setItem("manopavana_cart", JSON.stringify(cart));
  renderCart();
  renderProductsGrid();
  if (currentDetailProductKey) {
    renderProductDetailModalContent();
  }
}

function openCart() {
  if (cartDrawer) cartDrawer.classList.add("open");
  if (cartBackdrop) cartBackdrop.classList.add("open");
}

function closeCart() {
  if (cartDrawer) cartDrawer.classList.remove("open");
  if (cartBackdrop) cartBackdrop.classList.remove("open");
}

if (openCartBtn) openCartBtn.addEventListener("click", openCart);
if (closeCartBtn) closeCartBtn.addEventListener("click", closeCart);
if (cartBackdrop) cartBackdrop.addEventListener("click", closeCart);

function handleDirectAdd(id, title, price, img) {
  const product = { id, title, price: parseInt(price, 10), img };
  addToCart(product);
}

function addToCart(product) {
  const existing = cart.find((item) => item.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  saveCart();
}

window.updateQuantity = function (id, delta) {
  const item = cart.find((item) => item.id === id);
  if (!item) {
    if (delta > 0) {
      if (id === "combo-3l") {
        cart.push({ id: "combo-3l", title: "Complete 3-Oil Essential Box (3L Trio)", price: 1249, img: "https://res.cloudinary.com/bng9wtel/image/upload/v1788615807/groundnut-oil.jpg", quantity: 1 });
      } else {
        const [prodKey, sizeKey] = id.split("-");
        const formattedSize = sizeKey === "1l" ? "1L" : "500ml";
        const catItem = PRODUCT_CATALOG[prodKey]?.sizes[formattedSize];
        if (catItem) {
          cart.push({ id: catItem.id, title: catItem.title, price: catItem.price, img: PRODUCT_CATALOG[prodKey].img, quantity: 1 });
        }
      }
    }
  } else {
    item.quantity += delta;
    if (item.quantity <= 0) {
      cart = cart.filter((i) => i.id !== id);
    }
  }
  saveCart();
};

window.removeItem = function (id) {
  cart = cart.filter((item) => item.id !== id);
  saveCart();
};

function generateDynamicUPI() {
  if (!currentOrderRef) {
    currentOrderRef = "MP" + Math.floor(1000 + Math.random() * 9000);
  }

  const formattedAmount = Number(currentCalculatedGrandTotal).toFixed(2);
  const rawUpiString = `upi://pay?pa=${UPI_MERCHANT_VPA}&pn=${encodeURIComponent(
    UPI_BUSINESS_NAME
  )}&am=${formattedAmount}&cu=INR&mode=02&purpose=00`;

  if (dynamicUpiQrImg) {
    dynamicUpiQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=10&data=${encodeURIComponent(
      rawUpiString
    )}`;
  }

  if (mobileUpiDeepLink) {
    mobileUpiDeepLink.href = rawUpiString;
  }

  if (upiPayableAmount) {
    upiPayableAmount.textContent = `₹${currentCalculatedGrandTotal.toLocaleString("en-IN")}`;
  }
}

function updatePaymentModeUI() {
  const isUPI = payUPIRadio && payUPIRadio.checked;

  if (isUPI) {
    if (labelPayUPI) labelPayUPI.classList.add("active");
    if (labelPayCOD) labelPayCOD.classList.remove("active");
    if (upiPaymentBox) upiPaymentBox.style.display = "block";
    if (submitOrderBtn) submitOrderBtn.textContent = "I Have Paid — Confirm Order on WhatsApp 💬";
    generateDynamicUPI();
  } else {
    if (labelPayUPI) labelPayUPI.classList.remove("active");
    if (labelPayCOD) labelPayCOD.classList.add("active");
    if (upiPaymentBox) upiPaymentBox.style.display = "none";
    if (submitOrderBtn) submitOrderBtn.textContent = "Confirm COD Order via WhatsApp 💬";
  }
}

if (payUPIRadio) payUPIRadio.addEventListener("change", updatePaymentModeUI);
if (payCODRadio) payCODRadio.addEventListener("change", updatePaymentModeUI);

// ==========================================
// 6. INTENT TOGGLE (FAMILY VS GIFT)
// ==========================================
const btnIntentFamily = document.getElementById("btnIntentFamily");
const btnIntentGift = document.getElementById("btnIntentGift");
const giftNoteGroup = document.getElementById("giftNoteGroup");
const lblCustName = document.getElementById("lblCustName");
const lblCustPhone = document.getElementById("lblCustPhone");
const custLabelName = document.getElementById("custLabelName");

if (btnIntentFamily && btnIntentGift) {
  btnIntentFamily.addEventListener("click", () => {
    isGiftOrder = false;
    btnIntentFamily.classList.add("active");
    btnIntentGift.classList.remove("active");
    if (giftNoteGroup) giftNoteGroup.style.display = "none";
    if (lblCustName) lblCustName.textContent = "Full Name (Your Name) *";
    if (lblCustPhone) lblCustPhone.textContent = "WhatsApp Contact Number (10 Digits) *";
    if (custLabelName) custLabelName.placeholder = "e.g. The Kumar Family / Ramesh's Kitchen";
  });

  btnIntentGift.addEventListener("click", () => {
    isGiftOrder = true;
    btnIntentGift.classList.add("active");
    btnIntentFamily.classList.remove("active");
    if (giftNoteGroup) giftNoteGroup.style.display = "block";
    if (lblCustName) lblCustName.textContent = "Recipient's Name (Delivery To) *";
    if (lblCustPhone) lblCustPhone.textContent = "Recipient's WhatsApp / Phone Number *";
    if (custLabelName) custLabelName.placeholder = "e.g. Specially Crafted for Suresh & Family / Amma's Kitchen";
  });
}

function openCheckoutModal(e) {
  if (e) e.preventDefault();

  if (!cart || cart.length === 0) {
    alert("Please add at least one bottle to your bag first!");
    return;
  }

  currentOrderRef = "MP" + Math.floor(1000 + Math.random() * 9000);
  updatePaymentModeUI();

  closeCart();
  if (checkoutModalBackdrop) {
    checkoutModalBackdrop.classList.add("open");
  }
}

function closeCheckoutModal() {
  if (checkoutModalBackdrop) {
    checkoutModalBackdrop.classList.remove("open");
  }
}

if (openCheckoutModalBtn) {
  openCheckoutModalBtn.addEventListener("click", openCheckoutModal);
}

if (closeModalBtn) {
  closeModalBtn.addEventListener("click", closeCheckoutModal);
}

if (checkoutModalBackdrop) {
  checkoutModalBackdrop.addEventListener("click", (e) => {
    if (e.target === checkoutModalBackdrop) {
      closeCheckoutModal();
    }
  });
}

function renderCart() {
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  let discountAmount = 0;
  const isLoyal = isLoyaltyDiscountValid();

  if (isLoyal && subtotal > 0) {
    discountAmount = Math.round((subtotal * REORDER_DISCOUNT_PERCENT) / 100);
    if (discountRow) discountRow.style.display = "flex";
    if (cartDiscount) cartDiscount.textContent = `-₹${discountAmount.toLocaleString("en-IN")}`;
  } else {
    if (discountRow) discountRow.style.display = "none";
  }

  const discountedSubtotal = subtotal - discountAmount;

  let deliveryFee = 0;
  if (totalCount > 0) {
    deliveryFee = discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
  }
  const grandTotal = discountedSubtotal + deliveryFee;
  currentCalculatedGrandTotal = grandTotal;

  if (cartCountBadge) cartCountBadge.textContent = totalCount;
  if (cartTotalItems) cartTotalItems.textContent = totalCount;
  if (cartSubtotal) cartSubtotal.textContent = `₹${subtotal.toLocaleString("en-IN")}`;

  if (cartDeliveryCharge) {
    if (totalCount === 0) {
      cartDeliveryCharge.innerHTML = `₹0`;
    } else if (deliveryFee === 0) {
      cartDeliveryCharge.innerHTML = `<span class="free-tag">FREE</span>`;
    } else {
      cartDeliveryCharge.innerHTML = `₹${STANDARD_DELIVERY_FEE}`;
    }
  }

  if (cartGrandTotal) {
    cartGrandTotal.textContent = `₹${grandTotal.toLocaleString("en-IN")}`;
  }

  if (shippingNote) {
    if (totalCount === 0) {
      shippingNote.textContent = `Add ₹500+ for FREE Doorstep Delivery across Bangalore (Delivered in 48–72 hrs)`;
    } else if (discountedSubtotal >= FREE_SHIPPING_THRESHOLD) {
      shippingNote.innerHTML = `🎉 You unlocked <strong>FREE Bangalore Delivery</strong> (48–72 hrs)!`;
    } else {
      const remaining = FREE_SHIPPING_THRESHOLD - discountedSubtotal;
      shippingNote.innerHTML = `Add <strong>₹${remaining}</strong> more to get <strong>FREE Bangalore Delivery</strong>!`;
    }
  }

  if (checkoutModalBackdrop && checkoutModalBackdrop.classList.contains("open")) {
    generateDynamicUPI();
  }

  if (!cartItemsList) return;

  if (cart.length === 0) {
    cartItemsList.innerHTML = `<div class="empty-cart-msg">Your artisanal bag is empty.<br>Select any bottle or combo above to begin.</div>`;
    return;
  }

  cartItemsList.innerHTML = cart
    .map(
      (item) => `
      <div class="cart-item">
        <img src="${item.img}" class="cart-item-thumb" alt="${item.title}" onerror="this.src='https://placehold.co/100x120/171412/eab308?text=Bottle'" />
        <div class="cart-item-details">
          <div class="cart-item-title">${item.title}</div>
          <div class="cart-item-price">₹${item.price}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)" type="button">-</button>
            <span class="qty-count">${item.quantity}</span>
            <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)" type="button">+</button>
            <button class="btn-remove-item" onclick="removeItem('${item.id}')" type="button">Remove</button>
          </div>
        </div>
      </div>
    `
    )
    .join("");
}

// Global hook for buttons with data attributes
document.querySelectorAll(".btn-buy-combo").forEach((button) => {
  button.addEventListener("click", (e) => {
    const btn = e.currentTarget;
    const product = {
      id: btn.dataset.id,
      title: btn.dataset.title,
      price: parseInt(btn.dataset.price, 10),
      img: btn.dataset.img
    };
    addToCart(product);
  });
});

// ==========================================
// 7. FORM VALIDATION ENGINE
// ==========================================
const nameEl = document.getElementById("custName");
const phoneEl = document.getElementById("custPhone");
const addressEl = document.getElementById("custAddress");
const cityEl = document.getElementById("custCity");
const pincodeEl = document.getElementById("custPincode");

const nameErr = document.getElementById("custNameErr");
const phoneErr = document.getElementById("custPhoneErr");
const addressErr = document.getElementById("custAddressErr");
const cityErr = document.getElementById("custCityErr");
const pincodeErr = document.getElementById("custPincodeErr");

function validateField(field, errorEl, ruleFn, errorMsg) {
  const isValid = ruleFn(field.value.trim());
  if (!isValid) {
    field.classList.add("input-error");
    errorEl.textContent = errorMsg;
    errorEl.style.display = "block";
  } else {
    field.classList.remove("input-error");
    errorEl.textContent = "";
    errorEl.style.display = "none";
  }
  return isValid;
}

const isNameValid = (v) => v.length >= 3 && /^[a-zA-Z\s.]+$/.test(v);
const isPhoneValid = (v) => /^[6-9]\d{9}$/.test(v);
const isAddressValid = (v) => v.length >= 10;
const isCityValid = (v) => v.length >= 2;
const isPincodeValid = (v) => /^(5[6-9]\d{4})$/.test(v);

nameEl?.addEventListener("blur", () => {
  if (nameEl.value.trim().length > 0) {
    validateField(nameEl, nameErr, isNameValid, "Please enter a valid full name (at least 3 characters).");
  }
});

phoneEl?.addEventListener("blur", () => {
  if (phoneEl.value.trim().length > 0) {
    validateField(phoneEl, phoneErr, isPhoneValid, "Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.");
  }
});

addressEl?.addEventListener("blur", () => {
  if (addressEl.value.trim().length > 0) {
    validateField(addressEl, addressErr, isAddressValid, "Please provide complete street / house details (minimum 10 characters).");
  }
});

cityEl?.addEventListener("blur", () => {
  if (cityEl.value.trim().length > 0) {
    validateField(cityEl, cityErr, isCityValid, "Please enter a valid city or area.");
  }
});

pincodeEl?.addEventListener("blur", () => {
  if (pincodeEl.value.trim().length > 0) {
    validateField(pincodeEl, pincodeErr, isPincodeValid, "Enter a valid 6-digit Karnataka pincode (starting with 56–59).");
  }
});

nameEl?.addEventListener("input", () => {
  if (nameEl.classList.contains("input-error") && isNameValid(nameEl.value.trim())) {
    nameEl.classList.remove("input-error");
    nameErr.style.display = "none";
  }
});

phoneEl?.addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/\D/g, "");
  if (phoneEl.classList.contains("input-error") && isPhoneValid(e.target.value.trim())) {
    phoneEl.classList.remove("input-error");
    phoneErr.style.display = "none";
  }
});

addressEl?.addEventListener("input", () => {
  if (addressEl.classList.contains("input-error") && isAddressValid(addressEl.value.trim())) {
    addressEl.classList.remove("input-error");
    addressErr.style.display = "none";
  }
});

cityEl?.addEventListener("input", () => {
  if (cityEl.classList.contains("input-error") && isCityValid(cityEl.value.trim())) {
    cityEl.classList.remove("input-error");
    cityErr.style.display = "none";
  }
});

pincodeEl?.addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/\D/g, "");
  if (pincodeEl.classList.contains("input-error") && isPincodeValid(e.target.value.trim())) {
    pincodeEl.classList.remove("input-error");
    pincodeErr.style.display = "none";
  }
});

function validateAllFields() {
  const v1 = validateField(nameEl, nameErr, isNameValid, "Please enter a valid full name (at least 3 characters).");
  const v2 = validateField(phoneEl, phoneErr, isPhoneValid, "Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.");
  const v3 = validateField(addressEl, addressErr, isAddressValid, "Please provide complete street / house details (minimum 10 characters).");
  const v4 = validateField(cityEl, cityErr, isCityValid, "Please enter a valid city or area.");
  const v5 = validateField(pincodeEl, pincodeErr, isPincodeValid, "Enter a valid 6-digit Karnataka pincode (starting with 56–59).");

  return v1 && v2 && v3 && v4 && v5;
}

// ==========================================
// 8. SYNCHRONIZED CLOUD DISPATCH & WHATSAPP
// ==========================================
async function checkoutViaWhatsApp() {
  if (!cart || cart.length === 0) return;

  if (!validateAllFields()) {
    if (formError) {
      formError.textContent = "Please fix the highlighted fields above before confirming.";
      formError.style.display = "block";
    }
    return;
  }

  if (formError) {
    formError.style.display = "none";
  }

  const name = nameEl.value.trim();
  const phone = phoneEl.value.trim();
  const labelCustomName = custLabelName ? custLabelName.value.trim() : "";
  const giftNote = document.getElementById("custGiftNote") ? document.getElementById("custGiftNote").value.trim() : "";
  const address = addressEl.value.trim();
  const district = document.getElementById("custDistrict").value;
  const city = cityEl.value.trim();
  const pincode = pincodeEl.value.trim();
  const isUPI = payUPIRadio && payUPIRadio.checked;
  const paymentModeText = isUPI ? "Prepaid UPI / QR Scan" : "Cash on Delivery (COD)";

  let message = `🌿 *New Order - MANOPAVANA Wood-Pressed Oils*\n`;
  message += `*Ref ID:* #${currentOrderRef}\n`;
  message += `─────────────────────────\n`;

  let subtotal = 0;
  let itemsSummaryArray = [];

  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    message += `${index + 1}. *${item.title}*\n    Qty: ${item.quantity} × ₹${item.price} = ₹${itemTotal.toLocaleString("en-IN")}\n`;
    itemsSummaryArray.push(`${item.title} (x${item.quantity})`);
  });

  const isLoyal = isLoyaltyDiscountValid();
  let discountAmount = 0;
  if (isLoyal && subtotal > 0) {
    discountAmount = Math.round((subtotal * REORDER_DISCOUNT_PERCENT) / 100);
  }

  const discountedSubtotal = subtotal - discountAmount;
  const deliveryFee = discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
  const grandTotal = discountedSubtotal + deliveryFee;

  message += `─────────────────────────\n`;
  message += `*Subtotal:* ₹${subtotal.toLocaleString("en-IN")}\n`;

  if (isLoyal && discountAmount > 0) {
    message += `*Bottle QR Reorder Discount (10% OFF):* -₹${discountAmount.toLocaleString("en-IN")}\n`;
  }

  message += `*Delivery Fee:* ${deliveryFee === 0 ? "FREE (Orders above ₹500)" : `₹${deliveryFee}`}\n`;
  message += `*Grand Total Payable:* ₹${grandTotal.toLocaleString("en-IN")}\n`;
  message += `*Payment Method:* ${paymentModeText}\n\n`;

  if (isGiftOrder) {
    message += `🎁 *Order Type:* Gift Dispatch (Fresh Bottles)\n`;
  } else {
    message += `🏡 *Order Type:* Home Kitchen Delivery (Fresh Bottles)\n`;
  }

  if (labelCustomName) {
    message += `🏷️ *Custom Bottle Label:* "${labelCustomName}"\n`;
  }

  if (isGiftOrder && giftNote) {
    message += `💌 *Gift Tag Note:* "${giftNote}"\n`;
  }

  message += `\n📍 *Delivery Details (Karnataka - 48 to 72 hrs):*\n`;
  message += `• *Recipient Name:* ${name}\n`;
  message += `• *Phone:* ${phone}\n`;
  message += `• *Address:* ${address}\n`;
  message += `• *City / Area:* ${city}\n`;
  message += `• *District:* ${district}\n`;
  message += `• *State:* Karnataka\n`;
  message += `• *Pincode:* ${pincode}\n\n`;

  if (isLoyal && discountAmount > 0) {
    message += `🏷️ *Promo Claimed:* Verified Bottle QR (${activeCloudBottleCode})\n`;
  }

  if (isUPI) {
    message += `✅ *Payment Status:* Paid via UPI / QR Scan. Please verify and confirm order!\n`;
  } else {
    message += `💵 *Payment Status:* Cash on Delivery. Please confirm dispatch!`;
  }

  const originalBtnText = submitOrderBtn.textContent;
  if (submitOrderBtn) {
    submitOrderBtn.disabled = true;
    submitOrderBtn.textContent = "Processing Order...";
  }

  try {
    await callGoogleSheetsCloud({
      action: "create_order",
      orderRef: currentOrderRef,
      name: name,
      phone: phone,
      address: `${address}, ${city}`,
      district: district,
      pincode: pincode,
      orderType: isGiftOrder ? "Gift Dispatch" : "Home Kitchen",
      customLabel: labelCustomName,
      giftNote: giftNote,
      items: itemsSummaryArray.join(", "),
      grandTotal: grandTotal,
      paymentMode: isUPI ? "UPI_PREPAID" : "COD",
      bottleCode: activeCloudBottleCode || ""
    });
  } catch (e) {
    console.warn("Google Sheets order sync notice:", e);
  }

  resetCloudLoyaltyState();

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?text=${encodedMessage}`;

  closeCheckoutModal();
  renderCart();
  startLiveCountdown();

  if (submitOrderBtn) {
    submitOrderBtn.disabled = false;
    submitOrderBtn.textContent = originalBtnText;
  }

  window.open(whatsappUrl, "_blank");
}

if (submitOrderBtn) {
  submitOrderBtn.addEventListener("click", checkoutViaWhatsApp);
}

// ==========================================
// 9. DYNAMIC USER REVIEWS & ADMIN PIN DELETE
// ==========================================
let reviewsList = JSON.parse(localStorage.getItem("manopavana_user_reviews")) || [];
const reviewsDisplayGrid = document.getElementById("reviewsDisplayGrid");
const productReviewForm = document.getElementById("productReviewForm");

function isAdminActive() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("admin") === "true";
}

function renderReviews() {
  if (!reviewsDisplayGrid) return;

  if (reviewsList.length === 0) {
    reviewsDisplayGrid.innerHTML = `
      <div class="empty-reviews-notice">
        <span>🌱</span>
        <p>No customer reviews posted yet.<br>Be the first to share your kitchen experience using the form below!</p>
      </div>
    `;
    return;
  }

  const isAdmin = isAdminActive();

  reviewsDisplayGrid.innerHTML = reviewsList
    .map((rev) => {
      const starRatingNum = Math.max(1, Math.min(5, parseInt(rev.rating, 10) || 5));
      const starsDisplay = "★".repeat(starRatingNum) + "☆".repeat(5 - starRatingNum);

      return `
      <div class="review-card" id="card-${rev.id}">
        <div>
          <div class="review-card-top">
            <div class="review-stars">${starsDisplay}</div>
            ${
              isAdmin
                ? `<button class="btn-admin-delete" onclick="deleteReview('${rev.id}')" title="Admin Delete">🗑️ Delete</button>`
                : ""
            }
          </div>
          <p class="review-text">"${escapeHtml(rev.comment)}"</p>
        </div>
        <div class="reviewer-meta">
          <strong>${escapeHtml(rev.name)}</strong>
          <span>${escapeHtml(rev.location)} • ${escapeHtml(rev.product)}</span>
          <small class="review-date">${escapeHtml(rev.date)}</small>
        </div>
      </div>
    `;
    })
    .join("");
}

window.deleteReview = function (reviewId) {
  const enteredPin = prompt("Admin Verification: Enter Secret PIN to remove this review:");
  if (enteredPin === ADMIN_PIN) {
    reviewsList = reviewsList.filter((item) => item.id !== reviewId);
    localStorage.setItem("manopavana_user_reviews", JSON.stringify(reviewsList));
    renderReviews();
    alert("Review removed successfully.");
  } else if (enteredPin !== null) {
    alert("Incorrect PIN. Action denied.");
  }
};

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

if (productReviewForm) {
  productReviewForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("revName").value.trim();
    const product = document.getElementById("revProduct").value;
    const rating = document.getElementById("revRating").value;
    const location = document.getElementById("revLocation").value.trim() || "Karnataka Customer";
    const comment = document.getElementById("revComment").value.trim();

    if (!name || !comment) {
      alert("Please enter your name and feedback.");
      return;
    }

    const newReview = {
      id: "REV-" + Date.now(),
      name: name,
      product: product,
      rating: rating,
      location: location,
      comment: comment,
      date: new Date().toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    };

    reviewsList.unshift(newReview);
    localStorage.setItem("manopavana_user_reviews", JSON.stringify(reviewsList));

    renderReviews();
    productReviewForm.reset();

    alert("✨ Thank you! Your review has been successfully posted on the website.");
  });
}

// ==========================================
// 10. LEGAL MODALS & ACCORDION SETUP
// ==========================================
function openLegalModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("open");
}

function closeLegalModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("open");
}

document.querySelectorAll(".legal-backdrop").forEach((backdrop) => {
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) {
      backdrop.classList.remove("open");
    }
  });
});

document.querySelectorAll(".faq-question").forEach((button) => {
  button.addEventListener("click", () => {
    const faqItem = button.parentElement;
    const isActive = faqItem.classList.contains("active");

    document.querySelectorAll(".faq-item").forEach((item) => {
      item.classList.remove("active");
    });

    if (!isActive) {
      faqItem.classList.add("active");
    }
  });
});

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  renderProductsGrid();
  renderCart();
  renderReviews();
});