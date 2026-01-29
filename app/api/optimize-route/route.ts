import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export async function POST(req: Request) {
    try {
        const { orders, endPointId, preserveOrder, startPoint, orderListText: reqOrderListText } = await req.json();

        if (!orders || orders.length < 2) {
            return Response.json({ message: "Not enough orders to optimize" }, { status: 400 });
        }

        const orderListText = reqOrderListText || orders.map((o: any) =>
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
    You are an expert logistics route planner for JABODETABEK.
    
    TASKS:
    1. Analyze the following list of courier orders.
    2. ${taskInstruction}
    
    ORDERS:
    ${orderListText}

    CRITICAL CONSOLIDATION RULES:
    1. For each order, RETAIN the recipient_name, order_id, and service_type provided in the record if they are already present and accurate.
    2. If a field is missing (e.g., "-"), attempt to find it in the "Address" string (which might actually be a raw copy-paste).
    3. "cleaned_address": MUST be a valid, short address for Google Maps. Clean it from notes, floor numbers, or recipient names.
    4. "total_revenue": Only return this if you see a new, more accurate total revenue line in the input.

    Return ONLY a raw JSON object (no markdown, no backticks).
    
    Example output format:
    { 
      "total_revenue": "Rp11.400",
      "route": [
        { 
            "id": "input_id_1", 
            "distance": "0 km",
            "cleaned_address": "Jl. Merdeka No 45, Jakarta Pusat", 
            "note": "Pagar hitam",
            "recipient_name": "Apotek Dian Prima",
            "deadline": "10:06 PM",
            "order_id": "GM-191",
            "service_type": "GrabMart"
        }
      ] 
    }
    `;

        // Using generateText is often more robust for simple keys than generateObject
        const { text } = await generateText({
            model: google("gemini-2.0-flash"),
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

        // ... existing AI processing ...

        // HYBRID INTELLIGENCE: Override AI distances with Google Maps Real Data if Key exists
        if (process.env.GOOGLE_MAPS_API_KEY && result.route && result.route.length > 0) {
            console.log("🗺️ GOOGLE MAPS ACTIVE: Calculating precise distances...");
            try {
                // Helper to fetch distance for a single leg
                const getLegDistance = async (origin: string, dest: string) => {
                    if (!origin || !dest) return "0 km";
                    try {
                        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(dest)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
                        const res = await fetch(url);
                        const data = await res.json();

                        if (data.status !== "OK") {
                            console.error(`❌ Maps API Error (Status: ${data.status}):`, data.error_message);
                        } else if (data.rows[0].elements[0].status !== "OK") {
                            console.error(`⚠️ Route not found (Element Status: ${data.rows[0].elements[0].status}) for ${origin} -> ${dest}`);
                        }

                        if (data.status === "OK" && data.rows[0].elements[0].status === "OK") {
                            return data.rows[0].elements[0].distance.text;
                        }
                    } catch (e) {
                        console.error("Maps API Network/Parse Error:", e);
                    }
                    return null; // Fallback to AI's guess if fails
                };

                // Sequential processing to respect rate limits & dependency
                let currentOrigin = startPoint || "Jakarta, Indonesia"; // Fallback start

                // If startPoint is coordinates (lat,long), it's valid for Maps API

                for (let i = 0; i < result.route.length; i++) {
                    const stop = result.route[i];
                    // Use cleaned_address for accuracy, fallback to raw address
                    const destination = stop.cleaned_address || stop.address;

                    const realDist = await getLegDistance(currentOrigin, destination);

                    if (realDist) {
                        result.route[i].distance = realDist;
                        result.route[i].distanceSource = "google";
                    } else {
                        result.route[i].distanceSource = "ai_estimate";
                    }

                    // Update origin for next leg
                    currentOrigin = destination;
                }
                console.log("✅ Google Maps Distances Updated!");
            } catch (mapError) {
                console.error("⚠️ Google Maps Integration Failed (Using AI Fallback):", mapError);
            }
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
