import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lovfbqnuxdihjidxacet.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvdmZicW51eGRpaGppZHhhY2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNjAyMjMsImV4cCI6MjA4MzgzNjIyM30.Y74ci0AFuG26XzIvbR65WEImmbi-9g1PYBgNgMZ01-g';
const supabase = createClient(supabaseUrl, supabaseKey);

const applicants = [
    {
        full_name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '555-0101',
        position: 'Sales Representative',
        status: 'New',
        notes: 'Shift Preference: Mon-Fri Morning'
    },
    {
        full_name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phone: '555-0102',
        position: 'Customer Service Representative',
        status: 'Interview Scheduled',
        notes: 'Shift Preference: Mon-Fri Afternoon. Previous Experience: Retail'
    },
    {
        full_name: 'Alice Johnson',
        email: 'alice.johnson@example.com',
        phone: '555-0103',
        position: 'Account Manager',
        status: 'Reviewed',
        notes: 'Location: Charlotte, NC'
    },
    {
        full_name: 'Bob Brown',
        email: 'bob.brown@example.com',
        phone: '555-0104',
        position: 'Sales Representative',
        status: 'New',
        notes: 'Referring Employee: Sarah Connor'
    },
    {
        full_name: 'Charlie Davis',
        email: 'charlie.davis@example.com',
        phone: '555-0105',
        position: 'Logistics Coordinator',
        status: 'New',
        notes: 'Shift Preference: Weekend'
    }
];

async function seed() {
    const { data, error } = await supabase.from('vista_applications').insert(applicants);
    if (error) {
        console.error('Error seeding data:', error);
    } else {
        console.log('Successfully added 5 applicants.');
    }
}

seed();
