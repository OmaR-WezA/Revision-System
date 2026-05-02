import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import * as dotenv from 'dotenv';
if (fs.existsSync('.env.local')) { dotenv.config({ path: '.env.local' }); } else { dotenv.config(); }

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fix() {
    // Fetch ALL records
    let all = [];
    let from = 0;
    while (true) {
        const { data } = await supabase.from('deliveries').select('id, universityId, subjectName, status, delegateId').range(from, from + 999);
        if (!data || data.length === 0) break;
        all = [...all, ...data];
        if (data.length < 1000) break;
        from += 1000;
    }
    console.log(`Total records: ${all.length}`);

    // Group strictly by universityId (as string) + normalized subjectName
    const groups = {};
    all.forEach(r => {
        // Normalize: trim spaces, lowercase, remove all extra whitespace
        const uid = String(r.universityId || '').trim();
        const subject = String(r.subjectName || '').trim().replace(/\s+/g, ' ').toLowerCase();
        const key = `${uid}___${subject}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
    });

    const statusPriority = { 'delivered': 3, 'with_delegate': 2, 'ready': 1 };
    const toDelete = [];
    let dupCount = 0;

    for (const [key, records] of Object.entries(groups)) {
        if (records.length > 1) {
            dupCount++;
            // Sort: delivered first, then with_delegate, then ready
            records.sort((a, b) => (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0));
            const keep = records[0];
            const remove = records.slice(1);
            console.log(`DUP [${key.split('___')[0]}] ${keep.subjectName}: keeping "${keep.id}" (${keep.status}), deleting ${remove.length} extra`);
            remove.forEach(r => toDelete.push(r.id));
        }
    }

    console.log(`\nFound ${dupCount} duplicate groups → ${toDelete.length} records to delete`);

    if (toDelete.length === 0) {
        // If no duplicates by normalised key, show what 2520990 looks like
        const student = all.filter(r => String(r.universityId).trim() === '2520990');
        console.log('\nRecords for 2520990:', JSON.stringify(student, null, 2));
        return;
    }

    for (let i = 0; i < toDelete.length; i += 100) {
        const chunk = toDelete.slice(i, i + 100);
        const { error } = await supabase.from('deliveries').delete().in('id', chunk);
        if (error) console.error('Error:', error.message);
        else console.log(`Deleted batch ${Math.floor(i / 100) + 1}`);
    }

    console.log('\n✅ Deduplication complete!');
}

fix();
