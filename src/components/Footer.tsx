import React from "react";
import {
  ShieldCheck,
  Building,
  Phone,
  Mail,
  MessageCircle,
  FileText,
  X,
  ExternalLink,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { BUSINESS_CONFIG, LEGAL_POLICIES, MEDIA_ASSETS } from "../constants";

export const Footer: React.FC = () => {
  const { activePolicyModal, setActivePolicyModal, cmsConfig } = useStore();

  const activePolicyData = activePolicyModal
  ? (cmsConfig?.policies?.[activePolicyModal] || LEGAL_POLICIES[activePolicyModal])
  : null;

  return (
    <>
      <footer className="w-full max-w-full bg-gradient-to-b from-[#1C110B] via-[#140D09] to-[#0D0704] text-[#D6BEAA] pt-16 pb-12 border-t border-[#3A2417] shadow-2xl box-border">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 box-border">
          {/* Top Brand Statement Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-[#2D1B10]">
            {/* Column 1: Brand & Origin */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-none p-1 flex items-center justify-center shrink-0 border-2 border-[#E5DACB] bg-white shadow-xs">
                  <img
                    src={cmsConfig?.brandLogoUrl || MEDIA_ASSETS.logo}
                    alt={cmsConfig?.brandName || BUSINESS_CONFIG.BRAND_NAME}
                    className="w-full h-full object-contain block"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold font-serif text-[#FDF6EC] tracking-wider">
                    {cmsConfig?.brandName || BUSINESS_CONFIG.BRAND_NAME}
                  </span>
                  <span className="text-[11px] text-[#F5BC51] font-semibold">
                    {cmsConfig?.brandTagline || "Pure by nature, trusted for life"}
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#A88D77] leading-relaxed">
                {cmsConfig?.facilityStatement || BUSINESS_CONFIG.FACILITY_STATEMENT}
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#24160F] border border-[#4A301E] text-xs text-[#F5BC51]">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#E08F35]" />
                <span className="font-semibold">{cmsConfig?.fssaiLicense || BUSINESS_CONFIG.FSSAI_LICENSE}</span>
              </div>
            </div>

            {/* Column 2: Facility & Packaging Center */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold font-serif text-[#F5BC51] uppercase tracking-wider flex items-center gap-2">
                <Building className="w-4 h-4 text-[#E08F35]" />
                Packaging Facility
              </h4>
              <p className="text-xs text-[#A88D77] leading-relaxed">
                {cmsConfig?.facilityAddress || BUSINESS_CONFIG.FACILITY_ADDRESS}
              </p>
              <p className="text-[11px] text-[#8C7A6B]">
                GSTIN: <span className="font-mono text-[#D6BEAA]">{cmsConfig?.gstin || BUSINESS_CONFIG.GSTIN}</span>
              </p>
              <p className="text-[11px] text-[#8C7A6B]">
                Founder & Grievance Officer:{" "}
                <span className="text-[#D6BEAA] font-semibold">{cmsConfig?.founderName || BUSINESS_CONFIG.FOUNDER_NAME}</span>
              </p>
            </div>

            {/* Column 3: Contact & Direct Assistance */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold font-serif text-[#F5BC51] uppercase tracking-wider">
                Direct Helpdesk
              </h4>
              <div className="space-y-2 text-xs text-[#A88D77]">
                <a
                  href={`https://wa.me/${(cmsConfig?.primaryPhone || BUSINESS_CONFIG.PRIMARY_PHONE).replace(/\D/g, "")}?text=Hi%20MANOPAVANA,%20I%20have%20an%20inquiry%20about%20your%20wood-pressed%20oils`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>WhatsApp Business: {cmsConfig?.primaryPhone || BUSINESS_CONFIG.PRIMARY_PHONE}</span>
                </a>
                <a
                  href={`tel:${(cmsConfig?.primaryPhone || BUSINESS_CONFIG.PRIMARY_PHONE).replace(/\D/g, "")}`}
                  className="flex items-center gap-2 hover:text-[#FDF6EC] transition-colors"
                >
                  <Phone className="w-4 h-4 shrink-0 text-[#E08F35]" />
                  <span>{cmsConfig?.primaryPhone || BUSINESS_CONFIG.PRIMARY_PHONE}</span>
                </a>
                {cmsConfig?.altPhone && (
                  <a
                    href={`tel:${cmsConfig.altPhone.replace(/\D/g, "")}`}
                    className="flex items-center gap-2 hover:text-[#FDF6EC] transition-colors"
                  >
                    <Phone className="w-4 h-4 shrink-0 text-[#E08F35]" />
                    <span>Alt: {cmsConfig.altPhone}</span>
                  </a>
                )}
                <a
                  href={`mailto:${cmsConfig?.email || BUSINESS_CONFIG.EMAIL}`}
                  className="flex items-center gap-2 hover:text-[#FDF6EC] transition-colors"
                >
                  <Mail className="w-4 h-4 shrink-0 text-[#E08F35]" />
                  <span>{cmsConfig?.email || BUSINESS_CONFIG.EMAIL}</span>
                </a>
              </div>
            </div>

            {/* Column 4: Transparent Customer Policies */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold font-serif text-[#F5BC51] uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#E08F35]" />
                Customer Assurance
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    onClick={() => setActivePolicyModal("terms")}
                    className="text-[#A88D77] hover:text-[#F5BC51] transition-colors text-left flex items-center gap-1 cursor-pointer"
                  >
                    <span>Terms & Conditions</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActivePolicyModal("shipping")}
                    className="text-[#A88D77] hover:text-[#F5BC51] transition-colors text-left flex items-center gap-1 cursor-pointer"
                  >
                    <span>Shipping & Delivery Policy</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActivePolicyModal("returns")}
                    className="text-[#A88D77] hover:text-[#F5BC51] transition-colors text-left flex items-center gap-1 cursor-pointer"
                  >
                    <span>Return & Refund Policy</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActivePolicyModal("privacy")}
                    className="text-[#A88D77] hover:text-[#F5BC51] transition-colors text-left flex items-center gap-1 cursor-pointer"
                  >
                    <span>Privacy Policy</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Disclaimer & Copyright */}
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#8C7A6B]">
            <p>
              © {new Date().getFullYear()} {BUSINESS_CONFIG.BRAND_NAME} - Artisanal Wood-Pressed Oils (Bengaluru). All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-[#A88D77]">
              <span>GSTIN: {BUSINESS_CONFIG.GSTIN}</span>
              <span>•</span>
              <span>FSSAI: {BUSINESS_CONFIG.FSSAI_LICENSE}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Verbatim Policy Modal */}
      {activePolicyData && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="policy-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
        >
          <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#24160F] to-[#140D09] text-[#FDF6EC] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] border border-[#4A301E] overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-[#120A06] border-b border-[#3A2417]">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-[#E08F35]" />
                <h3 id="policy-modal-title" className="text-base font-bold font-serif text-[#FFD885]">
                  {activePolicyData.title}
                </h3>
              </div>
              <button
                onClick={() => setActivePolicyModal(null)}
                aria-label="Close policy modal"
                className="p-1.5 text-[#A88D77] hover:text-[#FDF6EC] hover:bg-[#2C1D14] rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 text-xs text-[#D6BEAA] leading-relaxed whitespace-pre-line font-normal">
              {activePolicyData.content}
            </div>
            <div className="flex items-center justify-between px-6 py-3.5 bg-[#120A06] border-t border-[#3A2417] text-[11px] text-[#A88D77]">
              <span>Official Policy Document • MANOPAVANA</span>
              <button
                onClick={() => setActivePolicyModal(null)}
                className="px-4 py-1.5 text-xs font-bold text-[#140D09] bg-gradient-to-r from-[#D49A37] to-[#B87C24] hover:brightness-110 rounded-xl transition-all cursor-pointer shadow-md"
              >
                Understood & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
