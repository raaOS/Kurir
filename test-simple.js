
// using global fetch in Node 18+

async function testConnection() {
    // 1x1 pixel white transparent base64 png
    const tinyImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";

    console.log("Testing API with tiny image...");
    try {
        const response = await fetch('http://localhost:3000/api/parse-route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: tinyImage })
        });

        console.log(`Status: ${response.status}`);
        const text = await response.text();
        console.log(`Body: ${text}`);

    } catch (err) {
        console.error("Test script error:", err);
    }
}

testConnection();
