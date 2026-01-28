const { google } = require("@ai-sdk/google");
const { generateText } = require("ai");

const API_KEY = "AIzaSyBP0SfpbmZu7REj4JRLptkTQygATLA-h54";
process.env.GOOGLE_GENERATIVE_AI_API_KEY = API_KEY;

const fs = require('fs');

function log(msg) {
    console.log(msg);
    fs.appendFileSync('stress-test-log.txt', msg + '\n');
}

// 1. Mock Request Function (Simulating route.ts internal logic)
async function testScenario(name, startCoords, orders) {
    log(`\n=== SCENARIO: ${name} ===`);
    log(`Start: ${startCoords}`);

    // Simulate Backend "getRegionHint"
    const getRegionHint = (coords) => {
        const match = coords.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (!match) return "UNKNOWN";
        const lat = parseFloat(match[1]);
        const lon = parseFloat(match[2]);

        if (lat < -6.50) return "BOGOR AREA (South)";
        if (lat < -6.35 && lat >= -6.50) return "DEPOK AREA (South of Jakarta)";
        if (lon < 106.70) return "TANGERANG AREA (West)";
        if (lon > 106.95) return "BEKASI AREA (East)";
        if (lat > -6.15) return "NORTH JAKARTA";
        return "CENTRAL/SOUTH JAKARTA";
    };

    const region = getRegionHint(startCoords);
    log(`[Backend Logic Mock] Detected Region: ${region}`);

    // Call AI with the Real Prompt Logic
    const route = await callAI(orders, startCoords, region);

    log("--- Result ---");
    route.forEach((r, i) => {
        log(`[${i + 1}] ${r.cleaned_address}`);
    });

    return route[0].cleaned_address;
}

async function callAI(orders, startPoint, regionHint) {
    const orderListText = orders.map((o) =>
        `ID: ${o.id} | Type: ${o.type} (${o.platform}) | Address: ${o.address}`
    ).join("\n");

    const startPointContext = `STARTING LOCATION: [${startPoint}] (Detected Region: ${regionHint}).
               
               CRITICAL - SPATIAL SORTING RULES:
               1. You have been provided a 'Detected Region' for the start point (e.g., BOGOR, BEKASI).
               2. SCAN the 'Address' of each order in the list.
               3. The FIRST STOP in the route MUST be the order that is topologically CLOSEST to that Region.`;

    const taskInstruction = `
        2. The route MUST END at: [${orders[orders.length - 1].address}].
        3. ${startPointContext}
        4. Arrange the other orders to MINIMIZE TOTAL DRIVING DISTANCE.
     `;

    const prompt = `
    You are an expert logistics route planner for JABODETABEK (Jakarta, Bogor, Depok, Tangerang, Bekasi).
    
    TASKS:
    1. Analyze the following list of courier orders.
    ${taskInstruction}
    
    ORDERS:
    ${orderListText}

    CRITICAL INSTRUCTION:
    Return ONLY a raw JSON object. Array "route".
    Format: { "route": [{ "id": "...", "distance": "...", "cleaned_address": "...", "note": "..." }] }
    `;

    try {
        const { text } = await generateText({
            model: google("models/gemini-2.0-flash"),
            prompt: prompt,
        });
        const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanJson).route;
    } catch (e) {
        log("AI Error: " + e.message);
        return [];
    }
}

async function runStressTest() {
    fs.writeFileSync('stress-test-log.txt', '');

    // Case 1: Bekasi Start (East) -> Should pick Aeon Cakung (East)
    await testScenario("Bekasi Start", "-6.22, 107.00", [
        { id: "1", type: "Ambil", platform: "Grab", address: "Neo Soho (West)" },
        { id: "2", type: "Ambil", platform: "Grab", address: "Aeon Cakung (East)" },
        { id: "3", type: "Antar", platform: "Grab", address: "PIM (South)" }
    ]);

    // Case 2: Bogor Start (South) -> Should pick Cibinong or Depok over Jakarta
    await testScenario("Bogor Start", "-6.59, 106.80", [
        { id: "1", type: "Ambil", platform: "Grab", address: "Monas (Central)" },
        { id: "2", type: "Ambil", platform: "Grab", address: "Cibinong City Mall (Bogor)" },
        { id: "3", type: "Antar", platform: "Grab", address: "Ancol (North)" }
    ]);

    // Case 3: Tangerang Start (West) -> Should pick Summarecon Serpong over Bekasi
    await testScenario("Tangerang Start", "-6.23, 106.60", [
        { id: "1", type: "Ambil", platform: "Grab", address: "Summarecon Mall Serpong (West)" },
        { id: "2", type: "Ambil", platform: "Grab", address: "Grand Galaxy Park Bekasi (East)" },
        { id: "3", type: "Antar", platform: "Grab", address: "Sarinah (Central)" }
    ]);
}

runStressTest();
