import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { sellerName, school, graduationYear, listings } = await req.json();

    if (!ANTHROPIC_API_KEY) {
      return Response.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const listingSummary = listings
      .map(
        (l: { name: string; price: number; note?: string; category?: string; marketplace?: string; sold?: boolean }) =>
          `- ${l.name} | $${l.price} | Category: ${l.category || "N/A"} | ${l.note || "No description"} | Marketplace: ${l.marketplace || "N/A"} | ${l.sold ? "SOLD" : "Available"}`
      )
      .join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: `You are a design assistant. Generate a complete, self-contained HTML document that serves as a beautiful, printable product catalog/flyer for a student seller on LionsList (Columbia University's student marketplace).

Seller: ${sellerName}
School: ${school}
Class of: ${graduationYear}

Listings:
${listingSummary}

Requirements:
- The HTML must be self-contained with all styles inline or in a <style> tag
- Use a clean, modern design with Columbia blue (#002B5C) as the primary accent color and light blue (#9BCBEB) as secondary
- Include a header with the LionsList lion emoji logo, seller name, school, and graduation year
- Each listing should be a well-formatted card showing: item name (prominent), price (green, bold), category badge, description, marketplace name, and availability status
- Items marked as SOLD should have a subtle "SOLD" overlay or badge
- Use elegant typography — prefer system fonts like -apple-system, Segoe UI, or similar
- Design it for A4/Letter paper size (max-width around 800px, centered)
- Include a footer with "Generated on LionsList — The Columbia Student Marketplace"
- Make it look professional enough to share in WhatsApp groups
- Do NOT include any images or external resources
- Return ONLY the HTML, nothing else — no markdown fences, no explanation`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Claude API error:", response.status);
      return Response.json(
        { error: "Failed to generate PDF content" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const html = data.content?.[0]?.text || "";

    return Response.json({ html });
  } catch (error) {
    console.error("PDF generation error:", error);
    return Response.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
});
