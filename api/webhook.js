import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export default async function handler(req, res) {
    // 1. Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // 2. Security: Verify Calendly Signature (Optional but recommended)
    // For now, we'll skip strict signature verification to get it working, 
    // but in production you should verify 'Calendly-Webhook-Signature' header.

    const body = req.body;
    const event = body.event;
    const payload = body.payload;

    console.log(`Received Calendly Event: ${event}`);

    // 3. Filter for "invitee.created" (Booking made)
    if (event === 'invitee.created') {
        const email = payload.email;
        const startTime = payload.scheduled_event.start_time; // ISO String

        console.log(`Booking for: ${email} at ${startTime}`);

        if (!email || !startTime) {
            return res.status(400).json({ message: 'Missing email or start_time' });
        }

        // 4. Initialize Supabase Admin Client
        // We use the SERVICE_ROLE_KEY to bypass RLS policies and update any record.
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 5. Update the Record
        // We ONLY update 'interview_date'. We do NOT change the status.
        const { error } = await supabase
            .from('vista_applications')
            .update({ interview_date: startTime })
            .eq('email', email);

        if (error) {
            console.error('Supabase Update Error:', error);
            return res.status(500).json({ message: 'Database Update Failed', error: error.message });
        }

        console.log('Successfully updated interview_date.');
        return res.status(200).json({ message: 'Sync Successful' });
    }

    // Handle cancellation if needed (invitee.canceled)
    if (event === 'invitee.canceled') {
        const email = payload.email;
        // Logic to clear date could go here
        console.log(`Cancellation for: ${email}`);
        return res.status(200).json({ message: 'Cancellation processed (No-op)' });
    }

    return res.status(200).json({ message: 'Event ignored' });
}
