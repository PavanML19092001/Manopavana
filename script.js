// ==========================================
// MANOPAVANA - ARTISANAL WOOD-PRESSED OILS (BANGALORE)
// PRODUCTION CLIENT SCRIPT (script.js) - FIRESTORE DIRECT
// ==========================================

(function () {
  "use strict";

  // ==========================================
  // 1. CONFIGURATION & CONSTANTS
  // ==========================================
  const R2_PUBLIC_BASE_URL = "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev";
  const WHATSAPP_BUSINESS_NUMBER = "919180301917";
  const FREE_SHIPPING_THRESHOLD = 500;
  const STANDARD_DELIVERY_FEE = 49;
  const REORDER_DISCOUNT_PERCENT = 10;
  const QR_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 Days
  const ADMIN_PIN = "1234";

  // Default Bangalore Landmark Center (Vidhana Soudha corridor)
  const DEFAULT_BANGALORE_COORDS = [12.9716, 77.5946];

  // Google Apps Script URL (FOR PHONEPE SECRET HANDSHAKE)
  const GOOGLE_SCRIPT_API_URL = "https://script.google.com/macros/s/AKfycbyQ-8w0XmfJiBUm8fg_W3kBQ7XSXJTftmc6I7188L25N_dwWCKDtYwnpRJTcCii70U-/exec";

  // Active Firebase Configuration
  const firebaseConfig = {
    apiKey: "AIzaSyBZ2h7B82XvIR2ffT2E5g9MHp1M7QPO9K4",
    authDomain: "manopavana-d399e.firebaseapp.com",
    projectId: "manopavana-d399e",
    storageBucket: "manopavana-d399e.firebasestorage.app",
    messagingSenderId: "675866391632",
    appId: "1:675866391632:web:a5c160fb7315a5f8788d55",
    measurementId: "G-5G8JTQF8Q2"
  };

  // ==========================================
  // 2. STATE VARIABLES
  // ==========================================
  let authInstance = null;
  let googleAuthProvider = null;
  let db = null;
  let firebaseInitialized = false;

  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem("manopavana_active_user")) || null;
  } catch (e) {
    currentUser = null;
  }

  let currentAuthMode = "login";
  let countdownTimerInterval = null;
  let currentCalculatedGrandTotal = 0;
  let currentOrderRef = "";
  let checkoutSource = "cart";
  let buyNowItem = null;
  let retryOrderData = null;
  let lastFailedOrderRef = "";
  let toastTimeoutTimer = null;
  let addressTypingTimer = null;

  // Leaflet Map & Marker Instances
  let leafletMap = null;
  let mapMarker = null;
  let onboardMap = null;
  let onboardMarker = null;

  let userSelectedPincode = localStorage.getItem("manopavana_user_pincode") || "560058";
  let isBangalorePincode = userSelectedPincode.startsWith("560");

  let activeBottleCode = localStorage.getItem("manopavana_bottle_code") || null;
  let bottleScanTimestampMs = localStorage.getItem("manopavana_bottle_scan_time")
    ? parseInt(localStorage.getItem("manopavana_bottle_scan_time"), 10)
    : null;

  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem("manopavana_cart")) || [];
  } catch (e) {
    cart = [];
  }

  let localOrdersHistory = [];
  try {
    localOrdersHistory = JSON.parse(localStorage.getItem("manopavana_local_orders")) || [];
  } catch (e) {
    localOrdersHistory = [];
  }

  let reviewsList = [];
  try {
    reviewsList = JSON.parse(localStorage.getItem("manopavana_user_reviews")) || [];
  } catch (e) {
    reviewsList = [];
  }

  let currentSelectedComboKey = "combo-3l";
  let currentDetailProductKey = null;
  let currentDetailSelectedSize = "1L";

  // Bottle Loyalty Quiz State
  let onboardingQuizAttemptsLeft = 2;
  let selectedQuizBottleKey = "groundnut";
  let activeQuizData = null;
  let selectedQuizOptionText = null;

  const BOTTLE_QUIZ_POOLS = {
    groundnut: [
      {
        hint: "Look at the front label right below 'GROUNDNUT OIL':",
        question: "What tagline is printed right below 'GROUNDNUT OIL' on the front label?",
        correct: "Perfect for Everyday Indian Cooking"
      }
    ],
    coconut: [
      {
        hint: "Look at the front label right below 'COCONUT OIL':",
        question: "What tagline is printed right below 'COCONUT OIL' on the front label?",
        correct: "Made for Authentic Flavours"
      }
    ],
    sesame: [
      {
        hint: "Look at the front label right below 'SESAME OIL':",
        question: "What tagline is printed right below 'SESAME OIL' on the front label?",
        correct: "The Traditional Choice for Rich Flavour"
      }
    ]
  };

  // ==========================================
  // 3. MASTER CATALOG & SPECIFICATIONS
  // ==========================================
  const createGallery = (prefix, count = 11) =>
    Array.from({ length: count }, (_, i) => `${R2_PUBLIC_BASE_URL}/${prefix}-${i + 1}.png`);

  const PRODUCT_CATALOG = {
    groundnut: {
      id: "groundnut",
      name: "Wood-Pressed Groundnut Oil",
      badgeTheme: "theme-groundnut",
      bgClass: "oil-groundnut",
      img: `${R2_PUBLIC_BASE_URL}/groundnut-1.png`,
      gallery: createGallery("groundnut", 11),
      shortDesc: "Sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore packaging and distribution facility. Unrefined and unbleached, retaining authentic aroma and high smoke-point performance.",
      features: [
        { icon: "🌾", label: "Aroma", val: "Naturally Nutty" },
        { icon: "🫓", label: "Texture", val: "Light & Non-Sticky" },
        { icon: "🍳", label: "Cooking", val: "Absorbs Less" }
      ],
      specs: {
        "Extraction Method": "Traditional Wooden Marachekku (<45°C)",
        "Processing Type": "Unrefined, Unbleached & Non-Deodorized",
        "FSSAI License": "Reg. No. 21226008004689",
        "Packaging Facility": "Bangalore Packaging & Distribution Facility",
        "Container Type": "Food-Grade Shatterproof Bottle + Drip-Free Spout",
        "Best For": "Daily Curries, Crispy Dosas, Deep Frying, Sautéing",
        "Shelf Life": "9-12 Months (Store in cool, dark place)",
        "Authenticity Standards": "Zero Mineral Oil, No Argemone, No Added Preservatives"
      },
      nutrition: [
        { name: "Energy", val: "862.1 Kcal" },
        { name: "Carbohydrates", val: "0.0 gm" },
        { name: "Total Fat", val: "99.97 gm" },
        { name: "Saturated Fat", val: "86.95 gm" },
        { name: "Mono Unsaturated Fat", val: "6.48 gm" },
        { name: "Poly Unsaturated Fat", val: "1.83 gm" },
        { name: "Trans Fat", val: "0.0 gm" },
        { name: "Cholesterol", val: "0.0 mg" },
        { name: "Protein", val: "0.0 gm" },
        { name: "Total Sugar", val: "0.0 gm" },
        { name: "Dietary Fiber", val: "0.0 gm" },
        { name: "Moisture", val: "0.05 %" },
        { name: "Total Ash", val: "0.05 %" }
      ],
      sizes: {
        "1L": { id: "groundnut-1l", price: 399, badge: "1 Litre", title: "Wood-Pressed Groundnut Oil (1L)" },
        "500ml": { id: "groundnut-500ml", price: 189, badge: "500 ml", title: "Wood-Pressed Groundnut Oil (500ml)" }
      }
    },
    coconut: {
      id: "coconut",
      name: "Wood-Pressed Coconut Oil",
      badgeTheme: "theme-coconut",
      bgClass: "oil-coconut",
      img: `${R2_PUBLIC_BASE_URL}/coconut-1.png`,
      gallery: createGallery("coconut", 11),
      shortDesc: "Sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore packaging and distribution facility. Extracted from sulfur-free copra with wholesome MCTs.",
      features: [
        { icon: "🥥", label: "Aroma", val: "Fresh Copra Scent" },
        { icon: "✨", label: "Extraction", val: "Slow Wood Chekku" },
        { icon: "🌿", label: "Usage", val: "Edible & Multi-Use" }
      ],
      specs: {
        "Extraction Method": "Traditional Wood Chekku (<40°C)",
        "Processing Type": "Raw, Unrefined & Natural Settling",
        "FSSAI License": "Reg. No. 21226008004689",
        "Packaging Facility": "Bangalore Packaging & Distribution Facility",
        "Container Type": "Food-Grade Shatterproof Bottle + Drip-Free Spout",
        "Best For": "Coastal Curries, Kerala Avial, Vegetable Stew, Hair Care",
        "Shelf Life": "9-12 Months",
        "Authenticity Standards": "Zero Liquid Paraffin, No Added Aromas"
      },
      nutrition: [
        { name: "Energy", val: "862.1 Kcal" },
        { name: "Carbohydrates", val: "0.0 gm" },
        { name: "Total Fat", val: "99.97 gm" },
        { name: "Saturated Fat", val: "86.95 gm" },
        { name: "Mono Unsaturated Fat", val: "6.48 gm" },
        { name: "Poly Unsaturated Fat", val: "1.83 gm" },
        { name: "Trans Fat", val: "0.0 gm" },
        { name: "Cholesterol", val: "0.0 mg" },
        { name: "Protein", val: "0.0 gm" },
        { name: "Total Sugar", val: "0.0 gm" },
        { name: "Dietary Fiber", val: "0.0 gm" },
        { name: "Moisture", val: "0.05 %" },
        { name: "Total Ash", val: "0.05 %" }
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
      img: `${R2_PUBLIC_BASE_URL}/sesame-1.png`,
      gallery: createGallery("sesame", 11),
      shortDesc: "Sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore packaging and distribution facility. Ground with pure palm jaggery for traditional nutty warmth.",
      features: [
        { icon: "🍯", label: "Aroma", val: "Chekku Scent" },
        { icon: "🪵", label: "Process", val: "Slow Crushed" },
        { icon: "☀", label: "Quality", val: "Unrefined Extraction" }
      ],
      specs: {
        "Extraction Method": "Slow Wooden Press with Palm Jaggery",
        "Processing Type": "Unbleached, Natural Cloth Filtration",
        "FSSAI License": "Reg. No. 21226008004689",
        "Packaging Facility": "Bangalore Packaging & Distribution Facility",
        "Container Type": "Food-Grade Shatterproof Bottle + Drip-Free Spout",
        "Best For": "Authentic Idli Podi, Puliogare, Rasam Tadka, Oil Pulling",
        "Shelf Life": "9-12 Months",
        "Authenticity Standards": "100% Sesame Extract, Zero Synthetic Fragrances"
      },
      nutrition: [
        { name: "Energy", val: "884.3 Kcal" },
        { name: "Carbohydrates", val: "0.0 gm" },
        { name: "Total Fat", val: "99.96 gm" },
        { name: "Saturated Fat", val: "13.9 gm" },
        { name: "Poly Unsaturated Fat", val: "43.35 gm" },
        { name: "Mono Unsaturated Fat", val: "42.11 gm" },
        { name: "Trans Fat", val: "0.0 gm" },
        { name: "Cholesterol", val: "0.0 mg" },
        { name: "Protein", val: "0.0 gm" },
        { name: "Total Sugar", val: "0.0 gm" },
        { name: "Dietary Fiber", val: "0.0 gm" },
        { name: "Moisture", val: "0.07 %" },
        { name: "Total Ash", val: "0.03 %" }
      ],
      sizes: {
        "1L": { id: "sesame-1l", price: 499, badge: "1 Litre", title: "Wood-Pressed Sesame Oil (1L)" },
        "500ml": { id: "sesame-500ml", price: 269, badge: "500 ml", title: "Wood-Pressed Sesame Oil (500ml)" }
      }
    }
  };

  const COMBO_CATALOG = {
    "combo-3l": {
      id: "combo-3l",
      title: "Complete 3-Oil Essential Box (3L Trio)",
      volume: "3 Litres",
      badgeText: "3 x 1 Litre Kitchen Trio",
      headingText: "Complete Kitchen 3-Oil Essential Box (3 Litres)",
      descText: "Equip your kitchen with South India's 3 core traditional wood-pressed oils. Sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore packaging and distribution facility. Includes 1L Groundnut Oil, 1L Coconut Oil, and 1L Sesame Oil.",
      price: 1299,
      qrPrice: 1169,
      img: `${R2_PUBLIC_BASE_URL}/combo-all-labels.jpg`
    },
    "combo-15l": {
      id: "combo-15l",
      title: "Complete 3-Oil Starter Box (1.5L Trio)",
      volume: "1.5 Litres",
      badgeText: "3 x 500ml Kitchen Trio",
      headingText: "Complete Kitchen 3-Oil Starter Box (1.5 Litres)",
      descText: "Compact kitchen starter box containing 500ml Groundnut Oil, 500ml Coconut Oil, and 500ml Sesame Oil, packed fresh at our Bangalore packaging and distribution facility.",
      price: 699,
      qrPrice: 629,
      img: `${R2_PUBLIC_BASE_URL}/combo-all-labels.jpg`
    }
  };

  const INDIA_STATES_AND_DISTRICTS = {
    "Karnataka": [
      "Bagalkote", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar",
      "Chamarajanagara", "Chikkaballapura", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada",
      "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar",
      "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru",
      "Udupi", "Uttara Kannada", "Vijayanagara", "Vijayapura", "Yadgir"
    ],
    "Tamil Nadu": [
      "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri",
      "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur",
      "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris",
      "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga",
      "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli",
      "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore",
      "Viluppuram", "Virudhunagar"
    ],
    "Kerala": [
      "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam",
      "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta",
      "Thiruvananthapuram", "Thrissur", "Wayanad"
    ],
    "Andhra Pradesh": [
      "Alluri Sitharama Raju", "Anakapalli", "Ananthapuramu", "Annamayya", "Bapatla",
      "Chittoor", "Dr. B.R. Ambedkar Konaseema", "East Godavari", "Eluru", "Guntur",
      "Kakinada", "Krishna", "Kurnool", "Nandyal", "NTR", "Palnadu",
      "Parvathipuram Manyam", "Prakasam", "Sri Potti Sriramulu Nellore", "Sri Sathya Sai",
      "Srikakulam", "Tirupati", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"
    ],
    "Telangana": [
      "Adilabad", "Bhadradri Kothagudem", "Hanamkonda", "Hyderabad", "Jagtial",
      "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar",
      "Khammam", "Kumuram Bheem Asifabad", "Mahabubabad", "Mahabubnagar", "Mancherial",
      "Medak", "Medchal-Malkajgiri", "Mulugu", "Nagarkurnool", "Nalgonda",
      "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla",
      "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad",
      "Wanaparthy", "Warangal", "Yadadri Bhuvanagiri"
    ],
    "Maharashtra": [
      "Ahmednagar", "Akola", "Amravati", "Chhatrapati Sambhajinagar", "Beed", "Bhandara",
      "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli",
      "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban",
      "Nagpur", "Nanded", "Nandurbar", "Nashik", "Dharashiv", "Palghar",
      "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara",
      "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"
    ],
    "Delhi": [
      "Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi",
      "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"
    ]
  };

  function populateStatesDropdown() {
    const stateSelect = document.getElementById("custState");
    const districtSelect = document.getElementById("custDistrict");
    if (!stateSelect || !districtSelect) return;

    stateSelect.innerHTML = `<option value="">-- Select State / UT --</option>`;
    Object.keys(INDIA_STATES_AND_DISTRICTS).sort().forEach((stateName) => {
      const opt = document.createElement("option");
      opt.value = stateName;
      opt.textContent = stateName;
      stateSelect.appendChild(opt);
    });

    stateSelect.value = "Karnataka";
    populateDistrictsForState("Karnataka");

    stateSelect.onchange = function (e) {
      populateDistrictsForState(e.target.value);
    };
  }

  function populateDistrictsForState(stateName) {
    const districtSelect = document.getElementById("custDistrict");
    if (!districtSelect) return;

    districtSelect.innerHTML = `<option value="">-- Select District --</option>`;
    if (!stateName || !INDIA_STATES_AND_DISTRICTS[stateName]) return;

    const districts = [...INDIA_STATES_AND_DISTRICTS[stateName]].sort();
    districts.forEach((dist) => {
      const opt = document.createElement("option");
      opt.value = dist;
      opt.textContent = dist;
      districtSelect.appendChild(opt);
    });

    if (stateName === "Karnataka" && districts.includes("Bengaluru Urban")) {
      districtSelect.value = "Bengaluru Urban";
    }
  }

  function escapeHtml(text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ==========================================
  // 4. ACTION TOAST & ERROR TRANSLATOR
  // ==========================================
  window.showActionToast = function (title, message, icon = "✨", type = "info") {
    const toast = document.getElementById("actionToast");
    const titleEl = document.getElementById("actionToastTitle");
    const msgEl = document.getElementById("actionToastMessage");
    const iconEl = document.getElementById("actionToastIcon");

    if (!toast) return;

    if (toastTimeoutTimer) clearTimeout(toastTimeoutTimer);

    toast.className = "action-toast";
    if (type === "success") toast.classList.add("toast-success");
    if (type === "error") toast.classList.add("toast-error");

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (iconEl) iconEl.textContent = icon;

    toast.classList.add("show");

    toastTimeoutTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 4000);
  };

  function getFriendlyAuthErrorMessage(err) {
    if (!err) return "An unexpected error occurred. Please try again.";
    const code = err.code || "";
    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Invalid phone/email or password. Please verify and try again.";
      case "auth/email-already-in-use":
        return "An account already exists with these credentials. Please sign in instead.";
      case "auth/weak-password":
        return "Please choose a password with at least 6 characters.";
      case "auth/invalid-email":
        return "Please enter a valid phone number or email address.";
      case "auth/popup-closed-by-user":
        return "Sign-in was cancelled before completion. Please try again.";
      case "auth/popup-blocked":
        return "Pop-up blocked by your browser. Please allow popups for this site.";
      case "auth/network-request-failed":
        return "Network connection issue detected. Please check your internet connection.";
      case "auth/too-many-requests":
        return "Too many unsuccessful attempts. Access paused for security. Try again in 2 minutes.";
      default:
        return err.message || "Authentication failed. Please try again.";
    }
  }

  // ==========================================
  // 5. JSONP BACKEND CALLER (FOR PHONEPE PG ONLY)
  // ==========================================
  function callBackend(params) {
    return new Promise((resolve, reject) => {
      const callbackName = "jsonp_cb_" + Math.round(100000 * Math.random());
      let script = null;
      let timer = null;

      window[callbackName] = function (data) {
        clearTimeout(timer);
        delete window[callbackName];
        if (script && script.parentNode) script.parentNode.removeChild(script);
        resolve(data);
      };

      const queryString = Object.keys(params)
        .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(params[k]))
        .join("&");

      script = document.createElement("script");
      script.src = `${GOOGLE_SCRIPT_API_URL}?${queryString}&callback=${callbackName}`;

      script.onerror = function () {
        clearTimeout(timer);
        delete window[callbackName];
        if (script && script.parentNode) script.parentNode.removeChild(script);
        reject(new Error("Unable to connect to gateway controller."));
      };

      timer = setTimeout(function () {
        delete window[callbackName];
        if (script && script.parentNode) script.parentNode.removeChild(script);
        reject(new Error("Server response timed out. Action cached locally."));
      }, 15000);

      document.body.appendChild(script);
    });
  }

  // ==========================================
  // 6. FIREBASE AUTH & UNIVERSAL LOGIN
  // ==========================================
  function initFirebaseAuth() {
    try {
      if (window.firebase && window.firebase.auth) {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        authInstance = firebase.auth();
        googleAuthProvider = new firebase.auth.GoogleAuthProvider();

        if (window.firebase.firestore) {
          db = firebase.firestore();
        }

        firebaseInitialized = true;

        authInstance.onAuthStateChanged(async (user) => {
          if (user) {
            let phone = "";
            let name = user.displayName || (user.email ? user.email.split("@")[0] : "Customer");
            if (name.endsWith("_phone")) name = name.replace("_phone", "");

            if (db) {
              try {
                const doc = await db.collection("customers").doc(user.uid).get();
                if (doc.exists) {
                  const d = doc.data();
                  if (d.name) name = d.name;
                  if (d.phone) phone = d.phone;
                }
              } catch (e) {}
            }

            currentUser = {
              uid: user.uid,
              email: user.email || "",
              phone: phone || user.phoneNumber || "",
              displayName: name
            };
            localStorage.setItem("manopavana_active_user", JSON.stringify(currentUser));
          } else {
            currentUser = null;
            localStorage.removeItem("manopavana_active_user");
          }
          updateAuthUI();
        });
      }
    } catch (err) {
      console.error("Firebase init error:", err);
    }
    updateAuthUI();
  }

  async function syncCustomerRecord(user, extraData, isNewUser) {
    if (!db || !user) return;
    try {
      const userRef = db.collection("customers").doc(user.uid);
      const doc = await userRef.get();

      if (!doc.exists) {
        await userRef.set({
          firebaseUid: user.uid,
          name: extraData.name || user.displayName || "Customer",
          email: user.email || "",
          phone: extraData.phone || "",
          totalOrders: 0,
          totalSpent: 0,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        await userRef.update({
          lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (e) {
      console.warn("Customer Firestore sync notice:", e);
    }
  }

  function updateAuthUI() {
    const authPillLabel = document.getElementById("authPillLabel");
    const authUserMeta = document.getElementById("authUserMeta");
    const custNameInput = document.getElementById("custName");
    const custPhoneInput = document.getElementById("custPhone");
    const logoutItem = document.getElementById("authLogoutItem");

    if (currentUser) {
      const name = currentUser.displayName || (currentUser.email ? currentUser.email.split("@")[0] : "Customer");
      if (authPillLabel) authPillLabel.textContent = "👤 " + name;
      if (authUserMeta) authUserMeta.textContent = `Hello, ${name}`;
      if (custNameInput && !custNameInput.value && currentUser.displayName) {
        custNameInput.value = currentUser.displayName;
      }
      if (custPhoneInput && !custPhoneInput.value && currentUser.phone) {
        custPhoneInput.value = currentUser.phone;
      }
      if (logoutItem) logoutItem.style.display = "block";
    } else {
      if (authPillLabel) authPillLabel.textContent = "👤 Login";
      if (authUserMeta) authUserMeta.textContent = "Welcome to MANOPAVANA";
      if (logoutItem) logoutItem.style.display = "none";
    }
  }

  window.handleAuthPillClick = function () {
    const dropdown = document.getElementById("authDropdownMenu");
    if (currentUser) {
      if (dropdown) dropdown.classList.toggle("open");
    } else {
      window.openAuthModal("login");
    }
  };

  window.openAuthModal = function (mode = "login") {
    window.toggleAuthMode(mode);
    const modal = document.getElementById("authModalBackdrop");
    if (modal) {
      modal.classList.add("open");
      document.body.classList.add("modal-open");
    }
  };

  window.closeAuthModal = function () {
    const modal = document.getElementById("authModalBackdrop");
    if (modal) {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
    }
  };

  window.toggleAuthMode = function (mode) {
    currentAuthMode = mode;
    const sidebarTitle = document.getElementById("fkAuthSidebarTitle");
    const sidebarDesc = document.getElementById("fkAuthSidebarDesc");
    const submitBtn = document.getElementById("btnAuthSubmit");
    const switchBtn = document.getElementById("btnAuthSwitchMode");
    const passGroup = document.getElementById("authPasswordGroup");
    const errBox = document.getElementById("authErrorMsg");
    const successBox = document.getElementById("authSuccessMsg");

    if (errBox) errBox.style.display = "none";
    if (successBox) successBox.style.display = "none";
    if (submitBtn) submitBtn.disabled = false;

    if (mode === "login") {
      if (sidebarTitle) sidebarTitle.textContent = "Login";
      if (sidebarDesc) sidebarDesc.textContent = "Access your orders, saved addresses, and authentic wood-pressed oils discounts.";
      if (submitBtn) submitBtn.textContent = "Continue";
      if (switchBtn) {
        switchBtn.textContent = "New to MANOPAVANA? Create an account";
        switchBtn.style.display = "inline-block";
      }
      if (passGroup) passGroup.style.display = "block";
    } else if (mode === "register") {
      if (sidebarTitle) sidebarTitle.textContent = "Register";
      if (sidebarDesc) sidebarDesc.textContent = "Sign up with your phone or email to track doorstep delivery & earn repeat benefits.";
      if (submitBtn) submitBtn.textContent = "Create Account";
      if (switchBtn) {
        switchBtn.textContent = "Existing User? Log In";
        switchBtn.style.display = "inline-block";
      }
      if (passGroup) passGroup.style.display = "block";
    } else if (mode === "reset") {
      if (sidebarTitle) sidebarTitle.textContent = "Reset Password";
      if (sidebarDesc) sidebarDesc.textContent = "Enter your registered email address and we'll send you a password reset link.";
      if (submitBtn) submitBtn.textContent = "Send Reset Link";
      if (switchBtn) {
        switchBtn.textContent = "Back to Sign In";
        switchBtn.style.display = "inline-block";
      }
      if (passGroup) passGroup.style.display = "none";
    }
  };

  window.toggleAuthModeAlternate = function () {
    if (currentAuthMode === "login") {
      window.toggleAuthMode("register");
    } else {
      window.toggleAuthMode("login");
    }
  };

  window.handleUniversalAuthSubmit = async function (e) {
    if (e && e.preventDefault) e.preventDefault();

    let identifier = document.getElementById("authIdentifier")?.value.trim() || "";
    const password = document.getElementById("authPassword")?.value || "";
    const errBox = document.getElementById("authErrorMsg");
    const successBox = document.getElementById("authSuccessMsg");
    const submitBtn = document.getElementById("btnAuthSubmit");

    if (errBox) errBox.style.display = "none";
    if (successBox) successBox.style.display = "none";

    if (!identifier) {
      if (errBox) {
        errBox.textContent = "Please enter your Phone Number or Email Address.";
        errBox.style.display = "block";
      }
      return;
    }

    let isPhone = false;
    let authEmail = identifier;
    const cleanDigits = identifier.replace(/\D/g, "");
    if (cleanDigits.length === 10 && !identifier.includes("@")) {
      isPhone = true;
      authEmail = `${cleanDigits}@phone.manopavana.com`;
    }

    if (currentAuthMode === "reset") {
      if (isPhone) {
        if (errBox) {
          errBox.textContent = "Password resets via link require an email address. If using phone, please contact support.";
          errBox.style.display = "block";
        }
        return;
      }
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending...";
      }
      try {
        if (!firebaseInitialized) throw new Error("Authentication service connecting. Please try again.");
        await authInstance.sendPasswordResetEmail(authEmail);
        if (successBox) {
          successBox.textContent = "Password reset instructions sent! Please check your Inbox and Spam.";
          successBox.style.display = "block";
        }
      } catch (err) {
        if (errBox) {
          errBox.textContent = getFriendlyAuthErrorMessage(err);
          errBox.style.display = "block";
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Send Reset Link";
        }
      }
      return;
    }

    if (!firebaseInitialized) {
      if (errBox) {
        errBox.textContent = "Authentication service connecting. Please try again in a moment.";
        errBox.style.display = "block";
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Processing...";
    }

    try {
      if (currentAuthMode === "login") {
        if (!password) throw new Error("Password is required to sign in.");
        const userCred = await authInstance.signInWithEmailAndPassword(authEmail, password);
        const user = userCred.user;
        const name = user.displayName || (isPhone ? cleanDigits : authEmail.split("@")[0]);

        await syncCustomerRecord(user, {
          name: name,
          email: isPhone ? "" : authEmail,
          phone: isPhone ? cleanDigits : ""
        }, false);

        window.closeAuthModal();
        window.showActionToast("Sign In Successful", `🎉 Welcome back, ${name}!`, "👋", "success");
      } else if (currentAuthMode === "register") {
        if (!password || password.length < 6) throw new Error("Password must be at least 6 characters.");
        const userCred = await authInstance.createUserWithEmailAndPassword(authEmail, password);
        const user = userCred.user;
        const name = isPhone ? cleanDigits : authEmail.split("@")[0];

        await user.updateProfile({ displayName: name });

        await syncCustomerRecord(user, {
          name: name,
          email: isPhone ? "" : authEmail,
          phone: isPhone ? cleanDigits : ""
        }, true);

        window.closeAuthModal();
        window.showActionToast("Account Created", `🎉 Welcome to MANOPAVANA, ${name}!`, "🎉", "success");
      }
    } catch (err) {
      if (errBox) {
        errBox.textContent = getFriendlyAuthErrorMessage(err);
        errBox.style.display = "block";
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = currentAuthMode === "login" ? "Continue" : "Create Account";
      }
    }
  };

  window.handleGoogleSignIn = async function () {
    const errBox = document.getElementById("authErrorMsg");
    if (!firebaseInitialized) {
      alert("Authentication service connecting. Please try again in a moment.");
      return;
    }
    try {
      const result = await authInstance.signInWithPopup(googleAuthProvider);
      const user = result.user;
      const isNewUser = !!(result.additionalUserInfo && result.additionalUserInfo.isNewUser);
      const name = user.displayName || user.email.split("@")[0];

      await syncCustomerRecord(user, {
        name: name,
        email: user.email,
        phone: user.phoneNumber || ""
      }, isNewUser);

      window.closeAuthModal();

      if (isNewUser) {
        window.showActionToast("Account Created", `🎉 Welcome to MANOPAVANA, ${name}!`, "🎉", "success");
      } else {
        window.showActionToast("Sign In Successful", `🎉 Welcome back, ${name}!`, "������", "success");
      }
    } catch (err) {
      if (errBox) {
        errBox.textContent = getFriendlyAuthErrorMessage(err);
        errBox.style.display = "block";
      }
    }
  };

  window.handleSignOut = async function () {
    const dropdown = document.getElementById("authDropdownMenu");
    if (dropdown) dropdown.classList.remove("open");
    if (authInstance) {
      try { await authInstance.signOut(); } catch (e) {}
    }
    currentUser = null;
    localStorage.removeItem("manopavana_active_user");
    updateAuthUI();
    window.closeAccountDashboard();
    window.showActionToast("Signed Out", "👋 You have logged out successfully.", "👋", "info");
  };

  document.addEventListener("click", (e) => {
    const dropdown = document.getElementById("authDropdownMenu");
    const container = document.getElementById("authPillContainer");
    if (dropdown && container && !container.contains(e.target)) {
      dropdown.classList.remove("open");
    }
  });

  // ==========================================
  // 7. USER DASHBOARD & ADDRESS MANAGEMENT
  // ==========================================
  window.openAccountDashboard = function (initialTab = "orders") {
    const dropdown = document.getElementById("authDropdownMenu");
    if (dropdown) dropdown.classList.remove("open");

    if (!currentUser && initialTab === "profile") {
      window.openAuthModal("login");
      window.showActionToast("Sign In Required", "Please sign in to view your profile.", "👤", "info");
      return;
    }

    const modal = document.getElementById("accountDashboardBackdrop");
    if (!modal) return;
    modal.classList.add("open");
    document.body.classList.add("modal-open");
    window.switchDashboardView(initialTab);
  };

  window.closeAccountDashboard = function () {
    const modal = document.getElementById("accountDashboardBackdrop");
    if (modal) {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
    }
  };

  window.switchDashboardView = function (tabType) {
    const views = {
      orders: document.getElementById("dashOrdersView"),
      profile: document.getElementById("dashProfileView"),
      addresses: document.getElementById("dashAddressesView")
    };

    const tabs = {
      orders: document.getElementById("tabDashOrders"),
      profile: document.getElementById("tabDashProfile"),
      addresses: document.getElementById("tabDashAddresses")
    };

    Object.keys(views).forEach((key) => {
      if (views[key]) views[key].style.display = key === tabType ? "block" : "none";
      if (tabs[key]) tabs[key].classList.toggle("active", key === tabType);
    });

    if (tabType === "orders") {
      fetchUserOrderHistory();
    } else if (tabType === "profile") {
      renderDashboardProfile();
    } else if (tabType === "addresses") {
      renderDashboardSavedAddress();
    }
  };

  function renderDashboardProfile() {
    const profDisplayName = document.getElementById("profDisplayName");
    const profEmail = document.getElementById("profEmail");
    const profPhone = document.getElementById("profPhone");
    const profLoyalBadge = document.getElementById("profLoyalBadge");

    if (currentUser) {
      if (profDisplayName) profDisplayName.textContent = currentUser.displayName || "Customer";
      if (profEmail) {
        profEmail.textContent = (currentUser.email && currentUser.email.includes("@phone.manopavana.com"))
          ? "Registered via Phone"
          : (currentUser.email || "--");
      }
      if (profPhone) profPhone.textContent = currentUser.phone ? `+91 ${currentUser.phone}` : "Not linked yet";
    } else {
      if (profDisplayName) profDisplayName.textContent = "Guest Customer";
      if (profEmail) profEmail.textContent = "Sign in to associate your orders";
      if (profPhone) profPhone.textContent = "--";
    }

    if (profLoyalBadge) {
      profLoyalBadge.style.display = isLoyaltyDiscountValid() ? "inline-block" : "none";
    }
  }

  window.toggleProfileEditMode = function (showEdit = true) {
    const readBox = document.getElementById("profileReadState");
    const formBox = document.getElementById("profileEditForm");
    const editBtn = document.getElementById("btnToggleEditProfile");

    if (!currentUser) return;

    if (showEdit) {
      if (readBox) readBox.style.display = "none";
      if (formBox) {
        formBox.style.display = "block";
        const nameInp = document.getElementById("editProfName");
        const emailInp = document.getElementById("editProfEmail");
        const phoneInp = document.getElementById("editProfPhone");
        if (nameInp) nameInp.value = currentUser.displayName || "";
        if (emailInp) {
          const isPhoneAlias = currentUser.email && currentUser.email.includes("@phone.manopavana.com");
          emailInp.value = isPhoneAlias ? "" : (currentUser.email || "");
        }
        if (phoneInp) phoneInp.value = currentUser.phone || "";
      }
      if (editBtn) editBtn.style.display = "none";
    } else {
      if (readBox) readBox.style.display = "block";
      if (formBox) formBox.style.display = "none";
      if (editBtn) editBtn.style.display = "inline-block";
    }
  };

  window.saveUserProfileChanges = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!currentUser) return;

    const newName = document.getElementById("editProfName")?.value.trim();
    const newEmail = document.getElementById("editProfEmail")?.value.trim() || "";
    const newPhone = document.getElementById("editProfPhone")?.value.trim();

    if (!newName || newPhone.length < 10) {
      alert("Please enter a valid Full Name and 10-digit Phone number.");
      return;
    }

    if (newEmail && !newEmail.includes("@")) {
      alert("Please enter a valid Email Address.");
      return;
    }

    currentUser.displayName = newName;
    if (newEmail) currentUser.email = newEmail;
    currentUser.phone = newPhone;
    localStorage.setItem("manopavana_active_user", JSON.stringify(currentUser));

    if (authInstance && authInstance.currentUser) {
      try {
        await authInstance.currentUser.updateProfile({ displayName: newName });
      } catch (err) {}
      if (newEmail && authInstance.currentUser.email !== newEmail) {
        try {
          await authInstance.currentUser.updateEmail(newEmail);
        } catch (err) {}
      }
    }

    if (db) {
      try {
        const updateDoc = {
          name: newName,
          phone: newPhone,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (newEmail) updateDoc.email = newEmail;
        await db.collection("customers").doc(currentUser.uid).set(updateDoc, { merge: true });
      } catch (err) {}
    }

    updateAuthUI();
    renderDashboardProfile();
    window.toggleProfileEditMode(false);
    window.showActionToast("Profile Updated", "✅ Profile and email saved successfully!", "👤", "success");
  };

  function renderDashboardSavedAddress() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem("manopavana_saved_delivery"));
    } catch (e) {
      saved = null;
    }

    const card = document.getElementById("savedAddressDashboardCard");
    const form = document.getElementById("dashAddressForm");
    const nameEl = document.getElementById("dashAddrName");
    const textEl = document.getElementById("dashAddrText");
    const phoneEl = document.getElementById("dashAddrPhone");

    if (card) card.style.display = "block";
    if (form) form.style.display = "none";

    if (saved && saved.name && saved.address) {
      if (nameEl) nameEl.textContent = saved.name;
      if (textEl) textEl.textContent = `${saved.address}, ${saved.city || "Bengaluru"}, ${saved.state || "Karnataka"} - ${saved.pincode || "560058"}`;
      if (phoneEl) phoneEl.textContent = `📞 +91 ${saved.phone}`;
    } else {
      if (nameEl) nameEl.textContent = "No address saved yet";
      if (textEl) textEl.textContent = "Click Edit / Change to add your default Bangalore doorstep address.";
      if (phoneEl) phoneEl.textContent = "";
    }
  }

  window.openDashboardAddressForm = function () {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem("manopavana_saved_delivery"));
    } catch (e) {}

    const card = document.getElementById("savedAddressDashboardCard");
    const form = document.getElementById("dashAddressForm");

    if (card) card.style.display = "none";
    if (form) {
      form.style.display = "block";
      const nameInp = document.getElementById("dashInputName");
      const phoneInp = document.getElementById("dashInputPhone");
      const addrInp = document.getElementById("dashInputAddress");
      const cityInp = document.getElementById("dashInputCity");
      const pinInp = document.getElementById("dashInputPincode");

      if (saved) {
        if (nameInp) nameInp.value = saved.name || "";
        if (phoneInp) phoneInp.value = saved.phone || "";
        if (addrInp) addrInp.value = saved.address || "";
        if (cityInp) cityInp.value = saved.city || "Bengaluru";
        if (pinInp) pinInp.value = saved.pincode || "560058";
      } else if (currentUser) {
        if (nameInp) nameInp.value = currentUser.displayName || "";
        if (phoneInp) phoneInp.value = currentUser.phone || "";
      }
    }
  };

  window.closeDashboardAddressForm = function () {
    const card = document.getElementById("savedAddressDashboardCard");
    const form = document.getElementById("dashAddressForm");
    if (card) card.style.display = "block";
    if (form) form.style.display = "none";
  };

  window.saveDashboardAddress = async function (e) {
    if (e && e.preventDefault) e.preventDefault();

    const name = document.getElementById("dashInputName")?.value.trim();
    const phone = document.getElementById("dashInputPhone")?.value.trim();
    const address = document.getElementById("dashInputAddress")?.value.trim();
    const city = document.getElementById("dashInputCity")?.value.trim() || "Bengaluru";
    const pincode = document.getElementById("dashInputPincode")?.value.trim() || "560058";

    if (!name || phone.length < 10 || !address || pincode.length !== 6) {
      alert("Please fill in all address fields completely.");
      return;
    }

    const payload = {
      name,
      phone,
      address,
      city,
      state: "Karnataka",
      district: "Bengaluru Urban",
      pincode,
      latitude: DEFAULT_BANGALORE_COORDS[0],
      longitude: DEFAULT_BANGALORE_COORDS[1]
    };

    localStorage.setItem("manopavana_saved_delivery", JSON.stringify(payload));

    if (db && currentUser) {
      try {
        await db.collection("customers").doc(currentUser.uid).set({
          defaultAddress: payload
        }, { merge: true });
      } catch (err) {}
    }

    renderDashboardSavedAddress();
    window.closeDashboardAddressForm();
    window.showActionToast("Address Saved", "📍 Delivery address saved successfully!", "🏡", "success");
  };

  async function fetchUserOrderHistory() {
    const loading = document.getElementById("dashOrdersLoading");
    const list = document.getElementById("dashOrdersList");

    if (loading) {
      loading.style.display = "block";
      loading.textContent = "🔍 Fetching orders from our facility...";
    }
    if (list) list.style.display = "none";

    if (db && currentUser) {
      try {
        const querySnapshot = await db.collection("orders")
          .where("firebaseUid", "==", currentUser.uid)
          .get();

        if (loading) loading.style.display = "none";

        if (!querySnapshot.empty) {
          const orders = [];
          querySnapshot.forEach((doc) => orders.push(doc.data()));
          orders.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
          list.innerHTML = renderOrdersTimelineList(orders);
          list.style.display = "block";
          return;
        }
      } catch (err) {
        console.warn("Firestore order history notice:", err);
      }
    }

    if (loading) loading.style.display = "none";
    if (list) {
      let localMatches = localOrdersHistory;
      if (currentUser) {
        localMatches = localOrdersHistory.filter(o =>
          o.firebaseUid === currentUser.uid ||
          (currentUser.email && o.email === currentUser.email)
        );
      }

      if (localMatches.length > 0) {
        list.innerHTML = renderOrdersTimelineList(localMatches);
      } else {
        list.innerHTML = `
          <div class="empty-orders-view">
            <div class="empty-icon">📦</div>
            <h4>No orders placed yet</h4>
            <p>Browse our fresh cold wood-pressed oils and place your first order!</p>
          </div>
        `;
      }
      list.style.display = "block";
    }
  }

  function renderOrdersTimelineList(orders) {
    const seenRefs = new Set();
    const uniqueOrders = [];
    orders.forEach((o) => {
      const ref = (o.orderRef || "").trim();
      if (ref && !seenRefs.has(ref)) {
        seenRefs.add(ref);
        uniqueOrders.push(o);
      }
    });

    return uniqueOrders.map((order) => {
      const pMode = (order.paymentMode || "").toUpperCase();
      const oStat = (order.orderStatus || "").toLowerCase();
      const isUnpaid = pMode.includes("PENDING") || pMode.includes("UNPAID") || oStat.includes("incomplete") || oStat.includes("pending");
      const orderPayloadAttr = escapeHtml(JSON.stringify(order));

      return `
        <div class="fk-order-card ${isUnpaid ? 'fk-order-card-unpaid' : ''}">
          <div class="fk-order-header">
            <div class="fk-order-title-box">
              <span class="fk-order-ref">Order #${escapeHtml(order.orderRef)}</span>
              <span class="fk-order-meta">${escapeHtml(order.timestamp || "Recent")} • <strong>₹${escapeHtml(order.grandTotal)}</strong></span>
            </div>
            <span class="fk-order-status-badge ${isUnpaid ? 'badge-danger' : 'badge-success'}">
              ${isUnpaid ? '⚠️ Payment Incomplete' : escapeHtml(order.orderStatus || "Placed")}
            </span>
          </div>

          <div class="fk-order-items">
            <span class="fk-order-label">Items:</span>
            <span class="fk-order-names">${escapeHtml(order.items)}</span>
          </div>

          ${isUnpaid ? `
            <div class="fk-order-unpaid-box">
              <p class="fk-order-unpaid-text">
                Payment was not completed for this order. Complete payment online or switch to Cash on Delivery:
              </p>
              <div class="fk-order-unpaid-actions">
                <button type="button" class="btn-fk-order-action btn-fk-retry" onclick='window.retryOrderDirectly(${orderPayloadAttr}, "PHONEPE")'>
                  ⚡ Retry via PhonePe
                </button>
                <button type="button" class="btn-fk-order-action btn-fk-cod" onclick='window.retryOrderDirectly(${orderPayloadAttr}, "COD")'>
                  💵 Switch to COD
                </button>
              </div>
            </div>
          ` : `
            <div class="track-timeline-progress">
              <div class="track-step-node node-step active">
                <span class="node-dot active">✓</span>
                <span class="node-lbl">Placed</span>
              </div>
              <div class="track-step-node node-step ${oStat.includes('pack') || oStat.includes('process') || oStat.includes('settl') || oStat.includes('dispatch') || oStat.includes('deliver') ? 'active' : ''}">
                <span class="node-dot ${oStat.includes('pack') || oStat.includes('process') || oStat.includes('settl') || oStat.includes('dispatch') || oStat.includes('deliver') ? 'active' : ''}">⚙</span>
                <span class="node-lbl">Packed</span>
              </div>
              <div class="track-step-node node-step ${oStat.includes('dispatch') || oStat.includes('transit') || oStat.includes('out') || oStat.includes('deliver') ? 'active' : ''}">
                <span class="node-dot ${oStat.includes('dispatch') || oStat.includes('transit') || oStat.includes('out') || oStat.includes('deliver') ? 'active' : ''}">🚚</span>
                <span class="node-lbl">Dispatched</span>
              </div>
              <div class="track-step-node node-step ${oStat.includes('deliver') ? 'active' : ''}">
                <span class="node-dot ${oStat.includes('deliver') ? 'active' : ''}">🏡</span>
                <span class="node-lbl">Delivered</span>
              </div>
            </div>

            <div class="fk-order-footer">
              <strong class="fk-order-facility-tag">Facility Status:</strong>
              <span class="fk-order-facility-text">${escapeHtml(order.trackingNotes || "Sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore packaging and distribution facility.")}</span>
            </div>
          `}
        </div>
      `;
    }).join("");
  }

  window.retryOrderDirectly = function (orderObj, mode) {
    window.closeAccountDashboard();
    window.closePaymentFailedModal();

    checkoutSource = "retry";
    buyNowItem = null;
    retryOrderData = orderObj;
    currentOrderRef = orderObj.orderRef;
    currentCalculatedGrandTotal = parseFloat(orderObj.grandTotal) || 0;

    if (mode === "PHONEPE") {
      const pRadio = document.getElementById("payPhonePe");
      if (pRadio) pRadio.checked = true;
    } else {
      const cRadio = document.getElementById("payCOD");
      if (cRadio) cRadio.checked = true;
    }

    openCheckoutModalUI();
  };

  // ==========================================
  // 8. BOTTLE CLAIM / LOYALTY QR MODAL
  // ==========================================
  window.openBottleClaimModal = function () {
    const dropdown = document.getElementById("authDropdownMenu");
    if (dropdown) dropdown.classList.remove("open");

    const modal = document.getElementById("bottleQuizModalBackdrop");
    if (!modal) return;
    onboardingQuizAttemptsLeft = 2;
    modal.classList.add("open");
    document.body.classList.add("modal-open");
    window.selectOnboardingQuizBottle(selectedQuizBottleKey);
  };

  window.closeBottleQuizModal = function () {
    const modal = document.getElementById("bottleQuizModalBackdrop");
    if (modal) {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
    }
  };

  window.selectOnboardingQuizBottle = function (bottleKey) {
    selectedQuizBottleKey = bottleKey;
    selectedQuizOptionText = null;

    ["groundnut", "coconut", "sesame"].forEach((k) => {
      const pill = document.getElementById("onboardPill" + k.charAt(0).toUpperCase() + k.slice(1));
      if (pill) {
        pill.classList.toggle("active", k === bottleKey);
      }
    });

    const quizData = BOTTLE_QUIZ_POOLS[bottleKey][0];
    const hintText = document.getElementById("onboardQuizHintText");
    const qTitle = document.getElementById("onboardQuizQuestionText");
    const optionsContainer = document.getElementById("onboardQuizOptionsContainer");
    const feedbackBox = document.getElementById("onboardQuizFeedbackBox");

    if (hintText) hintText.textContent = quizData.hint;
    if (qTitle) qTitle.textContent = quizData.question;
    if (feedbackBox) feedbackBox.style.display = "none";

    const distractors = [
      "Extracted using industrial chemical solvents",
      "Refined, bleached, and chemically deodorized",
      "Blended with synthetic liquid paraffin wax",
      "Processed with artificial preservatives and dyes"
    ];

    const options = [
      { text: quizData.correct, correct: true },
      { text: distractors[0], correct: false },
      { text: distractors[1], correct: false },
      { text: distractors[2], correct: false },
      { text: distractors[3], correct: false }
    ].sort(() => Math.random() - 0.5);

    activeQuizData = {
      correct: quizData.correct,
      options: options
    };

    if (optionsContainer) {
      optionsContainer.innerHTML = options.map((opt, i) => `
        <label class="quiz-option-card" id="quizOptCard_${i}" onclick="window.chooseOnboardingQuizOption('${escapeHtml(opt.text)}', ${i})">
          <input type="radio" name="bottleQuizRadio" value="${escapeHtml(opt.text)}" />
          <span>${escapeHtml(opt.text)}</span>
        </label>
      `).join("");
    }
  };

  window.chooseOnboardingQuizOption = function (text, idx) {
    selectedQuizOptionText = text;
    document.querySelectorAll(".quiz-option-card").forEach((card, i) => {
      card.classList.toggle("selected", i === idx);
      const radio = card.querySelector("input[type='radio']");
      if (radio) radio.checked = i === idx;
    });
  };

  window.submitOnboardingBottleQuiz = function () {
    const feedbackBox = document.getElementById("onboardQuizFeedbackBox");
    const attemptBadge = document.getElementById("onboardAttemptBadge");

    if (!selectedQuizOptionText) {
      alert("Please select one option printed on your bottle label.");
      return;
    }

    if (selectedQuizOptionText === activeQuizData.correct) {
      activeBottleCode = `VERIFIED_${selectedQuizBottleKey.toUpperCase()}_BOTTLE`;
      bottleScanTimestampMs = Date.now();
      localStorage.setItem("manopavana_bottle_code", activeBottleCode);
      localStorage.setItem("manopavana_bottle_scan_time", bottleScanTimestampMs.toString());

      if (feedbackBox) {
        feedbackBox.className = "quiz-feedback-box success";
        feedbackBox.innerHTML = "✅ <strong>Label verified!</strong> 10% Loyalty Discount unlocked across all repeat orders for 7 days!";
        feedbackBox.style.display = "block";
      }

      renderCart();
      startLiveCountdown();
      renderComboSection();
      window.showActionToast("Discount Activated", "🎉 10% Bottle Reorder Discount is active!", "✨", "success");

      setTimeout(() => {
        window.closeBottleQuizModal();
      }, 1400);
    } else {
      onboardingQuizAttemptsLeft--;
      if (attemptBadge) {
        attemptBadge.textContent = `⚠️ ${onboardingQuizAttemptsLeft} chance${onboardingQuizAttemptsLeft === 1 ? '' : 's'} left to claim 10% OFF`;
        if (onboardingQuizAttemptsLeft === 1) attemptBadge.className = "attempt-badge danger";
      }

      if (feedbackBox) {
        feedbackBox.className = "quiz-feedback-box error";
        feedbackBox.innerHTML = `❌ Option does not match your bottle label.`;
        feedbackBox.style.display = "block";
      }

      if (onboardingQuizAttemptsLeft <= 0) {
        alert("Attempts exhausted. You can continue shopping at regular pricing!");
        window.closeBottleQuizModal();
      }
    }
  };

  // ==========================================
  // 9. LOCATION & PINCODE CHECKER MODAL
  // ==========================================
  window.openLocationCheckModal = function () {
    const modal = document.getElementById("locationModalBackdrop");
    const pinInput = document.getElementById("pincodeCheckInput");
    const resultBox = document.getElementById("pincodeCheckResultBox");
    if (!modal) return;

    if (pinInput) pinInput.value = userSelectedPincode;
    if (resultBox) resultBox.style.display = "none";
    modal.classList.add("open");
    document.body.classList.add("modal-open");

    setTimeout(() => {
      initOrUpdateOnboardingMap();
    }, 250);
  };

  window.closeLocationCheckModal = function () {
    const modal = document.getElementById("locationModalBackdrop");
    if (modal) {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
    }
  };

  function initOrUpdateOnboardingMap(lat = DEFAULT_BANGALORE_COORDS[0], lng = DEFAULT_BANGALORE_COORDS[1]) {
    const mapElement = document.getElementById("onboardingMap");
    if (!mapElement || typeof L === "undefined") return;

    if (!onboardMap) {
      onboardMap = L.map("onboardingMap", {
        center: [lat, lng],
        zoom: 14,
        zoomControl: true,
        scrollWheelZoom: false
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19
      }).addTo(onboardMap);

      onboardMarker = L.marker([lat, lng], { draggable: true }).addTo(onboardMap);

      onboardMarker.on("dragend", function (e) {
        const pos = e.target.getLatLng();
        reverseGeocodeOpenStreetMap(pos.lat, pos.lng);
        setOnboardMapCoordinates(pos.lat, pos.lng);
      });

      onboardMap.on("click", function (e) {
        onboardMarker.setLatLng(e.latlng);
        reverseGeocodeOpenStreetMap(e.latlng.lat, e.latlng.lng);
        setOnboardMapCoordinates(e.latlng.lat, e.latlng.lng);
      });
    } else {
      onboardMap.setView([lat, lng], 14);
      if (onboardMarker) onboardMarker.setLatLng([lat, lng]);
    }

    setOnboardMapCoordinates(lat, lng);
    setTimeout(() => {
      if (onboardMap) onboardMap.invalidateSize();
    }, 250);
  }

  function setOnboardMapCoordinates(lat, lng) {
    const coordsBadge = document.getElementById("onboardMapCoordsBadge");
    if (coordsBadge) {
      coordsBadge.textContent = `GPS: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`;
    }
  }

  window.submitPincodeCheck = function () {
    const pinInput = document.getElementById("pincodeCheckInput");
    const resultBox = document.getElementById("pincodeCheckResultBox");
    if (!pinInput || !resultBox) return;

    const enteredPin = pinInput.value.trim();
    if (!/^\d{6}$/.test(enteredPin)) {
      resultBox.className = "pincode-result-box warning";
      resultBox.innerHTML = `<strong>Invalid Pincode</strong>Please enter a valid 6-digit Indian pincode.`;
      resultBox.style.display = "block";
      return;
    }

    userSelectedPincode = enteredPin;
    isBangalorePincode = enteredPin.startsWith("560");
    localStorage.setItem("manopavana_user_pincode", enteredPin);
    updateLocationUI();

    if (isBangalorePincode) {
      resultBox.className = "pincode-result-box success";
      resultBox.innerHTML = `<strong>✅ Delivering to Bangalore (${enteredPin})</strong>Direct doorstep delivery in 24–72 hours from our facility. Free on ₹500+ orders.`;
      resultBox.style.display = "block";
      setTimeout(window.closeLocationCheckModal, 1300);
    } else {
      resultBox.className = "pincode-result-box warning";
      resultBox.innerHTML = `<strong>📍 Outside Bangalore (${enteredPin})</strong>Direct doorstep delivery is exclusive to Bangalore (560xxx). Orders for your location are fulfilled securely via our <strong>Official Flipkart Store</strong>.<br><br>
      <a href="https://www.flipkart.com" target="_blank" rel="noopener noreferrer" class="btn-continue-flipkart" style="display:inline-flex; width:auto; padding:0.6rem 1.2rem; margin-top:0.5rem;">
        🛒 Shop on Flipkart &rarr;
      </a>`;
      resultBox.style.display = "block";
    }
  };

  function updateLocationUI() {
    const headerLoc = document.getElementById("headerLocationLabel");
    const headerMobileLoc = document.getElementById("headerMobileLocationLabel");
    const cartLoc = document.getElementById("cartDrawerLocLabel");
    const custPin = document.getElementById("custPincode");

    if (custPin) custPin.value = userSelectedPincode;

    if (isBangalorePincode) {
      if (headerLoc) headerLoc.innerHTML = `Deliver to: <strong>Bangalore (${userSelectedPincode})</strong>`;
      if (headerMobileLoc) headerMobileLoc.textContent = `Bangalore (${userSelectedPincode})`;
      if (cartLoc) cartLoc.textContent = `Bangalore (${userSelectedPincode})`;
    } else {
      if (headerLoc) headerLoc.innerHTML = `Deliver to: <strong>${userSelectedPincode} (Flipkart)</strong>`;
      if (headerMobileLoc) headerMobileLoc.textContent = `${userSelectedPincode} (Flipkart)`;
      if (cartLoc) cartLoc.textContent = `${userSelectedPincode} (Flipkart)`;
    }

    renderProductsGrid();
    renderComboSection();
  }

  window.openFlipkartModal = function () {
    const modal = document.getElementById("flipkartModalBackdrop");
    if (modal) {
      modal.classList.add("open");
      document.body.classList.add("modal-open");
    }
  };

  window.closeFlipkartModal = function () {
    const modal = document.getElementById("flipkartModalBackdrop");
    if (modal) {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
    }
  };

  // ==========================================
  // 10. CATALOG SEARCH
  // ==========================================
  const SEARCH_ITEMS = [
    {
      id: "groundnut-1l",
      key: "groundnut",
      title: "Wood-Pressed Groundnut Oil (1L)",
      sub: "1 Litre Bottle • Pure Chekku Extraction",
      price: 399,
      img: `${R2_PUBLIC_BASE_URL}/groundnut-1.png`,
      type: "product",
      keywords: "groundnut peanut singdana cooking dosa frying oil"
    },
    {
      id: "groundnut-500ml",
      key: "groundnut",
      title: "Wood-Pressed Groundnut Oil (500ml)",
      sub: "500 ml Bottle • Everyday Cooking",
      price: 189,
      img: `${R2_PUBLIC_BASE_URL}/groundnut-1.png`,
      type: "product",
      keywords: "groundnut peanut singdana small 500ml"
    },
    {
      id: "coconut-1l",
      key: "coconut",
      title: "Wood-Pressed Coconut Oil (1L)",
      sub: "1 Litre Bottle • Sulfur-Free Copra",
      price: 499,
      img: `${R2_PUBLIC_BASE_URL}/coconut-1.png`,
      type: "product",
      keywords: "coconut copra nariyal coastal curry hair oil"
    },
    {
      id: "coconut-500ml",
      key: "coconut",
      title: "Wood-Pressed Coconut Oil (500ml)",
      sub: "500 ml Bottle • Pure Chekku Extraction",
      price: 269,
      img: `${R2_PUBLIC_BASE_URL}/coconut-1.png`,
      type: "product",
      keywords: "coconut copra nariyal small 500ml"
    },
    {
      id: "sesame-1l",
      key: "sesame",
      title: "Wood-Pressed Sesame Oil (1L)",
      sub: "1 Litre Bottle • Crushed with Palm Jaggery",
      price: 499,
      img: `${R2_PUBLIC_BASE_URL}/sesame-1.png`,
      type: "product",
      keywords: "sesame gingelly til podi puliogare oil pulling"
    },
    {
      id: "sesame-500ml",
      key: "sesame",
      title: "Wood-Pressed Sesame Oil (500ml)",
      sub: "500 ml Bottle • Authentic Gingelly",
      price: 269,
      img: `${R2_PUBLIC_BASE_URL}/sesame-1.png`,
      type: "product",
      keywords: "sesame gingelly til small 500ml"
    },
    {
      id: "combo-3l",
      key: "combo-3l",
      title: "Complete 3-Oil Essential Box (3 Litres)",
      sub: "1L Groundnut + 1L Coconut + 1L Sesame Trio",
      price: 1299,
      img: `${R2_PUBLIC_BASE_URL}/combo-all-labels.jpg`,
      type: "combo",
      keywords: "combo box trio 3l pack value starter kitchen set"
    },
    {
      id: "combo-15l",
      key: "combo-15l",
      title: "Complete 3-Oil Starter Box (1.5 Litres)",
      sub: "500ml Groundnut + 500ml Coconut + 500ml Sesame",
      price: 699,
      img: `${R2_PUBLIC_BASE_URL}/combo-all-labels.jpg`,
      type: "combo",
      keywords: "combo box starter 1.5l trio pack"
    }
  ];

  window.handleCatalogSearch = function (query) {
    const cleanQuery = (query || "").toLowerCase().trim();
    const dropdown = document.getElementById("liveSearchResults");
    const productCards = document.querySelectorAll("#productGridContainer .product-card");
    const comboSection = document.getElementById("combo");

    productCards.forEach((card) => {
      const text = card.textContent.toLowerCase();
      if (!cleanQuery || text.includes(cleanQuery)) {
        card.style.display = "flex";
      } else {
        card.style.display = "none";
      }
    });

    if (comboSection) {
      if (!cleanQuery || "combo essential trio kitchen starter box 3l 1.5l".includes(cleanQuery)) {
        comboSection.style.display = "block";
      } else {
        comboSection.style.display = "none";
      }
    }

    if (!dropdown) return;

    if (!cleanQuery) {
      dropdown.innerHTML = `
        <div class="live-search-header">
          <span>POPULAR SEARCHES</span>
          <small>Instant Filter</small>
        </div>
        <div class="live-search-suggestions">
          <button type="button" class="live-search-pill" onclick="selectSearchQuery('Groundnut Oil')">🥜 Groundnut Oil</button>
          <button type="button" class="live-search-pill" onclick="selectSearchQuery('Coconut Oil')">🥥 Coconut Oil</button>
          <button type="button" class="live-search-pill" onclick="selectSearchQuery('Sesame Oil')">🌾 Sesame Oil</button>
          <button type="button" class="live-search-pill" onclick="selectSearchQuery('3L Trio Combo')">🎁 3-Oil Kitchen Trio</button>
          <button type="button" class="live-search-pill" onclick="openBottleClaimModal()">🏷️ 10% Bottle Reorder</button>
        </div>
      `;
      dropdown.style.display = "block";
      return;
    }

    const matches = SEARCH_ITEMS.filter((item) =>
      item.title.toLowerCase().includes(cleanQuery) ||
      item.keywords.toLowerCase().includes(cleanQuery)
    );

    if (matches.length === 0) {
      dropdown.innerHTML = `
        <div class="live-search-empty">
          <p>No oils found matching "<strong>${escapeHtml(cleanQuery)}</strong>".</p>
        </div>
      `;
      dropdown.style.display = "block";
      return;
    }

    dropdown.innerHTML = `
      <div class="live-search-header">
        <span>FOUND ${matches.length} MATCHING OILS</span>
        <small>Click to view</small>
      </div>
      ${matches.map((item) => `
        <div class="live-search-item" onclick="navigateFromSearch('${item.type}', '${item.key}')">
          <img src="${item.img}" alt="${escapeHtml(item.title)}" class="live-search-thumb" />
          <div class="live-search-meta">
            <div class="live-search-title">${escapeHtml(item.title)}</div>
            <div class="live-search-sub">${escapeHtml(item.sub)}</div>
          </div>
          <div class="live-search-price">₹${item.price}</div>
          <button type="button" class="live-search-btn-add" onclick="event.stopPropagation(); handleDirectAdd('${item.id}', '${escapeHtml(item.title)}', ${item.price}, '${item.img}')">
            ADD +
          </button>
        </div>
      `).join("")}
    `;
    dropdown.style.display = "block";
  };

  window.handleSearchFocus = function () {
    const input = document.getElementById("storeSearchInput");
    window.handleCatalogSearch(input ? input.value : "");
  };

  window.handleSearchKeyDown = function (evt) {
    if (evt.key === "Enter") {
      evt.preventDefault();
      const dropdown = document.getElementById("liveSearchResults");
      if (dropdown) dropdown.style.display = "none";
      const productsSection = document.getElementById("products");
      if (productsSection) productsSection.scrollIntoView({ behavior: "smooth" });
    } else if (evt.key === "Escape") {
      const dropdown = document.getElementById("liveSearchResults");
      if (dropdown) dropdown.style.display = "none";
      evt.target.blur();
    }
  };

  window.selectSearchQuery = function (q) {
    const input = document.getElementById("storeSearchInput");
    if (input) {
      input.value = q;
      window.handleCatalogSearch(q);
      const productsSection = document.getElementById("products");
      if (productsSection) productsSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  window.navigateFromSearch = function (type, key) {
    const dropdown = document.getElementById("liveSearchResults");
    if (dropdown) dropdown.style.display = "none";

    if (type === "combo") {
      const comboSection = document.getElementById("combo");
      if (comboSection) {
        comboSection.style.display = "block";
        comboSection.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      const card = document.querySelector(`.product-card[data-key="${key}"]`);
      if (card) {
        card.style.display = "flex";
        card.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  document.addEventListener("click", function (evt) {
    const searchBar = document.getElementById("headerSearchBar");
    const dropdown = document.getElementById("liveSearchResults");
    if (dropdown && searchBar && !searchBar.contains(evt.target)) {
      dropdown.style.display = "none";
    }
  });

  // ==========================================
  // 11. AUDIO ENGINE & AUTOPLAY
  // ==========================================
  let isAudioPlaying = false;
  let hasInteracted = false;

  function tryImmediateAudioPlayback() {
    const audio = document.getElementById("heroBgAudio");
    const btn = document.getElementById("soundToggleBtn");
    const icon = document.getElementById("soundIcon");
    const text = document.getElementById("soundText");
    if (!audio) return;

    audio.volume = 1.0;
    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {
        isAudioPlaying = true;
        if (icon) icon.textContent = "🔊";
        if (text) text.textContent = "Sound On";
        btn?.classList.add("playing");
      }).catch(() => {
        isAudioPlaying = false;
        if (icon) icon.textContent = "🔇";
        if (text) text.textContent = "Tap for Sound";
        btn?.classList.remove("playing");
      });
    }
  }

  function toggleAudio() {
    const audio = document.getElementById("heroBgAudio");
    const btn = document.getElementById("soundToggleBtn");
    const icon = document.getElementById("soundIcon");
    const text = document.getElementById("soundText");
    if (!audio) return;

    if (isAudioPlaying) {
      audio.pause();
      isAudioPlaying = false;
      if (icon) icon.textContent = "🔇";
      if (text) text.textContent = "Sound Off";
      btn?.classList.remove("playing");
    } else {
      audio.play().then(() => {
        isAudioPlaying = true;
        if (icon) icon.textContent = "🔊";
        if (text) text.textContent = "Sound On";
        btn?.classList.add("playing");
      }).catch(() => {});
    }
  }

  function initVideoAutoplay() {
    const video = document.getElementById("heroVideo");
    const fallback = document.getElementById("heroFallbackImage");
    if (!video) return;

    video.muted = true;
    video.loop = true;
    video.playsInline = true;

    video.play().catch(() => {
      if (fallback) {
        video.style.display = "none";
        fallback.style.display = "block";
      }
    });

    const bottleVid = document.getElementById("bottleAutoplayVideo");
    if (bottleVid) {
      bottleVid.muted = true;
      bottleVid.loop = true;
      bottleVid.playsInline = true;
      bottleVid.play().catch(() => {});
    }
  }

  // ==========================================
  // 12. MAP INTEGRATION & GEOLOCATION
  // ==========================================
  function initOrUpdateDeliveryMap(lat = DEFAULT_BANGALORE_COORDS[0], lng = DEFAULT_BANGALORE_COORDS[1]) {
    const mapElement = document.getElementById("deliveryMap");
    if (!mapElement || typeof L === "undefined") return;

    if (!leafletMap) {
      leafletMap = L.map("deliveryMap", {
        center: [lat, lng],
        zoom: 14,
        zoomControl: true,
        scrollWheelZoom: false
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19
      }).addTo(leafletMap);

      mapMarker = L.marker([lat, lng], { draggable: true }).addTo(leafletMap);

      mapMarker.on("dragend", function (e) {
        const position = e.target.getLatLng();
        setMapCoordinates(position.lat, position.lng);
      });

      leafletMap.on("click", function (e) {
        mapMarker.setLatLng(e.latlng);
        setMapCoordinates(e.latlng.lat, e.latlng.lng);
      });
    } else {
      leafletMap.setView([lat, lng], 14);
      if (mapMarker) mapMarker.setLatLng([lat, lng]);
    }

    setMapCoordinates(lat, lng);
    setTimeout(() => {
      if (leafletMap) leafletMap.invalidateSize();
    }, 250);
  }

  function setMapCoordinates(lat, lng) {
    const latInput = document.getElementById("custLatitude");
    const lngInput = document.getElementById("custLongitude");
    const coordsBadge = document.getElementById("mapCoordsBadge");

    const roundLat = parseFloat(lat).toFixed(5);
    const roundLng = parseFloat(lng).toFixed(5);

    if (latInput) latInput.value = roundLat;
    if (lngInput) lngInput.value = roundLng;
    if (coordsBadge) coordsBadge.textContent = `GPS: ${roundLat}, ${roundLng}`;
  }

  window.detectUserGeolocation = function (isOnboarding = false) {
    const btn = isOnboarding ? document.querySelector(".btn-gps-inline") : document.querySelector(".btn-gps-locate");
    const origText = btn ? btn.innerHTML : "";

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your current browser.");
      return;
    }

    if (btn) btn.innerHTML = "⏳ Locating...";

    const handleSuccess = (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (isOnboarding) {
        initOrUpdateOnboardingMap(lat, lng);
        reverseGeocodeOpenStreetMap(lat, lng);
      } else {
        initOrUpdateDeliveryMap(lat, lng);
        reverseGeocodeOpenStreetMap(lat, lng);
      }

      if (btn) btn.innerHTML = "✅ Located!";
      setTimeout(() => { if (btn) btn.innerHTML = origText; }, 2000);
    };

    const handleFail = () => {
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        (err) => {
          let errDetail = "Could not retrieve exact location. Please drag the pin on the map.";
          if (err.code === 1) {
            errDetail = "Location permission denied. Please allow location access.";
          }
          alert(errDetail);
          if (btn) btn.innerHTML = origText;
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
      );
    };

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleFail,
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
    );
  };

  function reverseGeocodeOpenStreetMap(lat, lng) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data || !data.address) return;
        const addr = data.address;
        const pin = addr.postcode || "";
        const city = addr.city || addr.town || addr.suburb || addr.neighbourhood || "Bengaluru";

        const custCity = document.getElementById("custCity");
        const custPin = document.getElementById("custPincode");
        const pinModalInput = document.getElementById("pincodeCheckInput");
        const custAddress = document.getElementById("custAddress");

        if (custCity && !custCity.value) custCity.value = city;
        if (pin && /^\d{6}$/.test(pin)) {
          if (custPin) custPin.value = pin;
          if (pinModalInput) pinModalInput.value = pin;
          userSelectedPincode = pin;
          isBangalorePincode = pin.startsWith("560");
          updateLocationUI();
        }

        if (custAddress && !custAddress.value && data.display_name) {
          custAddress.value = data.display_name.split(",").slice(0, 3).join(",").trim();
        }
      })
      .catch((e) => console.warn("Reverse geocode notice:", e));
  }

  window.handleAddressForwardGeocode = function (query) {
    if (addressTypingTimer) clearTimeout(addressTypingTimer);
    if (!query || query.trim().length < 5) return;

    addressTypingTimer = setTimeout(() => {
      const searchCity = document.getElementById("custCity")?.value || "Bengaluru";
      const fullQuery = `${query.trim()}, ${searchCity}, Karnataka, India`;

      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullQuery)}&limit=1`)
        .then(res => res.json())
        .then(results => {
          if (results && results.length > 0) {
            const lat = parseFloat(results[0].lat);
            const lon = parseFloat(results[0].lon);
            initOrUpdateDeliveryMap(lat, lon);
          }
        })
        .catch(err => console.warn("Forward geocode notice:", err));
    }, 800);
  };

  // ==========================================
  // 13. CHECKOUT SAVED DETAILS
  // ==========================================
  function loadSavedDeliveryDetails() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem("manopavana_saved_delivery"));
    } catch (e) {
      saved = null;
    }

    const summaryCard = document.getElementById("savedAddressSummaryCard");
    const fieldsContainer = document.getElementById("deliveryFieldsContainer");

    if (checkoutSource === "retry" && retryOrderData) {
      const custName = document.getElementById("custName");
      const custPhone = document.getElementById("custPhone");
      const custAddress = document.getElementById("custAddress");
      const custPincode = document.getElementById("custPincode");

      if (custName && retryOrderData.customerName) custName.value = retryOrderData.customerName;
      if (custPhone && retryOrderData.phone) custPhone.value = retryOrderData.phone;
      if (custAddress && retryOrderData.address) custAddress.value = retryOrderData.address;
      if (custPincode && retryOrderData.pincode) custPincode.value = retryOrderData.pincode;

      if (summaryCard) summaryCard.style.display = "none";
      if (fieldsContainer) fieldsContainer.style.display = "block";
      initOrUpdateDeliveryMap();
      return;
    }

    if (saved && saved.name && saved.phone && saved.address) {
      const custName = document.getElementById("custName");
      const custPhone = document.getElementById("custPhone");
      const custAddress = document.getElementById("custAddress");
      const custState = document.getElementById("custState");
      const custDistrict = document.getElementById("custDistrict");
      const custCity = document.getElementById("custCity");
      const custPincode = document.getElementById("custPincode");

      if (custName) custName.value = saved.name;
      if (custPhone) custPhone.value = saved.phone;
      if (custAddress) custAddress.value = saved.address;
      if (custCity) custCity.value = saved.city || "Bengaluru";
      if (custPincode) custPincode.value = saved.pincode || "560058";

      if (custState && saved.state) {
        custState.value = saved.state;
        populateDistrictsForState(saved.state);
      }
      if (custDistrict && saved.district) {
        custDistrict.value = saved.district;
      }

      const addrName = document.getElementById("savedAddrName");
      const addrText = document.getElementById("savedAddrText");
      const addrPhone = document.getElementById("savedAddrPhone");
      const gpsNotice = document.getElementById("savedAddrGpsNotice");

      if (addrName) addrName.textContent = saved.name;
      if (addrText) addrText.textContent = `${saved.address}, ${saved.city || "Bengaluru"} - ${saved.pincode || "560058"}`;
      if (addrPhone) addrPhone.textContent = `📞 +91 ${saved.phone}`;

      const savedLat = parseFloat(saved.latitude) || DEFAULT_BANGALORE_COORDS[0];
      const savedLng = parseFloat(saved.longitude) || DEFAULT_BANGALORE_COORDS[1];

      if (gpsNotice) {
        gpsNotice.style.display = (saved.latitude && saved.longitude) ? "inline-block" : "none";
      }

      if (summaryCard) summaryCard.style.display = "block";
      if (fieldsContainer) fieldsContainer.style.display = "none";

      initOrUpdateDeliveryMap(savedLat, savedLng);
    } else {
      if (summaryCard) summaryCard.style.display = "none";
      if (fieldsContainer) fieldsContainer.style.display = "block";

      const currentLat = parseFloat(document.getElementById("custLatitude")?.value) || DEFAULT_BANGALORE_COORDS[0];
      const currentLng = parseFloat(document.getElementById("custLongitude")?.value) || DEFAULT_BANGALORE_COORDS[1];
      initOrUpdateDeliveryMap(currentLat, currentLng);
    }
  }

  window.toggleEditAddress = function (showForm = true) {
    const summaryCard = document.getElementById("savedAddressSummaryCard");
    const fieldsContainer = document.getElementById("deliveryFieldsContainer");

    if (showForm) {
      if (summaryCard) summaryCard.style.display = "none";
      if (fieldsContainer) fieldsContainer.style.display = "block";
      setTimeout(() => {
        if (leafletMap) leafletMap.invalidateSize();
      }, 200);
    } else {
      if (summaryCard) summaryCard.style.display = "block";
      if (fieldsContainer) fieldsContainer.style.display = "none";
    }
  };

  // ==========================================
  // 14. CART & ACCURATE FINANCIALS
  // ==========================================
  function isLoyaltyDiscountValid() {
    if (!bottleScanTimestampMs) return false;
    return (Date.now() - bottleScanTimestampMs) < QR_EXPIRY_MS;
  }

  function triggerBadgeAnimation() {
    const badge = document.getElementById("cartCountBadge");
    if (badge) {
      badge.classList.remove("badge-pop");
      void badge.offsetWidth;
      badge.classList.add("badge-pop");
      setTimeout(() => badge.classList.remove("badge-pop"), 250);
    }
  }

  function saveCart() {
    localStorage.setItem("manopavana_cart", JSON.stringify(cart));
    renderCart();
    renderProductsGrid();
    if (currentDetailProductKey) {
      renderProductDetailModalContent();
    }
    triggerBadgeAnimation();
  }

  window.openCart = function () {
    const drawer = document.getElementById("cartDrawer");
    const backdrop = document.getElementById("cartBackdrop");
    if (drawer) drawer.classList.add("open");
    if (backdrop) backdrop.classList.add("open");
  };

  window.closeCart = function () {
    const drawer = document.getElementById("cartDrawer");
    const backdrop = document.getElementById("cartBackdrop");
    if (drawer) drawer.classList.remove("open");
    if (backdrop) backdrop.classList.remove("open");
  };

  function getCartItemQuantity(itemId) {
    const item = cart.find((i) => i.id === itemId);
    return item ? item.quantity : 0;
  }

  window.handleDirectAdd = function (id, title, price, img) {
    if (!isBangalorePincode) {
      window.openFlipkartModal();
      return;
    }
    const existing = cart.find((item) => item.id === id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ id, title, price: parseInt(price, 10), img, quantity: 1 });
    }
    saveCart();
    window.showActionToast("Added to Bag", `🛒 Added ${title} to your bag.`, "🛒", "success");
  };

  window.handleDirectComboAdd = function () {
    const combo = COMBO_CATALOG[currentSelectedComboKey];
    if (!combo) return;
    window.handleDirectAdd(combo.id, combo.title, combo.price, combo.img);
  };

  window.updateQuantity = function (id, delta) {
    const item = cart.find((item) => item.id === id);
    if (!item) {
      if (delta > 0) {
        if (COMBO_CATALOG[id]) {
          const combo = COMBO_CATALOG[id];
          cart.push({ id: combo.id, title: combo.title, price: combo.price, img: combo.img, quantity: 1 });
          window.showActionToast("Added to Bag", `🛒 Added ${combo.title} to your bag.`, "🛒", "success");
        } else {
          const [prodKey, sizeKey] = id.split("-");
          const formattedSize = sizeKey === "1l" ? "1L" : "500ml";
          const catItem = PRODUCT_CATALOG[prodKey]?.sizes[formattedSize];
          if (catItem) {
            cart.push({ id: catItem.id, title: catItem.title, price: catItem.price, img: PRODUCT_CATALOG[prodKey].img, quantity: 1 });
            window.showActionToast("Added to Bag", `🛒 Added ${catItem.title} to your bag.`, "🛒", "success");
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

  function renderCart() {
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    let discountAmount = 0;
    const isLoyal = isLoyaltyDiscountValid();

    const discountRow = document.getElementById("discountRow");
    const cartDiscount = document.getElementById("cartDiscount");

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

    const cartCountBadge = document.getElementById("cartCountBadge");
    const mobileCartCountBadge = document.getElementById("mobileCartCountBadge");
    const cartTotalItems = document.getElementById("cartTotalItems");
    const cartSubtotal = document.getElementById("cartSubtotal");
    const cartDeliveryCharge = document.getElementById("cartDeliveryCharge");
    const cartGrandTotal = document.getElementById("cartGrandTotal");
    const shippingNote = document.getElementById("shippingNote");

    if (cartCountBadge) cartCountBadge.textContent = totalCount;
    if (mobileCartCountBadge) mobileCartCountBadge.textContent = totalCount;
    if (cartTotalItems) cartTotalItems.textContent = totalCount;
    if (cartSubtotal) cartSubtotal.textContent = `₹${subtotal.toLocaleString("en-IN")}`;

    if (cartDeliveryCharge) {
      cartDeliveryCharge.innerHTML = totalCount === 0 ? "₹0" : (deliveryFee === 0 ? `<span class="free-tag">FREE</span>` : `₹${STANDARD_DELIVERY_FEE}`);
    }

    if (cartGrandTotal) {
      cartGrandTotal.textContent = `₹${grandTotal.toLocaleString("en-IN")}`;
    }

    if (shippingNote) {
      if (totalCount === 0) {
        shippingNote.textContent = `Add ₹500+ for FREE Doorstep Delivery across Bangalore`;
      } else if (discountedSubtotal >= FREE_SHIPPING_THRESHOLD) {
        shippingNote.innerHTML = `🎉 You unlocked <strong>FREE Bangalore Delivery</strong> (24–72 hrs)!`;
      } else {
        const remaining = FREE_SHIPPING_THRESHOLD - discountedSubtotal;
        shippingNote.innerHTML = `Add <strong>₹${remaining}</strong> more for <strong>FREE Bangalore Delivery</strong>!`;
      }
    }

    // Free Shipping Progress Meter
    const freeShippingBarFill = document.getElementById("freeShippingBarFill");
    const freeShippingStatusText = document.getElementById("freeShippingStatusText");
    const freeShippingPercentText = document.getElementById("freeShippingPercentText");
    if (freeShippingBarFill && freeShippingStatusText) {
      if (totalCount === 0) {
        freeShippingBarFill.style.width = "0%";
        freeShippingStatusText.innerHTML = `🚚 Add ₹${FREE_SHIPPING_THRESHOLD} for <strong>FREE Bangalore Delivery</strong>`;
        if (freeShippingPercentText) freeShippingPercentText.textContent = "0%";
      } else {
        const pct = Math.min(100, Math.round((discountedSubtotal / FREE_SHIPPING_THRESHOLD) * 100));
        freeShippingBarFill.style.width = pct + "%";
        if (discountedSubtotal >= FREE_SHIPPING_THRESHOLD) {
          freeShippingStatusText.innerHTML = `🎉 <strong>FREE Doorstep Delivery Unlocked!</strong>`;
          if (freeShippingPercentText) freeShippingPercentText.textContent = "100%";
        } else {
          const rem = FREE_SHIPPING_THRESHOLD - discountedSubtotal;
          freeShippingStatusText.innerHTML = `🚚 Add <strong>₹${rem}</strong> more for <strong>FREE Delivery</strong>`;
          if (freeShippingPercentText) freeShippingPercentText.textContent = pct + "%";
        }
      }
    }

    // Floating Mobile Cart Bar (Ensuring body tag has class to prevent sound button overlap!)
    const mobileCartBar = document.getElementById("mobileCartBar");
    if (mobileCartBar) {
      if (totalCount > 0) {
        mobileCartBar.style.display = "flex";
        document.body.classList.add("has-mobile-cart");
        const mCount = document.getElementById("mobileCartCount");
        const mTotal = document.getElementById("mobileCartTotal");
        if (mCount) mCount.textContent = `${totalCount} ${totalCount === 1 ? 'item' : 'items'}`;
        if (mTotal) mTotal.textContent = `₹${grandTotal.toLocaleString("en-IN")}`;
      } else {
        mobileCartBar.style.display = "none";
        document.body.classList.remove("has-mobile-cart");
      }
    }

    const cartItemsList = document.getElementById("cartItemsList");
    if (!cartItemsList) return;

    if (cart.length === 0) {
      cartItemsList.innerHTML = `<div class="empty-cart-msg">Your artisanal bag is empty.<br>Select any bottle or combo above to begin.</div>`;
      return;
    }

    cartItemsList.innerHTML = cart.map((item) => `
      <div class="cart-item">
        <img src="${item.img}" class="cart-item-thumb" alt="${escapeHtml(item.title)}" onerror="this.src='https://placehold.co/100x120/f8fafc/0c831f?text=Bottle'" />
        <div class="cart-item-details">
          <div class="cart-item-title">${escapeHtml(item.title)}</div>
          <div class="cart-item-price">₹${item.price}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)" type="button">-</button>
            <span class="qty-count">${item.quantity}</span>
            <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)" type="button">+</button>
            <button class="btn-remove-item" onclick="removeItem('${item.id}')" type="button">Remove</button>
          </div>
        </div>
      </div>
    `).join("");
  }

  // ==========================================
  // 15. CATALOG DISPLAY
  // ==========================================
  let activeProductCardSizes = {
    groundnut: "1L",
    coconut: "1L",
    sesame: "1L"
  };

  window.selectProductCardSize = function (productKey, size) {
    activeProductCardSizes[productKey] = size;
    renderProductsGrid();
  };

  window.filterCatalogCategory = function (category, evt) {
    document.querySelectorAll(".cat-pill").forEach((p) => p.classList.remove("active"));
    if (evt && evt.currentTarget) {
      evt.currentTarget.classList.add("active");
    }

    const productCards = document.querySelectorAll("#productGridContainer .product-card");
    const comboSection = document.getElementById("combo");

    if (category === "all") {
      productCards.forEach((c) => (c.style.display = "flex"));
      if (comboSection) comboSection.style.display = "block";
      document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
    } else if (category === "combo") {
      productCards.forEach((c) => (c.style.display = "none"));
      if (comboSection) {
        comboSection.style.display = "block";
        comboSection.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      if (comboSection) comboSection.style.display = "none";
      productCards.forEach((c) => {
        if (c.dataset.key === category) {
          c.style.display = "flex";
        } else {
          c.style.display = "none";
        }
      });
      document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  function renderStepperButtonHTML(id, title, price, img, quantity) {
    if (!isBangalorePincode) {
      return `
        <a href="https://www.flipkart.com" target="_blank" rel="noopener noreferrer" class="btn-buy-cart" style="text-decoration:none;">
          🛒 Buy on Flipkart
        </a>
      `;
    }

    if (quantity > 0) {
      return `
        <div class="stepper-active-box">
          <button class="stepper-btn" onclick="updateQuantity('${id}', -1)" type="button" aria-label="Decrease">−</button>
          <span class="stepper-value">${quantity}</span>
          <button class="stepper-btn" onclick="updateQuantity('${id}', 1)" type="button" aria-label="Increase">+</button>
        </div>
      `;
    }

    return `
      <button class="btn-buy-cart" onclick="handleDirectAdd('${id}', '${escapeHtml(title)}', ${price}, '${img}')" type="button">
        ADD +
      </button>
    `;
  }

  function renderProductsGrid() {
    const container = document.getElementById("productGridContainer");
    if (!container) return;
    container.innerHTML = "";

    const isLoyal = isLoyaltyDiscountValid();

    Object.keys(PRODUCT_CATALOG).forEach((key) => {
      const product = PRODUCT_CATALOG[key];
      const selectedSize = activeProductCardSizes[key] || "1L";
      const sizeData = product.sizes[selectedSize];
      const currentQty = getCartItemQuantity(sizeData.id);

      const effectivePrice = isLoyal ? Math.round(sizeData.price * 0.9) : sizeData.price;

      const card = document.createElement("div");
      card.className = `product-card ${product.badgeTheme}`;
      card.dataset.key = key;

      const featuresHTML = product.features.map((f) => `<li>${f.icon} <strong>${f.label}:</strong> ${f.val}</li>`).join("");

      const priceBadgeHTML = isLoyal
        ? `
          <div class="card-price-row">
            <div class="price-block">
              <span class="price">₹${effectivePrice}</span>
              <span class="price-regular-note">Regular: ₹${sizeData.price}</span>
            </div>
            <span class="badge-loyal-applied">🏷️ 10% Reorder Active</span>
            <span class="badge-stock">⚡ In Stock</span>
          </div>
        `
        : `
          <div class="card-price-row">
            <div class="price-block">
              <span class="price">₹${sizeData.price}</span>
              <span class="price-transparent-label">Transparent Price</span>
            </div>
            <span class="badge-reorder-perk" onclick="openBottleClaimModal()" title="Claim 10% discount if you scanned a bottle">🏷️ 10% Off Reorder</span>
            <span class="badge-stock">⚡ In Stock</span>
          </div>
        `;

      card.innerHTML = `
        <span class="card-badge">Wood Pressed</span>
        <div class="card-image-wrap ${product.bgClass}" onclick="openProductDetailModal('${key}')">
          <img src="${product.img}" alt="${escapeHtml(product.name)}" class="product-img" onerror="this.src='https://placehold.co/200x260/faf6f0/156d38?text=Oil'" />
          <span class="card-quick-hint">Tap for Details</span>
        </div>
        <div class="card-content">
          <h3 class="card-title-clickable" onclick="openProductDetailModal('${key}')">${escapeHtml(product.name)}</h3>
          <ul class="product-feature-list">${featuresHTML}</ul>

          <div class="card-size-selector-row">
            <button type="button" class="card-size-pill ${selectedSize === '1L' ? 'active' : ''}" onclick="selectProductCardSize('${key}', '1L')">
              1 Litre · ₹${product.sizes['1L'].price}
            </button>
            <button type="button" class="card-size-pill ${selectedSize === '500ml' ? 'active' : ''}" onclick="selectProductCardSize('${key}', '500ml')">
              500 ml · ₹${product.sizes['500ml'].price}
            </button>
          </div>
          
          ${priceBadgeHTML}

          <div class="card-dual-actions">
            <div class="stepper-wrap-inline" id="stepper-container-${sizeData.id}">
              ${renderStepperButtonHTML(sizeData.id, sizeData.title, sizeData.price, product.img, currentQty)}
            </div>
            <button class="btn-card-buynow" type="button" onclick="handleDirectBuyNow('${sizeData.id}', '${escapeHtml(sizeData.title)}', ${sizeData.price}, '${product.img}')">
              ⚡ BUY NOW
            </button>
          </div>
        </div>
      `;

      container.appendChild(card);
    });

    renderComboSection();
  }

  function renderComboSection() {
    const currentCombo = COMBO_CATALOG[currentSelectedComboKey];
    if (!currentCombo) return;

    const comboBadgeText = document.getElementById("comboBadgeText");
    const comboTitleHeading = document.getElementById("comboTitleHeading");
    const comboDescText = document.getElementById("comboDescText");
    const comboCurrentPrice = document.getElementById("comboCurrentPrice");
    const comboQrDiscountHint = document.getElementById("comboQrDiscountHint");
    const btnComboBuyNowDirect = document.getElementById("btnComboBuyNowDirect");

    if (comboBadgeText) comboBadgeText.textContent = currentCombo.badgeText;
    if (comboTitleHeading) comboTitleHeading.textContent = currentCombo.headingText;
    if (comboDescText) comboDescText.textContent = currentCombo.descText;
    if (comboCurrentPrice) comboCurrentPrice.textContent = `₹${currentCombo.price}`;
    if (comboQrDiscountHint) comboQrDiscountHint.textContent = `(₹${currentCombo.qrPrice} with Bottle QR Scan)`;

    const btnCombo3L = document.getElementById("btnCombo3L");
    const btnCombo15L = document.getElementById("btnCombo15L");
    if (btnCombo3L && btnCombo15L) {
      btnCombo3L.classList.toggle("active", currentSelectedComboKey === "combo-3l");
      btnCombo15L.classList.toggle("active", currentSelectedComboKey === "combo-15l");
    }

    if (btnComboBuyNowDirect) {
      if (!isBangalorePincode) {
        btnComboBuyNowDirect.innerHTML = `🛒 Buy Combo on Flipkart`;
        btnComboBuyNowDirect.onclick = function () { window.open("https://www.flipkart.com", "_blank"); };
      } else {
        btnComboBuyNowDirect.innerHTML = `BUY NOW`;
        btnComboBuyNowDirect.onclick = window.handleDirectComboBuyNow;
      }
    }
  }

  window.selectComboVariant = function (comboKey) {
    currentSelectedComboKey = comboKey;
    renderComboSection();
  };

  window.handleDirectComboBuyNow = function () {
    if (!isBangalorePincode) {
      window.openFlipkartModal();
      return;
    }
    const currentCombo = COMBO_CATALOG[currentSelectedComboKey];
    window.handleDirectBuyNow(currentCombo.id, currentCombo.title, currentCombo.price, currentCombo.img);
  };

  // ==========================================
  // 16. PRODUCT DETAIL MODAL CONTROLLER
  // ==========================================
  window.openProductDetailModal = function (productKey) {
    const product = PRODUCT_CATALOG[productKey];
    if (!product) return;

    currentDetailProductKey = productKey;
    currentDetailSelectedSize = "1L";

    renderProductDetailModalContent();

    const modal = document.getElementById("productDetailModalBackdrop");
    if (modal) {
      modal.classList.add("open");
      document.body.classList.add("modal-open");
    }
  };

  window.closeProductDetailModal = function () {
    const modal = document.getElementById("productDetailModalBackdrop");
    if (modal) {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
    }
    currentDetailProductKey = null;
  };

  window.selectModalVariantSize = function (sizeKey) {
    currentDetailSelectedSize = sizeKey;
    renderProductDetailModalContent();
  };

  window.switchDetailMainImage = function (src, thumbEl) {
    const mainImg = document.getElementById("detailMainImg");
    if (mainImg) mainImg.src = src;

    document.querySelectorAll(".detail-thumb-img").forEach((el) => el.classList.remove("active"));
    if (thumbEl) thumbEl.classList.add("active");
  };

  function renderProductDetailModalContent() {
    const body = document.getElementById("modalProductDetailBody");
    if (!currentDetailProductKey || !body) return;

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
      .map((imgSrc, idx) => `<img src="${imgSrc}" class="detail-thumb-img ${idx === 0 ? "active" : ""}" onclick="switchDetailMainImage('${imgSrc}', this)" alt="Label View ${idx + 1}" loading="lazy" decoding="async" />`)
      .join("");

    // Removed "Lab Certified" text completely (Requirement 7)
    const effectivePrice = isLoyaltyDiscountValid() ? Math.round(selectedSizeData.price * 0.9) : selectedSizeData.price;

    body.innerHTML = `
      <div class="detail-top-grid">
        <div class="detail-gallery">
          <div class="detail-main-img-box" id="detailMainImgBox">
            <img src="${product.gallery[0]}" class="detail-main-img" id="detailMainImg" alt="${escapeHtml(product.name)}" decoding="async" />
          </div>
          <div class="detail-thumb-strip">${thumbnailsHTML}</div>
        </div>
        <div class="detail-info-col">
          <span class="detail-badge-pill">🌿 Traditional Wood-Pressed • 100% Pure</span>
          <h2 class="detail-title">${escapeHtml(product.name)}</h2>
          <p class="detail-short-desc">${escapeHtml(product.shortDesc)}</p>
          <div class="modal-variant-wrap">
            <span class="modal-variant-label">Choose Volume:</span>
            <div class="modal-variant-pills">
              <button type="button" class="modal-size-pill ${currentDetailSelectedSize === "1L" ? "active" : ""}" onclick="selectModalVariantSize('1L')">1 Litre (₹${product.sizes["1L"].price})</button>
              <button type="button" class="modal-size-pill ${currentDetailSelectedSize === "500ml" ? "active" : ""}" onclick="selectModalVariantSize('500ml')">500 ml (₹${product.sizes["500ml"].price})</button>
            </div>
          </div>
          <div class="modal-action-row">
            <div>
              <span class="price-sub">Price (Inclusive of GST):</span>
              <div class="modal-price-val">₹${effectivePrice}</div>
              ${isLoyaltyDiscountValid() ? '<small class="text-green" style="font-weight:700;">🏷️ 10% Bottle Reorder Discount Applied</small>' : '<small style="color:var(--gold-deep); font-weight:600;">Transparent Price • 10% Off on Reorder</small>'}
            </div>
            <div class="stepper-wrap-inline" id="stepper-container-modal-${selectedSizeData.id}">
              ${renderStepperButtonHTML(selectedSizeData.id, selectedSizeData.title, effectivePrice, product.img, currentQty)}
            </div>
          </div>
        </div>
      </div>
      <div class="detail-spec-box">
        <h4>Extraction Specifications</h4>
        <table class="specs-table-grid"><tbody>${specRows}</tbody></table>
      </div>
      <div class="detail-spec-box">
        <h4>Nutritional Breakdown</h4>
        <div class="detail-nutrition-grid">${nutritionBoxes}</div>
      </div>

      <!-- Sticky bottom bar: Add to Cart and Buy Now next to each other -->
      <div class="pdp-sticky-bottom-bar">
        <div class="pdp-bottom-price-box">
          <span class="pdp-bottom-price-label">Price (${selectedSizeData.badge}):</span>
          <span class="pdp-bottom-price-val">₹${effectivePrice}</span>
        </div>
        <div class="pdp-bottom-buttons-row">
          <button type="button" class="btn-pdp-cart" onclick="handleDirectAdd('${selectedSizeData.id}', '${escapeHtml(selectedSizeData.title)}', ${selectedSizeData.price}, '${product.img}')">
            🛒 ADD TO CART
          </button>
          <button type="button" class="btn-pdp-buy" onclick="handleDirectBuyNow('${selectedSizeData.id}', '${escapeHtml(selectedSizeData.title)}', ${selectedSizeData.price}, '${product.img}')">
            ⚡ BUY NOW
          </button>
        </div>
      </div>
    `;
  }

  // ==========================================
  // 17. CHECKOUT & ORDERS
  // ==========================================
  window.handleDirectBuyNow = function (id, title, price, img) {
    if (!isBangalorePincode) {
      window.openFlipkartModal();
      return;
    }
    checkoutSource = "buynow";
    retryOrderData = null;
    buyNowItem = { id, title, price: parseInt(price, 10), quantity: 1, img };
    window.closeProductDetailModal();
    promptLoginOrOpenCheckout();
  };

  function promptLoginOrOpenCheckout() {
    if (!currentUser) {
      window.openAuthModal("login");
      const errBox = document.getElementById("authErrorMsg");
      if (errBox) {
        errBox.textContent = "Please sign in or create an account to tie your order to your profile.";
        errBox.style.display = "block";
      }
    } else {
      openCheckoutModalUI();
    }
  }

  function openCheckoutModalUI() {
    if (checkoutSource !== "retry" || !currentOrderRef) {
      currentOrderRef = "MP_" + Date.now() + "_" + Math.floor(100 + Math.random() * 900);
    }

    const titleEl = document.getElementById("modalCheckoutTitle");
    if (titleEl) {
      if (checkoutSource === "retry" && retryOrderData) {
        titleEl.textContent = `Verify & Complete Payment: #${retryOrderData.orderRef}`;
      } else if (checkoutSource === "buynow" && buyNowItem) {
        titleEl.textContent = `Delivery & Payment: ${buyNowItem.title}`;
      } else {
        titleEl.textContent = "Delivery & Payment Details";
      }
    }

    updateCheckoutFinancials();
    updatePaymentModeUI();
    loadSavedDeliveryDetails();

    const modal = document.getElementById("checkoutModalBackdrop");
    if (modal) {
      modal.classList.add("open");
      document.body.classList.add("modal-open");
      setTimeout(() => {
        if (leafletMap) leafletMap.invalidateSize();
      }, 300);
    }
  }

  window.closeCheckoutModal = function () {
    const modal = document.getElementById("checkoutModalBackdrop");
    if (modal) {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
    }
    if (checkoutSource === "retry") {
      checkoutSource = "cart";
      retryOrderData = null;
    }
  };

  function updateCheckoutFinancials() {
    const preview = document.getElementById("checkoutOrderPreview");
    if (!preview) return;

    if (checkoutSource === "retry" && retryOrderData) {
      currentCalculatedGrandTotal = parseFloat(retryOrderData.grandTotal) || 0;
      currentOrderRef = retryOrderData.orderRef;

      preview.innerHTML = `
        <div class="retry-order-summary-box">
          <div class="retry-summary-head">
            <span class="retry-tag">📋 Retrying Order Reference</span>
            <strong class="retry-ref">#${escapeHtml(retryOrderData.orderRef)}</strong>
          </div>
          <div class="retry-summary-field">
            <strong>Items to be Paid:</strong>
            <div class="retry-val">${escapeHtml(retryOrderData.items)}</div>
          </div>
          <div class="retry-summary-field">
            <strong>Delivery Destination:</strong>
            <div class="retry-val-sub">${escapeHtml(retryOrderData.address || "Bangalore")} (${escapeHtml(retryOrderData.pincode || "560058")})</div>
          </div>
          <div class="retry-summary-total">
            <span>Locked Grand Total:</span>
            <strong>₹${currentCalculatedGrandTotal.toLocaleString("en-IN")}</strong>
          </div>
        </div>
      `;
      return;
    }

    let subtotal = 0;
    let itemsCount = 0;
    let previewHTML = "";

    const items = checkoutSource === "buynow" && buyNowItem ? [buyNowItem] : cart;

    items.forEach((item) => {
      subtotal += item.price * item.quantity;
      itemsCount += item.quantity;
      previewHTML += `
        <div class="checkout-preview-item">
          <img src="${item.img}" class="checkout-preview-thumb" alt="${escapeHtml(item.title)}" onerror="this.src='https://placehold.co/50x60/171412/eab308?text=Bottle'" />
          <div class="checkout-preview-info">
            <strong>${escapeHtml(item.title)}</strong>
            <span>Qty: ${item.quantity} × ₹${item.price}</span>
          </div>
          <div class="checkout-preview-cost">₹${(item.price * item.quantity).toLocaleString("en-IN")}</div>
        </div>
      `;
    });

    const isLoyal = isLoyaltyDiscountValid();
    let discountAmount = 0;
    if (isLoyal && subtotal > 0) {
      discountAmount = Math.round((subtotal * REORDER_DISCOUNT_PERCENT) / 100);
    }

    const discountedSubtotal = subtotal - discountAmount;
    let deliveryFee = 0;
    if (itemsCount > 0) {
      deliveryFee = discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
    }
    const grandTotal = discountedSubtotal + (itemsCount > 0 ? deliveryFee : 0);
    currentCalculatedGrandTotal = grandTotal;

    preview.innerHTML = `
      <div class="checkout-preview-header">
        <span>Items (${itemsCount})</span>
        <span>Subtotal: ₹${subtotal.toLocaleString("en-IN")}</span>
      </div>
      <div class="checkout-preview-list">${previewHTML}</div>
      <div class="checkout-preview-footer">
        ${discountAmount > 0 ? `<div class="checkout-row discount-text"><span>Loyalty Discount (10%):</span><span>-₹${discountAmount.toLocaleString("en-IN")}</span></div>` : ""}
        <div class="checkout-row"><span>Delivery:</span><span>${deliveryFee === 0 ? '<strong class="free-tag">FREE</strong>' : `₹${deliveryFee}`}</span></div>
        <div class="checkout-row total-highlight"><span>Total Payable:</span><span>₹${grandTotal.toLocaleString("en-IN")}</span></div>
      </div>
    `;
  }

  function updatePaymentModeUI() {
    const isPhonePe = document.getElementById("payPhonePe")?.checked;
    const isCOD = document.getElementById("payCOD")?.checked;
    const submitBtn = document.getElementById("submitOrderBtn");
    const infoBox = document.getElementById("phonepePaymentInfoBox");

    document.getElementById("labelPayPhonePe")?.classList.toggle("active", !!isPhonePe);
    document.getElementById("labelPayCOD")?.classList.toggle("active", !!isCOD);
    document.getElementById("labelPayWhatsApp")?.classList.toggle("active", !isPhonePe && !isCOD);

    if (infoBox) infoBox.style.display = isPhonePe ? "block" : "none";

    if (submitBtn) {
      if (isPhonePe) submitBtn.textContent = "Proceed to Pay via PhonePe ⚡";
      else if (isCOD) submitBtn.textContent = "Confirm Cash on Delivery Order 💵";
      else submitBtn.textContent = "Confirm Order on WhatsApp 💬";
    }
  }

  async function saveOrderToFirestore(orderData) {
    if (!db) return;
    try {
      await db.collection("orders").doc(orderData.orderRef).set({
        orderRef: orderData.orderRef,
        firebaseUid: orderData.firebaseUid,
        customerName: orderData.customerName,
        phone: orderData.phone,
        email: orderData.email || "",
        address: orderData.address,
        pincode: orderData.pincode,
        items: orderData.items,
        grandTotal: orderData.grandTotal,
        paymentMode: orderData.paymentMode,
        orderStatus: orderData.orderStatus,
        bottleCode: orderData.bottleCode || "",
        trackingNotes: "Sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore packaging and distribution facility.",
        timestamp: new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
        timestampMs: Date.now(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn("Firestore order save error:", e);
    }
  }

  async function handleCheckoutSubmission() {
    if (!currentUser) {
      promptLoginOrOpenCheckout();
      return;
    }

    const name = document.getElementById("custName")?.value.trim();
    const phone = document.getElementById("custPhone")?.value.trim();
    const address = document.getElementById("custAddress")?.value.trim();
    const state = document.getElementById("custState")?.value.trim() || "Karnataka";
    const district = document.getElementById("custDistrict")?.value.trim() || "Bengaluru Urban";
    const city = document.getElementById("custCity")?.value.trim() || "Bengaluru";
    const pincode = document.getElementById("custPincode")?.value.trim();
    const latitude = document.getElementById("custLatitude")?.value || DEFAULT_BANGALORE_COORDS[0];
    const longitude = document.getElementById("custLongitude")?.value || DEFAULT_BANGALORE_COORDS[1];
    const chkSave = document.getElementById("chkSaveAddress")?.checked;
    const errBox = document.getElementById("formError");

    if (!name || phone.length < 10 || !address || pincode.length !== 6) {
      if (errBox) {
        errBox.textContent = "Please fill in all mandatory delivery address fields properly.";
        errBox.style.display = "block";
      }
      return;
    }

    if (!pincode.startsWith("560")) {
      window.openFlipkartModal();
      return;
    }

    if (errBox) errBox.style.display = "none";

    if (chkSave) {
      const deliveryPayload = {
        name, phone, address, state, district, city, pincode, latitude, longitude
      };
      localStorage.setItem("manopavana_saved_delivery", JSON.stringify(deliveryPayload));
    }

    let itemsSummary = "";
    if (checkoutSource === "retry" && retryOrderData) {
      itemsSummary = retryOrderData.items;
    } else {
      const itemsToCheckout = checkoutSource === "buynow" && buyNowItem ? [buyNowItem] : cart;
      itemsSummary = itemsToCheckout.map((i) => `${i.title} (x${i.quantity})`).join(", ");
    }

    const paymentMode = document.getElementById("payPhonePe")?.checked
      ? "PHONEPE"
      : (document.getElementById("payCOD")?.checked ? "COD" : "WHATSAPP");

    const submitBtn = document.getElementById("submitOrderBtn");
    const origText = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Processing Order...";
    }

    const uid = currentUser.uid || ("GUEST_" + phone);
    const currentOrigin = window.location.origin + window.location.pathname;

    const orderPayload = {
      orderRef: currentOrderRef,
      firebaseUid: uid,
      customerName: name,
      phone: phone,
      email: currentUser.email || "",
      address: `${address}, ${city}`,
      pincode: pincode,
      items: itemsSummary,
      grandTotal: currentCalculatedGrandTotal.toString(),
      paymentMode: paymentMode,
      orderStatus: paymentMode === "PHONEPE" ? "Payment Pending" : "Placed",
      bottleCode: activeBottleCode || ""
    };

    try {
      await saveOrderToFirestore(orderPayload);

      if (paymentMode === "PHONEPE") {
        sessionStorage.setItem("manopavana_pending_checkout_source", checkoutSource);
        sessionStorage.setItem("manopavana_pending_order_ref", currentOrderRef);

        const response = await callBackend({
          action: "create_phonepe_order",
          orderRef: currentOrderRef,
          firebaseUid: uid,
          amount: currentCalculatedGrandTotal,
          name: name,
          phone: phone,
          email: currentUser.email || "",
          address: `${address}, ${city}`,
          state: state,
          district: district,
          pincode: pincode,
          items: itemsSummary,
          bottleCode: activeBottleCode || "",
          latitude: latitude,
          longitude: longitude,
          redirectBaseUrl: currentOrigin
        });

        if (response && response.status === "SUCCESS" && response.redirectUrl) {
          const targetUrl = String(response.redirectUrl).trim();
          if (targetUrl.indexOf("script.google.com") !== -1 || targetUrl.indexOf("script.googleusercontent.com") !== -1) {
            alert("PhonePe Gateway session could not be established. Please select 'Cash on Delivery' or 'WhatsApp Order'.");
            return;
          }
          window.location.href = targetUrl;
          return;
        } else {
          const errDetail = (response && response.message) ? response.message : "Unable to initiate PhonePe session.";
          alert("Payment Error: " + errDetail + "\n\nPlease try Cash on Delivery or WhatsApp Order.");
          return;
        }
      } else {
        const orderSnapshot = {
          timestamp: new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
          timestampMs: Date.now(),
          orderRef: currentOrderRef,
          firebaseUid: uid,
          customerName: name,
          phone: phone,
          email: currentUser.email || "",
          items: itemsSummary,
          grandTotal: currentCalculatedGrandTotal.toString(),
          paymentMode: paymentMode,
          orderStatus: "Placed",
          trackingNotes: "Sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore packaging and distribution facility.",
          latitude: latitude,
          longitude: longitude
        };

        const existingIdx = localOrdersHistory.findIndex(o => o.orderRef === currentOrderRef);
        if (existingIdx !== -1) {
          localOrdersHistory[existingIdx] = orderSnapshot;
        } else {
          localOrdersHistory.unshift(orderSnapshot);
        }
        localStorage.setItem("manopavana_local_orders", JSON.stringify(localOrdersHistory));

        if (checkoutSource === "cart") {
          cart = [];
          localStorage.removeItem("manopavana_cart");
          renderCart();
        }

        window.closeCheckoutModal();

        showOrderConfirmationModal({
          orderRef: currentOrderRef,
          customerName: name,
          paymentMode: paymentMode === "COD" ? "Cash on Delivery (COD)" : "WhatsApp Manual Order"
        });

        if (paymentMode === "WHATSAPP") {
          let msg = `🌿 *New Order - MANOPAVANA Wood-Pressed Oils*\n`;
          msg += `*Ref:* #${currentOrderRef}\n*UID:* ${uid}\n`;
          msg += `*Name:* ${name}\n*Phone:* ${phone}\n*Address:* ${address}, ${city} - ${pincode}\n`;
          msg += `*Location:* https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}\n`;
          msg += `*Items:* ${itemsSummary}\n*Total:* ₹${currentCalculatedGrandTotal}\n*Payment:* WhatsApp Manual`;
          window.open(`https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
        }
      }
    } catch (err) {
      console.warn("Checkout processing notice:", err);
      alert(err.message || "Failed to process checkout. Please choose Cash on Delivery or WhatsApp Order.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = origText;
      }
      currentOrderRef = "MP_" + Date.now() + "_" + Math.floor(100 + Math.random() * 900);
    }
  }

  function showOrderConfirmationModal(details) {
    const modal = document.getElementById("orderConfirmationModalBackdrop");
    const box = document.getElementById("confirmReceiptDetails");
    const waBtn = document.getElementById("btnWhatsAppTrackReceipt");

    if (box) {
      box.innerHTML = `
        <div class="confirm-receipt-row"><span>Order Reference:</span><strong>#${details.orderRef}</strong></div>
        <div class="confirm-receipt-row"><span>Payment Method:</span><strong>${details.paymentMode}</strong></div>
        <div class="confirm-receipt-row"><span>Estimated Delivery:</span><strong style="color:#16a34a;">24 – 72 Hours (Bangalore)</strong></div>
        <div class="confirm-receipt-row total-row"><span>Status:</span><strong style="color:#d97706;">Confirmed &amp; Queued for Packaging</strong></div>
      `;
    }

    if (waBtn) {
      waBtn.href = `https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?text=${encodeURIComponent("Live tracking for Order #" + details.orderRef)}`;
    }

    if (modal) {
      modal.classList.add("open");
      document.body.classList.add("modal-open");
    }
  }

  window.closeOrderConfirmationModal = function () {
    const modal = document.getElementById("orderConfirmationModalBackdrop");
    if (modal) {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
    }
  };

  window.openLiveTrackingFromConfirmation = function () {
    window.closeOrderConfirmationModal();
    window.openAccountDashboard("orders");
  };

  // ==========================================
  // 18. PAYMENT RETRY & FAILURE HANDLERS
  // ==========================================
  window.showPaymentFailedModal = function (orderRef, reasonText) {
    lastFailedOrderRef = orderRef;
    const modal = document.getElementById("paymentFailedModalBackdrop");
    const refEl = document.getElementById("failedModalRef");
    const reasonEl = document.getElementById("failedModalReason");

    if (refEl) refEl.textContent = "#" + orderRef;
    if (reasonEl) {
      reasonEl.textContent = reasonText || "Payment was cancelled or was not confirmed by the bank.";
    }

    if (db && orderRef) {
      db.collection("orders").doc(orderRef).set({
        paymentMode: "PHONEPE",
        orderStatus: "Payment Incomplete",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(() => {});
    }

    if (modal) {
      modal.classList.add("open");
      document.body.classList.add("modal-open");
    }
  };

  window.closePaymentFailedModal = function () {
    const modal = document.getElementById("paymentFailedModalBackdrop");
    if (modal) {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
    }
  };

  window.retryPaymentFromModal = async function () {
    window.closePaymentFailedModal();

    let matched = localOrdersHistory.find(o => o.orderRef === lastFailedOrderRef);
    if (!matched && db && lastFailedOrderRef) {
      try {
        const doc = await db.collection("orders").doc(lastFailedOrderRef).get();
        if (doc.exists) matched = doc.data();
      } catch (e) {}
    }

    if (matched) {
      window.retryOrderDirectly(matched, "PHONEPE");
    } else {
      const pRadio = document.getElementById("payPhonePe");
      if (pRadio) pRadio.checked = true;
      updatePaymentModeUI();
      openCheckoutModalUI();
    }
  };

  window.switchToCodFromModal = async function () {
    window.closePaymentFailedModal();

    let matched = localOrdersHistory.find(o => o.orderRef === lastFailedOrderRef);
    if (!matched && db && lastFailedOrderRef) {
      try {
        const doc = await db.collection("orders").doc(lastFailedOrderRef).get();
        if (doc.exists) matched = doc.data();
      } catch (e) {}
    }

    if (matched) {
      window.retryOrderDirectly(matched, "COD");
    } else {
      const cRadio = document.getElementById("payCOD");
      if (cRadio) cRadio.checked = true;
      updatePaymentModeUI();
      openCheckoutModalUI();
    }
  };

  // ==========================================
  // 19. REVIEWS
  // ==========================================
  function renderReviews() {
    const grid = document.getElementById("reviewsDisplayGrid");
    if (!grid) return;

    if (reviewsList.length === 0) {
      grid.innerHTML = `
        <div class="empty-reviews-notice">
          <span>🌱</span>
          <p>No customer reviews posted yet.<br>Be the first to share your kitchen experience using the form below!</p>
        </div>
      `;
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const isAdmin = urlParams.get("admin") === "true";

    grid.innerHTML = reviewsList
      .map((rev) => {
        const starRatingNum = Math.max(1, Math.min(5, parseInt(rev.rating, 10) || 5));
        const starsDisplay = "★".repeat(starRatingNum) + "☆".repeat(5 - starRatingNum);

        return `
          <div class="review-card" id="card-${rev.id}">
            <div>
              <div class="review-card-top">
                <div class="review-stars">${starsDisplay}</div>
                ${isAdmin ? `<button class="btn-admin-delete" onclick="deleteReview('${rev.id}')" title="Admin Delete">🗑️ Delete</button>` : ""}
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

  // ==========================================
  // 20. MODALS & LOYALTY TIMER
  // ==========================================
  window.openLegalModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("open");
      document.body.classList.add("modal-open");
    }
  };

  window.closeLegalModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
    }
  };

  function initLoyaltyFromStorage() {
    const storedTime = localStorage.getItem("manopavana_bottle_scan_time");
    if (storedTime) {
      const elapsed = Date.now() - parseInt(storedTime, 10);
      if (elapsed < QR_EXPIRY_MS) {
        bottleScanTimestampMs = parseInt(storedTime, 10);
        activeBottleCode = localStorage.getItem("manopavana_bottle_code") || "VERIFIED_BOTTLE";
        startLiveCountdown();
      } else {
        window.clearLoyaltyDiscount();
      }
    }
  }

  window.clearLoyaltyDiscount = function () {
    activeBottleCode = null;
    bottleScanTimestampMs = null;
    localStorage.removeItem("manopavana_bottle_code");
    localStorage.removeItem("manopavana_bottle_scan_time");
    renderCart();
    startLiveCountdown();
    renderComboSection();
  };

  function startLiveCountdown() {
    if (countdownTimerInterval) clearInterval(countdownTimerInterval);

    function updateTimer() {
      const announcementText = document.getElementById("announcementText");
      const topBar = document.getElementById("topAnnouncementBar");

      if (!announcementText || !topBar) return;

      if (isLoyaltyDiscountValid()) {
        const remainingMs = Math.max(0, QR_EXPIRY_MS - (Date.now() - bottleScanTimestampMs));
        if (remainingMs <= 0) {
          window.clearLoyaltyDiscount();
          return;
        }

        const totalSeconds = Math.floor(remainingMs / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const formatted = `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
        announcementText.innerHTML = `🏷 <strong>Bottle Scan Verified:</strong> 10% Loyalty Discount Active! <span class="countdown-pill">⏱ ${formatted}</span>`;
        topBar.classList.add("loyal-banner");
      } else {
        // Centered single delivery text as requested (Requirement 2)
        announcementText.innerHTML = `<span class="announcement-item">🚚 <strong>FREE Doorstep Delivery across Bangalore (24–72 hours) on above 500</strong></span>`;
        topBar.classList.remove("loyal-banner");
        clearInterval(countdownTimerInterval);
      }
    }

    updateTimer();
    countdownTimerInterval = setInterval(updateTimer, 1000);
  }

  // ==========================================
  // 21. DOM INITIALIZATION
  // ==========================================
  window.handleSubNavClick = function (evt, linkEl) {
    document.querySelectorAll(".sub-nav-link").forEach((l) => l.classList.remove("active"));
    if (linkEl) linkEl.classList.add("active");
  };

  function initSubNavObserver() {
    const sectionIds = ["products", "combo", "bottle-design", "culinary", "reviews", "loyalty", "benchmark", "faqs"];
    const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);
    const links = document.querySelectorAll(".sub-nav-link");

    if (!window.IntersectionObserver) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const currentId = entry.target.id;
          links.forEach((l) => {
            const href = l.getAttribute("href") || "";
            if (href === "#" + currentId) {
              links.forEach((other) => other.classList.remove("active"));
              l.classList.add("active");
            }
          });
        }
      });
    }, { threshold: 0.25, rootMargin: "-70px 0px -40% 0px" });

    sections.forEach((sec) => observer.observe(sec));
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("soundToggleBtn")?.addEventListener("click", toggleAudio);
    initVideoAutoplay();

    tryImmediateAudioPlayback();

    const enableAudioOnGesture = () => {
      if (!hasInteracted) {
        hasInteracted = true;
        tryImmediateAudioPlayback();
      }
      ["click", "touchend"].forEach((e) => window.removeEventListener(e, enableAudioOnGesture));
    };
    ["click", "touchend"].forEach((e) => window.addEventListener(e, enableAudioOnGesture, { passive: true }));

    document.getElementById("openCartBtn")?.addEventListener("click", window.openCart);
    document.getElementById("closeCartBtn")?.addEventListener("click", window.closeCart);
    document.getElementById("cartBackdrop")?.addEventListener("click", window.closeCart);

    document.getElementById("openCheckoutModalBtn")?.addEventListener("click", () => {
      if (cart.length === 0) {
        alert("Please add at least one bottle to your bag first!");
        return;
      }
      if (!isBangalorePincode) {
        window.openFlipkartModal();
        return;
      }
      checkoutSource = "cart";
      buyNowItem = null;
      retryOrderData = null;
      window.closeCart();
      promptLoginOrOpenCheckout();
    });

    document.getElementById("closeModalBtn")?.addEventListener("click", window.closeCheckoutModal);
    document.getElementById("closeDetailModalBtn")?.addEventListener("click", window.closeProductDetailModal);

    document.getElementById("payPhonePe")?.addEventListener("change", updatePaymentModeUI);
    document.getElementById("payCOD")?.addEventListener("change", updatePaymentModeUI);
    document.getElementById("payWhatsApp")?.addEventListener("change", updatePaymentModeUI);

    document.getElementById("submitOrderBtn")?.addEventListener("click", handleCheckoutSubmission);

    ["custPhone", "custPincode", "pincodeCheckInput", "editProfPhone", "dashInputPhone"].forEach((id) => {
      document.getElementById(id)?.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/\D/g, "");
      });
    });

    document.getElementById("productReviewForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("revName")?.value.trim();
      const product = document.getElementById("revProduct")?.value;
      const rating = document.getElementById("revRating")?.value;
      const location = document.getElementById("revLocation")?.value.trim() || "Bangalore";
      const comment = document.getElementById("revComment")?.value.trim();

      if (!name || !comment) {
        alert("Please fill in your name and kitchen feedback.");
        return;
      }

      reviewsList.unshift({
        id: "REV-" + Date.now(),
        name,
        product,
        rating,
        location,
        comment,
        date: new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
      });

      localStorage.setItem("manopavana_user_reviews", JSON.stringify(reviewsList));
      renderReviews();
      e.target.reset();
      window.showActionToast("Review Submitted", "✨ Thank you! Your review has been posted.", "✨", "success");
    });

    document.querySelectorAll(".faq-question").forEach((button) => {
      button.addEventListener("click", () => {
        const item = button.parentElement;
        const isActive = item.classList.contains("active");
        document.querySelectorAll(".faq-item").forEach((el) => el.classList.remove("active"));
        if (!isActive) item.classList.add("active");
      });
    });

    // Verify PhonePe Return
    const urlParams = new URLSearchParams(window.location.search);
    const incomingOrderRef = urlParams.get("orderRef");
    const incomingStatus = (urlParams.get("status") || "").toLowerCase();

    if (incomingOrderRef) {
      const savedCheckoutSource = sessionStorage.getItem("manopavana_pending_checkout_source") || "cart";

      if (incomingStatus.includes("fail") || incomingStatus.includes("cancel") || incomingStatus.includes("error")) {
        window.showPaymentFailedModal(incomingOrderRef, "Payment session was cancelled at PhonePe gateway.");
        sessionStorage.removeItem("manopavana_pending_checkout_source");
        sessionStorage.removeItem("manopavana_pending_order_ref");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        window.showActionToast("Checking Status", "Verifying with PhonePe... ⏳", "⏳", "info");

        let handled = false;
        const cutoffTimer = setTimeout(() => {
          if (!handled) {
            handled = true;
            window.showPaymentFailedModal(incomingOrderRef, "Payment was not confirmed by the bank. Order not yet placed.");
            sessionStorage.removeItem("manopavana_pending_checkout_source");
            sessionStorage.removeItem("manopavana_pending_order_ref");
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }, 2500);

        callBackend({ action: "verify_payment", orderRef: incomingOrderRef })
          .then((verification) => {
            if (handled) return;
            clearTimeout(cutoffTimer);
            handled = true;

            if (verification && verification.paymentStatus === "COMPLETED") {
              if (db) {
                db.collection("orders").doc(incomingOrderRef).set({
                  paymentMode: "PHONEPE_PAID",
                  orderStatus: "Placed",
                  updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true }).catch(() => {});
              }

              if (savedCheckoutSource === "cart") {
                cart = [];
                localStorage.removeItem("manopavana_cart");
                renderCart();
              }
              showOrderConfirmationModal({
                orderRef: incomingOrderRef,
                paymentMode: "PhonePe Online (Verified)"
              });
            } else {
              window.showPaymentFailedModal(incomingOrderRef, verification.reason || "Payment was cancelled or declined by bank.");
            }
          })
          .catch(() => {
            if (handled) return;
            clearTimeout(cutoffTimer);
            handled = true;
            window.showPaymentFailedModal(incomingOrderRef, "Payment was not confirmed. Connection dropped.");
          })
          .finally(() => {
            sessionStorage.removeItem("manopavana_pending_checkout_source");
            sessionStorage.removeItem("manopavana_pending_order_ref");
            window.history.replaceState({}, document.title, window.location.pathname);
          });
      }
    }

    populateStatesDropdown();
    updateLocationUI();
    initLoyaltyFromStorage();
    initSubNavObserver();
    renderProductsGrid();
    renderCart();
    renderReviews();
    initFirebaseAuth();
  });
})();
