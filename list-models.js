const API_KEY = "AIzaSyBP0SfpbmZu7REj4JRLptkTQygATLA-h54";

async function listModels() {
    console.log("Fetching models...");
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await response.json();

        if (data.models) {
            console.log("AVAILABLE MODELS:");
            data.models.forEach(m => {
                if (m.name.includes("gemini")) {
                    console.log(m.name);
                }
            });
        } else {
            console.log("No models found:", data);
        }
    } catch (error) {
        console.error("Error:", error.message);
    }
}

listModels();
