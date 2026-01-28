const { google } = require("@ai-sdk/google");
const { generateText } = require("ai");

const API_KEY = "AIzaSyBP0SfpbmZu7REj4JRLptkTQygATLA-h54";
process.env.GOOGLE_GENERATIVE_AI_API_KEY = API_KEY;

const fs = require('fs');

function log(msg) {
    console.log(msg);
    fs.appendFileSync('test-log-startpoint.txt', msg + '\n');
}

async function runTest() {
    fs.writeFileSync('test-log-startpoint.txt', '');
    log("--- START POINT FEATURE TEST ---");

    // Scenario:
    // Orders are in:
    // A. West Jakarta (Neo Soho)
    // B. East Jakarta (Aeon Cakung)
    // End Point: South Jakarta (Pondok Indah)

    // IF Start Point is "Tangerang" (West), Logic suggests: Tangerang -> West -> East -> South (or West -> South -> East? No, East is far).
    // Probably Tangerang -> West (Neo Soho) -> South (PIM) -> East (Aeon)? No, PIM is end point.
    // So Tangerang -> West (Neo Soho) -> East (Aeon) -> South (PIM).

    // IF Start Point is "Bekasi" (East), Logic suggests: Bekasi -> East (Aeon) -> West (Neo Soho) -> South (PIM).

    // Let's test "Bekasi" start point. The first stop SHOULD be Aeon Cakung (East).

    const orders = [
        { id: "1", type: "Ambil", platform: "Grab", address: "Neo Soho Mall, Jakarta Barat" },
        { id: "2", type: "Ambil", platform: "Grab", address: "AEON Mall Cakung, Jakarta Timur" },
        { id: "3", type: "Antar", platform: "Grab", address: "Pondok Indah Mall, Jakarta Selatan" } // END
    ];
    const endPointId = "3";
    const startPoint = "Stasiun Bekasi, Jawa Barat";

    log(`Start Point: ${startPoint}`);
    log(`Orders: \n${orders.map(o => o.address).join('\n')}`);
    log(`End Point: ${orders[2].address}`);

    try {
        const route = await callAI(orders, endPointId, startPoint);
        log("\n--- OPTIMIZED ROUTE ---");
        route.forEach((r, i) => {
            log(`[${i + 1}] ${r.cleaned_address} (Dist: ${r.distance})`);
        });

        // Verification logic
        if (route[0].cleaned_address.includes("AEON") || route[0].cleaned_address.includes("Cakung")) {
            log("\n✅ SUCCESS: Route started at East Jakarta (nearest to Bekasi).");
        } else {
            log("\n❌ FAILURE: Route did not start at the expected nearest location.");
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
        ? `STARTING LOCATION: The courier starts strictly from [${startPoint}]. Calculate the first stop's distance FROM this location.`
        : `STARTING LOCATION: No specific start point provided. Assume the most logical first pick-up point.`;

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
