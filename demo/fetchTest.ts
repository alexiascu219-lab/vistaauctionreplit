import 'dotenv/config';

async function main() {
    const apiKey = 'AIzaSyDLXSSwT4uCOHDQIUXhcO_xinPc_2a1UQw';
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: "Hello!" }]
            }]
        })
    });

    const data = await response.json();
    console.log('--- RAW FETCH RESPONSE ---');
    console.log(JSON.stringify(data, null, 2));
    console.log('---------------------------');
}

main();
