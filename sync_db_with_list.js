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

async function sync() {
    console.log("--- Starting Database Sync ---");

    // 1. Load ALL DB Data (to get existing names)
    let dbDeliveries = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase.from('deliveries').select('id, studentName').range(from, from + 999);
        if (error) break;
        if (!data || data.length === 0) break;
        dbDeliveries = [...dbDeliveries, ...data];
        if (data.length < 1000) break;
        from += 1000;
    }
    const nameMap = {};
    dbDeliveries.forEach(d => { nameMap[d.id] = d.studentName; });

    // 2. Load List Data
    const content = fs.readFileSync('Dragt.txt', 'utf8');
    const lines = content.trim().split('\n');
    const header = lines[0].split('\t').map(h => h.trim());
    const subjects = header.slice(1);

    const listData = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('\t').map(p => p.trim());
        if (parts.length < 2) continue;
        const uid = parts[0];
        for (let j = 1; j < parts.length; j++) {
            listData.push({ uid, subject: subjects[j - 1], status: parts[j] });
        }
    }

    const updates = [];
    const inserts = [];
    const now = new Date().toISOString();
    const batch = "sync_" + Date.now();

    for (const item of listData) {
        const isDelivered = item.status === "طبعت واستلمت" || item.status === "سلمتها خلاص";
        const isPrintedNotReceived = item.status === "طبعت ومستلمتش";
        const shouldNotExist = item.status === "مليش بونص اصلاً" || item.status === "لسه مطبعتش";

        if (shouldNotExist) continue;

        const subjectSlug = slugify(item.subject);
        const id = `it1_${item.uid}_${subjectSlug}`; // Standard IT ID pattern

        const finalStatus = isDelivered ? 'delivered' : 'ready';

        inserts.push({
            id,
            universityId: item.uid,
            studentName: nameMap[id] || ("Student " + item.uid), // Preserve name if exists
            subjectName: item.subject,
            status: finalStatus,
            createdAt: now,
            deliveredAt: isDelivered ? now : null,
            uploadBatch: batch
        });
    }

    console.log(`Prepared ${inserts.length} records to upsert.`);

    // Upsert in batches of 100
    for (let i = 0; i < inserts.length; i += 100) {
        const chunk = inserts.slice(i, i + 100);
        const { error } = await supabase.from('deliveries').upsert(chunk, { onConflict: 'id' });
        if (error) {
            console.error("Error during upsert:", error);
        } else {
            console.log(`Upserted chunk ${i / 100 + 1}`);
        }
    }

    console.log("--- Sync Complete ---");
}

sync();
