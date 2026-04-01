// ─────────────────────────────────────────────
// 📤 Upload Page — Excel file import
// ─────────────────────────────────────────────
import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { parseExcelFile, extractSubjectFromFilename } from '../utils/excelParser';
import { uploadDeliveries } from '../services/deliveryService';

// ─────────────────────────────────────────────
// Upload result summary card
// ─────────────────────────────────────────────
function UploadResult({ result }) {
    if (!result) return null;
    return (
        <div className={`alert ${result.newCount > 0 ? 'alert-success' : 'alert-info'}`}>
            <CheckCircle2 size={18} />
            <div>
                <strong>اكتمل الرفع — مادة: {result.subjectName}</strong>
                <br />
                <span style={{ fontSize: '0.85rem' }}>
                    ✅ {result.newCount} طالب جديد تمت إضافته
                    {result.skippedCount > 0 && ` · ⏭️ ${result.skippedCount} تم تخطيه (موجود مسبقاً)`}
                </span>
            </div>
        </div>
    );
}

export default function UploadPage() {
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    // ─── Process the dropped/selected file ───
    const processFile = useCallback(async (file) => {
        if (!file) return;

        // Validate file type
        const isExcel = file.name.match(/\.(xlsx|xls)$/i);
        if (!isExcel) {
            setError('يُرجى رفع ملف Excel بامتداد .xlsx أو .xls فقط');
            return;
        }

        setError(null);
        setResult(null);
        setUploading(true);
        setProgress(10);

        try {
            // Step 1: Extract subject from filename
            const subjectName = extractSubjectFromFilename(file.name);

            // Step 2: Parse Excel rows
            setProgress(30);
            const rows = await parseExcelFile(file);

            if (rows.length === 0) {
                setError('الملف لا يحتوي على بيانات صالحة. تأكد من أن العمود A = اسم الطالب والعمود B = الرقم الجامعي.');
                setUploading(false);
                return;
            }

            setProgress(60);

            // Step 3: Upload to Firestore (with duplicate prevention)
            const { newCount, skippedCount } = await uploadDeliveries(rows, subjectName);

            setProgress(100);
            setResult({ subjectName, newCount, skippedCount });
            toast.success(`تم رفع "${subjectName}" بنجاح — ${newCount} طالب جديد`);

        } catch (err) {
            setError(err.message || 'حدث خطأ أثناء الرفع');
            toast.error('فشل في رفع الملف');
        } finally {
            setUploading(false);
            setTimeout(() => setProgress(0), 1000);
        }
    }, []);

    // ─── Drag and Drop handlers ───
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        processFile(file);
    }, [processFile]);

    const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
    const handleDragLeave = () => setDragging(false);
    const handleFileInput = (e) => processFile(e.target.files[0]);

    return (
        <div>
            {/* ── Page Header ── */}
            <div className="page-header">
                <h1 className="page-title">رفع ملف Excel</h1>
                <p className="page-subtitle">
                    ارفع الملف — سيقوم النظام تلقائياً بتجنب التكرار وتسجيل الطلاب الجدد فقط
                </p>
            </div>

            {/* ── Instructions ── */}
            <div className="alert alert-info" style={{ marginBottom: '24px' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <div>
                    <strong>تنسيق الملف المطلوب:</strong>
                    <br />
                    <span style={{ fontSize: '0.85rem' }}>
                        العمود A = اسم الطالب · العمود B = الرقم الجامعي · اسم الملف = اسم المادة
                        <br />
                        مثال: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '4px' }}>Mathematics.xlsx</code>
                    </span>
                </div>
            </div>

            {/* ── Upload Zone ── */}
            <div
                className={`upload-zone ${dragging ? 'dragging' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                role="region"
                aria-label="منطقة رفع الملف"
            >
                <input
                    type="file"
                    id="excel-file-input"
                    accept=".xlsx,.xls"
                    onChange={handleFileInput}
                    disabled={uploading}
                    aria-label="اختر ملف Excel"
                />

                {uploading ? (
                    <>
                        <span className="upload-icon">⏳</span>
                        <p className="upload-title">جاري المعالجة...</p>
                        <div className="progress-bar" style={{ maxWidth: '320px', margin: '16px auto' }}>
                            <div className="progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                    </>
                ) : (
                    <>
                        <span className="upload-icon">
                            <FileSpreadsheet size={48} color="var(--clr-primary)" />
                        </span>
                        <p className="upload-title">اسحب وأفلت ملف Excel هنا</p>
                        <p className="upload-subtitle">أو انقر للاختيار يدوياً — .xlsx / .xls</p>
                    </>
                )}
            </div>

            {/* ── Error ── */}
            {error && (
                <div className="alert alert-warning" style={{ marginTop: '16px' }}>
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {/* ── Success Result ── */}
            <div style={{ marginTop: '16px' }}>
                <UploadResult result={result} />
            </div>

            {/* ── Logic explanation card (for admins) ── */}
            <div className="card" style={{ marginTop: '32px' }}>
                <h3 style={{ marginBottom: '12px', fontSize: '1rem' }}>🧠 كيف يعمل النظام؟</h3>
                <ol style={{ paddingRight: '20px', color: 'var(--clr-text-2)', fontSize: '0.9rem', lineHeight: 2 }}>
                    <li>يستخرج النظام اسم المادة من اسم الملف تلقائياً</li>
                    <li>يقرأ كل صف: الرقم الجامعي + الاسم</li>
                    <li>لكل طالب، يتحقق: هل <strong style={{ color: 'var(--clr-text-1)' }}>رقمه الجامعي + المادة</strong> موجود في قاعدة البيانات؟</li>
                    <li>إذا كان موجوداً → <span style={{ color: 'var(--clr-warning)' }}>يتخطاه (لا تكرار)</span></li>
                    <li>إذا لم يكن موجوداً → <span style={{ color: 'var(--clr-success)' }}>يضيفه بحالة "جاهز للاستلام"</span></li>
                    <li>الطلاب الذين سبق تسليمهم لن تتغير حالتهم أبداً</li>
                </ol>
            </div>
        </div>
    );
}
