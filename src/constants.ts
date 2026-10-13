import { ComboProduct, CustomerReview, FAQItem, Product } from "./types";
import videoStudioBg from "./assets/products/video-studio-bg.jpg";
import groundnutLight from "./assets/products/groundnut-light.png";
import groundnutDark from "./assets/products/groundnut-dark.png";
import groundnutStudio from "./assets/products/groundnut-studio.jpg";
import coconutLight from "./assets/products/coconut-light.png";
import coconutDark from "./assets/products/coconut-dark.png";
import coconutStudio from "./assets/products/coconut-studio.jpg";
import sesameLight from "./assets/products/sesame-light.png";
import sesameDark from "./assets/products/sesame-dark.png";
import sesameStudio from "./assets/products/sesame-studio.jpg";

export const BUSINESS_CONFIG = {
  BRAND_NAME: "MANOPAVANA",
  MASTER_TAGLINE: "Pure by nature, trusted for life",
  FOUNDER_NAME: "Manoj M R",
  GRIEVANCE_OFFICER: "Manoj M R",
  PRIMARY_PHONE: "+91 91803 01917",
  PHONE_RAW: "919180301917",
  ALT_PHONE: "8431023984",
  EMAIL: "manopavana@gmail.com",
  FACILITY_ADDRESS: "118, Raghavendra Layout, Thigalarapalya, Peenya 2nd Stage, Bangalore, Karnataka - 560058",
  FSSAI_LICENSE: "Reg. No. 21226008004689",
  GSTIN: "29EYSPR5297E1ZE",
  ADMIN_PIN: "1234",
  DEFAULT_COORDINATES: [12.9716, 77.5946] as [number, number],
  FREE_SHIPPING_THRESHOLD: 500,
  STANDARD_SHIPPING_FEE: 49,
  LOYALTY_DISCOUNT_PERCENT: 10,
  LOYALTY_VALIDITY_MS: 7 * 24 * 60 * 60 * 1000, // 7 Days = 604,800,000 ms
  FACILITY_STATEMENT: "Sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore packaging and distribution facility.",
  HERO_HEADLINE: "Unrefined by Nature, Bottled Fresh",
  HERO_SUBHEAD: "Sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore facility. Free from chemical solvents, and sealed fresh into food-grade bottles to preserve natural aroma and wholesome nutrients.",
  HERO_HIGHLIGHTS: ["Marachekku Pressing", "Natural Sedimentation", "Direct Bangalore Delivery"],
};

export const PHONEPE_CONFIG = {
  CLIENT_ID: "SU2609091606384536532802",
  CLIENT_VERSION: "1",
  CLIENT_SECRET: "4c8a116b-8cfc-46ad-beda-1572fe0acc2f",
  MERCHANT_ID: "M22I0LXKSWR86",
  AUTH_URL: "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
  PAY_URL: "https://api.phonepe.com/apis/pg/checkout/v2/pay",
  STATUS_URL: "https://api.phonepe.com/apis/pg/checkout/v2/order",
  PRODUCTION_ORIGIN: "https://manopavana.com",
};

