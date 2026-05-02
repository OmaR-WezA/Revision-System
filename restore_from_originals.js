import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
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

function parseExcel(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const students = [];
    // Find header row - look for row with "الرقم" or similar
    let startRow = 0;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowStr = row.join('').toLowerCase();
        if (rowStr.includes('الرقم') || rowStr.includes('اسم') || rowStr.includes('id')) {
            startRow = i + 1;
            break;
        }
    }

    for (let i = startRow; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 2) continue;

        // Try to find university ID (7-digit number)
        let uid = null;
        let name = null;

        for (const cell of row) {
            const val = String(cell || '').trim();
            if (/^\d{7}$/.test(val) || /^\d{6}$/.test(val)) {
                uid = val;
            } else if (val.length > 5 && /[\u0600-\u06FF]/.test(val)) {
                // Arabic text = student name
                if (!name) name = val;
            }
        }

        if (uid && name) {
            students.push({ uid, name });
        } else if (uid) {
            students.push({ uid, name: `طالب ${uid}` });
        }
    }

    return students;
}

async function restore() {
    console.log("=== Starting Full Database Restoration ===\n");

    // 1. Fetch EXISTING DB data first (to preserve statuses)
    console.log("Loading existing DB records...");
    let dbDeliveries = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase.from('deliveries').select('id, status, delegateId, deliveredAt, assignedAt, assignBatchId').range(from, from + 999);
        if (error || !data || data.length === 0) break;
        dbDeliveries = [...dbDeliveries, ...data];
        if (data.length < 1000) break;
        from += 1000;
    }
    console.log(`Found ${dbDeliveries.length} existing records in DB.`);

    const existingMap = {};
    dbDeliveries.forEach(d => { existingMap[d.id] = d; });

    // 2. Process each subject file
    const files = [
        { path: 'data_sheet/bouns math.xlsx', subject: 'bouns math (IT-1)' },
        { path: 'data_sheet/Math_Revision_Final.xlsx', subject: 'Math_Revision_Final (IT-1)' },
        { path: 'data_sheet/English_Revision_Final.xlsx', subject: 'English_Revision_Final (IT-1)' }
    ];

    let totalUpserted = 0;

    for (const file of files) {
        console.log(`\nProcessing: ${file.subject}`);

        if (!fs.existsSync(file.path)) {
            console.log(`  ⚠️ File not found: ${file.path}`);
            continue;
        }

        const students = parseExcel(file.path);
        console.log(`  Found ${students.length} students in file.`);

        const subjectSlug = slugify(file.subject);
        const rows = [];
        const now = new Date().toISOString();

        for (const student of students) {
            const id = `it1_${student.uid}_${subjectSlug}`;
            const existing = existingMap[id];

            rows.push({
                id,
                universityId: student.uid,
                studentName: student.name,
                subjectName: file.subject,
                // PRESERVE existing status if it exists! Otherwise default to 'ready'
                status: existing?.status || 'ready',
                createdAt: now,
                uploadBatch: 'restore_' + Date.now(),
                delegateId: existing?.delegateId || null,
                deliveredAt: existing?.deliveredAt || null,
                assignedAt: existing?.assignedAt || null,
                assignBatchId: existing?.assignBatchId || null
            });
        }

        // Upsert in batches
        for (let i = 0; i < rows.length; i += 100) {
            const chunk = rows.slice(i, i + 100);
            const { error } = await supabase.from('deliveries').upsert(chunk, { onConflict: 'id' });
            if (error) {
                console.error(`  ❌ Error: ${error.message}`);
            }
        }

        console.log(`  ✅ Upserted ${rows.length} records for ${file.subject}`);
        totalUpserted += rows.length;
    }

    console.log(`\n=== Restoration Complete! Total: ${totalUpserted} records ===`);
    console.log("Note: Existing statuses (delivered, with_delegate) were preserved.");
}

restore();
