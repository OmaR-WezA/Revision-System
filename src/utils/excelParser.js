// =============================================
// 📊 Excel Parser Utility
// =============================================
// Uses SheetJS (xlsx) to read .xlsx / .xls files
// entirely in the browser — no server upload needed.
// =============================================

import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────
// Extract subject name from file name
// Examples:
//   "Mathematics_Batch2.xlsx" → "Mathematics"
//   "علم النفس.xlsx"          → "علم النفس"
//   "physics.xlsx"            → "physics"
// ─────────────────────────────────────────────
export function extractSubjectFromFilename(filename) {
    if (!filename) return 'Unknown Subject';
    // Remove extension only
    const withoutExt = filename.replace(/\.[^/.]+$/, '');
    return withoutExt.trim() || 'Unknown Subject';
}

// ─────────────────────────────────────────────
// Parse Excel file → array of { universityId, studentName }
// WHY we validate here?
//   → Catch bad data BEFORE it hits Firestore.
//   → Returns only clean rows; logs skipped ones.
// ─────────────────────────────────────────────
export function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Take the first sheet
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];

                // Convert sheet to array of objects
                // header: 1 → gives us raw rows (array of arrays)
                const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

                if (rawRows.length < 2) {
                    reject(new Error('الملف فارغ أو لا يحتوي على بيانات'));
                    return;
                }

                // --- TEMPLATE VALIDATION ---
                const headerRow = rawRows[0] || [];
                const colA = String(headerRow[0] || '').trim().toLowerCase();
                const colB = String(headerRow[1] || '').trim().toLowerCase();

                if (!colA.includes('اسم') && !colA.includes('name')) {
                    reject(new Error('قالب غير صالح: يجب أن يكون العمود الأول (A) يحتوي على كلمة "اسم" أو "Name"'));
                    return;
                }

                // Allow empty B (if ID is empty sometimes) BUT the header must be logically "University ID".
                // Actually some sheets might have 'رقم' or 'id'. Let's be flexible but check.
                if (!colB.includes('رقم') && !colB.includes('id')) {
                    reject(new Error('قالب غير صالح: يجب أن يكون العمود الثاني (B) يحتوي على كلمة "الرقم الجامعي" أو "ID"'));
                    return;
                }

                // First row = headers → skip it
                // Real sheet format: Column A = Student Name, Column B = Academic ID
                const rows = rawRows
                    .slice(1) // skip header row
                    .map((row) => ({
                        studentName: String(row[0] ?? '').trim(),   // Column A
                        universityId: String(row[1] ?? '').trim(),   // Column B
                    }))
                    .filter((row) => row.universityId && row.studentName); // skip empty

                resolve(rows);
            } catch (err) {
                reject(new Error(`خطأ في قراءة الملف: ${err.message}`));
            }
        };

        reader.onerror = () => reject(new Error('فشل في قراءة الملف'));
        reader.readAsArrayBuffer(file);
    });
}
