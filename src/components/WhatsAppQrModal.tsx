import React, { useState, useEffect } from "react";
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Smartphone,
  ShieldCheck,
  Send,
  LogOut,
  ExternalLink,
} from "lucide-react";

interface WhatsAppQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const WhatsAppQrModal: React.FC<WhatsAppQrModalProps> = ({
  isOpen,
  onClose,
  showToast,
}) => {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connectedPhone, setConnectedPhone] = useState("+91 91803 01917");
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [testNumber, setTestNumber] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Poll or fetch status
  const fetchGatewayState = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetch("/api?action=whatsapp_fetch_real_qr");
      const data = await res.json();

      if (data.type === "alreadyLogged" || data.stateInstance === "authorized") {
        setIsAuthorized(true);
        setQrImage(null);
        if (data.phone) {
          setConnectedPhone(data.phone.startsWith("+") ? data.phone : `+${data.phone}`);
        }
        if (data.deviceId) setDeviceId(data.deviceId);
      } else if (data.type === "qrCode" && data.message) {
        setIsAuthorized(false);
        const img = data.message.startsWith("data:")
          ? data.message
          : `data:image/png;base64,${data.message}`;
        setQrImage(img);
      } else {
        setIsAuthorized(false);
        setErrorMessage(data.message || "Could not retrieve WhatsApp QR code.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reach WhatsApp gateway.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchGatewayState();

    // Auto check status every 5 seconds if waiting for scan
    const interval = setInterval(() => {
      if (!isAuthorized) {
        fetch("/api?action=whatsapp_fetch_real_qr")
          .then((r) => r.json())
          .then((data) => {
            if (data.type === "alreadyLogged" || data.stateInstance === "authorized") {
              setIsAuthorized(true);
              setQrImage(null);
              showToast("WhatsApp successfully linked!");
            } else if (data.type === "qrCode" && data.message) {
              const img = data.message.startsWith("data:")
                ? data.message
                : `data:image/png;base64,${data.message}`;
              setQrImage(img);
            }
          })
          .catch(() => {});
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isOpen, isAuthorized]);

  // Handle logout and re-link
  const handleLogoutAndRelink = async () => {
    if (!window.confirm("Do you want to unlink the current WhatsApp session and scan a fresh QR code?")) return;
    try {
      setIsLoggingOut(true);
      await fetch("/api?action=whatsapp_logout_and_relink", { method: "POST" });
      setIsAuthorized(false);
      showToast("Unlinked. Generating new QR code...");
      await fetchGatewayState();
    } catch {
      showToast("Could not reset WhatsApp connection.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Test OTP
  const handleSendTestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = testNumber.replace(/\D/g, "").slice(-10);
    if (clean.length !== 10) {
      showToast("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setTestSending(true);
      const testCode = Math.floor(100000 + Math.random() * 900000).toString();
      const res = await fetch("/api?action=send_whatsapp_otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: clean, otp: testCode }),
      });
      const data = await res.json();
      if (data.status === "SUCCESS" && data.sent) {
        showToast(`Test OTP (${testCode}) sent to +91 ${clean} on WhatsApp!`);
        setTestNumber("");
      } else {
        showToast(data.message || "Failed to send WhatsApp message.");
      }
    } catch {
      showToast("Error dispatching test message.");
    } finally {
      setTestSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#1A1009] rounded-3xl shadow-2xl border border-[#E8DFC8] dark:border-[#3B2516] overflow-hidden text-[#1F120A] dark:text-[#FAF4EA]">
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base">WhatsApp Gateway Pairing</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Green-API Instance 710722779911
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-xs text-stone-500">Checking Green-API WhatsApp connection...</p>
            </div>
          ) : isAuthorized ? (
            /* Already Connected & Authorized */
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 space-y-3 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-emerald-900 dark:text-emerald-200">
                    WhatsApp is LINKED & ACTIVE!
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                    Your store WhatsApp gateway is connected and automatically sending OTPs.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-black/30 border border-emerald-300 dark:border-emerald-700 text-xs font-mono font-bold text-emerald-800 dark:text-emerald-200">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Sender Phone: {connectedPhone}</span>
                </div>
                {deviceId && (
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">
                    Device: {deviceId}
                  </p>
                )}
              </div>

              {/* Instant Test OTP Section */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-[#120A06] border border-stone-200 dark:border-[#3A2417] space-y-3">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold">Verify Live Delivery (Test OTP)</span>
                </div>
                <form onSubmit={handleSendTestOtp} className="flex gap-2">
                  <input
                    type="tel"
                    value={testNumber}
                    onChange={(e) => setTestNumber(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    maxLength={10}
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#1A1009] border border-stone-300 dark:border-stone-700 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={testSending}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    {testSending ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{testSending ? "Sending..." : "Send OTP"}</span>
                  </button>
                </form>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Try typing your mobile number above and tap <strong>Send OTP</strong>. You will receive a real WhatsApp message from {connectedPhone} in 2 seconds!
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={handleLogoutAndRelink}
                  disabled={isLoggingOut}
                  className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-950/20 text-red-600 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isLoggingOut ? "Unlinking..." : "Scan New QR / Re-link Phone"}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 text-white dark:text-stone-900 text-xs font-bold transition-colors cursor-pointer"
                >
                  Close & Continue
                </button>
              </div>
            </div>
          ) : (
            /* Not Authorized - Show Live QR Code */
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h4 className="font-bold text-sm">Scan with WhatsApp to Link Device</h4>
                <p className="text-xs text-stone-500">
                  Open WhatsApp on your phone (+91 91803 01917) and scan this QR code.
                </p>
              </div>

              {/* QR Image Box */}
              <div className="flex flex-col items-center justify-center p-6 bg-stone-50 dark:bg-[#120A06] rounded-2xl border border-stone-200 dark:border-[#3A2417]">
                {qrImage ? (
                  <div className="p-3 bg-white rounded-2xl shadow-lg border-2 border-emerald-500">
                    <img
                      src={qrImage}
                      alt="WhatsApp Web QR Code"
                      className="w-56 h-56 object-contain"
                    />
                  </div>
                ) : (
                  <div className="py-8 flex flex-col items-center space-y-2 text-stone-400">
                    <QrCode className="w-16 h-16 animate-pulse" />
                    <p className="text-xs">Generating QR code...</p>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 text-xs">
                  <button
                    onClick={fetchGatewayState}
                    className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 font-bold flex items-center gap-1.5 cursor-pointer text-stone-700 dark:text-stone-300"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh QR</span>
                  </button>
                  <span className="text-[11px] text-emerald-600 font-medium">
                    Auto-refreshes on scan
                  </span>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>How to scan:</span>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-stone-700 dark:text-stone-300">
                  <li>Open <strong>WhatsApp</strong> on your phone</li>
                  <li>Tap <strong>Settings</strong> (iOS) or <strong>⋮ Menu</strong> (Android)</li>
                  <li>Tap <strong>Linked Devices</strong> ➔ <strong>Link a Device</strong></li>
                  <li>Point your camera at the QR code above</li>
                </ol>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-xs text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
