import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import * as dotenv from 'dotenv';
if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
} else {
    dotenv.config();
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function verify() {
    console.log("--- Starting Data Verification ---");

    // 1. Load ALL DB Data (Recursive)
    let dbDeliveries = [];
    let from = 0;
    const step = 1000;
    let finished = false;

    while (!finished) {
        const { data, error } = await supabase.from('deliveries').select('*').range(from, from + step - 1);
        if (error) {
            console.error("Error fetching DB data:", error);
            return;
        }
        if (data && data.length > 0) {
            dbDeliveries = [...dbDeliveries, ...data];
            if (data.length < step) finished = true;
            else from += step;
        } else {
            finished = true;
        }
    }
    console.log(`Fetched ${dbDeliveries.length} records from DB.`);

    // 2. Load and Parse List (Dragt.txt)
    const content = fs.readFileSync('Dragt.txt', 'utf8');
    const lines = content.trim().split('\n');
    const header = lines[0].split('\t').map(h => h.trim());

    const subjects = header.slice(1); // [bouns math (IT-1), Math_Revision_Final (IT-1), English_Revision_Final (IT-1)]
    const report = {
        mismatches: [],
        missingInDB: [],
        missingInList: [],
        summary: { total: 0, ok: 0 }
    };

    const listData = {}; // { universityId: { subject: status } }

    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('\t').map(p => p.trim());
        if (parts.length < 2) continue;
        const uid = parts[0];
        listData[uid] = {};
        for (let j = 1; j < parts.length; j++) {
            listData[uid][subjects[j - 1]] = parts[j];
        }
    }

    // 3. Compare
    for (const [uid, studentSubjects] of Object.entries(listData)) {
        for (const [subjectName, listStatus] of Object.entries(studentSubjects)) {
            report.summary.total++;

            const dbRecord = dbDeliveries.find(d =>
                String(d.universityId) === uid &&
                d.subjectName === subjectName
            );

            // Logic:
            // "طبعت واستلمت" or "سلمتها خلاص" -> delivered
            // "طبعت ومستلمتش" -> exists but not delivered
            // "مليش بونص اصلاً" or "لسه مطبعتش" -> not exists

            const isDeliveredKeyword = listStatus === "طبعت واستلمت" || listStatus === "سلمتها خلاص";
            const isPrintedNotReceived = listStatus === "طبعت ومستلمتش";
            const shouldNotExist = listStatus === "مليش بونص اصلاً" || listStatus === "لسه مطبعتش";

            if (shouldNotExist) {
                if (dbRecord) {
                    report.mismatches.push(`[${uid}] ${subjectName}: List says 'Not Exists' but DB has status '${dbRecord.status}'`);
                } else {
                    report.summary.ok++;
                }
            } else if (isDeliveredKeyword) {
                if (!dbRecord) {
                    report.missingInDB.push(`[${uid}] ${subjectName}: List says 'Delivered' but NOT in DB`);
                } else if (dbRecord.status !== 'delivered') {
                    report.mismatches.push(`[${uid}] ${subjectName}: List says 'Delivered' but DB status is '${dbRecord.status}'`);
                } else {
                    report.summary.ok++;
                }
            } else if (isPrintedNotReceived) {
                if (!dbRecord) {
                    report.missingInDB.push(`[${uid}] ${subjectName}: List says 'Printed' but NOT in DB`);
                } else if (dbRecord.status === 'delivered') {
                    report.mismatches.push(`[${uid}] ${subjectName}: List says 'NOT Delivered' but DB says 'delivered'`);
                } else {
                    report.summary.ok++;
                }
            }
        }
    }

    // 4. Output Results
    console.log(`\nVerification Summary:`);
    console.log(`Total Checks: ${report.summary.total}`);
    console.log(`Matched: ${report.summary.ok}`);
    console.log(`Mismatches: ${report.mismatches.length}`);
    console.log(`Missing in DB: ${report.missingInDB.length}`);

    if (report.mismatches.length > 0) {
        console.log("\n--- Mismatches ---");
        report.mismatches.slice(0, 10).forEach(m => console.log(m));
        if (report.mismatches.length > 10) console.log("...");
    }

    if (report.missingInDB.length > 0) {
        console.log("\n--- Missing in DB ---");
        report.missingInDB.slice(0, 10).forEach(m => console.log(m));
        if (report.missingInDB.length > 10) console.log("...");
    }
}

verify();
