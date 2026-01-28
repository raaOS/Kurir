const { google } = require("@ai-sdk/google");
const { generateText } = require("ai");

const API_KEY = "AIzaSyBP0SfpbmZu7REj4JRLptkTQygATLA-h54";
process.env.GOOGLE_GENERATIVE_AI_API_KEY = API_KEY;

async function testParsing() {
    console.log("Testing AI Parsing Logic...");

    const orders = [
        { id: "1", type: "Ambil", platform: "Grab", address: "Jl. Mawar No 5, Pagar hitam ada anjing galak (0812345678)" },
        { id: "2", type: "Antar", platform: "Grab", address: "Kantor Kelurahan Gambir, lantai 2 ruangan pak lurah" },
        { id: "3", type: "Ambil", platform: "Shopee", address: "Grand Indonesia West Mall, Lobby Arjuna" } // Endpoint
    ];
    const endPointId = "3";

    // Simulate AP code logic locally
    const orderListText = orders.map((o) =>
        `ID: ${o.id} | Type: ${o.type} (${o.platform}) | Address: ${o.address}`
    ).join("\n");

    const taskInstruction = `
        2. The route MUST END at: [Grand Indonesia West Mall, Lobby Arjuna] (ID: 3).
        3. Arrange the other orders in the most logical, efficient driving sequence to reach that end point.
        4. Consider the flow of "Pickup" (Ambil) before "Delivery" (Antar) if they seem related.
        5. ESTIMATE the driving distance from the previous stop for each item (start point distance is 0).
        6. INTELLIGENT PARSING: Split the input address into "cleaned_address" (for Google Maps) and "note" (user instructions/details).
  `;

    const prompt = `
    You are an expert logistics route planner for Jakarta/Indonesia.
    
    TASKS:
    1. Analyze the following list of courier orders.
    ${taskInstruction}
    
    ORDERS:
    ${orderListText}

    CRITICAL INSTRUCTION:
    Return ONLY a raw JSON object (no markdown, no backticks).
    The JSON must contain an array called "route" with objects.
    
    Example output format:
    { 
      "route": [
        { 
            "id": "input_id_1", 
            "distance": "0 km",
            "cleaned_address": "Jl. Merdeka No 45, Jakarta Pusat", 
            "note": "Pagar hitam, titip satpam (Ibu Ani 0812...)" 
        }
      ] 
    }
    `;

    try {
        console.log("Sending prompt to gemini-2.0-flash...");
        const { text } = await generateText({
            model: google("models/gemini-2.0-flash"),
            prompt: prompt,
        });

        console.log("\n--- AI Response ---");
        console.log(text);
        console.log("-------------------\n");

        const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const result = JSON.parse(cleanJson);
        console.log("Sorted & Parsed Result:", JSON.stringify(result, null, 2));

    } catch (error) {
        console.error("FAILED. Error:", error.message);
    }
}

testParsing();
