import React, { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, X, CheckCircle2, AlertCircle, Building2 } from "lucide-react";
import { useStore } from "../context/StoreContext";
import { INDIAN_STATES_DISTRICTS } from "../constants";
import L from "leaflet";

export const LocationModal: React.FC = () => {
  const {
    address,
    updateAddress,
    reverseGeocodeAndSaveAddress,
    isLocationModalOpen,
    setLocationModalOpen,
    setFlipkartModalOpen,
    showToast,
  } = useStore();

  const [fullName, setFullName] = useState(address.fullName);
  const [phone, setPhone] = useState(address.phone);
  const [email, setEmail] = useState(address.email || "");
  const [addressLine1, setAddressLine1] = useState(address.addressLine1);
  const [landmark, setLandmark] = useState(address.landmark);
  const [state, setState] = useState(address.state || "Karnataka");
  const [district, setDistrict] = useState(address.district || "Bengaluru Urban");
  const [pincode, setPincode] = useState(address.pincode || "560058");
  const [coords, setCoords] = useState<[number, number]>([
    address.lat || 12.9716,
    address.lng || 77.5946,
  ]);
  const [isLocating, setIsLocating] = useState(false);

  // Sync initial state if address updates externally
  useEffect(() => {
    setFullName(address.fullName);
    setPhone(address.phone);
    setEmail(address.email || "");
    setAddressLine1(address.addressLine1);
    setLandmark(address.landmark);
    setState(address.state || "Karnataka");
    setDistrict(address.district || "Bengaluru Urban");
    setPincode(address.pincode || "560058");
    if (address.lat && address.lng) {
      setCoords([address.lat, address.lng]);
    }
  }, [address]);

  // Leaflet map setup
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!isLocationModalOpen) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: coords,
          zoom: 13,
          attributionControl: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);

        const customIcon = L.divIcon({
          className: "custom-leaflet-marker",
          html: `<div style="background-color:#E08F35; width:28px; height:28px; border-radius:50%; border:3px solid #FFF; box-shadow:0 4px 10px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center;">
                  <div style="background:#5E3210; width:10px; height:10px; border-radius:50%;"></div>
                </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker(coords, {
          draggable: true,
          icon: customIcon,
        }).addTo(map);

        marker.on("dragend", async () => {
          const latLng = marker.getLatLng();
          setCoords([latLng.lat, latLng.lng]);
          await reverseGeocode(latLng.lat, latLng.lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } else {
        mapInstanceRef.current.setView(coords, 13);
        if (markerRef.current) {
          markerRef.current.setLatLng(coords);
        }
      }
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [isLocationModalOpen, coords]);

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const partial = await reverseGeocodeAndSaveAddress(lat, lon);
      if (partial) {
        if (partial.addressLine1) setAddressLine1(partial.addressLine1);
        if (partial.pincode) setPincode(partial.pincode);
        if (partial.district) setDistrict(partial.district);
        if (partial.state) setState(partial.state);
        if (partial.landmark) setLandmark(partial.landmark);
        showToast("📍 Address auto-populated from pin location!");
      }
    } catch {
      // ignore network hiccups
    }
  };

  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords([lat, lng]);
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 15);
          markerRef.current.setLatLng([lat, lng]);
        }
        showToast("📍 GPS coordinates retrieved! Auto-filling address...");
        await reverseGeocode(lat, lng);
        setIsLocating(false);
      },
      (err) => {
        console.warn("Geolocation warning:", err.message);
        setIsLocating(false);
        showToast("Could not retrieve precise GPS. You can pin the map manually.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleStateChange = (newState: string) => {
    setState(newState);
    const districtsForState = INDIAN_STATES_DISTRICTS[newState] || [];
    setDistrict(districtsForState[0] || "");
  };

  const isBangalorePincode =
    pincode.startsWith("560") ||
    district.toLowerCase().includes("bengaluru") ||
    state === "Karnataka" && district.toLowerCase().includes("bangalore");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      showToast("Full Name is required.");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      showToast("WhatsApp contact number must be exactly 10 digits.");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast("Valid Email Address is required.");
      return;
    }
    if (!addressLine1.trim()) {
      showToast("Primary street delivery address is required.");
      return;
    }
    const cleanPin = pincode.replace(/\D/g, "");
    if (cleanPin.length !== 6) {
      showToast("Pincode must be exactly 6 digits.");
      return;
    }

    const isBLR = cleanPin.startsWith("560");
    updateAddress({
      fullName: fullName.trim(),
      phone: cleanPhone,
      email: email.trim(),
      addressLine1: addressLine1.trim(),
      landmark: landmark.trim(),
      state,
      district,
      pincode: cleanPin,
      city: isBLR ? "Bengaluru" : district,
      lat: coords[0],
      lng: coords[1],
      isBangalore: isBLR,
    });
    setLocationModalOpen(false);
    if (!isBLR) {
      setFlipkartModalOpen(true);
    } else {
      showToast("📍 Delivery location updated across the entire store!");
    }
  };

  if (!isLocationModalOpen) return null;

  const currentDistricts = INDIAN_STATES_DISTRICTS[state] || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#24160F] to-[#140D09] text-[#FDF6EC] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] border border-[#4A301E] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-[#120A06] border-b border-[#3A2417]">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-[#D49A37]/20 text-[#F5BC51]">
              <MapPin className="w-5 h-5 text-[#F5BC51]" />
            </span>
            <div>
              <h2 id="location-modal-title" className="text-lg font-bold font-serif text-[#FFD885]">
                Choose Delivery Destination
              </h2>
              <p className="text-xs text-[#A88D77]">
                1-Click GPS or OpenStreetMap pin for pinpoint Bengaluru doorstep drop-off
              </p>
            </div>
          </div>
          <button
            onClick={() => setLocationModalOpen(false)}
            aria-label="Close delivery destination modal"
            className="p-2 text-[#A88D77] hover:text-[#FDF6EC] hover:bg-[#2C1D14] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-5">
          {/* Geolocation Quick Trigger */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-[#1C110B] border border-[#4A301E] rounded-2xl shadow-inner">
            <div className="flex items-center gap-2.5">
              <Navigation className="w-5 h-5 text-[#F5BC51] shrink-0" />
              <div>
                <p className="text-xs font-semibold text-[#FDF6EC]">
                  Automatic GPS Pinpoint
                </p>
                <p className="text-[11px] text-[#A88D77]">
                  Detect current location to autofill street and coordinate pin
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleUseGPS}
              disabled={isLocating}
              className="px-4 py-2 text-xs font-semibold text-[#140D09] bg-gradient-to-r from-[#D49A37] to-[#B87C24] hover:brightness-110 disabled:opacity-50 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              {isLocating ? "Detecting GPS..." : "Use Current Location"}
            </button>
          </div>

          {/* Leaflet Map Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[#A88D77]">
              <span className="font-semibold text-[#D6BEAA] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#F5BC51]" />
                Interactive OpenStreetMap (Drag pin to fine-tune):
              </span>
              <span className="text-[11px] text-[#A88D77] font-mono">
                {coords[0].toFixed(4)}, {coords[1].toFixed(4)}
              </span>
            </div>
            <div
              ref={mapContainerRef}
              className="w-full h-44 rounded-2xl border border-[#4A301E] overflow-hidden shadow-inner bg-[#140D09]"
            />
          </div>

          {/* Service Availability Badge */}
          <div
            className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
              isBangalorePincode
                ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-200"
                : "bg-amber-950/40 border-amber-800/40 text-amber-200"
            }`}
          >
            {isBangalorePincode ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <p className="font-bold">
                {isBangalorePincode
                  ? "Direct Doorstep Delivery Active (Bengaluru 560xxx)"
                  : "Pan-India Route via Official Flipkart Store"}
              </p>
              <p className="text-[11px] opacity-90 mt-0.5">
                {isBangalorePincode
                  ? "Orders dispatched fresh from our Peenya facility within 24 to 72 hours. Free delivery unlocked at ₹500!"
                  : "Deliveries outside Bengaluru urban/rural run with Flipkart Assured transit and courier tracking."}
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <form id="location-form" onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#D6BEAA] mb-1">
                  Recipient Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Manoj Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#120A06] border border-[#4A301E] rounded-xl focus:outline-none focus:border-[#D49A37] focus:ring-1 focus:ring-[#D49A37]/50 text-[#FDF6EC] placeholder-[#7A6150]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#D6BEAA] mb-1">
                  WhatsApp Number (10 digits) *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  pattern="[0-9]{10}"
                  placeholder="e.g. 9180301917"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#120A06] border border-[#4A301E] rounded-xl focus:outline-none focus:border-[#D49A37] focus:ring-1 focus:ring-[#D49A37]/50 text-[#FDF6EC] placeholder-[#7A6150]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#D6BEAA] mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. customer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#120A06] border border-[#4A301E] rounded-xl focus:outline-none focus:border-[#D49A37] focus:ring-1 focus:ring-[#D49A37]/50 text-[#FDF6EC] placeholder-[#7A6150]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#D6BEAA] mb-1">
                Primary Street Delivery Address *
              </label>
              <input
                type="text"
                placeholder="e.g. 118, Raghavendra Layout, Thigalarapalya"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs bg-[#120A06] border border-[#4A301E] rounded-xl focus:outline-none focus:border-[#D49A37] focus:ring-1 focus:ring-[#D49A37]/50 text-[#FDF6EC] placeholder-[#7A6150]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#D6BEAA] mb-1">
                  State
                </label>
                <select
                  value={state}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#120A06] border border-[#4A301E] rounded-xl focus:outline-none focus:border-[#D49A37] focus:ring-1 focus:ring-[#D49A37]/50 text-[#FDF6EC]"
                >
                  {Object.keys(INDIAN_STATES_DISTRICTS).map((s) => (
                    <option key={s} value={s} className="bg-[#140D09] text-[#FDF6EC]">
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D6BEAA] mb-1">
                  District
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#120A06] border border-[#4A301E] rounded-xl focus:outline-none focus:border-[#D49A37] focus:ring-1 focus:ring-[#D49A37]/50 text-[#FDF6EC]"
                >
                  {currentDistricts.map((d) => (
                    <option key={d} value={d} className="bg-[#140D09] text-[#FDF6EC]">
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D6BEAA] mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="560058"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-xs bg-[#120A06] border border-[#4A301E] rounded-xl focus:outline-none focus:border-[#D49A37] focus:ring-1 focus:ring-[#D49A37]/50 text-[#FDF6EC] placeholder-[#7A6150]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#D6BEAA] mb-1">
                Landmark / Nearby Spot (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Near Peenya 2nd Stage Water Tank"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-[#120A06] border border-[#4A301E] rounded-xl focus:outline-none focus:border-[#D49A37] focus:ring-1 focus:ring-[#D49A37]/50 text-[#FDF6EC] placeholder-[#7A6150]"
              />
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#120A06] border-t border-[#3A2417]">
          <div className="flex items-center gap-2 text-xs text-[#A88D77]">
            <Building2 className="w-4 h-4 text-[#F5BC51]" />
            <span>Peenya 2nd Stage Dispatch Center</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setLocationModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-[#A88D77] hover:text-[#FDF6EC] rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="location-form"
              className="px-5 py-2.5 text-xs font-bold font-serif uppercase tracking-wider text-[#140D09] bg-gradient-to-r from-[#D49A37] via-[#F5BC51] to-[#BF7E16] hover:brightness-110 rounded-xl shadow-[0_4px_20px_rgba(212,154,55,0.35)] border border-[#FFD885] transition-all cursor-pointer"
            >
              Save Address & Sync Store
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
