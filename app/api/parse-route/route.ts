import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    if (!image) {
      return new Response("No image provided", { status: 400 });
    }

    const routeSchema = z.object({
      platform: z.enum(["grab", "shopee", "unknown"]),
      pickup_address: z.string(),
      delivery_address: z.string(),
      confidence: z.number(),
    });

    try {
      // Attempt AI Analysis
      const result = await generateObject({
        model: google("gemini-1.5-flash"),
        schema: routeSchema,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this delivery app screenshot (Grab or Shopee). \n1. Identify the Platform (Grab = Green/White, Shopee = Orange).\n2. Extract 'Pickup Address' (look for: 'Pick up', 'Pengirim', 'Sender', top address).\n3. Extract 'Delivery Address' (look for: 'Drop off', 'Penerima', 'Recipient', bottom address)." },
              { type: "image", image: image },
            ],
          },
        ],
      });
      return Response.json(result.object);

    } catch (aiError) {
      console.error("AI Service Failed, falling back to mock data:", aiError);

      // FALLBACK MOCK DATA (agar aplikasi tetap bisa didemo)
      // Deteksi kasar berdasarkan warna (jika ada warna teks/base64 yg bisa dicek simple, tapi kita random aja atau default)

      const mockData = {
        platform: "grab", // Default mock
        pickup_address: "Jalan Contoh Penjemputan No. 123 (Mode Offline)",
        delivery_address: "Jalan Tujuan Pengantaran No. 456 (Mode Offline)",
        confidence: 0.5,
        viz_note: "AI gagal, menggunakan data simulasi."
      };

      return Response.json(mockData);
    }

  } catch (error) {
    console.error("Route parsing error:", error);
    return new Response("System error", { status: 500 });
  }
}
