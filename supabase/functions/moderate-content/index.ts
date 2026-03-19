import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { name, note, category, imageUrls } = await req.json();

    if (!ANTHROPIC_API_KEY) {
      // Fail open if no API key configured
      return Response.json({ allowed: true });
    }

    const textContent = [name, note, category].filter(Boolean).join(" | ");

    const messages: Array<{ role: string; content: unknown }> = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are a content moderator for a Columbia University student marketplace called LionsList. Review the following listing and determine if it violates content policies.

Listing text: "${textContent}"

Rules:
- No offensive, hateful, or discriminatory content
- No illegal items or services
- No explicit adult content
- No weapons or dangerous items
- No scams or misleading content

Respond with JSON only: {"allowed": true} or {"allowed": false, "reason": "brief explanation"}`,
          },
          ...(imageUrls || []).map((url: string) => ({
            type: "image" as const,
            source: { type: "url" as const, url },
          })),
        ],
      },
    ];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 150,
        messages,
      }),
    });

    if (!response.ok) {
      console.error("Claude API error:", response.status);
      return Response.json({ allowed: true }); // fail open
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    // Parse JSON from response
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return Response.json(JSON.parse(match[0]));
    }

    return Response.json({ allowed: true }); // fail open on parse error
  } catch (error) {
    console.error("Moderation error:", error);
    return Response.json({ allowed: true }); // fail open
  }
});
