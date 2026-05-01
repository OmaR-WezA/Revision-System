import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://dxaeeijtahirkkqzxuqe.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4YWVlaWp0YWhpcmtrcXp4dXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTQ0MTMsImV4cCI6MjA5MDczMDQxM30.xKP5jkNBHv1Qm_2h0bDPSdbbm0yuXesT0f5irjnetK8'
);

// Confirmed mappings from WhatsApp
const toInsert = [
    // G1 C1
    { university_id: '2520048', section_key: 'G1 C1' },
    { university_id: '2520049', section_key: 'G1 C1' },
    { university_id: '2520050', section_key: 'G1 C1' },
    { university_id: '2520051', section_key: 'G1 C1' },
    { university_id: '2520053', section_key: 'G1 C1' },
    { university_id: '2520055', section_key: 'G1 C1' },
    { university_id: '2520056', section_key: 'G1 C1' },
    // G1 C2
    { university_id: '2520157', section_key: 'G1 C2' },
    { university_id: '2520159', section_key: 'G1 C2' },
    { university_id: '2520161', section_key: 'G1 C2' },
    { university_id: '2520164', section_key: 'G1 C2' },
    // G3 C4
    { university_id: '2560001', section_key: 'G3 C4' },
    { university_id: '2560017', section_key: 'G3 C4' },
    { university_id: '2560072', section_key: 'G3 C4' },
    { university_id: '2560114', section_key: 'G3 C4' },
    { university_id: '2560079', section_key: 'G3 C4' },
    { university_id: '2530256', section_key: 'G3 C4' },
];

async function fix() {
    console.log(`Inserting ${toInsert.length} students...`);
    const { error } = await supabase
        .from('student_sections')
        .upsert(toInsert, { onConflict: 'university_id', ignoreDuplicates: false });

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Done! All students inserted/updated successfully.');
    }
}

fix();
