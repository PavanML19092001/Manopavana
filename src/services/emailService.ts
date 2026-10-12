import emailjs from "@emailjs/browser";
import { EMAILJS_CONFIG } from "../constants";
import { Order } from "../types";

/**
 * Dispatch an order confirmation email via EmailJS (service_c6el9r8, template_zcdzrbl, SzEt0unJ8krw0qHVt)
 * to manopavana@gmail.com
 */
export async function sendOrderConfirmationEmail(order: Order) {
  try {
    const itemsSummary = order.items
      .map((item) => `${item.title} (${item.variant}) x ${item.quantity} = ₹${item.price * item.quantity}`)
      .join("\n");

    const templateParams = {
      to_email: EMAILJS_CONFIG.TARGET_EMAIL,
      order_ref: order.orderRef,
      order_date: order.date,
      customer_name: order.shippingAddress.fullName || "Customer",
      customer_phone: order.shippingAddress.phone,
      delivery_address: `${order.shippingAddress.addressLine1}, ${order.shippingAddress.district}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`,
      landmark: order.shippingAddress.landmark || "N/A",
      items_summary: itemsSummary,
      total_amount: `₹${order.total}`,
      payment_method: order.paymentMethod.toUpperCase(),
      payment_status: order.paymentStatus,
      is_bangalore: order.shippingAddress.isBangalore ? "Yes (Peenya Direct)" : "Pan-India",
    };

    const res = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      templateParams,
      EMAILJS_CONFIG.PUBLIC_KEY
    );

    console.log("EmailJS order dispatch confirmation sent successfully:", res.status, res.text);
    return true;
  } catch (error) {
    console.warn("EmailJS delivery notice:", error);
    return false;
  }
}
