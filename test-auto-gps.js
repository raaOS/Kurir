const { google } = require("@ai-sdk/google");
const { generateText } = require("ai");

const API_KEY = "AIzaSyBP0SfpbmZu7REj4JRLptkTQygATLA-h54";
process.env.GOOGLE_GENERATIVE_AI_API_KEY = API_KEY;

const fs = require('fs');

function log(msg) {
    console.log(msg);
    fs.appendFileSync('test-log-gps.txt', msg + '\n');
}

async function runTest() {
    fs.writeFileSync('test-log-gps.txt', '');
    log("--- AUTO GPS FEATURE TEST ---");

    // Scenario:
    // User is physically at "Ancol" (North Jakarta).
    // Orders:
    // 1. Mangga Dua (North, close to Ancol)
    // 2. Grand Indonesia (Center)
    // 3. Blok M (South) - End Point

    // GPS Coordinates for Ancol: -6.1257176, 106.8416666

    // Expected Route: Ancol (Start) -> Mangga Dua -> GI -> Blok M.
    // IF the logic is wrong and it ignores GPS, it might try to start from GI or random.

    const orders = [
        { id: "1", type: "Ambil", platform: "Grab", address: "Mangga Dua Square" },
        { id: "2", type: "Ambil", platform: "Grab", address: "Grand Indonesia" },
        { id: "3", type: "Antar", platform: "Grab", address: "Blok M Square" } // END
    ];
    const endPointId = "3";

    // Simulating the format sent by navigator.geolocation (`lat,long`)
    // BUT we found Gemini struggles with pure numbers. 
    // In a real app, we might reverse-geocode this first.
    // Let's test if providing a HINT works better.
    const startPointMockCoords = "Near Ancol, North Jakarta (Lat -6.12)";

    log(`Simulated GPS Input: ${startPointMockCoords}`);
    log(`Orders: \n${orders.map(o => o.address).join('\n')}`);

    try {
        const route = await callAI(orders, endPointId, startPointMockCoords);
        log("\n--- OPTIMIZED ROUTE ---");
        route.forEach((r, i) => {
            log(`[${i + 1}] ${r.cleaned_address} (Dist: ${r.distance})`);
        });

        // Verification logic
        // First stop should be Mangga Dua (closest to Ancol)
        if (route[0].cleaned_address.toLowerCase().includes("mangga dua")) {
            log("\n✅ SUCCESS: Route correctly started at the location nearest to GPS coordinates.");
        } else {
            log("\n❌ FAILURE: Auto-GPS logic failed. Check prompt handling for coordinates.");
        }

    } catch (e) {
        log("Error: " + e.message);
    }
}

async function callAI(orders, endPointId, startPoint) {
    const orderListText = orders.map((o) =>
        `ID: ${o.id} | Type: ${o.type} (${o.platform}) | Address: ${o.address}`
    ).join("\n");

    const endPointOrder = orders.find(o => o.id === endPointId);

    const startPointContext = startPoint
        ? `STARTING LOCATION: The courier starts strictly from GPS COORDINATES [${startPoint}]. Calculate the first stop's distance FROM this location.`
        : `STARTING LOCATION: No specific start point provided.`;

    const taskInstruction = `
        2. The route MUST END at: [${endPointOrder.address}] (ID: ${endPointId}).
        3. ${startPointContext}
        4. Arrange the other orders in the most logical, efficient driving sequence to reach that end point from the start.
        5. INTELLIGENT PARSING: Split the input address into "cleaned_address" (for Google Maps) and "note" (user instructions/details).
        6. ESTIMATE the driving distance from the previous stop (or Start Point for the first item).
     `;

    const prompt = `
    You are an expert logistics route planner for Jakarta/Indonesia.
    
    TASKS:
    1. Analyze the following list of courier orders.
    ${taskInstruction}
    
    ORDERS:
    ${orderListText}

    CRITICAL INSTRUCTION:
    Return ONLY a raw JSON object. Array "route".
    Format: { "route": [{ "id": "...", "distance": "...", "cleaned_address": "...", "note": "..." }] }
    `;

    const { text } = await generateText({
        model: google("models/gemini-2.0-flash"),
        prompt: prompt,
    });

    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson).route;
}

runTest();
