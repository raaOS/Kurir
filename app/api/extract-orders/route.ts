import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { normalizeText } from "@/lib/normalizer";

// ✅ OUTPUT FORMAT v2.0 (AI-FIRST + BACKEND GUARD)
const OrderSchemaV2 = z.object({
  orders: z.array(z.object({
    order_id: z.string().nullable().describe("Order ID, e.g. #1234. Null if not found."),
    ambil: z.object({
      gps: z.string().describe("Clean GPS address choice (Robot). Empty if none."),
      note: z.string().describe("Human instructions / landmarks. Use ⚠️ for conflicts.")
    }),
    antar: z.object({
      gps: z.string().describe("Clean GPS address choice (Robot). Empty if none."),
      note: z.string().describe("Human instructions / landmarks. Use ⚠️ for conflicts.")
    }),
    confidence: z.number().describe("Initial confidence score (0-100)"),
    warnings: z.array(z.string()).describe("List of detected issues e.g. 'KONFLIK_ALAMAT', 'ALAMAT_NUMPANG'")
  })),
  route_order: z.array(z.string()).describe("Suggested sequence of stops")
});

export async function POST(req: Request) {
  try {
    const { text, platform } = await req.json();

    if (!text) return Response.json({ message: "No text provided" }, { status: 400 });

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Missing API Key" }, { status: 500 });
    }

    // Phase 0: Normalizer (Typo Tolerance)
    const cleanedText = normalizeText(text);

    // 🔒 PROMPT v2.0 — Kurir Chaos Address Parser
    const systemPrompt = `
Kamu adalah AI parser khusus data kurir Indonesia.
Input adalah RAW COPY-PASTE dari Grab / Shopee / SPX, penuh typo, singkatan, dan format rusak.

Tugasmu HANYA:
1. Menentukan ALAMAT AMBIL
2. Menentukan ALAMAT ANTAR
3. Memisahkan GPS ADDRESS vs NOTE MANUSIA
4. Mendeteksi konflik / numpang alamat
5. Memberi confidence score 0–100

DEFINISI PENTING:
- GPS ADDRESS = alamat yang dipakai Google Maps (Jalan, Kota).
- NOTE = instruksi manusia, petunjuk visual, emosi, klarifikasi.
- Jika ragu → masukkan ke NOTE, BUKAN GPS.

ATURAN INTI:
1. Segmentasi: Anggap alamat lengkap pertama = AMBIL, berikutnya = ANTAR.
2. GPS (Robot): Ambil versi PALING PANJANG & STRUKTURAL.
3. NOTE (Manusia): Masukkan ( ... ), KAPITAL emosional, kata arah (depan, pagar, cat), dan KATA KONFLIK (maps salah, aslinya, numpang).
4. KONFLIK/NUMPANG:
   - Jika nomor/unit beda atau "numpang alamat":
   - GPS TETAP yang tertulis resmi.
   - NOTE ditambah di BARIS PERTAMA: "⚠️ KONFLIK ALAMAT: <penjelasan>"
   - Masukkan tag "KONFLIK_ALAMAT" atau "ALAMAT_NUMPANG" ke array warnings.

OUTPUT WAJIB JSON SESUAI SCHEMA.
`;

    const userPrompt = `
TEKS HASIL COPY–PASTE:
"""
${cleanedText}
"""
`;

    const { object } = await generateObject({
      model: google("gemini-2.0-flash"),
      schema: OrderSchemaV2,
      system: systemPrompt,
      prompt: userPrompt,
    });

    // 🛑 BACKEND GUARDRAILS (SANITY CHECK)
    // Backend tidak baca alamat, hanya jaga keselamatan.
    const guardedOrders = object.orders.map(order => {
      let finalConfidence = order.confidence;

      // Rule 1: Safety First
      if (order.warnings.length > 0) {
        finalConfidence = Math.min(finalConfidence, 60); // Max Medium
      }

      // Rule 2: Conflict Detection in Notes (Double Check)
      const combinedNotes = (order.ambil.note + " " + order.antar.note).toUpperCase();
      if (combinedNotes.includes("⚠️") || combinedNotes.includes("KONFLIK") || combinedNotes.includes("SALAH")) {
        finalConfidence = Math.min(finalConfidence, 60);
        if (!order.warnings.includes("KONFLIK_TERDETEKSI")) {
          order.warnings.push("KONFLIK_TERDETEKSI");
        }
      }

      // Rule 3: Empty Address Panic
      if (!order.ambil.gps && !order.antar.gps) {
        finalConfidence = 20; // Low
        order.warnings.push("ALAMAT_KOSONG");
      }

      return {
        ...order,
        confidence: finalConfidence
      };
    });

    return Response.json({
      ...object,
      orders: guardedOrders
    });

  } catch (error) {
    console.error("❌ EXTRACTION API ERROR:", error);
    return Response.json({
      error: "Failed to extract orders",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
