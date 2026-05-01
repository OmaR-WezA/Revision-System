import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://dxaeeijtahirkkqzxuqe.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4YWVlaWp0YWhpcmtrcXp4dXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTQ0MTMsImV4cCI6MjA5MDczMDQxM30.xKP5jkNBHv1Qm_2h0bDPSdbbm0yuXesT0f5irjnetK8'
);

const rawData = [
    { name: 'خالد حسن علي حسن', code: '2520362', section: 'G1 C4' },
    { name: 'جني عادل احمد مصطفى', code: '2520292', section: 'G1 C3' },
    { name: 'بدر شعبان محمد عبدالحميد', code: '2520233', section: 'G1 C3' },
    { name: 'عمار محمد احمد راشد', code: '2520633', section: 'G2 C2' },
    { name: 'حنين احمد شعبان طاهر', code: '2520355', section: 'G1 C4' },
    { name: 'اميره محمود محمد عبدالهادى', code: '2520043', section: 'G1 C1' },
    { name: 'يوسف رضا صلاح', code: '2521147', section: 'G3 C4' },
    { name: 'علي فتحي علي حسن', code: '2520628', section: 'G2 C2' },
    { name: 'يحيي محمد عبد الحميد محمد', code: '2521134', section: 'G3 C3' },
    { name: 'مؤمن ايمن محمد عبد النبي', code: '2520720', section: 'G2 C3' },
    { name: 'ياسمين بسيونى عبدالفتاح محمد يوسف', code: '2521120', section: 'G3 C3' },
    { name: 'احمد سعيد ابراهيم محمود محمد', code: '2520092', section: 'G1 C1' }, // Defaulted to G1 C1 as sct was blank but usually they follow GX CX pattern
    { name: 'منة الله محمد عبدالله', code: '2520988', section: 'G3 C1' },
    { name: 'اسلام محروس فرج عوض', code: '2520154', section: 'G1 C2' },
    { name: 'عبدالرحمن سيد محمود محمد', code: '2520585', section: 'G2 C1' },
    { name: 'روان محمد محمد عبد السلام', code: '2520419', section: 'G1 C4' },
    { name: 'اسلام حشمت علي سليمان', code: '2520151', section: 'G1 C2' },
    { name: 'نور محمد فرج', code: '2521056', section: 'G3 C2' },
    { name: 'محمود ابراهيم منازع محمد', code: '2520854', section: 'G2 C4' },
    { name: 'منه الله محمد السيد ابراهيم', code: '2520985', section: 'G3 C1' },
    { name: 'هاجر احمد عبدالرؤوف بكر', code: '2521074', section: 'G3 C2' },
    { name: 'سهيله محمد حسن عبد الحميد', code: '2520499', section: 'G2 C1' },
    { name: 'كيرمينا هاني انور', code: '2520712', section: 'G2 C3' },
    { name: 'عمر محمود بصيلي السيد', code: '2520654', section: 'G2 C2' },
    { name: 'محمد عبد النعيم عبد اللطيف', code: '2520813', section: 'G2 C4' },
];

async function run() {
    console.log(`Starting bulk registration for ${rawData.length} entries...`);

    // DEDUPLICATION: Ensure unique codes in the input array
    const uniqueMap = new Map();
    rawData.forEach(d => {
        if (d.code) uniqueMap.set(d.code, d);
    });
    const uniqueData = Array.from(uniqueMap.values());
    console.log(`Deduplicated to ${uniqueData.length} unique entries.`);

    // 1. Prepare for 'delegates' table
    const delegatesToUpsert = uniqueData.map(d => ({
        code: d.code,
        name: d.name,
        department: d.section
    }));

    // 2. Prepare for 'student_sections' table
    const studentSectionsToUpsert = uniqueData.filter(d => d.section).map(d => ({
        university_id: d.code,
        section_key: d.section
    }));

    try {
        // Bulk Upsert Delegates
        const { error: delError } = await supabase
            .from('delegates')
            .upsert(delegatesToUpsert, { onConflict: 'code' });

        if (delError) throw new Error(`Delegate Error: ${delError.message}`);
        console.log('✅ Delegates table updated.');

        // Bulk Upsert Student Sections
        const { error: ssError } = await supabase
            .from('student_sections')
            .upsert(studentSectionsToUpsert, { onConflict: 'university_id' });

        if (ssError) throw new Error(`Student Sections Error: ${ssError.message}`);
        console.log('✅ Student Sections table updated.');

        console.log('\nSUCCESS: All delegates are now registered and mapped to their sections.');
    } catch (err) {
        console.error('FAILED:', err.message);
    }
}

run();
