// Native fetch is available in Node.js 18+

// INSTRUCTIONS:
// 1. Get your Personal Access Token from Calendly (Integrations > API & Connectors).
// 2. Paste it below where it says 'YOUR_TOKEN_HERE'.
// 3. Run this script: node scripts/register_calendly.js

const CALENDLY_TOKEN = 'eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzY5Mzk4MTI4LCJqdGkiOiI3MWMwMjQ5Mi1iNjFhLTQ4NWEtOWNjOC1lMzAzYmZmYTU5ZDYiLCJ1c2VyX3V1aWQiOiIwYWIzMDE4My0wN2UwLTQyM2EtOTczNC0xYmU1Yjk3MThiZGUifQ.d3z6HC78dFlyH80OkcodpkLhD_Z3eOH9_CKMDcwHHhDqiRX_0dfrDSxzwDuSvVIYTJrn_DJcI-iCJ9wOztsT3g';
const WEBHOOK_URL = 'https://careers.vistaauction.com/api/webhooks/calendly';

async function registerWebhook() {
    try {
        // 1. Get Current User URI
        const userRes = await fetch('https://api.calendly.com/users/me', {
            headers: { 'Authorization': `Bearer ${CALENDLY_TOKEN}` }
        });
        const userData = await userRes.json();
        const userUri = userData.resource.uri;
        const organizationUri = userData.resource.current_organization;

        console.log('Found User URI:', userUri);

        // 2. Create Webhook Subscription
        const response = await fetch('https://api.calendly.com/webhook_subscriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CALENDLY_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: WEBHOOK_URL,
                events: ['invitee.created'],
                organization: organizationUri, // Subscribe at Org level (covers all event types)
                user: userUri,
                scope: 'organization'
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Webhook Registered Successfully!');
            console.log('ID:', data.resource.uuid);
        } else {
            console.error('❌ Failed:', JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

registerWebhook();
