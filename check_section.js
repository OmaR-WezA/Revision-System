import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://dxaeeijtahirkkqzxuqe.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4YWVlaWp0YWhpcmtrcXp4dXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTQ0MTMsImV4cCI6MjA5MDczMDQxM30.xKP5jkNBHv1Qm_2h0bDPSdbbm0yuXesT0f5irjnetK8'
);

async function check() {
    const section = 'G3 C3';
    console.log(`Checking data for section: ${section}`);

    // 1. How many students in this section?
    const { data: students, error: studentError } = await supabase
        .from('student_sections')
        .select('*')
        .eq('section_key', section);

    if (studentError) {
        console.error('Student Error:', studentError.message);
        return;
    }

    console.log(`Total students in ${section}: ${students.length}`);
    if (students.length === 0) {
        console.log("No students mapped to this section yet.");
    }

    const uids = students.map(s => s.university_id);

    // 2. Any deliveries for these students?
    const { data: deliveries, error: deliveryError } = await supabase
        .from('deliveries')
        .select('*')
        .in('universityId', uids);

    if (deliveryError) {
        console.error('Delivery Error:', deliveryError.message);
        return;
    }

    console.log(`Total deliveries found for section students: ${deliveries.length}`);

    const readyCount = deliveries.filter(d => d.status === 'ready').length;
    const assignedCount = deliveries.filter(d => d.status === 'with_delegate').length;
    const deliveredCount = deliveries.filter(d => d.status === 'delivered').length;

    console.log(`Status Breakdown:`);
    console.log(`- Ready (With Admin): ${readyCount}`);
    console.log(`- With Delegate: ${assignedCount}`);
    console.log(`- Delivered: ${deliveredCount}`);
}

check();
