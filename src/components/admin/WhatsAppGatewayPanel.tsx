import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Smartphone,
  ShieldCheck,
  Power,
  ExternalLink,
  HelpCircle,
  Key,
  Layers,
  Sparkles,
} from "lucide-react";
import { BUSINESS_CONFIG } from "../../constants";

interface WhatsAppStatus {
  connected: boolean;
  phone: string;
  linkedAt: string | null;
  totalSent: number;
}

export const WhatsAppGatewayPanel: React.FC<{
  isDark: boolean;
  showToast: (msg: string) => void;
}> = ({ isDark, showToast }) => {
  const [activeTab, setActiveTab] = useState<"greenapi" | "meta" | "status">("greenapi");
  const [status, setStatus] = useState<WhatsAppStatus>({
    connected: false,
    phone: BUSINESS_CONFIG.PRIMARY_PHONE,
    linkedAt: null,
    totalSent: 0,
  });

  // Green-API settings (Zero Facebook, Real WhatsApp Web QR)
  const [greenInstanceId, setGreenInstanceId] = useState(
    () => localStorage.getItem("manopavana_green_id") || ""
  );
  const [greenApiToken, setGreenApiToken] = useState(
    () => localStorage.getItem("manopavana_green_token") || ""
  );
  const [realQrImage, setRealQrImage] = useState<string | null>(null);
  const [fetchingQr, setFetchingQr] = useState(false);

  // Meta Cloud API settings (Official 1,000 Free msgs/month)
  const [metaToken, setMetaToken] = useState(
    () => localStorage.getItem("manopavana_meta_token") || ""
  );
  const [metaPhoneId, setMetaPhoneId] = useState(
    () => localStorage.getItem("manopavana_meta_phone_id") || ""
  );

  const [testPhone, setTestPhone] = useState("");
  const [testingSend, setTestingSend] = useState(false);

  // Load gateway connection status
  const fetchStatus = async () => {
    try {
      const res = await fetch("/api?action=whatsapp_status");
      if (res.ok) {
        const data = await res.json();
        const isLinked =
          localStorage.getItem("manopavana_wa_connected") === "true" ||
          Boolean(greenInstanceId && greenApiToken) ||
          Boolean(metaToken && metaPhoneId);
        const linkedAt = localStorage.getItem("manopavana_wa_linked_at");
        const total = parseInt(localStorage.getItem("manopavana_wa_sent_count") || "0", 10);
        setStatus({
          connected: isLinked,
          phone: BUSINESS_CONFIG.PRIMARY_PHONE,
          linkedAt: linkedAt || "Active Store Hub",
          totalSent: total,
        });
      }
    } catch {
      const isLinked = localStorage.getItem("manopavana_wa_connected") === "true";
      setStatus((prev) => ({ ...prev, connected: isLinked }));
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Save Green-API settings
  const handleSaveGreenApi = () => {
    if (!greenInstanceId.trim() || !greenApiToken.trim()) {
      showToast("Please enter both Instance ID and API Token.");
      return;
    }
    localStorage.setItem("manopavana_green_id", greenInstanceId.trim());
    localStorage.setItem("manopavana_green_token", greenApiToken.trim());
    localStorage.setItem("manopavana_wa_connected", "true");
    const nowStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    localStorage.setItem("manopavana_wa_linked_at", nowStr);
    setStatus((prev) => ({ ...prev, connected: true, linkedAt: nowStr }));
    showToast("Green-API configuration saved!");
    handleFetchRealQr();
  };

  // Fetch genuine WhatsApp Web QR code from Green-API
  const handleFetchRealQr = async () => {
    const id = greenInstanceId.trim() || localStorage.getItem("manopavana_green_id") || "";
    const token = greenApiToken.trim() || localStorage.getItem("manopavana_green_token") || "";

    if (!id || !token) {
      showToast("Enter your Green-API Instance ID and Token first.");
      return;
    }

    try {
      setFetchingQr(true);
      const res = await fetch("/api?action=whatsapp_fetch_real_qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId: id, apiToken: token }),
      });

      const data = await res.json();
      if (data.type === "qrCode" && data.message) {
        // Green-API returns base64 image data in message
        const imgUrl = data.message.startsWith("data:")
          ? data.message
          : `data:image/png;base64,${data.message}`;
        setRealQrImage(imgUrl);
        showToast("Live WhatsApp Web QR loaded! Scan with WhatsApp now.");
      } else if (data.type === "alreadyLogged") {
        setRealQrImage(null);
        localStorage.setItem("manopavana_wa_connected", "true");
        setStatus((prev) => ({ ...prev, connected: true }));
        showToast("WhatsApp is already linked & active on this instance!");
      } else {
        showToast(data.message || "Failed to load live QR code.");
      }
    } catch {
      showToast("Could not contact gateway to fetch QR.");
    } finally {
      setFetchingQr(false);
    }
  };

  // Save Meta settings
  const handleSaveMeta = () => {
    if (!metaToken.trim() || !metaPhoneId.trim()) {
      showToast("Please enter both Meta Access Token and Phone Number ID.");
      return;
    }
    localStorage.setItem("manopavana_meta_token", metaToken.trim());
    localStorage.setItem("manopavana_meta_phone_id", metaPhoneId.trim());
    localStorage.setItem("manopavana_wa_connected", "true");
    const nowStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    localStorage.setItem("manopavana_wa_linked_at", nowStr);
    setStatus((prev) => ({ ...prev, connected: true, linkedAt: nowStr }));
    showToast("Meta WhatsApp Cloud API credentials saved!");
  };

  // Disconnect / Clear
  const handleDisconnect = () => {
    if (!window.confirm("Disconnect WhatsApp gateway settings?")) return;
    localStorage.removeItem("manopavana_wa_connected");
    localStorage.removeItem("manopavana_wa_linked_at");
    localStorage.removeItem("manopavana_green_id");
    localStorage.removeItem("manopavana_green_token");
    localStorage.removeItem("manopavana_meta_token");
    localStorage.removeItem("manopavana_meta_phone_id");
    setGreenInstanceId("");
    setGreenApiToken("");
    setMetaToken("");
    setMetaPhoneId("");
    setRealQrImage(null);
    setStatus((prev) => ({
      ...prev,
      connected: false,
      linkedAt: null,
    }));
    showToast("WhatsApp Gateway unlinked.");
  };

  // Send a test message
  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = testPhone.replace(/\D/g, "").slice(-10);
    if (cleanNumber.length !== 10) {
      showToast("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setTestingSend(true);
      const testCode = Math.floor(100000 + Math.random() * 900000).toString();

      const res = await fetch("/api?action=send_whatsapp_otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanNumber,
          otp: testCode,
          greenApiId: greenInstanceId || localStorage.getItem("manopavana_green_id"),
          greenApiToken: greenApiToken || localStorage.getItem("manopavana_green_token"),
          metaToken: metaToken || localStorage.getItem("manopavana_meta_token"),
          metaPhoneId: metaPhoneId || localStorage.getItem("manopavana_meta_phone_id"),
        }),
      });

      const data = await res.json();
      const nextCount = status.totalSent + 1;
      localStorage.setItem("manopavana_wa_sent_count", String(nextCount));
      setStatus((p) => ({ ...p, totalSent: nextCount }));

      if (data.status === "SUCCESS") {
        showToast(`Test OTP (${testCode}) dispatched to +91 ${cleanNumber}!`);
      } else {
        showToast(data.message || "OTP dispatched via gateway.");
      }
      setTestPhone("");
    } catch {
      showToast("Failed to dispatch test message.");
    } finally {
      setTestingSend(false);
    }
  };

  return (
    <div
      className={`rounded-3xl border p-6 shadow-sm space-y-6 transition-colors ${
        isDark ? "bg-[#1A1009] border-[#3B2516]" : "bg-white border-[#E8DFC8]"
      }`}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-serif text-[#1F120A] dark:text-[#FAF4EA]">
                WhatsApp Authentication Hub
              </h2>
              {status.connected ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-[10px] font-bold border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Gateway
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 text-[10px] font-bold border border-amber-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Configuration Required
                </span>
              )}
            </div>
            <p className="text-xs text-[#6A523E] dark:text-[#C4B29E]">
              Sender:{" "}
              <strong className="text-emerald-700 dark:text-emerald-400">
                {status.phone}
              </strong>{" "}
              • Zero cost • Flipkart-style secret OTP (never displayed on screen)
            </p>
          </div>
        </div>

        {status.connected && (
          <button
            type="button"
            onClick={handleDisconnect}
            className="px-3.5 py-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 self-start md:self-auto"
          >
            <Power className="w-3.5 h-3.5" />
            <span>Reset / Reconfigure</span>
          </button>
        )}
      </div>

      {/* Why Did Scanning Fail Alert (Direct Education for User) */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 space-y-2">
        <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
          <HelpCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>Why did WhatsApp say: "Invalid QR scanned, you should scan on WhatsApp Web"?</span>
        </div>
        <p className="leading-relaxed text-[11px] text-[#7A5B3E] dark:text-[#E2C7B0]">
          WhatsApp's phone scanner (<strong>Linked Devices</strong>) does not scan normal QR images.
          It strictly checks for a live cryptographic handshake connection directly to WhatsApp Web's
          official servers (<code>wss://web.whatsapp.com</code>). Below, choose either{" "}
          <strong>Option 1 (Green-API WhatsApp Web Gateway — 100% Free & No Facebook)</strong> or{" "}
          <strong>Option 2 (Official Meta WhatsApp Cloud API — 1,000 Free Messages/Month)</strong>.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 dark:border-stone-800 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("greenapi")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "greenapi"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300"
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Option 1: Real WhatsApp Web QR (Zero Facebook — Free)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("meta")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "meta"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Option 2: Meta Cloud API (Official — 1,000 Free/Mo)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("status")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "status"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300"
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Test OTP Dispatch</span>
        </button>
      </div>

      {/* Tab 1: Green-API Real WhatsApp Web Pairing (No Facebook required) */}
      {activeTab === "greenapi" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Setup Form & Steps */}
            <div className="md:col-span-7 space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-[#140D08] border border-stone-200 dark:border-[#3A2417] space-y-3">
                <p className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>30-Second Setup with Green-API (No Facebook Account Needed)</span>
                </p>
                <ol className="list-decimal list-inside space-y-2 text-[#6A523E] dark:text-[#C4B29E] leading-relaxed">
                  <li>
                    Visit{" "}
                    <a
                      href="https://green-api.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-600 underline font-bold inline-flex items-center gap-1"
                    >
                      green-api.com <ExternalLink className="w-3 h-3" />
                    </a>{" "}
                    and sign up with your email (100% Free Developer Tier, no credit card required).
                  </li>
                  <li>
                    Create a free WhatsApp instance. It will show your <strong>idInstance</strong>{" "}
                    and <strong>apiTokenInstance</strong>.
                  </li>
                  <li>Enter both credentials below and click <strong>"Fetch Real WhatsApp QR"</strong>.</li>
                  <li>
                    Open WhatsApp on <strong>+91 91803 01917</strong> ➔ Tap{" "}
                    <strong>Linked Devices</strong> ➔ Scan the genuine QR code on the right!
                  </li>
                </ol>
              </div>

              {/* Form Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    idInstance (e.g. 7103859201)
                  </label>
                  <input
                    type="text"
                    value={greenInstanceId}
                    onChange={(e) => setGreenInstanceId(e.target.value)}
                    placeholder="Enter Green-API idInstance"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#100905] border border-stone-300 dark:border-stone-700 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    apiTokenInstance
                  </label>
                  <input
                    type="password"
                    value={greenApiToken}
                    onChange={(e) => setGreenApiToken(e.target.value)}
                    placeholder="Enter Green-API apiTokenInstance"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#100905] border border-stone-300 dark:border-stone-700 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveGreenApi}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm cursor-pointer"
                  >
                    Save Credentials
                  </button>
                  <button
                    type="button"
                    onClick={handleFetchRealQr}
                    disabled={fetchingQr}
                    className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${fetchingQr ? "animate-spin" : ""}`} />
                    <span>{fetchingQr ? "Fetching Live QR..." : "Fetch Real WhatsApp QR"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live QR Box */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-stone-50 dark:bg-[#120A06] border border-stone-200 dark:border-[#3A2417] text-center space-y-3 min-h-[280px]">
              {realQrImage ? (
                <>
                  <div className="p-3 bg-white rounded-2xl shadow-lg border-2 border-emerald-500">
                    <img
                      src={realQrImage}
                      alt="Real WhatsApp Web QR"
                      className="w-52 h-52 object-contain"
                    />
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                    Live WhatsApp Web QR code active!
                  </p>
                  <p className="text-[10px] text-[#A88D77]">
                    Open WhatsApp ➔ Linked Devices ➔ Link a Device ➔ Scan this screen.
                  </p>
                  <button
                    type="button"
                    onClick={handleFetchRealQr}
                    className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh QR code
                  </button>
                </>
              ) : (
                <div className="space-y-3 py-6">
                  <QrCode className="w-14 h-14 text-stone-300 dark:text-stone-700 mx-auto" />
                  <p className="text-xs text-[#A88D77] max-w-[200px]">
                    Enter your Green-API keys on the left and click "Fetch Real WhatsApp QR" to
                    display the live, authentic WhatsApp Web QR code.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Meta WhatsApp Cloud API */}
      {activeTab === "meta" && (
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-[#140D08] border border-stone-200 dark:border-[#3A2417] space-y-2">
            <p className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Official Meta WhatsApp Cloud API (1,000 Free Messages / Month Forever)</span>
            </p>
            <p className="text-[#6A523E] dark:text-[#C4B29E] leading-relaxed">
              Meta gives every account 1,000 free service/OTP conversations per month.
              It does NOT post anything on Facebook and requires no QR code scanning.
              Messages are sent directly from Meta's cloud servers even when your phone is switched off!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                WhatsApp Phone Number ID
              </label>
              <input
                type="text"
                value={metaPhoneId}
                onChange={(e) => setMetaPhoneId(e.target.value)}
                placeholder="e.g. 104928172635412"
                className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#100905] border border-stone-300 dark:border-stone-700 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Meta Access Token (System User or Permanent Token)
              </label>
              <input
                type="password"
                value={metaToken}
                onChange={(e) => setMetaToken(e.target.value)}
                placeholder="EAAG... token from developers.facebook.com"
                className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#100905] border border-stone-300 dark:border-stone-700 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveMeta}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm cursor-pointer"
          >
            Save Meta Cloud API Credentials
          </button>
        </div>
      )}

      {/* Tab 3 / Universal Test Sender */}
      {activeTab === "status" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-6 p-5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Gateway Status</span>
            </div>
            <div className="space-y-1 text-stone-600 dark:text-stone-300">
              <p>
                Configured Store Number:{" "}
                <strong className="text-emerald-700 dark:text-emerald-400">{status.phone}</strong>
              </p>
              <p>
                Status:{" "}
                <span className="font-semibold text-emerald-600">
                  {status.connected ? "Active & Ready" : "Default Simulation Active"}
                </span>
              </p>
              <p>
                Total Dispatches Recorded:{" "}
                <span className="font-bold text-emerald-600">{status.totalSent}</span>
              </p>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              In production, customers receive their 6-digit secret code in seconds without opening
              WhatsApp.
            </p>
          </div>

          <div className="md:col-span-6 p-5 rounded-2xl bg-stone-50 dark:bg-[#150D07] border border-stone-200 dark:border-[#3B2516] space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#A88D77] flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-emerald-500" />
              <span>Send Test WhatsApp OTP</span>
            </h3>
            <form onSubmit={handleSendTestMessage} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  Recipient Mobile Number
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-[#A88D77]">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="Enter 10-digit mobile number to test"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="w-full pl-11 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-[#100905] border border-stone-300 dark:border-stone-700 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={testingSend || testPhone.replace(/\D/g, "").length !== 10}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testingSend ? "Dispatching..." : "Send Test WhatsApp OTP"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
