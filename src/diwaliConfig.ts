/**
 * DIWALI CAMPAIGN CONFIGURATION
 * -------------------------------------------------------------
 * One single editable place for the Diwali Special campaign.
 * End date: 12 November, end of day (23:59:59 IST / local).
 * After that moment, the banner, the Diwali section, the ribbon,
 * and the "Diwali Special" wording automatically disappear,
 * and the products' normal titles & presentation are restored.
 */
export const DIWALI_CONFIG = {
  // EDITABLE END DATE: 12 November 2026, 23:59:59.999 IST
  endDate: "2026-11-12T23:59:59+05:30",

  // Existing combo product IDs: both 1L Family Trio (combo-3l) and 500ml Starter Trio (combo-1.5l)
  targetComboId: "combo-3l", // Default highlighted 1L trio
  secondaryComboId: "combo-1.5l", // 500ml starter trio
  comboIds: ["combo-3l", "combo-1.5l"] as const,

  // Responsive banner & uploaded photo assets
  bannerImage: "/assets/aistudio/Diwali_website_banner_background_97f9f82f_2K_0f79a834.jpg",
  comboProductImage: "/assets/aistudio/Three_oil_bottles_on_festive_8baeff95_2K_fff65987.jpg",
  comboSecondaryImage: "/assets/aistudio/Bottles_on_emerald_green_platform_4d4980b5_2K_841403c1.jpg",

  // Festive copy
  ribbonText: "Diwali Special",
  buttonText: "Gift a Diwali combo",
  titlePrefix: "Diwali Special: ",
  descriptionPrefix:
    "Pure, unrefined, wood-pressed oils in drip-free spout bottles. A Diwali gift they'll use every day. Offer till 12 November.",
  sectionHeading: "Diwali Special Combo",
  sectionSubheading: "Pure, unrefined, wood-pressed oils in drip-free spout bottles.",
  offerLine: "Offer till 12 November.",
  bannerAltText: "Manopavana Diwali Special combo",

  // Four trust row items
  trustRow: [
    { id: "pure", label: "Pure and unrefined", icon: "sparkles" },
    { id: "traditional", label: "Wood-pressed, the traditional way", icon: "leaf" },
    { id: "bottle", label: "Drip-free spout bottle", icon: "droplet" },
    { id: "delivery", label: "Delivered across India", icon: "truck" },
  ],

  // Check if a combo ID belongs to the Diwali special campaign
  isDiwaliComboId: (id?: string | null) => id === "combo-3l" || id === "combo-1.5l",
};

/**
 * Check whether the Diwali Special offer is currently active.
 * Automatically checks current time against the campaign end date.
 * Supports temporary test overrides (via session/localStorage or manual testing).
 */
export function isDiwaliActive(testDateOverride?: string | null): boolean {
  try {
    if (typeof window !== "undefined") {
      const storedTest =
        testDateOverride ||
        sessionStorage.getItem("diwali_test_override_date") ||
        localStorage.getItem("diwali_test_override_date");
      if (storedTest) {
        return new Date(storedTest).getTime() <= new Date(DIWALI_CONFIG.endDate).getTime();
      }
    }
    const end = new Date(DIWALI_CONFIG.endDate).getTime();
    return new Date().getTime() <= end;
  } catch {
    return false;
  }
}

/**
 * Check if a specific combo product qualifies for Diwali Special benefits
 */
export function isDiwaliCombo(productId?: string | null): boolean {
  if (!productId || !isDiwaliActive()) return false;
  return productId === "combo-3l" || productId === "combo-1.5l";
}

/**
 * Helper to simulate past or future date for instant testing (programmatic / test scripts)
 */
export function setDiwaliTestDate(dateStr: string | null) {
  if (typeof window === "undefined") return;
  if (!dateStr) {
    sessionStorage.removeItem("diwali_test_override_date");
    localStorage.removeItem("diwali_test_override_date");
  } else {
    sessionStorage.setItem("diwali_test_override_date", dateStr);
    localStorage.setItem("diwali_test_override_date", dateStr);
  }
  window.dispatchEvent(new Event("diwali_date_changed"));
}