export const FIREBASE_CONFIG = {
  apiKey: (typeof import.meta !== "undefined" && import.meta.env?.VITE_FIREBASE_API_KEY) || "AIzaSyBZ2h7B82XvIR2ffT2E5g9MHp1M7QPO9K4",
  authDomain: (typeof import.meta !== "undefined" && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) || "manopavana-d399e.firebaseapp.com",
  projectId: (typeof import.meta !== "undefined" && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || "manopavana-d399e",
  storageBucket: (typeof import.meta !== "undefined" && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) || "manopavana-d399e.firebasestorage.app",
  messagingSenderId: (typeof import.meta !== "undefined" && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || "675866391632",
  appId: (typeof import.meta !== "undefined" && import.meta.env?.VITE_FIREBASE_APP_ID) || "1:675866391632:web:a5c160fb7315a5f8788d55",
  measurementId: (typeof import.meta !== "undefined" && import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID) || "G-5G8JTQF8Q2",
};

export const EMAILJS_CONFIG = {
  SERVICE_ID: "service_c6el9r8",
  TEMPLATE_ID: "template_zcdzrbl",
  PUBLIC_KEY: "SzEt0unJ8krw0qHVt",
  TARGET_EMAIL: "manopavana@gmail.com",
};

export const MEDIA_ASSETS = {
  logo: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/logo2.jpg",
  logoOriginal: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/logo2.jpg",
  videoStudioBg,
  heroVideo: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/master_oil.mp4",
  heroFallbackImage: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/hero-image.png",
  bottle360Video: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/bottle_360.mp4",
  ambientAudioTrack: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/marada_gaana_beat.mp3",
  comboBanner: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/combo-all-labels.jpg",
  labels: {
    groundnut: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/label-groundnut.jpg",
    coconut: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/label-coconut.jpg",
    sesame: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/label-sesame.jpg",
  },
  loyaltySteps: {
    step1: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/step-bottle-qr.jpg",
    step2: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/step-camera-scan.jpg",
    step3: "https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/step-whatsapp-discount.jpg",
  },
  groundnutShots: Array.from({ length: 11 }, (_, i) => `https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/groundnut-${i + 1}.png`),
  coconutShots: Array.from({ length: 11 }, (_, i) => `https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/coconut-${i + 1}.png`),
  sesameShots: Array.from({ length: 11 }, (_, i) => `https://pub-9e18bb265ecf4224ae1230cf913745ca.r2.dev/sesame-${i + 1}.png`),
};

export const THEMED_PRODUCT_IMAGES: Record<string, { light: string; dark: string; studio: string }> = {
  groundnut: {
    light: groundnutLight,
    dark: groundnutDark,
    studio: groundnutStudio,
  },
  coconut: {
    light: coconutLight,
    dark: coconutDark,
    studio: coconutStudio,
  },
  sesame: {
    light: sesameLight,
    dark: sesameDark,
    studio: sesameStudio,
  },
};

export const INDIAN_STATES_DISTRICTS: Record<string, string[]> = {
  Karnataka: [
    "Bagalkote", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban",
    "Bidar", "Chamarajanagara", "Chikkaballapura", "Chikkamagaluru", "Chitradurga",
    "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan",
    "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal",
    "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga",
    "Tumakuru", "Udupi", "Uttara Kannada", "Vijayanagara", "Vijayapura", "Yadgir"
  ],
  "Tamil Nadu": [
    "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore",
    "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kanchipuram",
    "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai",
    "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai",
    "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi",
    "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli",
    "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur",
    "Vellore", "Viluppuram", "Virudhunagar"
  ],
  Kerala: [
    "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod",
    "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad",
    "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"
  ],
  "Andhra Pradesh": [
    "Alluri Sitharama Raju", "Anakapalli", "Ananthapuramu", "Annamayya", "Bapatla",
    "Chittoor", "Dr. B.R. Ambedkar Konaseema", "East Godavari", "Eluru", "Guntur",
    "Kakinada", "Krishna", "Kurnool", "Nandyal", "NTR",
    "Palnadu", "Parvathipuram Manyam", "Prakasam", "Sri Potti Sriramulu Nellore", "Sri Sathya Sai",
    "Srikakulam", "Tirupati", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"
  ],
  Telangana: [
    "Adilabad", "Bhadradri Kothagudem", "Hanamkonda", "Hyderabad", "Jagtial",
    "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar",
    "Khammam", "Kumuram Bheem Asifabad", "Mahabubabad", "Mahabubnagar", "Mancherial",
    "Medak", "Medchal-Malkajgiri", "Mulugu", "Nagarkurnool", "Nalgonda",
    "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla",
    "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad",
    "Wanaparthy", "Warangal", "Yadadri Bhuvanagiri"
  ],
  Maharashtra: [
    "Ahmednagar", "Akola", "Amravati", "Chhatrapati Sambhajinagar", "Beed",
    "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli",
    "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur",
    "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded",
    "Nandurbar", "Nashik", "Dharashiv", "Palghar", "Parbhani",
    "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara",
    "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"
  ],
  Delhi: [
    "Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi",
    "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"
  ],
  Goa: ["North Goa", "South Goa"],
  Gujarat: [
    "Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", "Botad",
    "Chhota Udaipur", "Dahod", "Dang", "Devbhumi Dwarka", "Gandhinagar", "Gir Somnath", "Jamnagar",
    "Junagadh", "Kheda", "Kutch", "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal",
    "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"
  ],
  Rajasthan: [
    "Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bikaner", "Bundi",
    "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer",
    "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh",
    "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"
  ],
  "Uttar Pradesh": [
    "Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Baghpat",
    "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor",
    "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad",
    "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur",
    "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat",
    "Kanpur Nagar", "Kasganj", "Kaushambi", "Kheri", "Kushinagar", "Lalitpur", "Lucknow", "Maharajganj",
    "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit",
    "Pratapgarh", "Prayagraj", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar",
    "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"
  ],
  "West Bengal": [
    "Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly",
    "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia",
    "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur",
    "Purulia", "South 24 Parganas", "Uttar Dinajpur"
  ],
  "Madhya Pradesh": [
    "Bhopal", "Gwalior", "Indore", "Jabalpur", "Ujjain", "Dewas", "Satna", "Rewa", "Sagar", "Ratlam",
    "Burhanpur", "Khandwa", "Morena", "Bhind", "Guna", "Shivpuri", "Vidisha", "Chhindwara", "Seoni", "Betul"
  ],
  Haryana: [
    "Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jhajjar",
    "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Nuh", "Palwal", "Panchkula", "Panipat",
    "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"
  ],
  Punjab: [
    "Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Ferozepur", "Gurdaspur",
    "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Mansa", "Moga", "Muktsar", "Pathankot",
    "Patiala", "Rupnagar", "Sahibzada Ajit Singh Nagar", "Sangrur", "Shahid Bhagat Singh Nagar", "Tarn Taran"
  ],
  Odisha: [
    "Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack", "Deogarh", "Dhenkanal",
    "Gajapati", "Ganjam", "Jagatsinghpur", "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara",
    "Kendujhar", "Khordha", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada",
    "Puri", "Rayagada", "Sambalpur", "Subarnapur", "Sundargarh"
  ],
  Bihar: [
    "Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga",
    "East Champaran", "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur", "Katihar", "Khagaria",
    "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada",
    "Patna", "Purnia", "Rohtas", "Saharsa", "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi",
    "Siwan", "Supaul", "Vaishali", "West Champaran"
  ],
  Assam: [
    "Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang",
    "Dhemaji", "Dhubri", "Dibrugarh", "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat",
    "Kamrup", "Kamrup Metropolitan", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli",
    "Morigaon", "Nagaon", "Nalbari", "Dima Hasao", "Sivasagar", "Sonitpur", "South Salmara-Mankachar",
    "Tinsukia", "Udalguri", "West Karbi Anglong"
  ],
  Uttarakhand: [
    "Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", "Nainital", "Pauri Garhwal",
    "Pithoragarh", "Rudraprayag", "Tehri Garhwal", "Udham Singh Nagar", "Uttarkashi"
  ],
  "Himachal Pradesh": [
    "Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Lahaul and Spiti", "Mandi",
    "Shimla", "Sirmaur", "Solan", "Una"
  ],
  Jharkhand: [
    "Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa", "Giridih", "Godda",
    "Gumla", "Hazaribagh", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu",
    "Ramgarh", "Ranchi", "Sahebganj", "Seraikela Kharsawan", "Simdega", "West Singhbhum"
  ],
  Chhattisgarh: [
    "Balod", "Baloda Bazar", "Balrampur", "Bastar", "Bemetara", "Bijapur", "Bilaspur", "Dantewada",
    "Dhamtari", "Durg", "Gariaband", "Gaurela Pendra Marwahi", "Janjgir Champa", "Jashpur", "Kabirdham",
    "Kanker", "Kondagaon", "Korba", "Koriya", "Mahasamund", "Mungeli", "Narayanpur", "Raigarh",
    "Raipur", "Rajnandgaon", "Sukma", "Surajpur", "Surguja"
  ],
  "Jammu and Kashmir": [
    "Anantnag", "Bandipora", "Baramulla", "Budgam", "Doda", "Ganderbal", "Jammu", "Kathua", "Kishtwar",
    "Kulgam", "Kupwara", "Poonch", "Pulwama", "Rajouri", "Ramban", "Reasi", "Samba", "Shopian", "Srinagar", "Udhampur"
  ],
  Chandigarh: ["Chandigarh"],
  Puducherry: ["Puducherry", "Karaikal", "Mahe", "Yanam"],
  "Arunachal Pradesh": [
    "Anjaw", "Changlang", "Dibang Valley", "East Kameng", "East Siang", "Itanagar", "Kamle",
    "Kra Daadi", "Kurung Kumey", "Lepa Rada", "Lohit", "Longding", "Lower Dibang Valley",
    "Lower Siang", "Lower Subansiri", "Namsai", "Pakke Kessang", "Papum Pare", "Shi Yomi",
    "Siang", "Tawang", "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"
  ],
  Manipur: [
    "Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", "Jiribam",
    "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", "Senapati", "Tamenglong",
    "Tengnoupal", "Thoubal", "Ukhrul"
  ],
  Meghalaya: [
    "East Garo Hills", "East Jaintia Hills", "East Khasi Hills", "Eastern West Khasi Hills",
    "North Garo Hills", "Ri Bhoi", "South Garo Hills", "South West Garo Hills",
    "South West Khasi Hills", "West Garo Hills", "West Jaintia Hills", "West Khasi Hills"
  ],
  Mizoram: [
    "Aizawl", "Champhai", "Hnahthial", "Khawzawl", "Kolasib", "Lawngtlai", "Lunglei",
    "Mamit", "Saitual", "Serchhip", "Siaha"
  ],
  Nagaland: [
    "Chümoukedima", "Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon",
    "Niuland", "Noklak", "Peren", "Phek", "Shamator", "Tseminyü", "Tuensang", "Wokha", "Zünheboto"
  ],
  Sikkim: [
    "Gangtok", "Gyalshing", "Mangan", "Namchi", "Pakyong", "Soreng"
  ],
  Tripura: [
    "Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura", "Unakoti", "West Tripura"
  ],
  "Andaman and Nicobar Islands": [
    "Nicobar", "North and Middle Andaman", "South Andaman"
  ],
  "Dadra and Nagar Haveli and Daman and Diu": [
    "Dadra and Nagar Haveli", "Daman", "Diu"
  ],
  Ladakh: [
    "Kargil", "Leh"
  ],
  Lakshadweep: [
    "Lakshadweep"
  ]
};

export const PACKAGING_FEATURES = {
  tag: "FUNCTIONAL PACKAGING DESIGN",
  heading: "Engineered for Daily Cooking",
  subhead: "Lightweight shatterproof food-grade bottle with a built-in drip-free precision pourer.",
  items: [
    {
      title: "Built-In Drip-Free Flip Spout",
      description: "Single-thumb controlled pouring directly into hot pans without messy oil drippings or counter stains."
    },
    {
      title: "Aroma & Freshness Lock Barrier",
      description: "Airtight food-grade seal protects natural cold-pressed antioxidants, keeping the nutty aroma crisp and unoxidized from first pour to the last drop."
    },
    {
      title: "Lightweight & Shatterproof Body",
      description: "Food-grade body with an anti-slip grip and wide stable base that won't shatter if dropped."
    }
  ]
};

export const BENCHMARK_COMPARISONS = [
  {
    metric: "Extraction Temperature",
    commercial: "High heat (200°C+ destroys natural vitamins & enzymes)",
    manopavana: "Room temperature slow wood press (< 45°C)",
  },
  {
    metric: "Chemical Solvents & Bleaches",
    commercial: "Hexane solvent extraction, caustic soda & acid bleaching",
    manopavana: "0% Chemicals • Zero Solvents • Completely Unrefined",
  },
  {
    metric: "Nutrient Retention",
    commercial: "Nutrients stripped, synthetic vitamins added back as additives",
    manopavana: "Naturally Preserved Micronutrients, Phytosterols & Tocopherols",
  },
  {
    metric: "Filtration & Clarification",
    commercial: "Artificial micro-bleaching and chemical deodorization filters",
    manopavana: "Traditional natural cotton sedimentation settling (7–10 days)",
  },
  {
    metric: "Aroma & Natural Taste",
    commercial: "Tasteless, odorless or masked with synthetic artificial flavor",
    manopavana: "Authentic deep Marachekku fragrance with raw seed notes",
  }
];

export const BENCHMARK_DISCLAIMER = "*Note: Natural sedimentation and color variations may occur between batches due to traditional zero-heat wooden press extraction and unfiltered cotton settling. This is a natural hallmark of unrefined cold-pressed oil.";

export const PRODUCTS: Product[] = [
  {
    id: "groundnut",
    name: "Wood-Pressed Groundnut Oil",
    kannadaName: "ಶುದ್ಧ ಮರದ ಗಾಣದ ಕಡಲೆಕಾಯಿ ಎಣ್ಣೆ",
    searchKeywords: "groundnut peanut singdana cooking dosa frying oil small 500ml",
    shortDescription: "Sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore packaging and distribution facility. Unrefined and unbleached, retaining authentic aroma and wholesome nutrients.",
    prices: {
      "1L": 399,
      "500ml": 189
    },
    mrp: {
      "1L": 399,
      "500ml": 189
    },
    inStock: {
      "1L": true,
      "500ml": true
    },
    smokePoint: "Cold-Pressed Marachekku",
    features: {
      aroma: "Naturally Nutty",
      texture: "Light & Non-Sticky",
      cooking: "Absorbs Less"
    },
    specs: {
      extraction: "Traditional Wooden Marachekku (<45°C)",
      processing: "Unrefined, Unbleached & Non-Deodorized",
      fssai: "Reg. No. 21226008004689",
      facility: "Bangalore Packaging & Distribution Facility",
      container: "Food-Grade Shatterproof Bottle + Drip-Free Spout",
      bestFor: "Daily Curries, Crispy Dosas, Deep Frying, Sautéing",
      shelfLife: "9-12 Months (Store in cool, dark place)",
      standards: "Zero Mineral Oil, No Argemone, No Added Preservatives"
    },
    nutrition: {
      energy: "862.1 Kcal",
      carbohydrates: "0.0 gm",
      totalFat: "99.97 gm",
      saturatedFat: "86.95 gm",
      monoUnsaturatedFat: "6.48 gm",
      polyUnsaturatedFat: "1.83 gm",
      transFat: "0.0 gm",
      cholesterol: "0.0 mg",
      protein: "0.0 gm",
      totalSugar: "0.0 gm",
      dietaryFiber: "0.0 gm",
      moisture: "0.05 %",
      totalAsh: "0.05 %"
    },
    culinaryPairing: {
      title: "Crispy Dosas & Everyday Tiffin",
      description: "Perfect for daily cooking, golden dosas, stir-fries, and shallow frying with rich nutty aroma."
    },
    labelImage: MEDIA_ASSETS.labels.groundnut,
    images: MEDIA_ASSETS.groundnutShots,
    quiz: {
      question: "What tagline is printed right below 'GROUNDNUT OIL' on the front label?",
      correctAnswer: "Perfect for Everyday Indian Cooking",
      options: [
        "Perfect for Everyday Indian Cooking",
        "Extracted using industrial chemical solvents",
        "Refined, bleached, and chemically deodorized",
        "Blended with synthetic liquid paraffin wax"
      ]
    }
  },
  {
    id: "coconut",
    name: "Wood-Pressed Coconut Oil",
    kannadaName: "ಶುದ್ಧ ಮರದ ಗಾಣದ ತೆಂಗಿನ ಎಣ್ಣೆ",
    searchKeywords: "coconut copra nariyal coastal curry hair oil small 500ml",
    shortDescription: "Sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore packaging and distribution facility. Extracted from sulfur-free copra with wholesome MCTs.",
    prices: {
      "1L": 499,
      "500ml": 269
    },
    mrp: {
      "1L": 499,
      "500ml": 269
    },
    inStock: {
      "1L": true,
      "500ml": true
    },
    smokePoint: "Sulfur-Free Copra Extract",
    features: {
      aroma: "Fresh Copra Scent",
      extraction: "Slow Wood Chekku",
      usage: "Edible & Multi-Use"
    },
    specs: {
      extraction: "Traditional Wood Chekku (<40°C)",
      processing: "Raw, Unrefined & Natural Settling",
      fssai: "Reg. No. 21226008004689",
      facility: "Bangalore Packaging & Distribution Facility",
      container: "Food-Grade Shatterproof Bottle + Drip-Free Spout",
      bestFor: "Coastal Curries, Kerala Avial, Vegetable Stew, Hair Care",
      shelfLife: "9-12 Months",
      standards: "Zero Liquid Paraffin, No Added Aromas"
    },
    nutrition: {
      energy: "862.1 Kcal",
      carbohydrates: "0.0 gm",
      totalFat: "99.97 gm",
      saturatedFat: "86.95 gm",
      monoUnsaturatedFat: "6.48 gm",
      polyUnsaturatedFat: "1.83 gm",
      transFat: "0.0 gm",
      cholesterol: "0.0 mg",
      protein: "0.0 gm",
      totalSugar: "0.0 gm",
      dietaryFiber: "0.0 gm",
      moisture: "0.05 %",
      totalAsh: "0.05 %"
    },
    culinaryPairing: {
      title: "Coastal Curries & Rice Dishes",
      description: "Unrefined aroma tailored for authentic Kerala avial, vegetable stew, and aromatic coastal curries."
    },
    labelImage: MEDIA_ASSETS.labels.coconut,
    images: MEDIA_ASSETS.coconutShots,
    quiz: {
      question: "What tagline is printed right below 'COCONUT OIL' on the front label?",
      correctAnswer: "Made for Authentic Flavours",
      options: [
        "Made for Authentic Flavours",
        "Processed with artificial preservatives and dyes",
        "Refined, bleached, and chemically deodorized",
        "Blended with synthetic liquid paraffin wax"
      ]
    }
  },
  {
    id: "sesame",
    name: "Wood-Pressed Sesame Oil",
    kannadaName: "ಶುದ್ಧ ಮರದ ಗಾಣದ ಎಳ್ಳೆಣ್ಣೆ",
    searchKeywords: "sesame gingelly til podi puliogare oil pulling small 500ml",
    shortDescription: "Sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore packaging and distribution facility. Ground with pure palm jaggery for traditional nutty warmth.",
    prices: {
      "1L": 499,
      "500ml": 269
    },
    mrp: {
      "1L": 499,
      "500ml": 269
    },
    inStock: {
      "1L": true,
      "500ml": true
    },
    smokePoint: "Slow Crushed with Jaggery",
    features: {
      aroma: "Chekku Scent",
      process: "Slow Crushed",
      quality: "Unrefined Extraction"
    },
    specs: {
      extraction: "Slow Wooden Press with Palm Jaggery",
      processing: "Unbleached, Natural Cloth Filtration",
      fssai: "Reg. No. 21226008004689",
      facility: "Bangalore Packaging & Distribution Facility",
      container: "Food-Grade Shatterproof Bottle + Drip-Free Spout",
      bestFor: "Authentic Idli Podi, Puliogare, Rasam Tadka, Oil Pulling",
      shelfLife: "9-12 Months",
      standards: "100% Sesame Extract, Zero Synthetic Fragrances"
    },
    nutrition: {
      energy: "884.3 Kcal",
      carbohydrates: "0.0 gm",
      totalFat: "99.96 gm",
      saturatedFat: "13.9 gm",
      monoUnsaturatedFat: "42.11 gm",
      polyUnsaturatedFat: "43.35 gm",
      transFat: "0.0 gm",
      cholesterol: "0.0 mg",
      protein: "0.0 gm",
      totalSugar: "0.0 gm",
      dietaryFiber: "0.0 gm",
      moisture: "0.07 %",
      totalAsh: "0.03 %"
    },
    culinaryPairing: {
      title: "Tempering, Puliogare & Podis",
      description: "Traditional choice for authentic tamarind rice (Puliogare), idli podi mix, rasam tadka, and daily wellness."
    },
    labelImage: MEDIA_ASSETS.labels.sesame,
    images: MEDIA_ASSETS.sesameShots,
    quiz: {
      question: "What tagline is printed right below 'SESAME OIL' on the front label?",
      correctAnswer: "The Traditional Choice for Rich Flavour",
      options: [
        "The Traditional Choice for Rich Flavour",
        "Blended with synthetic liquid paraffin wax",
        "Processed with artificial preservatives and dyes",
        "Extracted using industrial chemical solvents"
      ]
    }
  }
];

export const COMBOS: ComboProduct[] = [
  {
    id: "combo-3l",
    name: "Complete 3-Oil Essential Box (3L Trio)",
    heading: "Complete Kitchen 3-Oil Essential Box (3 Litres)",
    volumeLabel: "3 Litres (1L Groundnut + 1L Coconut + 1L Sesame)",
    searchKeywords: "combo box trio 3l pack value starter kitchen set",
    regularPrice: 1299,
    loyaltyPrice: 1169,
    mrp: 1560,
    description: "Equip your kitchen with South India's 3 core traditional wood-pressed oils. Sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore packaging and distribution facility. Includes brand-new sealed 1L Groundnut Oil, 1L Coconut Oil, and 1L Sesame Oil.",
    image: MEDIA_ASSETS.comboBanner,
    bullets: [
      "Complete monthly cooking coverage for your family",
      "Free Doorstep Delivery included across Bangalore (24–72 hrs)",
      "Raw artisanal extraction with zero chemical additives or solvents",
      "Includes verified 10% repeat order QR codes on all 3 bottles"
    ],
    inStock: true,
    includedOils: ["1L Groundnut Oil", "1L Coconut Oil", "1L Sesame Oil"]
  },
  {
    id: "combo-1.5l",
    name: "Complete 3-Oil Starter Box (1.5L Trio)",
    heading: "Complete Kitchen 3-Oil Starter Box (1.5 Litres)",
    volumeLabel: "1.5 Litres (500ml Groundnut + 500ml Coconut + 500ml Sesame)",
    searchKeywords: "combo box starter 1.5l trio pack",
    regularPrice: 699,
    loyaltyPrice: 629,
    mrp: 840,
    description: "Compact kitchen starter box containing 500ml Groundnut Oil, 500ml Coconut Oil, and 500ml Sesame Oil, packed fresh at our Bangalore packaging and distribution facility.",
    image: MEDIA_ASSETS.comboBanner,
    bullets: [
      "Complete monthly cooking coverage for your family",
      "Free Doorstep Delivery included across Bangalore (24–72 hrs)",
      "Raw artisanal extraction with zero chemical additives or solvents",
      "Includes verified 10% repeat order QR codes on all 3 bottles"
    ],
    inStock: true,
    includedOils: ["500ml Groundnut Oil", "500ml Coconut Oil", "500ml Sesame Oil"]
  }
];

export const FAQS: FAQItem[] = [
  {
    category: "quality",
    question: "What makes MANOPAVANA oils different from regular refined cooking oils?",
    answer: "Refined oils undergo chemical bleaching and extreme heating over 200°C. MANOPAVANA oils are sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore facility with zero external heat or chemicals, preserving natural nutrients and authentic aroma."
  },
  {
    category: "quality",
    question: "Why is there slight natural sediment at the bottom of the bottle?",
    answer: "Because our oils are completely unrefined and free from chemical filtration, we allow the oil to settle naturally through micro-mesh cotton cloths. The slight sediment at the bottom is pure seed fiber, a true mark of unrefined cold-pressed oils."
  },
  {
    category: "storage",
    question: "What is the shelf life and ideal storage for these oils?",
    answer: "Our cold-pressed oils maintain peak freshness for 9 to 12 months from the packaging date. Store them in a cool, dry place away from direct sunlight and keep the bottle tightly sealed."
  },
  {
    category: "shipping",
    question: "Where do you deliver and what are the shipping charges?",
    answer: "We deliver across all of India! For Bengaluru (560xxx), orders are fulfilled directly via our Peenya Facility Carrier within 24 to 48 hours. For all other locations across Karnataka and India, orders are fulfilled via our integrated Delhivery Express courier with live website tracking! Orders above ₹500 unlock Free Doorstep Delivery."
  }
];

export const CUSTOMER_REVIEWS: CustomerReview[] = [];

export const LEGAL_POLICIES = {
  terms: {
    title: "Terms & Conditions",
    content: `1. Business Scope & Facility Disclosure: MANOPAVANA is an artisanal repacker and distributor of wood-pressed edible oils. Oils are sourced directly from traditional wood-press artisans, settled naturally, and packed hygienically at our Bangalore packaging and distribution facility. Doorstep delivery is serviced directly across Bengaluru and nationwide across India via our integrated express logistics partners.

2. Pricing & Taxes: All prices listed on this website are in Indian Rupees (₹) and are inclusive of applicable GST (GSTIN: 29EYSPR5297E1ZE).

3. Bottle QR Loyalty Reorder Program: The 10% Bottle QR Loyalty discount is designed for returning customers. Each verified scan unlocks a 7-day window applying a 10% discount across all products at checkout.

4. Product Quality & Natural Variation: Because our oils are unrefined and free from artificial colorants, natural batch-to-batch variations in aroma, color, and cotton sedimentation are expected and attest to the authenticity of traditional artisanal extraction.

5. Grievance Redressal Mechanism: In accordance with the Consumer Protection (E-Commerce) Rules, 2020, the designated Grievance Redressal Officer for MANOPAVANA is:
Name: Manoj M R
Designation: Founder & Grievance Redressal Officer
Email: manopavana@gmail.com
Contact: +91 91803 01917 / +91 84310 23984
Packaging Facility Address: 118, Raghavendra Layout, Thigalarapalya, Peenya 2nd Stage, Bangalore - 560058`
  },
  shipping: {
    title: "Shipping & Delivery Policy",
    content: `1. Shipping Charges: Orders of ₹500 and above qualify for FREE Doorstep Delivery. Orders below ₹500 incur a flat ₹49 standard delivery fee.

2. Bengaluru Delivery: Orders within Bengaluru (560xxx) are dispatched directly from our Peenya packaging facility and delivered within 24 to 48 business hours.

3. Pan-India Delivery: Pin codes outside Bengaluru are fulfilled via Delhivery Express Logistics with real-time tracking directly inside your account on our website (delivered within 2 to 4 business days).`
  },
  returns: {
    title: "Return & Refund Policy",
    content: `1. Order Cancellation: Orders may be cancelled via WhatsApp (+91 91803 01917) within 4 hours of order placement or prior to courier handover.

2. Edible Goods Policy: Due to health and food safety standards under FSSAI regulations, opened or seal-broken oil bottles are non-returnable.

3. Damaged Shipments: If your package arrives leaked or damaged during transit, notify us within 24 hours of delivery via WhatsApp (+91 91803 01917) with unboxing photographs for an immediate replacement or full refund to your original payment method within 5–7 business days.`
  },
  privacy: {
    title: "Privacy Policy",
    content: `1. Information Collected: We collect essential order fulfillment details including Name, WhatsApp Number, Address, State, District, and Pincode solely to process and deliver your order.

2. Transactional Communication Consent: By placing an order, you consent to receive order updates, payment confirmations, and tracking information via WhatsApp and SMS.

3. Payment Security: Payment details are processed securely through PhonePe Official Payment Gateway with 256-bit bank-grade encryption; MANOPAVANA never stores your debit/credit card numbers, UPI PINs, or bank passwords.`
  }
};
