
/**
 * Normalizes text based on common Indonesian logistics typos and abbreviations.
 * This acts as Phase 0: The Cleaner Layer.
 */
export function normalizeText(text: string): string {
    if (!text) return "";

    let cleaned = text;

    // 1. Common Leet Speak & OCR Errors
    cleaned = cleaned
        .replace(/\bPlu1t\b/gi, "Pluit")
        .replace(/\bKran9\b/gi, "Karang")
        .replace(/\bJkt\b/gi, "Jakarta")
        .replace(/\bt0k0\b/gi, "toko")
        .replace(/\bb3si\b/gi, "besi")
        .replace(/\bpnt0\b/gi, "pintu")
        .replace(/0(?=\s*km)/gi, "O")
        .replace(/\bJl\s0\b/gi, "Jl.");

    // 2. Structural Fixes (Abbreviations to Formal)
    const structuralMap: [RegExp, string][] = [
        [/\b(j1|jln|jl)\.?\s/gi, "Jl. "],
        [/\b(n0|nmr|no)\.?\s/gi, "No. "],
        [/\b(bl|blk)\.?\s/gi, "Blok "],
        [/\b(lt|lantai)\.?\s/gi, "Lantai "],
        [/\b(u|un)\.?\s/gi, "Unit "],
        [/\b(rt)\.?\s?0*(\d+)/gi, "RT $2"],
        [/\b(rt)\.?\s/gi, "RT "],
        [/\b(rw)\.?\s/gi, "RW "],
    ];

    structuralMap.forEach(([regex, replacement]) => {
        cleaned = cleaned.replace(regex, replacement);
    });

    // 3. Directional/Visual Abbreviations (Context for Notes)
    const noteMap: [RegExp, string][] = [
        [/\b(dpn)\.?\s/gi, "depan "],
        [/\b(sblh|samping|smpng)\.?\s/gi, "samping "],
        [/\b(dkt)\.?\s/gi, "dekat "],
        [/\b(pgr)\.?\s/gi, "pagar "],
        [/\b(rmh)\.?\s/gi, "rumah "],
        [/\b(pth|pth)\.?\s/gi, "putih "],
        [/\b(hij|hj)\.?\s/gi, "hijau "],
        [/\b(htm)\.?\s/gi, "hitam "],
    ];

    noteMap.forEach(([regex, replacement]) => {
        cleaned = cleaned.replace(regex, replacement);
    });

    return cleaned;
}
