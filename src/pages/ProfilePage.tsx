import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  Edit2,
  Trash2,
  Plus,
  HelpCircle,
  LogOut,
  CheckCircle2,
  ChevronRight,
  Package,
  Calendar,
  Lock,
} from "lucide-react";
import { useStore, LabeledAddress } from "../context/StoreContext";
import { INDIAN_STATES_DISTRICTS } from "../constants";
import { extractCleanPhone, isSyntheticAccount } from "../firebase";

export const ProfilePage = () => {
  const navigate = useNavigate();
  const {
    currentUser,
    customerProfile,
    saveProfile,
    address,
    savedAddresses,
    saveNewAddress,
    updateSavedAddress,
    deleteSavedAddress,
    logoutUser,
    themeMode,
    showToast,
    setLoginModalOpen,
  } = useStore();

  const isDark = themeMode === "dark";
  const [activeTab, setActiveTab] = useState<"profile" | "addresses" | "faqs">("profile");

  // Phone number
  const userPhone =
    customerProfile?.phone ||
    (currentUser?.phoneNumber ? extractCleanPhone(currentUser.phoneNumber) : "") ||
    (address.phone ? extractCleanPhone(address.phone) : "");

  // Personal info fields
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  // Populate personal fields
  useEffect(() => {
    const rawName =
      (customerProfile?.name &&
        !customerProfile.name.toLowerCase().startsWith("user_") &&
        customerProfile.name !== "Customer" &&
        customerProfile.name !== "Valued Customer" &&
        customerProfile.name !== "Google Customer"
        ? customerProfile.name
        : "") ||
      (currentUser?.displayName &&
        !currentUser.displayName.toLowerCase().startsWith("user_") &&
        currentUser.displayName !== "Customer" &&
        currentUser.displayName !== "Google Customer"
        ? currentUser.displayName
        : "") ||
      (address.fullName && !address.fullName.toLowerCase().startsWith("user_")
        ? address.fullName
        : "");

    if (rawName) {
      const parts = rawName.trim().split(" ");
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
    }

    if (customerProfile?.gender) {
      setGender(customerProfile.gender as any);
    }

    const currentEmail =
      customerProfile?.email && !isSyntheticAccount(customerProfile.email)
        ? customerProfile.email
        : currentUser?.email && !isSyntheticAccount(currentUser.email)
        ? currentUser.email
        : "";
    setEmailInput(currentEmail);
  }, [customerProfile, currentUser, address]);

  // Manage Addresses Form State
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addrFullName, setAddrFullName] = useState("");
  const [addrPhone, setAddrPhone] = useState("");
  const [addrLine1, setAddrLine1] = useState("");
  const [addrLandmark, setAddrLandmark] = useState("");
  const [addrState, setAddrState] = useState("Karnataka");
  const [addrDistrict, setAddrDistrict] = useState("Bengaluru Urban");
  const [addrPincode, setAddrPincode] = useState("560058");
  const [addrLabel, setAddrLabel] = useState<"Home" | "Work" | "Other">("Home");

  const resetAddressForm = () => {
    setIsAddingNewAddress(false);
    setEditingAddressId(null);
    setAddrFullName("");
    setAddrPhone("");
    setAddrLine1("");
    setAddrLandmark("");
    setAddrState("Karnataka");
    setAddrDistrict("Bengaluru Urban");
    setAddrPincode("560058");
    setAddrLabel("Home");
  };

  const handleSavePersonal = async () => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!fullName) {
      showToast("Please enter your name.");
      return;
    }
    await saveProfile({
      name: fullName,
      gender,
    });
    setIsEditingPersonal(false);
    showToast("Personal information updated successfully!");
  };

  const handleSaveEmail = async () => {
    const clean = emailInput.trim().toLowerCase();
    if (clean && !clean.includes("@")) {
      showToast("Please enter a valid email address.");
      return;
    }
    await saveProfile({
      email: clean,
    });
    setIsEditingEmail(false);
    showToast("Email address updated!");
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrFullName.trim()) {
      showToast("Please enter recipient name.");
      return;
    }
    const cleanPhone = addrPhone.trim().replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      showToast("Please enter a valid 10-digit WhatsApp number.");
      return;
    }
    if (!addrLine1.trim()) {
      showToast("Please enter street address.");
      return;
    }
    const cleanPin = addrPincode.trim().replace(/\D/g, "").slice(0, 6);
    if (cleanPin.length !== 6) {
      showToast("Please enter a valid 6-digit postal pincode.");
      return;
    }

    const payload: LabeledAddress = {
      id: editingAddressId || `addr-${Date.now()}`,
      label: addrLabel,
      fullName: addrFullName.trim(),
      phone: cleanPhone,
      addressLine1: addrLine1.trim(),
      landmark: addrLandmark.trim(),
      state: addrState,
      district: addrDistrict,
      city: addrDistrict.toLowerCase().includes("bengaluru") ? "Bengaluru" : addrDistrict,
      pincode: cleanPin,
      isBangalore: cleanPin.startsWith("560") || addrDistrict.toLowerCase().includes("bengaluru"),
    };

    if (editingAddressId) {
      updateSavedAddress(editingAddressId, payload);
      showToast("Address updated successfully!");
    } else {
      saveNewAddress(payload);
    }
    resetAddressForm();
  };

  if (!currentUser) {
    return (
      <div
        className={`w-full min-h-[70vh] flex items-center justify-center p-6 ${
          isDark ? "bg-[#140D09] text-[#FAF4EA]" : "bg-[#FAF7F2] text-[#24140A]"
        }`}
      >
        <div
          className={`max-w-md w-full p-8 rounded-3xl border text-center space-y-5 shadow-xl ${
            isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-[#E8DEC8]"
          }`}
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#E08F35]">
            <User className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold font-serif">Sign in to view your Profile</h2>
            <p className="text-xs text-stone-500">
              Manage your personal information, delivery addresses, and WhatsApp-anchored account.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLoginModalOpen(true)}
            className="w-full py-3 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            Sign In with Mobile
          </button>
        </div>
      </div>
    );
  }

  const effectiveDisplayName =
    `${firstName} ${lastName}`.trim() ||
    customerProfile?.name ||
    currentUser.displayName ||
    "Customer";

  return (
    <div
      className={`w-full min-h-[calc(100vh-80px)] py-6 sm:py-10 transition-colors ${
        isDark ? "bg-[#140D09] text-[#FAF4EA]" : "bg-[#F1F3F6] text-[#212121]"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* FLIPKART LEFT SIDEBAR */}
          <div className="md:col-span-4 space-y-4">
            {/* User Greeting Card */}
            <div
              className={`p-4 rounded-2xl border shadow-xs flex items-center gap-3.5 ${
                isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-stone-200"
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-[#E08F35]/20 border border-[#E08F35]/40 flex items-center justify-center text-[#E08F35] font-black text-base shrink-0">
                {effectiveDisplayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] text-stone-400 block">Hello,</span>
                <h2 className="text-sm font-bold truncate text-stone-900 dark:text-stone-100">
                  {effectiveDisplayName}
                </h2>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    +91 {userPhone || "Verified"}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <div
              className={`rounded-2xl border shadow-xs overflow-hidden divide-y ${
                isDark
                  ? "bg-[#1C120B] border-[#362114] divide-[#2D1B10]"
                  : "bg-white border-stone-200 divide-stone-100"
              }`}
            >
              <div className="p-2 space-y-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("profile")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "profile"
                      ? "bg-[#2874F0] text-white shadow-xs"
                      : "text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4" />
                    <span>Personal Information</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-70" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("addresses")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "addresses"
                      ? "bg-[#2874F0] text-white shadow-xs"
                      : "text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4" />
                    <span>Manage Addresses ({savedAddresses?.length || 0})</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-70" />
                </button>

                <Link
                  to="/orders"
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <Package className="w-4 h-4 text-[#E08F35]" />
                    <span>My Orders</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-70" />
                </Link>

                <Link
                  to="/subscriptions"
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    <span>Monthly Oil Subscriptions</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-70" />
                </Link>

                <button
                  type="button"
                  onClick={() => setActiveTab("faqs")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "faqs"
                      ? "bg-[#2874F0] text-white shadow-xs"
                      : "text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <HelpCircle className="w-4 h-4" />
                    <span>FAQs & Security</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-70" />
                </button>
              </div>

              {/* Logout Option */}
              <div className="p-2">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to sign out?")) {
                      logoutUser();
                      navigate("/");
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* FLIPKART RIGHT CONTENT AREA */}
          <div className="md:col-span-8 space-y-6">
            {/* TAB 1: PERSONAL INFORMATION */}
            {activeTab === "profile" && (
              <div
                className={`p-6 sm:p-8 rounded-2xl border shadow-xs space-y-8 ${
                  isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-stone-200"
                }`}
              >
                {/* Personal Information (Name & Gender) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold font-serif text-stone-900 dark:text-stone-100">
                      Personal Information
                    </h3>
                    {!isEditingPersonal ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingPersonal(true)}
                        className="text-xs font-bold text-[#2874F0] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingPersonal(false)}
                        className="text-xs font-bold text-stone-400 hover:underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        disabled={!isEditingPersonal}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#2874F0]/30 ${
                          !isEditingPersonal
                            ? "bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300"
                            : "bg-white dark:bg-stone-900 border-[#2874F0] text-stone-900 dark:text-stone-100"
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        disabled={!isEditingPersonal}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#2874F0]/30 ${
                          !isEditingPersonal
                            ? "bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300"
                            : "bg-white dark:bg-stone-900 border-[#2874F0] text-stone-900 dark:text-stone-100"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Gender Selector (Flipkart exact) */}
                  <div className="pt-2">
                    <label className="block text-[11px] font-semibold text-stone-500 mb-2">
                      Your Gender
                    </label>
                    <div className="flex items-center gap-6 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          disabled={!isEditingPersonal}
                          checked={gender === "male"}
                          onChange={() => setGender("male")}
                          className="accent-[#2874F0]"
                        />
                        <span className="font-semibold text-stone-700 dark:text-stone-300">
                          Male
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          disabled={!isEditingPersonal}
                          checked={gender === "female"}
                          onChange={() => setGender("female")}
                          className="accent-[#2874F0]"
                        />
                        <span className="font-semibold text-stone-700 dark:text-stone-300">
                          Female
                        </span>
                      </label>
                    </div>
                  </div>

                  {isEditingPersonal && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleSavePersonal}
                        className="px-6 py-2.5 rounded-xl bg-[#2874F0] hover:bg-[#1a5bc7] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                      >
                        SAVE
                      </button>
                    </div>
                  )}
                </div>

                {/* Email Address Section */}
                <div className="space-y-4 pt-6 border-t border-stone-200 dark:border-stone-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        Email Address
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        Used for tax invoices and delivery dispatch notifications
                      </p>
                    </div>
                    {!isEditingEmail ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingEmail(true)}
                        className="text-xs font-bold text-[#2874F0] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingEmail(false)}
                        className="text-xs font-bold text-stone-400 hover:underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  <div className="max-w-md">
                    <input
                      type="email"
                      disabled={!isEditingEmail}
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="e.g. customer@example.com"
                      className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#2874F0]/30 ${
                        !isEditingEmail
                          ? "bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300"
                          : "bg-white dark:bg-stone-900 border-[#2874F0] text-stone-900 dark:text-stone-100"
                      }`}
                    />
                  </div>

                  {isEditingEmail && (
                    <button
                      type="button"
                      onClick={handleSaveEmail}
                      className="px-6 py-2.5 rounded-xl bg-[#2874F0] hover:bg-[#1a5bc7] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                    >
                      SAVE EMAIL
                    </button>
                  )}
                </div>

                {/* Mobile Number Section (Identity Anchor) */}
                <div className="space-y-4 pt-6 border-t border-stone-200 dark:border-stone-800">
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <span>Mobile Number</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified Root Anchor
                      </span>
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      Primary mobile number verified via WhatsApp OTP. All orders are anchored to this number.
                    </p>
                  </div>

                  <div className="max-w-md flex items-center gap-3">
                    <input
                      type="text"
                      disabled
                      value={`+91 ${userPhone}`}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 font-mono font-bold text-stone-700 dark:text-stone-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MANAGE ADDRESSES */}
            {activeTab === "addresses" && (
              <div
                className={`p-6 sm:p-8 rounded-2xl border shadow-xs space-y-6 ${
                  isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-stone-200"
                }`}
              >
                <div className="flex items-center justify-between border-b pb-4 border-stone-200 dark:border-stone-800">
                  <h3 className="text-base font-bold font-serif text-stone-900 dark:text-stone-100">
                    Manage Addresses
                  </h3>
                  {!isAddingNewAddress && (
                    <button
                      type="button"
                      onClick={() => {
                        resetAddressForm();
                        setIsAddingNewAddress(true);
                      }}
                      className="px-4 py-2 rounded-xl border border-[#2874F0] text-[#2874F0] hover:bg-[#2874F0]/10 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>ADD A NEW ADDRESS</span>
                    </button>
                  )}
                </div>

                {/* Add / Edit Address Form */}
                {isAddingNewAddress && (
                  <form
                    onSubmit={handleAddressSubmit}
                    className="p-5 rounded-2xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#2874F0] uppercase tracking-wider">
                        {editingAddressId ? "Edit Address In-Place" : "Add New Delivery Address"}
                      </span>
                      <button
                        type="button"
                        onClick={resetAddressForm}
                        className="text-xs text-stone-500 hover:text-stone-800 underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                          Recipient Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={addrFullName}
                          onChange={(e) => setAddrFullName(e.target.value)}
                          placeholder="e.g. Manoj Kumar"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                          10-digit WhatsApp Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={addrPhone}
                          onChange={(e) => setAddrPhone(e.target.value)}
                          placeholder="e.g. 9180301917"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                        Flat / House / Street Address (Manual Exact Address) *
                      </label>
                      <input
                        type="text"
                        required
                        value={addrLine1}
                        onChange={(e) => setAddrLine1(e.target.value)}
                        placeholder="e.g. 118, Raghavendra Layout, Peenya 2nd Stage"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                          Landmark (Optional)
                        </label>
                        <input
                          type="text"
                          value={addrLandmark}
                          onChange={(e) => setAddrLandmark(e.target.value)}
                          placeholder="e.g. Near Water Tank"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                          State *
                        </label>
                        <select
                          value={addrState}
                          onChange={(e) => {
                            const newState = e.target.value;
                            setAddrState(newState);
                            const dists = INDIAN_STATES_DISTRICTS[newState] || [];
                            if (dists.length > 0) setAddrDistrict(dists[0]);
                          }}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                        >
                          {Object.keys(INDIAN_STATES_DISTRICTS).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                          6-Digit Pincode *
                        </label>
                        <input
                          type="text"
                          required
                          value={addrPincode}
                          onChange={(e) => setAddrPincode(e.target.value)}
                          placeholder="e.g. 560058"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                        />
                      </div>
                    </div>

                    {/* Address Type (Home vs Work) */}
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-500 mb-1.5">
                        Address Type
                      </label>
                      <div className="flex gap-3">
                        {(["Home", "Work", "Other"] as const).map((lbl) => (
                          <button
                            key={lbl}
                            type="button"
                            onClick={() => setAddrLabel(lbl)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              addrLabel === lbl
                                ? "bg-[#2874F0] text-white shadow-xs"
                                : "bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300"
                            }`}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-xl bg-[#2874F0] hover:bg-[#1a5bc7] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                      >
                        SAVE ADDRESS
                      </button>
                      <button
                        type="button"
                        onClick={resetAddressForm}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-700 cursor-pointer"
                      >
                        CANCEL
                      </button>
                    </div>
                  </form>
                )}

                {/* Address Cards List */}
                <div className="space-y-4">
                  {(!savedAddresses || savedAddresses.length === 0) && !isAddingNewAddress ? (
                    <div className="p-8 text-center text-stone-500 text-xs">
                      No saved addresses yet. Tap "+ ADD A NEW ADDRESS" above to create one.
                    </div>
                  ) : (
                    savedAddresses?.map((card) => (
                      <div
                        key={card.id}
                        className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-2 relative"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                              {card.label || "Home"}
                            </span>
                            <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                              {card.fullName}
                            </span>
                            <span className="font-mono text-xs text-stone-500 font-semibold">
                              {card.phone}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAddressId(card.id);
                                setIsAddingNewAddress(true);
                                setAddrFullName(card.fullName);
                                setAddrPhone(card.phone);
                                setAddrLine1(card.addressLine1);
                                setAddrLandmark(card.landmark || "");
                                setAddrState(card.state || "Karnataka");
                                setAddrDistrict(card.district || "Bengaluru Urban");
                                setAddrPincode(card.pincode || "560058");
                                setAddrLabel(card.label || "Home");
                              }}
                              className="text-xs font-bold text-[#2874F0] hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete "${card.label}" address?`)) {
                                  deleteSavedAddress(card.id);
                                }
                              }}
                              className="text-xs font-bold text-red-500 hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                          {card.addressLine1}
                          {card.landmark ? `, Near ${card.landmark}` : ""}
                        </p>
                        <p className="text-xs text-stone-600 dark:text-stone-400 font-semibold">
                          {card.district || card.city}, {card.state} -{" "}
                          <span className="font-mono">{card.pincode}</span>
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: FAQS & SECURITY */}
            {activeTab === "faqs" && (
              <div
                className={`p-6 sm:p-8 rounded-2xl border shadow-xs space-y-6 ${
                  isDark ? "bg-[#1C120B] border-[#362114]" : "bg-white border-stone-200"
                }`}
              >
                <h3 className="text-base font-bold font-serif text-stone-900 dark:text-stone-100 border-b pb-3 border-stone-200 dark:border-stone-800">
                  Account FAQs & Security
                </h3>

                <div className="space-y-4 text-xs leading-relaxed text-stone-700 dark:text-stone-300">
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                      What happens when I update my email address?
                    </h4>
                    <p className="text-stone-500">
                      Your login credentials and tax invoices will automatically update. However, your
                      account remains securely anchored to your verified WhatsApp mobile number.
                    </p>
                  </div>

                  <div className="space-y-1 pt-3 border-t border-stone-100 dark:border-stone-800">
                    <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                      When will my orders sync between devices?
                    </h4>
                    <p className="text-stone-500">
                      Instantly! Because MANOPAVANA uses mobile-anchored cloud syncing, all orders placed
                      on mobile, tablet, or desktop are unified in your Orders tab.
                    </p>
                  </div>

                  <div className="space-y-1 pt-3 border-t border-stone-100 dark:border-stone-800">
                    <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                      How does the 10% Reorder discount work?
                    </h4>
                    <p className="text-stone-500">
                      Once activated via your empty bottle QR code or repeat purchase, you enjoy 10%
                      off on all orders above ₹1,000 for 7 full days.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
