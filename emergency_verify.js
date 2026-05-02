import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://dxaeeijtahirkkqzxuqe.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4YWVlaWp0YWhpcmtrcXp4dXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTQ0MTMsImV4cCI6MjA5MDczMDQxM30.xKP5jkNBHv1Qm_2h0bDPSdbbm0yuXesT0f5irjnetK8'
);

async function verify() {
    console.log("--- Supabase Health Check ---");

    const { count: delCount, error: delErr } = await supabase.from('deliveries').select('*', { count: 'exact', head: true });
    const { count: stCount, error: stErr } = await supabase.from('student_sections').select('*', { count: 'exact', head: true });

    console.log(`Deliveries: ${delCount} (Error: ${delErr?.message || 'None'})`);
    console.log(`Student Sections: ${stCount} (Error: ${stErr?.message || 'None'})`);

    // Check IT students
    const { data: itStudents } = await supabase.from('student_sections').select('*').eq('section_key', 'IT-1').limit(10);
    console.log(`Sample IT Students (Mapped):`, itStudents?.length || 0);

    // Check one IT delivery
    if (itStudents && itStudents.length > 0) {
        const { data: itDel } = await supabase.from('deliveries').select('*').eq('universityId', itStudents[0].university_id).limit(1);
        console.log(`Delivery found for IT student ${itStudents[0].university_id}:`, itDel?.length || 0);
    }
}

verify();
