import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { normalizeText } from "@/lib/normalizer";

const OrderSchema = z.object({
  orders: z.array(z.object({
    order_id: z.string().describe("The order ID, e.g. #1234 or GM-191"),
    platform: z.enum(["Shopee", "Grab", "Manual"]).optional().describe("Platform name"),
    type: z.enum(["Ambil", "Antar"]).describe("Type of task"),
    recipient_name: z.string().optional().describe("Name of store or customer"),
    address: z.string().describe("Clean, GPS-navigable address for Google Maps. Remove notes/landmarks."),
    note: z.string().describe("Human-readable notes, landmarks, colors, or 'aslinya no X' warnings."),
    confidence: z.number().describe("0-100 confidence score of extraction quality"),
    label: z.enum(["clean", "warning", "conflict"]).describe("Status label based on parsing certainty"),
    deadline: z.string().optional().describe("Delivery deadline/time if available"),
    service_type: z.string().optional().describe("Service type e.g. Instant, Sameday")
  })),
  total_revenue: z.string().optional().describe("Total revenue string if available, e.g. 'Rp 150.000'")
});

export async function POST(req: Request) {
  try {
    const { text, platform } = await req.json();

    if (!text) {
      return Response.json({ message: "No text provided" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return Response.json({
        error: "Missing API Key",
        details: "API Key (GOOGLE_GENERATIVE_AI_API_KEY) belum diset di .env.local"
      }, { status: 500 });
    }

    // Phase 0: The Cleaner Layer (Pre-processing)
    // We normalize BEFORE sending to AI to give it a better chance
    const cleanedText = normalizeText(text);

    console.log("DEBUG: Normalized Text:", cleanedText.substring(0, 100));

    const prompt = `
    You are an expert logistics parser for ${platform} Indonesia.
    Your GOAL is to separate the "GPS Address" from "Courier Instructions" with extreme precision.

    INPUT TEXT (Normalized):
    ${cleanedText}

    CRITICAL RULES:
    1. EXTRACT STRICTLY:
       - "address": ONLY Jalan, Nomor, RT/RW, Kelurahan, Kota. NO landmarks (e.g. "sebelah toko cat").
       - "note": ALL landmarks, visual descriptions (pagar hitam), warnings, and specific instructions.
    
    2. CONFLICT HANDLING:
       - If address says "No. 12" but text says "aslinya 10", keep "No. 12" in address, but put "⚠️ ASLINYA NO 10" in note.
       - Label as "conflict" if such contradiction exists.

    3. DEDUPLICATION:
       - Ensure strictly ONE 'Ambil' and ONE 'Antar' per Order ID if applicable.

    4. PLATFORM SPECIFIC:
       - Shopee: Handle blocks starting with Order ID.
       - Grab: Handle standard Grab format.
    
    Return a valid JSON object matching the schema.
    `;

    const { object } = await generateObject({
      model: google("gemini-2.0-flash"),
      schema: OrderSchema,
      prompt: prompt,
    });

    return Response.json(object);

  } catch (error) {
    console.error("❌ EXTRACTION API ERROR:", error);
    return Response.json({
      error: "Failed to extract orders",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
