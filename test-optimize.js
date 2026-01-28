const { google } = require("@ai-sdk/google");
const { generateText } = require("ai");

const API_KEY = "AIzaSyBP0SfpbmZu7REj4JRLptkTQygATLA-h54";
process.env.GOOGLE_GENERATIVE_AI_API_KEY = API_KEY;

async function testOptimization() {
    console.log("Testing Route Optimization Logic...");

    const orders = [
        { id: "1", type: "Ambil", platform: "Grab", address: "Monas, Jakarta Pusat" },
        { id: "2", type: "Antar", platform: "Grab", address: "Grand Indonesia, Jakarta Pusat" },
        { id: "3", type: "Ambil", platform: "Shopee", address: "Kota Kasablanka, Jakarta Selatan" },
        { id: "4", type: "Antar", platform: "Shopee", address: "Blok M Plaza, Jakarta Selatan" } // Endpoint
    ];
    const endPointId = "4";

    const orderListText = orders.map((o) =>
        `ID: ${o.id} | Type: ${o.type} (${o.platform}) | Address: ${o.address}`
    ).join("\n");

    const prompt = `
    You are an expert logistics route planner for Jakarta/Indonesia.
    
    TASKS:
    1. Analyze the following list of courier orders.
    2. The route MUST END at: [Blok M Plaza, Jakarta Selatan] (ID: 4).
    3. Arrange the other orders in the most logical, efficient driving sequence to reach that end point.
    4. Consider the flow of "Pickup" (Ambil) before "Delivery" (Antar) if they seem related.
    
    ORDERS:
    ${orderListText}

    CRITICAL INSTRUCTION:
    Return ONLY a raw JSON object (no markdown, no backticks).
    The JSON must contain an array called "sortedIds".
    The last ID must be 4.
    
    Example output format:
    { "sortedIds": ["id1", "id2", "id_finish"] }
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
        console.log("Parsed JSON Success:", result);

    } catch (error) {
        console.error("FAILED. Error:", error.message);
    }
}

testOptimization();
