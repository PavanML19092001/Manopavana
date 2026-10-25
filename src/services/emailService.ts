import emailjs from "@emailjs/browser";
import { EMAILJS_CONFIG } from "../constants";
import { Order } from "../types";

/**
 * Dispatch an order confirmation email via EmailJS (service_c6el9r8, template_zcdzrbl, SzEt0unJ8krw0qHVt)
 * to manopavana@gmail.com
 */
export async function sendOrderConfirmationEmail(order: Order) {
  try {
    // 1. Build a clean, multi-line items breakdown
    const itemsList =
      order.items && order.items.length > 0
        ? order.items.map(
            (item, idx) =>
              `${idx + 1}. ${item.title} (${item.variant}) x ${item.quantity} = ₹${item.price * item.quantity}`
          )
        : ["1. Artisanal Wood-Pressed Oil Order"];

    const itemsSummary = itemsList.join("\n");

    // 2. Format customer shipping details
    const customerName =
      order.shippingAddress?.fullName?.trim() || "Valued Customer";
    const customerPhone =
      order.shippingAddress?.phone?.trim() || "N/A";
    const customerEmail =
      order.shippingAddress?.email?.trim() || "N/A";
    const addressLine = order.shippingAddress?.addressLine1 || "";
    const district = order.shippingAddress?.district || order.shippingAddress?.city || "Bengaluru";
    const state = order.shippingAddress?.state || "Karnataka";
    const pincode = order.shippingAddress?.pincode || "";
    const deliveryAddress = [addressLine, district, `${state} - ${pincode}`]
      .filter((part) => part && part.trim() !== "-")
      .join(", ");
    const landmark = order.shippingAddress?.landmark || "N/A";

    const isCod = order.paymentMethod === "cod" || order.paymentMode === "COD";
    const paymentMethodLabel = isCod
      ? "Cash on Delivery (COD)"
      : "Online Payment (Completed)";

    const mapsLink =
      order.shippingAddress?.lat && order.shippingAddress?.lng
        ? `https://www.google.com/maps?q=${order.shippingAddress.lat},${order.shippingAddress.lng}`
        : "https://www.google.com/maps?q=12.9716,77.5946";

    const formattedDate =
      order.date && order.date !== "Just now"
        ? order.date
        : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // Comprehensive payload containing all standard naming conventions
    // ensures ANY EmailJS template placeholder is populated without blanks
    const fullOrderText = [
      `🛒 NEW ORDER #${order.orderRef}`,
      `📅 Date: ${formattedDate}`,
      `💳 Payment: ${paymentMethodLabel}`,
      `💰 Total Amount: ₹${order.total} (Subtotal: ₹${order.subtotal}, Delivery: ₹${order.shippingFee || 0}, Discount: ₹${order.discount || 0})`,
      ``,
      `👤 CUSTOMER DETAILS:`,
      `• Name: ${customerName}`,
      `• Phone: ${customerPhone}`,
      `• Email: ${customerEmail}`,
      `• Address: ${deliveryAddress}`,
      `• Landmark: ${landmark}`,
      `• Google Maps Pin: ${mapsLink}`,
      ``,
      `📦 ORDERED ITEMS:`,
      itemsSummary,
      ``,
      isCod ? `⚠️ ACTION REQUIRED: COLLECT ₹${order.total} CASH ON DELIVERY AT DOORSTEP` : `✅ Online Payment Completed`,
    ].join("\n");

    const templateParams: Record<string, string> = {
      to_email: EMAILJS_CONFIG.TARGET_EMAIL,
      to_name: "MANOPAVANA Team",
      from_name: customerName,
      from_email: customerEmail !== "N/A" ? customerEmail : "orders@manopavana.com",
      reply_to: customerEmail !== "N/A" ? customerEmail : EMAILJS_CONFIG.TARGET_EMAIL,
      subject: `[${isCod ? "COD ORDER" : "PAID ORDER"}] #${order.orderRef} - ₹${order.total} by ${customerName}`,
      title: `Order #${order.orderRef} (${paymentMethodLabel})`,

      // Primary Message & Content fallbacks (the most common EmailJS variables)
      message: fullOrderText,
      content: fullOrderText,
      body: fullOrderText,
      email_body: fullOrderText,
      text: fullOrderText,
      details: fullOrderText,
      order_details: fullOrderText,
      order_summary: fullOrderText,
      orderSummary: fullOrderText,
      summary: fullOrderText,
      notes: fullOrderText,
      description: fullOrderText,
      my_message: fullOrderText,

      // Order Reference variations
      order_ref: order.orderRef,
      orderRef: order.orderRef,
      order_id: order.orderRef || order.id,
      orderId: order.orderRef || order.id,
      order_number: order.orderRef,
      id: order.orderRef || order.id,

      // Date variations
      order_date: formattedDate,
      date: formattedDate,
      time: formattedDate,

      // Customer Name variations
      customer_name: customerName,
      customerName: customerName,
      name: customerName,
      user_name: customerName,
      client_name: customerName,

      // Customer Phone variations
      customer_phone: customerPhone,
      customerPhone: customerPhone,
      phone: customerPhone,
      user_phone: customerPhone,
      contact: customerPhone,
      mobile: customerPhone,
      phone_number: customerPhone,

      // Email variations
      customer_email: customerEmail,
      email: customerEmail,
      user_email: customerEmail,

      // Address variations
      delivery_address: deliveryAddress,
      deliveryAddress: deliveryAddress,
      address: deliveryAddress,
      shipping_address: deliveryAddress,
      shippingAddress: deliveryAddress,
      street_address: addressLine,
      address_line1: addressLine,
      landmark: landmark,
      city: district,
      district: district,
      state: state,
      pincode: pincode,
      zip: pincode,
      zipcode: pincode,

      // Item summary variations
      items_summary: itemsSummary,
      itemsSummary: itemsSummary,
      items: itemsSummary,
      order_items: itemsSummary,
      item_list: itemsSummary,
      products: itemsSummary,
      cart: itemsSummary,

      // Pricing variations
      total_amount: `₹${order.total}`,
      totalAmount: `₹${order.total}`,
      total: `₹${order.total}`,
      amount: `₹${order.total}`,
      grand_total: `₹${order.total}`,
      price: `₹${order.total}`,
      subtotal: `₹${order.subtotal}`,
      discount: `₹${order.discount || 0}`,
      shipping_fee: `₹${order.shippingFee || 0}`,

      // Payment variations
      payment_method: paymentMethodLabel,
      paymentMethod: paymentMethodLabel,
      payment_mode: order.paymentMode || paymentMethodLabel,
      paymentMode: order.paymentMode || paymentMethodLabel,
      payment_status: order.paymentStatus || (isCod ? "COD_PENDING_HANDOVER" : "COMPLETED"),
      paymentStatus: order.paymentStatus || (isCod ? "COD_PENDING_HANDOVER" : "COMPLETED"),

      // Facility & Logistics
      is_bangalore: order.shippingAddress?.isBangalore ? "Yes (Peenya Direct Doorstep)" : "Pan-India Route",
      maps_link: mapsLink,
      mapsLink: mapsLink,
      map_url: mapsLink,
      google_maps: mapsLink,
      tracking_number: order.trackingNumber || `MV-BLR-${Math.floor(10000 + Math.random() * 90000)}`,
      courier: order.courier || (order.shippingAddress?.isBangalore ? "MANOPAVANA Peenya Express" : "Delhivery Express"),
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

/**
 * Dispatch password-free login OTP via EmailJS directly to customer's email address
 */
export async function sendEmailLoginOtp(toEmail: string, otpCode: string): Promise<boolean> {
  try {
    const cleanEmail = toEmail.toLowerCase().trim();
    const messageBody = `Hello,\n\nYour 6-digit one-time verification code to sign in to MANOPAVANA is:\n\n${otpCode}\n\nThis code is valid for 10 minutes. For your security, do not share this OTP with anyone.\n\nWarm regards,\nMANOPAVANA Artisanal Wood-Pressed Oils\nBengaluru, India`;

    // Populate every common variable so that EVEN IF an order template is used,
    // the email is never blank and clearly displays the OTP code.
    const templateParams: Record<string, string> = {
      // Recipient fields
      to_email: cleanEmail,
      to_name: cleanEmail.split("@")[0] || "Customer",
      recipient: cleanEmail,
      user_email: cleanEmail,
      customer_email: cleanEmail,
      email: cleanEmail,
      to: cleanEmail,
      target_email: cleanEmail,
      from_name: "MANOPAVANA Security",
      from_email: "orders@manopavana.com",
      reply_to: cleanEmail,
      subject: `Your MANOPAVANA Login OTP: ${otpCode}`,
      title: `MANOPAVANA Login Verification: ${otpCode}`,

      // Primary message fields
      message: messageBody,
      content: messageBody,
      body: messageBody,
      details: messageBody,
      text: messageBody,
      otp_code: otpCode,
      code: otpCode,
      otp: otpCode,

      // Order template variables fallback (prevents blank template)
      order_ref: `LOGIN-OTP-${otpCode}`,
      orderRef: `LOGIN-OTP-${otpCode}`,
      order_id: `OTP-${otpCode}`,
      orderId: `OTP-${otpCode}`,
      customer_name: cleanEmail.split("@")[0] || "Customer",
      customerName: cleanEmail.split("@")[0] || "Customer",
      name: cleanEmail.split("@")[0] || "Customer",
      total_amount: `OTP: ${otpCode}`,
      total: `OTP: ${otpCode}`,
      amount: `OTP: ${otpCode}`,
      items_summary: `Your 6-digit MANOPAVANA login OTP is: ${otpCode}`,
      itemsSummary: `Your 6-digit MANOPAVANA login OTP is: ${otpCode}`,
      order_details: messageBody,
      orderSummary: messageBody,
      delivery_address: `Delivered to: ${cleanEmail}`,
      deliveryAddress: `Delivered to: ${cleanEmail}`,
      payment_method: `Login Verification (${otpCode})`,
      paymentMethod: `Login Verification (${otpCode})`,
    };

    const templateId =
      (typeof localStorage !== "undefined" &&
        localStorage.getItem("manopavana_emailjs_otp_template")) ||
      EMAILJS_CONFIG.TEMPLATE_ID;

    await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      templateId,
      templateParams,
      EMAILJS_CONFIG.PUBLIC_KEY
    );
    return true;
  } catch (error) {
    console.warn("Email OTP delivery notice:", error);
    return false;
  }
}

