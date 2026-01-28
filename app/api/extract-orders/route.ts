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

    const prompt = `
    You are an expert logistics parser. Your job is to extract multiple delivery orders from a raw text dump from a courier app (Grab/Shopee).
    
    INPUT TEXT:
    ${text}

    GUIDELINES:
    1. Identify all "Pickup" (Ambil) and "Delivery" (Antar) locations.
    2. For EACH location found, create a separate order object.
    3. Extract:
       - "recipient_name": Store Name or Customer Name.
       - "address": The full address string.
       - "type": MUST BE either "Ambil" or "Antar".
       - "order_id": The ID like "GM-191".
       - "deadline": Time like "10:06 PM".
       - "service_type": Like "GrabMart" or "GrabFood".
    4. Detect "total_revenue" from the text (e.g., "Pendapatan bersih saat ini: Rp11.400").
    5. Return ONLY a raw JSON object.

    Example output format:
    {
      "total_revenue": "Rp11.400",
      "orders": [
        {
          "recipient_name": "Apotek Dian Prima",
          "address": "Jl. Panjang Cidodol Rt.1/Rw.4...",
          "type": "Ambil",
          "order_id": "GM-191",
          "deadline": "10:06 PM",
          "service_type": "GrabMart"
        },
        {
          "recipient_name": "Regita",
          "address": "no 100, Jl. Musyawarah li...",
          "type": "Antar",
          "order_id": "GM-191",
          "deadline": "",
          "service_type": "GrabMart"
        }
      ]
    }
    `;

    console.log("DEBUG: Sending extraction request to gemini-1.5-flash...");

    const { text: aiResponse } = await generateText({
      model: google("models/gemini-1.5-flash"),
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
