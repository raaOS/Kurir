import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export async function POST(req: Request) {
    try {
        const { orders, endPointId, preserveOrder, startPoint } = await req.json();

        if (!orders || orders.length < 2) {
            return Response.json({ message: "Not enough orders to optimize" }, { status: 400 });
        }

        const orderListText = orders.map((o: any) =>
            `ID: ${o.id} | Type: ${o.type} (${o.platform}) | Address: ${o.address}`
        ).join("\n");

        let taskInstruction = "";

        // Helper to determine region from coordinates (Jabodetabek)
        const getRegionHint = (coords: string): string => {
            const match = coords.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
            if (!match) return "";
            const lat = parseFloat(match[1]);
            const lon = parseFloat(match[2]);

            // Simple Bounding Box Logic for Jabodetabek
            if (lat < -6.50) return "BOGOR AREA (South)";
            if (lat < -6.35 && lat >= -6.50) return "DEPOK AREA (South of Jakarta)";

            if (lon < 106.70) return "TANGERANG AREA (West)";
            if (lon > 106.95) return "BEKASI AREA (East)";

            // Jakarta Internal Logic (Rough estimate)
            if (lat > -6.15) return "NORTH JAKARTA (Ancol, Pluit)";
            if (lat > -6.20) return "CENTRAL/WEST JAKARTA (Monas, Grogol)";
            return "SOUTH/EAST JAKARTA (Blok M, Tebet)";
        };

        const regionHint = startPoint && startPoint.includes(",") ? getRegionHint(startPoint) : "";

        // Define Start Point Context - ROBUST REGION AWARENESS
        const startPointContext = startPoint
            ? `STARTING LOCATION: [${startPoint}] ${regionHint ? `(Detected Region: ${regionHint})` : ""}.
               
               CRITICAL - SPATIAL SORTING RULES:
               1. You have been provided a 'Detected Region' for the start point (e.g., BOGOR, BEKASI).
               2. SCAN the 'Address' of each order in the list.
               3. The FIRST STOP in the route MUST be the order that is topologically CLOSEST to that Region.
               
               Example Matches:
               - If Region is "BOGOR" -> Pick order in "Cibinong" or "Sentul" first.
               - If Region is "BEKASI" -> Pick order in "Cakung" or "Tambun" first.
               - If Region is "NORTH JAKARTA" -> Pick order in "Mangga Dua" or "Ancol" first.`
            : `STARTING LOCATION: No specific start point provided. Assume the most logical first pick-up point.`;

        if (preserveOrder) {
            taskInstruction = `
        2. KEEP the orders in the EXACT SAME SEQUENCE as provided in the input list. DO NOT REORDER.
        3. ${startPointContext}
        4. ESTIMATE the driving distance from the previous stop for each item (start point distance is 0).
        5. INTELLIGENT PARSING: Split the input address into "cleaned_address" (for Google Maps) and "note" (user instructions/details).
        `;
        } else {
            const endPointOrder = orders.find((o: any) => o.id === endPointId);
            if (!endPointOrder) {
                return Response.json({ message: "End point not found in orders" }, { status: 400 });
            }
            taskInstruction = `
        2. The route MUST END at: [${endPointOrder.address}] (ID: ${endPointId}).
        3. ${startPointContext}
        4. Arrange the other orders to MINIMIZE TOTAL DRIVING DISTANCE.
        5. The first stop MUST BE the one logically closest to the STARTING LOCATION.
        6. Consider the flow of "Pickup" (Ambil) before "Delivery" (Antar) if they seem related.
        7. ESTIMATE the driving distance from the previous stop (or Start Point for the first item).
        8. INTELLIGENT PARSING: Split the input address into "cleaned_address" (for Google Maps) and "note" (user instructions/details).
        `;
        }

        const prompt = `
    You are an expert logistics route planner for JABODETABEK (Jakarta, Bogor, Depok, Tangerang, Bekasi).
    
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
        },
        { 
            "id": "input_id_2", 
            "distance": "2.5 km",
            "cleaned_address": "Kota Kasablanka Mall",
            "note": "Lobby utama"
        }
      ] 
    }
    `;

        // Using generateText is often more robust for simple keys than generateObject
        const { text } = await generateText({
            model: google("models/gemini-2.0-flash"),
            prompt: prompt,
        });

        // Clean up potential markdown formatting from AI response
        // Sometimes AI returns ```json ... ``` despite instructions.
        const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();

        let result;
        try {
            result = JSON.parse(cleanJson);
        } catch (parseError) {
            console.error("JSON Parse Error on:", cleanJson);
            throw new Error("AI returned invalid JSON: " + text.substring(0, 50) + "...");
        }

        return Response.json(result);
    } catch (error) {
        console.log("\n\n==========================================");
        console.error("❌ AI OPTIMIZATION ERROR:");
        console.error(error);
        console.log("==========================================\n\n");

        // Return detailed error to client for debugging
        return Response.json({
            error: "Optimization failed",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
