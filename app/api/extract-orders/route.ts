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
    warnings: z.array(z.string()).describe("List of detected issues e.g. 'KONFLIK_ALAMAT', 'ALAMAT_NUMPANG'"),
    // Addon Phase 2 Field
    location_type: z.object({
      guess: z.enum(["KOS", "KONTRAKAN", "APARTEMEN", "RUKO", "GUDANG", "RUMAH", "UNKNOWN"]),
      confidence: z.number(),
      reason: z.string()
    }).optional()
  })),
  route_order: z.array(z.string()).describe("Suggested sequence of stops")
});

const LocationInferenceSchema = z.object({
  location_type: z.object({
    guess: z.enum(["KOS", "KONTRAKAN", "APARTEMEN", "RUKO", "GUDANG", "RUMAH", "UNKNOWN"]),
    confidence: z.number().describe("0-100"),
    reason: z.string()
  })
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

    // 🔒 PROMPT FINAL LOCK v3.0 — Kurir Chaos Address Parser
    const systemPrompt = `
Kamu adalah AI parser khusus data kurir Indonesia.

Input adalah RAW COPY-PASTE dari aplikasi kurir (Grab / Shopee / SPX / dll),
penuh:
- typo
- singkatan
- format rusak
- alamat numpang
- note nyelip di mana saja

❌ Jangan mengarang
❌ Jangan mengoreksi ejaan
❌ Jangan menghapus konteks manusia

TUJUAN UTAMA:
1. Memisahkan ALAMAT AMBIL vs ALAMAT ANTAR
2. Memisahkan GPS ADDRESS (robot) vs NOTE (manusia)
3. Mendeteksi konflik & alamat numpang
4. Memberikan CONFIDENCE SCORE yang STABIL & REALISTIS
5. Output JSON DETERMINISTIK

DEFINISI PENTING:
- GPS ADDRESS → alamat untuk Google Maps
- NOTE → petunjuk manusia (visual, emosi, klarifikasi)
- Jika ragu → masukkan ke NOTE, BUKAN GPS
- UNKNOWN adalah jawaban sehat

1. SEGMENTASI ORDER (LOCKED)
- Anggap blok alamat lengkap pertama = AMBIL
- Blok alamat lengkap berikutnya = ANTAR
- Abaikan: Chat, Penerima, Berat / dimensi paket
- Jangan bergantung pada kata "Diambil / Antar" secara kaku

2. GPS ADDRESS RULE (ROBOT)
Sebuah teks LAYAK GPS jika:
- Ada jalan / gedung / kompleks
- Ada wilayah administratif (RT/RW, kelurahan, kecamatan, kota, provinsi)
- Jika ada lebih dari satu kandidat: pilih yang paling panjang & paling struktural
❌ Jangan masukkan: arah, warna, emosi, klarifikasi manusia

3. NOTE RULE (MANUSIA)
Masukkan ke NOTE jika mengandung:
- teks dalam ( ... )
- HURUF KAPITAL emosional
- kata arah / visual: depan, samping, gang, pagar, cat, warung, satpam, pos, belok, masuk, belakang
- klarifikasi: aslinya, alamat salah, maps salah, ikut alamat, numpang alamat
NOTE boleh berantakan, boleh panjang, boleh typo.

4. KONFLIK & ALAMAT NUMPANG (WAJIB)
Jika ditemukan:
- nomor rumah berbeda
- unit / blok berbeda
- alamat tetangga dipakai
➡️ GPS TIDAK BOLEH DIUBAH
➡️ NOTE WAJIB dimulai dengan: "⚠️ KONFLIK ALAMAT: <ringkasan>"
Tambahkan warning sesuai konteks: KONFLIK_ALAMAT, ALAMAT_NUMPANG, UNIT_TIDAK_JELAS

5. CONFIDENCE SCORING (LOCKED & STABIL)
Gunakan skema berikut secara konsisten:

BASE SCORE:
- GPS jelas & lengkap → 85
- GPS cukup jelas → 70
- GPS ambigu → 55
- GPS hampir tidak ada → 30

PENALTY (AKUMULATIF) - Kurangi score jika:
- Typo ringan: -3
- Typo berat / singkatan ekstrem: -7
- Note arah panjang: -5
- Konflik nomor rumah: -15
- Alamat numpang: -20
- Unit / blok tidak jelas: -20
- "alamat salah / maps salah": -25
- Tidak ada GPS: set ≤25

CEILING RULE (KERAS):
- Jika ada ⚠️ warning apa pun (KONFLIK/NUMPANG/UNIT)
➡️ confidence MAKSIMAL = 60

GPS SUFFICIENCY RULE (ADD-ON):
Jika GPS ada TAPI Note mengandung:
"tanya, satpam tau, ikut, dibelakang, rumah ke-, pintu ke-, masuk gang, sebelah, dekat, samping"
DAN tidak ada konflik:
➡️ Tambahkan warning: "GPS_TIDAK_SUFISIEN"
➡️ confidence MAKSIMAL = 70

FLOOR RULE:
- Jika hanya ada note manusia
➡️ confidence MAKSIMAL = 30

STABILITY RULE:
- Kasus dengan struktur mirip ➡️ confidence tidak boleh beda >10 poin

OUTPUT WAJIB JSON SESUAI SCHEMA.
`;

    const userPrompt = `
TEKS HASIL COPY–PASTE:
"""
${cleanedText}
"""
`;

    // Phase 1: Main Extraction
    const { object } = await generateObject({
      model: google("gemini-2.0-flash"),
      schema: OrderSchemaV2,
      system: systemPrompt,
      prompt: userPrompt,
    });

    // 🛑 BACKEND GUARDRAILS (SANITY CHECK)
    const guardedOrders = object.orders.map(order => {
      let finalConfidence = order.confidence;

      // 1. Conflict Guards (Red Level) - Cap at 60
      const severeWarnings = ["KONFLIK_ALAMAT", "ALAMAT_NUMPANG", "KONFLIK_TERDETEKSI", "UNIT_TIDAK_JELAS"];
      if (order.warnings.some(w => severeWarnings.includes(w))) {
        finalConfidence = Math.min(finalConfidence, 60);
      }

      // 2. Insufficiency Guard (Yellow Level) - Cap at 70
      if (order.warnings.includes("GPS_TIDAK_SUFISIEN")) {
        finalConfidence = Math.min(finalConfidence, 70);
      }

      const combinedNotes = (order.ambil.note + " " + order.antar.note).toUpperCase();
      if (combinedNotes.includes("⚠️") || combinedNotes.includes("KONFLIK") || combinedNotes.includes("SALAH")) {
        finalConfidence = Math.min(finalConfidence, 60);
        if (!order.warnings.includes("KONFLIK_TERDETEKSI")) {
          order.warnings.push("KONFLIK_TERDETEKSI");
        }
      }

      if (!order.ambil.gps && !order.antar.gps) {
        finalConfidence = 20;
        order.warnings.push("ALAMAT_KOSONG");
      }

      return { ...order, confidence: finalConfidence };
    });

    // Phase 2: Location Inference (Addon)
    // Run concurrently for speed
    const enrichedOrders = await Promise.all(guardedOrders.map(async (order) => {
      // Only run if confidence is high and we have an Antar address (usually the destination needs type)
      if (order.confidence >= 60 && (order.antar.gps || order.antar.note)) {
        try {
          const inferencePrompt = `
                Kamu adalah AI pembaca konteks lokasi kurir.
                Tugas: Tebak tipe lokasi tujuan (ANTAR) berdasarkan GPS dan NOTE.
                
                GPS: ${order.antar.gps}
                NOTE: ${order.antar.note}

                KATEGORI: KOS, KONTRAKAN, APARTEMEN, RUKO, GUDANG, RUMAH, UNKNOWN.
                
                ATURAN:
                - Kos: ada kata kos, kamar, ibu kos.
                - Apartemen: tower, unit, lobby, lift.
                - Ruko: blok, kav, lantai 2 usaha.
                - UNKNOWN jika tidak yakin (<40%).
                
                CONFIDENCE SCORE: Skala 0-100 (Contoh: 85, 90). JANGAN DESIMAL (0.8).
                JANGAN MEMAKSA. UNKNOWN adalah jawaban sehat.
                `;

          const inferenceResult = await generateObject({
            model: google("gemini-2.0-flash"),
            schema: LocationInferenceSchema,
            prompt: inferencePrompt
          });

          // Only attach if not UNKNOWN or low confidence
          const result = inferenceResult.object.location_type;
          if (result.guess !== "UNKNOWN" && result.confidence >= 50) {
            return {
              ...order,
              location_type: result
            };
          }
          return order;

        } catch (e) {
          // Ignore inference errors, fallback to Phase 1 result
          console.warn("Location inference failed", e);
          return order;
        }
      }
      return order;
    }));

    return Response.json({
      ...object,
      orders: enrichedOrders
    });

  } catch (error) {
    console.error("❌ EXTRACTION API ERROR:", error);
    return Response.json({
      error: "Failed to extract orders",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
