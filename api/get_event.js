import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { eventUri } = req.body;
    const token = process.env.VITE_CALENDLY_TOKEN;

    if (!token) {
        return res.status(500).json({ message: 'Server Configuration Error: Missing VITE_CALENDLY_TOKEN' });
    }

    if (!eventUri) {
        return res.status(400).json({ message: 'Missing eventUri' });
    }

    try {
        console.log(`Fetching Calendly Event: ${eventUri}`);
        const response = await fetch(eventUri, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Calendly API Error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const startTime = data.resource.start_time;
        const endTime = data.resource.end_time;

        console.log(`✅ Event Found: ${startTime}`);
        return res.status(200).json({ startTime, endTime });

    } catch (error) {
        console.error('Calendly Fetch Error:', error);
        return res.status(500).json({ message: 'Failed to fetch event details', error: error.message });
    }
}
