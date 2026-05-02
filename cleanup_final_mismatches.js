import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import * as dotenv from 'dotenv';
if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
} else {
    dotenv.config();
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function cleanup() {
    console.log("--- Starting Final Cleanup ---");

    // The 6 IDs to delete from the verification report
    // Pattern: it1_{uid}_{subjectSlug}
    const idsToDelete = [
        'it1_2520734_math_revision_final_it1',
        'it1_2520734_english_revision_final_it1',
        'it1_2521051_math_revision_final_it1',
        'it1_2521051_english_revision_final_it1',
        'it1_2521090_math_revision_final_it1',
        'it1_2530317_english_revision_final_it1'
    ];

    const { data, error } = await supabase
        .from('deliveries')
        .delete()
        .in('id', idsToDelete)
        .select('id');

    if (error) {
        console.error("Error during deletion:", error);
    } else {
        console.log(`Successfully deleted ${data?.length || 0} extra records.`);
    }

    console.log("--- Cleanup Complete ---");
}

cleanup();
