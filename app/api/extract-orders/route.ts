import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export async function POST(req: Request) {
  try {
    const { text, platform } = await req.json();

    if (!text) {
      return Response.json({ message: "No text provided" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error("❌ MISSING API KEY: GOOGLE_GENERATIVE_AI_API_KEY is not set in .env.local");
      return Response.json({
        error: "Missing API Key",
        details: "API Key (GOOGLE_GENERATIVE_AI_API_KEY) belum diset di .env.local"
      }, { status: 500 });
    }

    const prompt = platform === "Shopee"
      ? `
    You are an expert logistics parser for Shopee Express Indonesia. 
    Your GOAL is to separate the "GPS Address" (for Google Maps) from the "Courier Instructions" (Notes) with extreme precision.

    INPUT TEXT:
    ${text}

    STRUCTURE Analysis:
    - Shopee orders come in blocks starting with Order ID (e.g., "#4R8E").
    - Each block has 2 addresses: Pick-up (Ambil) and Drop-off (Antar).

    CRITICAL RULES (THE "CONSTITUTION" OF ADDRESS PARSING):

    PHASE 0: THE CLEANER LAYER (NORMALIZATION) 🧹
    *BEFORE* seperating Address vs Note, you MUST fix "Extreme Typos":
    - Contextual Fixes: "Plu1t" -> "Pluit", "Kran9" -> "Karang", "Jkt" -> "Jakarta".
    - Leet Speak: "t0k0" -> "toko", "b3si" -> "besi", "pnt0" -> "pintu".
    - Structural Fixes: 
      - "j1", "jl", "jln" -> "Jl."
      - "n0", "n", "no" -> "No."
      - "bl", "blk" -> "Blok"
      - "lt", "lantai" -> "Lantai"
      - "u", "un" -> "Unit"
    - Abbreviation Expansion (Note Context):
      - "dpn" -> "depan", "sblh" -> "sebelah", "dkt" -> "dekat"
      - "pgr" -> "pagar", "smpng" -> "samping", "rmh" -> "rumah"

    PRINICIPLE 1: SEPARATE WORLDS
    - "GPS Address" = For Google Maps Robot (Must be CLEAN valid Indonesian).
    - "Note" = For Courier's Eyes.

    RULE 1: GPS ADDRESS LOCK 🔒
    - Extract strict Geographic Elements: Jalan, Nomor, RT/RW, Kelurahan, Kota.
    - If input is "J1. Plu1t Kran9 n0 12" -> GPS Address MUST BE "Jl. Pluit Karang No. 12" (Normalized).
    - DO NOT include patrols/visuals in GPS Address.

    RULE 2: NUMBER CLASSIFICATION 🔢
    - "No. 12" -> House Number (Conflict Candidate).
    - "RT 01", "RW 05", "Lantai 18", "Blok Z" -> SAFE (Not Conflict).
    - "No 14A" -> Variant (Soft Warning).

    RULE 3: CONFLICT HANDLING ⚠️
    - IF GPS Address has "No. 12" BUT text implies "aslinya no 10":
      * GPS Address: KEEP "No. 12" (Normalized).
      * Note: MUST START with "⚠️ ASLINYA NO 10."

    RULE 4: TEXT MINING (THE TRASH & GOLD) ⛏️
    - Extract normalized visuals into Note:
      * "pnt0 bsi h1tam" -> "Pintu besi hitam" (Fix readability).
      * "sblh t0k0 ikn" -> "Sebelah toko ikan".

    OUTPUT STRUCTURE (PRIORITY ORDER):
    Note must be sorted:
    1. ⚠️ Conflicts
    2. Landmarks (Gapura, Patung)
    3. Visuals (Cat, Pagar)
    4. Micro Directions (Masuk gang, samping)

    OUTPUT FORMAT:
    Return ONLY a raw JSON object with key "orders":
    [
      {
        "order_id": "#...",
        "platform": "Shopee",
        "type": "Ambil" | "Antar",
        "recipient_name": "...",
        "address": "Clean GPS Address Only",
        "note": "⚠️ [Real No if diff] [All extracted notes/patokan]",
        "deadline": "...",
        "service_type": "..."
      }
    ]
    `
      : `
    You are an expert logistics parser for Grab/GoTo.
    Same logic applies: Separate "Clean GPS Address" from "Human Notes" carefully.
    
    INPUT TEXT:
    ${text}

    GUIDELINES:
    1. STRICT DEDUPLICATION: One Ambil, One Antar per Order ID.
    2. ADDRESS CLEANING: Remove "patokan" phrases from the 'address' field. Move them to 'note'.
    3. DETECT NOTES: Look for parentheses (), "sebelah", "pagar", "cat", "lantai".
    4. DATA FIELDS:
       - "recipient_name": Store/Customer Name.
       - "address": The clean address for Google Maps.
       - "note": The visual instructions for the driver.
       - "type": "Ambil" or "Antar".
       - "order_id": ID like "GM-191".
       - "service_type": "GrabMart", "Instan", etc.
       - "deadline": Time string.
    
    Return ONLY a raw JSON object with key "orders": [ ... ] and optionally "total_revenue".
    `;

    console.log("DEBUG: Sending extraction request to gemini-2.0-flash...");

    const { text: aiResponse } = await generateText({
      model: google("gemini-2.0-flash"),
      prompt: prompt,
    });

    console.log("DEBUG: AI Response received (first 100 chars):", aiResponse.substring(0, 100));

    const cleanJson = aiResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleanJson);

    return Response.json(result);
  } catch (error) {
    console.error("❌ EXTRACTION API ERROR:", error);
    return Response.json({
      error: "Failed to extract orders",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
