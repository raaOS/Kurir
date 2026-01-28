const { google } = require("@ai-sdk/google");
const { generateText } = require("ai");

// Using the key we verified earlier
const API_KEY = "AIzaSyBP0SfpbmZu7REj4JRLptkTQygATLA-h54";
process.env.GOOGLE_GENERATIVE_AI_API_KEY = API_KEY;

const fs = require('fs');

function log(msg) {
    console.log(msg);
    fs.appendFileSync('test-log.txt', msg + '\n');
}

async function runScenario() {
    fs.writeFileSync('test-log.txt', ''); // Clear log
    log("--- SCENARIO TEST: Notes & Mid-Route Insertion ---");

    log("\n1. Initial Orders:");
    const orders = [
        { id: "1", type: "Ambil", platform: "Grab", address: "Monas, Jakarta Pusat" },
        { id: "2", type: "Antar", platform: "Grab", address: "Pondok Indah Mall 2" },
        { id: "3", type: "Antar", platform: "Shopee", address: "Grand Indonesia, Lobby Arjuna (Titip Satpam)" },
    ];
    const endPointId = "2";

    log(orders.map(o => `- ${o.address}`).join("\n"));

    log("\n... Optimizing Route 1 ...");
    try {
        const route1 = await callAI(orders, endPointId);
        printRoute(route1);

        log("\n---------------------------------------------------------");
        log("2. User adds NEW order (Senayan City) - Should be inserted in middle");
        log("---------------------------------------------------------");

        const newOrder = { id: "4", type: "Ambil", platform: "Grab", address: "Senayan City, Lobby Selatan (Antri sebentar)" };
        orders.push(newOrder);

        log("... Optimizing Route 2 (With New Order) ...");
        const route2 = await callAI(orders, endPointId);
        printRoute(route2);

    } catch (e) {
        log("Test Failed: " + e.message);
    }
}

async function callAI(orders, endPointId) {
    const orderListText = orders.map((o) =>
        `ID: ${o.id} | Type: ${o.type} (${o.platform}) | Address: ${o.address}`
    ).join("\n");

    const endPointOrder = orders.find(o => o.id === endPointId);

    const prompt = `
    You are an expert logistics route planner for Jakarta/Indonesia.
    
    TASKS:
    1. Analyze the following list of courier orders.
    2. The route MUST END at: [${endPointOrder.address}] (ID: ${endPointId}).
    3. Arrange the other orders in the most logical, efficient driving sequence to reach that end point.
    4. INTELLIGENT PARSING: Split the input address into "cleaned_address" (for Google Maps) and "note" (user instructions/details).
    
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

function printRoute(route) {
    route.forEach((r, i) => {
        log(`[${i + 1}] ${r.cleaned_address}`);
        if (r.note) log(`    📝 MEMO: ${r.note}`);
        log(`    📍 Dist: ${r.distance}`);
    });
}

runScenario();
