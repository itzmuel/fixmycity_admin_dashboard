// Supabase Edge Function: categorize-issue
// Uses an LLM provider when configured and falls back to deterministic keyword matching.

type RequestBody = {
  description?: string;
  address?: string;
  currentCategory?: string;
};

type SuggestionResponse = {
  category: string;
  confidence: number;
  reason: string;
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

function heuristicSuggestion(description: string): SuggestionResponse {
  const text = description.toLowerCase();

  if (/pothole|road crack|asphalt|sinkhole|road damage/.test(text)) {
    return { category: "Pothole", confidence: 0.82, reason: "Detected road surface damage keywords." };
  }
  if (/streetlight|traffic light|lamp|light not working|dark street/.test(text)) {
    return { category: "Streetlight", confidence: 0.8, reason: "Detected lighting/visibility keywords." };
  }
  if (/garbage|trash|litter|dumping|waste/.test(text)) {
    return { category: "Garbage", confidence: 0.78, reason: "Detected waste and sanitation keywords." };
  }
  if (/flood|drain|sewer|water leak|overflow/.test(text)) {
    return { category: "Drainage", confidence: 0.79, reason: "Detected water and drainage keywords." };
  }
  if (/graffiti|vandal|spray paint/.test(text)) {
    return { category: "Graffiti", confidence: 0.76, reason: "Detected vandalism-related keywords." };
  }
  if (/sidewalk|curb|walkway|pedestrian/.test(text)) {
    return { category: "Sidewalk", confidence: 0.75, reason: "Detected pedestrian path keywords." };
  }

  return {
    category: "General",
    confidence: 0.6,
    reason: "No strong pattern found; using broad fallback category.",
  };
}

async function openAiSuggestion(description: string, address: string, currentCategory: string): Promise<SuggestionResponse | null> {
  if (!OPENAI_API_KEY) return null;

  const prompt = [
    "Classify this city issue report into one category.",
    "Allowed categories: Pothole, Streetlight, Garbage, Drainage, Graffiti, Sidewalk, Public Property Damage, General",
    `Description: ${description}`,
    `Address: ${address}`,
    `Current category: ${currentCategory}`,
    "Return strict JSON: {\"category\": string, \"confidence\": number between 0 and 1, \"reason\": string}",
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "You are a strict JSON API that categorizes city incident reports.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) return null;

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") return null;

  try {
    const parsed = JSON.parse(content);
    if (typeof parsed.category !== "string") return null;

    return {
      category: parsed.category,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
      reason: typeof parsed.reason === "string" ? parsed.reason : "AI categorized this issue.",
    };
  } catch {
    return null;
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = (await request.json().catch(() => ({}))) as RequestBody;
  const description = (body.description ?? "").trim();
  const address = (body.address ?? "").trim();
  const currentCategory = (body.currentCategory ?? "General").trim();

  if (!description) {
    return new Response(JSON.stringify({ error: "description is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ai = await openAiSuggestion(description, address, currentCategory);
  const fallback = heuristicSuggestion(description);
  const payload = ai ?? fallback;

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
