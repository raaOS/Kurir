
const fs = require('fs');
const path = require('path');

async function testImage(filename) {
    const filePath = path.join('c:/Users/USER/Documents/kurir-asisten/Contoh gambar rute', filename);
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const base64Image = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;

    console.log(`Analyzing ${filename}...`);

    try {
        const response = await fetch('http://localhost:3000/api/parse-route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`HTTP error! status: ${response.status}`, errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`\n--- Result for ${filename} ---`);
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Error analyzing ${filename}:`, error.message);
    }
}

async function main() {
    await testImage('photo_6328061259399499569_y.jpg');
    await testImage('photo_6328061259399499570_y.jpg');
}

main();
