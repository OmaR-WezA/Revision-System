import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://dxaeeijtahirkkqzxuqe.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4YWVlaWp0YWhpcmtrcXp4dXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTQ0MTMsImV4cCI6MjA5MDczMDQxM30.xKP5jkNBHv1Qm_2h0bDPSdbbm0yuXesT0f5irjnetK8'
);

async function deduplicate() {
    console.log("--- Starting Deduplication ---");

    // 1. Fetch all deliveries
    let allRecords = [];
    let from = 0;
    let finished = false;
    while (!finished) {
        const { data, error } = await supabase.from('deliveries').select('*').range(from, from + 999);
        if (error) { console.error(error); break; }
        if (data.length < 1000) finished = true;
        allRecords = [...allRecords, ...data];
        from += 1000;
    }

    console.log(`Fetched ${allRecords.length} records.`);

    // 2. Group by UniversityId + SubjectName
    const groups = {};
    allRecords.forEach(r => {
        const key = `${r.universityId}_${r.subjectName}`.toLowerCase().trim();
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
    });

    const toDeleteIds = [];
    const statusPriority = { 'delivered': 3, 'with_delegate': 2, 'ready': 1 };

    Object.entries(groups).forEach(([key, records]) => {
        if (records.length > 1) {
            // Sort by priority (Delivered first) then by ID (favoring it1_ prefixes if both exist)
            records.sort((a, b) => {
                const pA = statusPriority[a.status] || 0;
                const pB = statusPriority[b.status] || 0;
                if (pA !== pB) return pB - pA;
                return b.id.length - a.id.length; // Favor longer IDs (usually it1_ prefixed)
            });

            // Keep the first, delete the rest
            const kept = records[0];
            const redundant = records.slice(1);
            console.log(`Duplicate found for student ${kept.universityId} (${kept.subjectName}): Total ${records.length}. Keeping ID: ${kept.id}`);
            redundant.forEach(r => toDeleteIds.push(r.id));
        }
    });

    if (toDeleteIds.length === 0) {
        console.log("No duplicates found.");
        return;
    }

    console.log(`Found ${toDeleteIds.length} records to delete.`);

    // 3. Delete in batches of 100
    for (let i = 0; i < toDeleteIds.length; i += 100) {
        const batch = toDeleteIds.slice(i, i + 100);
        const { error } = await supabase.from('deliveries').delete().in('id', batch);
        if (error) {
            console.error(`Error deleting batch starting at ${i}:`, error);
        } else {
            console.log(`Deleted batch ${i / 100 + 1}`);
        }
    }

    console.log("Deduplication complete!");
}

deduplicate();
