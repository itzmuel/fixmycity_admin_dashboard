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
  priority_score: number;
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

function priorityScore(description: string): number {
  const text = description.toLowerCase();
  
  // Critical safety hazards: 5
  if (/water main burst|gas leak|major flood|collapse|sinkhole|traffic light not working/.test(text)) {
    return 5;
  }
  
  // High priority: 4
  if (/pothole|road crack|asphalt damage|streetlight|flood|sewer|water leak/.test(text)) {
    return 4;
  }
  
  // Medium priority: 3
  if (/garbage|trash|graffiti|vandal|sidewalk damage|curb damage/.test(text)) {
    return 3;
  }
  
  // Low priority: 2
  if (/faded|paint|cosmetic|worn|cosmetic/.test(text)) {
    return 2;
  }
  
  // Default: 1
  return 1;
}

function heuristicSuggestion(description: string): SuggestionResponse {
  const text = description.toLowerCase();

  if (/pothole|road crack|asphalt|sinkhole|road damage/.test(text)) {
    return { category: "Pothole", confidence: 0.82, reason: "Detected road surface damage keywords.", priority_score: 4 };
  }
  if (/streetlight|traffic light|lamp|light not working|dark street/.test(text)) {
    return { category: "Streetlight", confidence: 0.8, reason: "Detected lighting/visibility keywords.", priority_score: 4 };
  }
  if (/garbage|trash|litter|dumping|waste/.test(text)) {
    return { category: "Garbage", confidence: 0.78, reason: "Detected waste and sanitation keywords.", priority_score: 3 };
  }
  if (/flood|drain|sewer|water leak|overflow/.test(text)) {
    return { category: "Drainage", confidence: 0.79, reason: "Detected water and drainage keywords.", priority_score: 5 };
  }
  if (/graffiti|vandal|spray paint/.test(text)) {
    return { category: "Graffiti", confidence: 0.76, reason: "Detected vandalism-related keywords.", priority_score: 2 };
  }
  if (/sidewalk|curb|walkway|pedestrian/.test(text)) {
    return { category: "Sidewalk", confidence: 0.75, reason: "Detected pedestrian path keywords.", priority_score: 3 };
  }

  return {
    category: "General",
    confidence: 0.6,
    reason: "No strong pattern found; using broad fallback category.",
    priority_score: priorityScore(description),
  };
}

async function openAiSuggestion(description: string, address: string, currentCategory: string): Promise<SuggestionResponse | null> {
  if (!OPENAI_API_KEY) return null;

  const prompt = [
    "Classify this city issue report into one category and assign a priority score.",
    "Allowed categories: Pothole, Streetlight, Garbage, Drainage, Graffiti, Sidewalk, Public Property Damage, General",
    "Priority score: 1 (low, cosmetic) to 5 (critical, safety hazard). Examples: 5=water main burst, 4=pothole, 3=garbage, 1=faded paint",
    `Description: ${description}`,
    `Address: ${address}`,
    `Current category: ${currentCategory}`,
    "Return strict JSON: {\"category\": string, \"confidence\": number between 0 and 1, \"reason\": string, \"priority_score\": number between 1 and 5}",
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
          content: "You are a strict JSON API that categorizes city incident reports and assigns priority scores.",
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

    const priority = typeof parsed.priority_score === "number" 
      ? Math.max(1, Math.min(5, parsed.priority_score)) 
      : priorityScore(description);

    return {
      category: parsed.category,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
      reason: typeof parsed.reason === "string" ? parsed.reason : "AI categorized this issue.",
      priority_score: priority,
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
