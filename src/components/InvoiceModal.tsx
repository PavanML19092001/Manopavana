import React, { useRef } from "react";
import { X, Download, Printer } from "lucide-react";
import { Order } from "../types";
import { BUSINESS_CONFIG } from "../constants";

interface InvoiceModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, isOpen, onClose }) => {
  const invoiceRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const gstRate = 0.05;
  const taxableValue = Math.round((order.subtotal - (order.discount || 0)) / (1 + gstRate));
  const totalGst = (order.subtotal - (order.discount || 0)) - taxableValue;
  const isBangalore = Boolean(
    order.shippingAddress?.isBangalore ||
    order.shippingAddress?.pincode?.startsWith("560") ||
    order.shippingAddress?.state?.toLowerCase().includes("karnataka")
  );

  const cgst = isBangalore ? Math.round(totalGst / 2) : 0;
  const sgst = isBangalore ? Math.round(totalGst / 2) : 0;
  const igst = !isBangalore ? totalGst : 0;

  const handlePrint = () => {
    if (!invoiceRef.current) return;

    // Create an isolated iframe for clean, single-page printing
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";

    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) {
      document.body.removeChild(printFrame);
      return;
    }

    const invoiceHtml = invoiceRef.current.innerHTML;

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice #${order.orderRef} - ${BUSINESS_CONFIG.BRAND_NAME}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 14mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
            body {
              background: #ffffff;
              color: #1c1917;
              font-size: 11px;
              line-height: 1.4;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .invoice-box {
              width: 100%;
              max-width: 100%;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 1.5px solid #d6d3d1;
              padding-bottom: 12px;
              margin-bottom: 14px;
            }
            .brand-name {
              font-size: 18px;
              font-weight: 800;
              color: #1c1917;
              letter-spacing: 0.5px;
            }
            .tagline {
              font-size: 11px;
              color: #78716c;
              margin-top: 2px;
            }
            .facility-details {
              font-size: 10px;
              color: #57534e;
              margin-top: 4px;
              max-width: 320px;
            }
            .tax-badge {
              display: inline-block;
              padding: 3px 8px;
              border: 1px solid #d6d3d1;
              border-radius: 4px;
              font-size: 10px;
              font-weight: bold;
              background-color: #f5f5f4;
            }
            .ref-number {
              font-size: 15px;
              font-weight: 800;
              font-family: monospace;
              margin-top: 4px;
            }
            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              background-color: #fafaf9;
              border: 1px solid #e7e5e4;
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 16px;
              font-size: 11px;
            }
            .section-label {
              font-size: 10px;
              font-weight: bold;
              color: #78716c;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 14px;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #d6d3d1;
              padding: 6px 8px;
            }
            th {
              background-color: #f5f5f4;
              font-weight: 700;
              text-transform: uppercase;
              color: #44403c;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .totals-container {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 16px;
            }
            .totals-table {
              width: 240px;
              font-family: monospace;
              font-size: 11px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 3px 0;
              color: #57534e;
            }
            .grand-total {
              border-top: 1.5px solid #d6d3d1;
              padding-top: 6px;
              margin-top: 4px;
              font-weight: 800;
              font-size: 14px;
              color: #1c1917;
            }
            .footer-notes {
              border-top: 1px solid #e7e5e4;
              padding-top: 12px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              font-size: 10px;
              color: #78716c;
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            ${invoiceHtml}
          </div>
        </body>
      </html>
    `);
    frameDoc.close();

    // Trigger print once iframe finishes parsing DOM
    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 1000);
    }, 250);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-2xl bg-white text-stone-900 rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Action Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-100 border-b border-stone-200">
          <span className="text-sm font-bold font-serif text-stone-900">
            Tax Invoice — Order #{order.orderRef}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>Print / Save 1-Page PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-stone-200 text-stone-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Page Container (Captures HTML for clean printout) */}
        <div className="overflow-y-auto p-8">
          <div ref={invoiceRef} className="text-xs text-stone-800 space-y-4">
            <div className="header">
              <div>
                <h1 className="brand-name">{BUSINESS_CONFIG.BRAND_NAME}</h1>
                <p className="tagline">Artisanal Wood-Pressed Cooking Oils</p>
                <p className="facility-details">{BUSINESS_CONFIG.FACILITY_ADDRESS}</p>
                <p className="facility-details font-mono">
                  GSTIN: <strong>{BUSINESS_CONFIG.GSTIN}</strong> | FSSAI: <strong>{BUSINESS_CONFIG.FSSAI_LICENSE}</strong>
                </p>
              </div>
              <div className="text-right">
                <span className="tax-badge">TAX INVOICE</span>
                <p className="ref-number">#{order.orderRef}</p>
                <p className="tagline">Date: {order.date}</p>
                <p className="tagline">
                  Payment: {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment (Paid)"}
                </p>
              </div>
            </div>

            <div className="details-grid">
              <div>
                <p className="section-label">Customer Details:</p>
                <p className="font-bold text-stone-900">{order.shippingAddress.fullName}</p>
                <p className="text-stone-600">{order.shippingAddress.addressLine1}</p>
                <p className="text-stone-600">
                  {order.shippingAddress.district || order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                </p>
                <p className="text-stone-600 font-mono">Phone: +91 {order.shippingAddress.phone}</p>
              </div>
              <div className="text-right">
                <p className="section-label">Dispatch Center:</p>
                <p className="font-bold text-stone-900">MANOPAVANA Peenya Hub</p>
                <p className="text-stone-600">Peenya 2nd Stage, Bangalore - 560058</p>
                <p className="text-stone-600">State: Karnataka (29)</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style={{ width: "35px" }} className="text-center">#</th>
                  <th>Item Description</th>
                  <th style={{ width: "70px" }} className="text-center">HSN</th>
                  <th style={{ width: "45px" }} className="text-center">Qty</th>
                  <th style={{ width: "75px" }} className="text-right">Price</th>
                  <th style={{ width: "85px" }} className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="text-center font-mono">{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{item.title} ({item.variant})</td>
                    <td className="text-center font-mono text-stone-600">
                      {item.title.toLowerCase().includes("coconut") ? "1513" : "1508"}
                    </td>
                    <td className="text-center font-bold">{item.quantity}</td>
                    <td className="text-right font-mono">₹{item.price}</td>
                    <td className="text-right font-bold font-mono">₹{item.price * item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="totals-container">
              <div className="totals-table">
                <div className="totals-row">
                  <span>Taxable Amount:</span>
                  <span>₹{taxableValue}</span>
                </div>
                {isBangalore ? (
                  <>
                    <div className="totals-row">
                      <span>CGST (2.5%):</span>
                      <span>₹{cgst}</span>
                    </div>
                    <div className="totals-row">
                      <span>SGST (2.5%):</span>
                      <span>₹{sgst}</span>
                    </div>
                  </>
                ) : (
                  <div className="totals-row">
                    <span>IGST (5%):</span>
                    <span>₹{igst}</span>
                  </div>
                )}
                <div className="totals-row">
                  <span>Shipping:</span>
                  <span>{order.shippingFee === 0 ? "FREE" : `₹${order.shippingFee}`}</span>
                </div>
                <div className="totals-row grand-total">
                  <span>Grand Total:</span>
                  <span style={{ color: "#E08F35" }}>₹{order.total}</span>
                </div>
              </div>
            </div>

            <div className="footer-notes">
              <p>Computer-generated invoice. Authorized by MANOPAVANA.</p>
              <p style={{ fontWeight: "bold", color: "#1c1917" }}>For MANOPAVANA</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};