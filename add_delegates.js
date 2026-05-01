import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://dxaeeijtahirkkqzxuqe.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4YWVlaWp0YWhpcmtrcXp4dXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTQ0MTMsImV4cCI6MjA5MDczMDQxM30.xKP5jkNBHv1Qm_2h0bDPSdbbm0yuXesT0f5irjnetK8'
);

const delegates = [
    { name: 'كيرمينا هاني انور', code: '2520712', department: 'G2 C3' },
    { name: 'حنين احمد شعبان', code: '2520355', department: 'G1 C4' },
    { name: 'ياسمين بسيوني', code: '2521120', department: 'G3 C3' }
];

async function addDelegates() {
    console.log(`Adding ${delegates.length} delegates...`);
    const { error } = await supabase
        .from('delegates')
        .upsert(delegates, { onConflict: 'code' });

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Done! Delegates added successfully.');
    }
}

addDelegates();
