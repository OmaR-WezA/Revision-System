import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import * as dotenv from 'dotenv';
if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
} else {
    dotenv.config();
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

function slugify(text) {
    return text.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
}

async function fixBounsath() {
    console.log("--- Fixing 'bouns math (IT-1)' statuses from Dragt.txt ---");

    const content = fs.readFileSync('Dragt.txt', 'utf8');
    const lines = content.trim().split('\n');
    const header = lines[0].split('\t').map(h => h.trim());

    // Find the column index for bouns math
    const bounsColIndex = header.findIndex(h => h.toLowerCase().includes('bouns'));
    if (bounsColIndex === -1) {
        console.error("Could not find 'bouns math' column in Dragt.txt!");
        return;
    }
    console.log(`Found bouns math at column index: ${bounsColIndex} (${header[bounsColIndex]})`);

    const subjectName = 'bouns math (IT-1)';
    const subjectSlug = slugify(subjectName);
    const now = new Date().toISOString();

    let deliveredCount = 0;
    let readyCount = 0;
    let skippedCount = 0;

    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('\t').map(p => p.trim());
        if (parts.length < 2) continue;

        const uid = parts[0];
        const statusText = parts[bounsColIndex] || '';

        const isDelivered = statusText === 'طبعت واستلمت' || statusText === 'سلمتها خلاص';
        const isPrinted = statusText === 'طبعت ومستلمتش';
        const shouldSkip = statusText === 'مليش بونص اصلاً' || statusText === 'لسه مطبعتش';

        if (shouldSkip) {
            skippedCount++;
            continue;
        }

        const id = `it1_${uid}_${subjectSlug}`;
        const finalStatus = isDelivered ? 'delivered' : 'ready';

        const { error } = await supabase.from('deliveries').update({
            status: finalStatus,
            deliveredAt: isDelivered ? now : null
        }).eq('id', id);

        if (error) {
            // If update failed (record doesn't exist), try to insert it
            // We don't have the name, so we'll skip for now
            console.log(`  ⚠️ Could not update ${uid}: ${error.message}`);
        } else {
            if (isDelivered) deliveredCount++;
            else readyCount++;
        }
    }

    console.log(`\n✅ Done!`);
    console.log(`  Delivered (تم التسليم):  ${deliveredCount}`);
    console.log(`  Printed not received:      ${readyCount}`);
    console.log(`  Skipped (no booklet):      ${skippedCount}`);
}

fixBounsath();
