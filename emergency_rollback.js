import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import * as dotenv from 'dotenv';
if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
} else {
    dotenv.config();
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function rollback() {
    console.log("--- Starting Emergency Rollback ---");

    // 1. Revert the known 18 Mismatches (based on logs)
    // Format: { id: status }
    const reverts = {
        'it1_2520164_math_revision_final_it1': 'delivered',
        'it1_2520164_english_revision_final_it1': 'delivered',
        'it1_2520213_bouns_math_it1': 'with_delegate',
        'it1_2520226_bouns_math_it1': 'delivered',
        'it1_2520399_bouns_math_it1': 'ready',
        'it1_2520434_bouns_math_it1': 'delivered',
        'it1_2520444_math_revision_final_it1': 'delivered',
        'it1_2520444_english_revision_final_it1': 'delivered',
        'it1_2520514_bouns_math_it1': 'with_delegate',
        'it1_2520625_english_revision_final_it1': 'ready'
    };

    console.log("Reverting known mismatches...");
    for (const [id, status] of Object.entries(reverts)) {
        await supabase.from('deliveries').update({
            status: status,
            uploadBatch: 'original_restored',
            deliveredAt: status === 'delivered' ? new Date().toISOString() : null
        }).eq('id', id);
    }

    // 2. Identify all records with 'sync_' batch
    console.log("Identifying records from sync batch...");
    const { data: syncRecords, error } = await supabase.from('deliveries').select('id').ilike('uploadBatch', 'sync_%');
    if (error) {
        console.error("Error fetching sync records:", error);
        return;
    }

    // 3. Delete records that are NOT in the revert list (these are the newly added students)
    const idsToDelete = syncRecords.map(r => r.id).filter(id => !reverts[id]);

    console.log(`Deleting ${idsToDelete.length} newly added records...`);
    if (idsToDelete.length > 0) {
        // Delete in batches of 100
        for (let i = 0; i < idsToDelete.length; i += 100) {
            const chunk = idsToDelete.slice(i, i + 100);
            await supabase.from('deliveries').delete().in('id', chunk);
        }
    }

    console.log("--- Rollback Complete ---");
    console.log("Note: 8 mismatches were missing from the truncated log and may still need manual check.");
}

rollback();
