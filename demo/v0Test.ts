async function main() {
    const apiKey = 'v1:83SkC9tJKHJUmqRsUPSeb02t:GWdSvbzjDyZGi6ONiWEtHlk4';
    const url = 'https://api.v0.dev/v1/chat/completions';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'v0-1.0-md',
                messages: [{ role: 'user', content: 'Hello!' }]
            })
        });

        const data = await response.json();
        console.log('--- V0 API RESPONSE ---');
        console.log(JSON.stringify(data, null, 2));
        console.log('-----------------------');
    } catch (error) {
        console.error('V0 FETCH ERROR:', error);
    }
}

main();
