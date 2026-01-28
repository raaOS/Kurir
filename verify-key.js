const API_KEY = "AIzaSyBP0SfpbmZu7REj4JRLptkTQygATLA-h54";

async function verify() {
    console.log("Checking available models for Key: " + API_KEY.substring(0, 5) + "...");

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await response.json();

        if (data.error) {
            console.error("API Error:", data.error.message);
        } else if (data.models) {
            console.log("SUCCESS! Available Models:");
            data.models.forEach(m => {
                if (m.name.includes("gemini")) console.log(`- ${m.name}`);
            });
        } else {
            console.log("No models found or unknown response structure.");
        }
    } catch (error) {
        console.error("Network Error:", error.message);
    }
}

verify();
