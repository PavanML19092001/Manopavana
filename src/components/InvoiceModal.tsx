import React from "react";
import { Printer, X, Download } from "lucide-react";
import { Order } from "../types";
import { BUSINESS_CONFIG } from "../constants";

interface InvoiceModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, isOpen, onClose }) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

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

  return (
    <div
  role="dialog"
  aria-modal="true"
  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:p-0 print:bg-white print:static print:inset-auto print:block"
>
      <style>
  {`
    @media print {
      /* Hide all body elements except the modal */
      body {
        visibility: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
      }
      
      /* Only render the printable invoice container */
      #printable-invoice, #printable-invoice * {
        visibility: visible !important;
      }

      #printable-invoice {
        position: fixed !important;
        left: 0 !important;
        top: 0 !important;
        width: 100vw !important;
        height: auto !important;
        margin: 0 !important;
        padding: 10mm 15mm !important;
        box-shadow: none !important;
        border: none !important;
        background: #ffffff !important;
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
      }

      @page {
        size: A4 portrait;
        margin: 0;
      }
    }
  `}
</style>

      <div className="relative w-full max-w-2xl bg-white text-stone-900 rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:rounded-none">
        {/* Actions bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-100 border-b border-stone-200 print:hidden">
          <span className="text-sm font-bold font-serif text-stone-900">
            Tax Invoice — Order #{order.orderRef}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#5E3210] hover:bg-[#43230A] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
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

        {/* Invoice Page Container */}
        <div id="printable-invoice" className="p-8 text-xs text-stone-800 space-y-4">
          <div className="flex justify-between items-start border-b border-stone-300 pb-4">
            <div>
              <h1 className="text-lg font-bold font-serif text-stone-900">{BUSINESS_CONFIG.BRAND_NAME}</h1>
              <p className="text-[11px] text-stone-500">Artisanal Wood-Pressed Cooking Oils</p>
              <p className="text-[10px] text-stone-600 mt-1 max-w-xs">{BUSINESS_CONFIG.FACILITY_ADDRESS}</p>
              <p className="text-[10px] text-stone-600 font-mono mt-0.5">
                GSTIN: <strong>{BUSINESS_CONFIG.GSTIN}</strong> | FSSAI: <strong>{BUSINESS_CONFIG.FSSAI_LICENSE}</strong>
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2 py-0.5 rounded bg-stone-100 font-bold text-[10px] border border-stone-300">
                TAX INVOICE
              </span>
              <p className="font-mono font-bold mt-1 text-sm text-stone-900">#{order.orderRef}</p>
              <p className="text-[10px] text-stone-500">Date: {order.date}</p>
              <p className="text-[10px] text-stone-500">
                Payment: {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment (Paid)"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-stone-50 p-3 rounded-xl border border-stone-200 text-[11px]">
            <div>
              <p className="font-bold text-[10px] text-stone-500 uppercase">Customer Details:</p>
              <p className="font-bold text-stone-900">{order.shippingAddress.fullName}</p>
              <p className="text-stone-600">{order.shippingAddress.addressLine1}</p>
              <p className="text-stone-600">
                {order.shippingAddress.district || order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
              </p>
              <p className="text-stone-600 font-mono">Phone: +91 {order.shippingAddress.phone}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-[10px] text-stone-500 uppercase">Dispatch Center:</p>
              <p className="font-bold text-stone-900">MANOPAVANA Peenya Hub</p>
              <p className="text-stone-600">Peenya 2nd Stage, Bangalore - 560058</p>
              <p className="text-stone-600">State: Karnataka (29)</p>
            </div>
          </div>

          <table className="w-full text-left border-collapse border border-stone-300 text-[11px]">
            <thead>
              <tr className="bg-stone-100 text-stone-700 uppercase font-bold border-b border-stone-300">
                <th className="py-2 px-2.5 border-r border-stone-300">#</th>
                <th className="py-2 px-2.5 border-r border-stone-300">Item Description</th>
                <th className="py-2 px-2.5 border-r border-stone-300">HSN</th>
                <th className="py-2 px-2.5 border-r border-stone-300 text-center">Qty</th>
                <th className="py-2 px-2.5 border-r border-stone-300 text-right">Price</th>
                <th className="py-2 px-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx} className="border-b border-stone-200">
                  <td className="py-2 px-2.5 border-r border-stone-300 text-center font-mono">{idx + 1}</td>
                  <td className="py-2 px-2.5 border-r border-stone-300 font-semibold">
                    {item.title} ({item.variant})
                  </td>
                  <td className="py-2 px-2.5 border-r border-stone-300 font-mono text-stone-600">
                    {item.title.toLowerCase().includes("coconut") ? "1513" : "1508"}
                  </td>
                  <td className="py-2 px-2.5 border-r border-stone-300 text-center font-bold">{item.quantity}</td>
                  <td className="py-2 px-2.5 border-r border-stone-300 text-right font-mono">₹{item.price}</td>
                  <td className="py-2 px-2.5 text-right font-bold font-mono">₹{item.price * item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end pt-1">
            <div className="w-56 space-y-1 text-right text-[11px] font-mono">
              <div className="flex justify-between text-stone-600">
                <span>Taxable Amount:</span>
                <span>₹{taxableValue}</span>
              </div>
              {isBangalore ? (
                <>
                  <div className="flex justify-between text-stone-600">
                    <span>CGST (2.5%):</span>
                    <span>₹{cgst}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>SGST (2.5%):</span>
                    <span>₹{sgst}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-stone-600">
                  <span>IGST (5%):</span>
                  <span>₹{igst}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>Shipping:</span>
                <span>{order.shippingFee === 0 ? "FREE" : `₹${order.shippingFee}`}</span>
              </div>
              <div className="flex justify-between font-bold text-sm border-t border-stone-300 pt-1 text-stone-900">
                <span>Grand Total:</span>
                <span className="text-[#E08F35]">₹{order.total}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-300 flex justify-between items-end text-[9px] text-stone-500">
            <p>Computer-generated invoice. Authorized by MANOPAVANA.</p>
            <p className="font-bold text-stone-800">For MANOPAVANA</p>
          </div>
        </div>
      </div>
    </div>
  );
};