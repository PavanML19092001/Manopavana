/**
 * Cloudflare Pages Functions - Dynamic OpenGraph metadata for Product Sharing
 * Route: /product/:id (e.g. /product/groundnut, /product/coconut, /product/sesame)
 *
 * Ensures WhatsApp, Facebook, iMessage, and Twitter display the EXACT product photo
 * (optimized < 300KB JPEG) instead of the generic store logo.
 */

const PRODUCT_META = {
  groundnut: {
    title: "Wood-Pressed Groundnut Oil (ಕಡಲೆಕಾಯಿ ಎಣ್ಣೆ) - MANOPAVANA",
    desc: "100% Traditional Marachekku Cold-Pressed Groundnut Oil from Bengaluru. High smoke point (230°C), unrefined, rich nutty aroma.",
    image: "/images/products/groundnut-studio.jpg",
  },
  coconut: {
    title: "Wood-Pressed Coconut Oil (ತೆಂಗಿನ ಎಣ್ಣೆ) - MANOPAVANA",
    desc: "100% Traditional Marachekku Cold-Pressed Coconut Oil from sun-dried copra. Unrefined, natural aroma, ideal for coastal cooking & hair care.",
    image: "/images/products/coconut-studio.jpg",
  },
  sesame: {
    title: "Wood-Pressed Sesame Oil (ಎಳ್ಳೆಣ್ಣೆ) - MANOPAVANA",
    desc: "Traditional Marachekku gingelly oil cold-pressed with organic palm jaggery. Rich flavor, unrefined, ideal for tadka and Ayurvedic care.",
    image: "/images/products/sesame-studio.jpg",
  },
};

export async function onRequest(context) {
  const { request, env, params } = context;
  const prodId = (params.id || "").toLowerCase();
  const meta = PRODUCT_META[prodId] || PRODUCT_META.groundnut;

  // Resolve absolute image URL for crawlers (WhatsApp requires absolute URL)
  const urlObj = new URL(request.url);
  const absoluteImageUrl = `${urlObj.origin}${meta.image}`;

  // Fetch the compiled root index.html from the Pages deployment
  const indexUrl = new URL("/", request.url);
  const response = await env.ASSETS.fetch(new Request(indexUrl.toString(), request));
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("text/html")) {
    let html = await response.text();

    // Replace Title & Description
    html = html
      .replace(/<title>.*?<\/title>/, `<title>${meta.title}</title>`)
      .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${meta.title}" />`)
      .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${meta.desc}" />`)
      .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${meta.desc}" />`);

    // Replace og:image with exact product image and WhatsApp required specs
    const ogImageTags = `<meta property="og:image" content="${absoluteImageUrl}" />\n    <meta property="og:image:secure_url" content="${absoluteImageUrl}" />\n    <meta property="og:image:type" content="image/jpeg" />\n    <meta property="og:image:width" content="800" />\n    <meta property="og:image:height" content="800" />`;
    html = html.replace(/<meta property="og:image" content=".*?" \/>/, ogImageTags);

    // Replace Twitter tags
    const twitterTags = `<meta name="twitter:card" content="summary_large_image" />\n    <meta name="twitter:image" content="${absoluteImageUrl}" />\n    <meta name="twitter:title" content="${meta.title}" />\n    <meta name="twitter:description" content="${meta.desc}" />`;
    html = html.replace('<meta name="twitter:card" content="summary_large_image" />', twitterTags);

    return new Response(html, {
      status: 200,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  }

  return response;
}
