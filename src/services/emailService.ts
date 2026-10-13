import emailjs from "@emailjs/browser";
import { EMAILJS_CONFIG } from "../constants";
import { Order } from "../types";

/**
 * Dispatch an order confirmation email via EmailJS (service_c6el9r8, template_zcdzrbl, SzEt0unJ8krw0qHVt)
 * to manopavana@gmail.com
 */
export async function sendOrderConfirmationEmail(order: Order) {
  try {
    const itemsSummary =
      order.items && order.items.length > 0
        ? order.items
            .map(
              (item) =>
                `• ${item.title} (${item.variant}) x ${item.quantity} = ₹${item.price * item.quantity}`
            )
            .join("\n")
        : "Order item details recorded in portal";

    const customerName =
      order.shippingAddress?.fullName?.trim() || "Valued Customer";
    const customerPhone =
      order.shippingAddress?.phone?.trim() || "N/A";
    const addressLine = order.shippingAddress?.addressLine1 || "";
    const district = order.shippingAddress?.district || "Bengaluru";
    const state = order.shippingAddress?.state || "Karnataka";
    const pincode = order.shippingAddress?.pincode || "";
    const deliveryAddress = `${addressLine}, ${district}, ${state} - ${pincode}`.replace(/^,\s*/, "");
    const landmark = order.shippingAddress?.landmark || "N/A";

    const paymentMethodLabel =
      order.paymentMethod === "cod"
        ? "CASH ON DELIVERY (COD)"
        : "ONLINE PAYMENT (COMPLETED)";

    const mapsLink =
      order.shippingAddress?.lat && order.shippingAddress?.lng
        ? `https://www.google.com/maps?q=${order.shippingAddress.lat},${order.shippingAddress.lng}`
        : "https://www.google.com/maps?q=12.9716,77.5946";

    const templateParams = {
      to_email: EMAILJS_CONFIG.TARGET_EMAIL,
      order_ref: order.orderRef,
      order_date: order.date || new Date().toLocaleString("en-IN"),
      customer_name: customerName,
      customer_phone: customerPhone,
      delivery_address: deliveryAddress,
      landmark: landmark,
      items_summary: itemsSummary,
      total_amount: `₹${order.total}`,
      payment_method: paymentMethodLabel,
      payment_status: order.paymentStatus || "COMPLETED",
      is_bangalore: order.shippingAddress?.isBangalore ? "Yes (Peenya Direct)" : "Pan-India",
      maps_link: mapsLink,
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
