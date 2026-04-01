// ─────────────────────────────────────────────
// 📤 Upload Page — Excel file import
// ─────────────────────────────────────────────
import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Trash2, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { parseExcelFile, extractSubjectFromFilename } from '../utils/excelParser';
import { uploadDeliveries, deleteSubject, deleteLastBatch } from '../services/githubService';
import { useDashboardData } from '../hooks/useDeliveries';

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

    // Form state for deleting
    const [deleteSubjectName, setDeleteSubjectName] = useState('');
    const [deletePassword, setDeletePassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Get subjects list
    const { subjects } = useDashboardData();

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

    // ─── Delete handler ───
    const handleDeleteSubject = async () => {
        if (!deleteSubjectName) {
            toast.error('اختر المادة أولاً');
            return;
        }
        if (!deletePassword) {
            toast.error('أدخل الرقم السري');
            return;
        }

        if (!window.confirm(`هل أنت متأكد من مسح جميع بيانات "${deleteSubjectName}" بشكل نهائي ولا رجعة فيه؟`)) {
            return;
        }

        setIsDeleting(true);
        try {
            const deletedCount = await deleteSubject(deleteSubjectName, deletePassword);
            toast.success(`تم حذف ${deletedCount} سجل خاص بمادة "${deleteSubjectName}" بنجاح.`);
            setDeleteSubjectName('');
            setDeletePassword('');
        } catch (err) {
            toast.error(err.message || 'حدث خطأ أثناء החذف');
        } finally {
            setIsDeleting(false);
        }
    };

    // ─── Undo Last Batch handler ───
    const handleUndoBatch = async () => {
        const pass = window.prompt("هذا الخيار سيحذف آخر شيت إكسيل قمت برفعه بالكامل. أدخل الرقم السري للتأكيد:");
        if (!pass) return;

        setIsDeleting(true);
        try {
            const count = await deleteLastBatch(pass);
            toast.success(`تم التراجع بنجاح! حُذف ${count} طالب كانوا في آخر عملية رفع.`);
        } catch (err) {
            toast.error(err.message || "خطأ أثناء محاولة حذف الشيت الأخير.");
        } finally {
            setIsDeleting(false);
        }
    };

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

            {/* ── Danger Zone (Delete) ── */}
            <div className="card" style={{ marginTop: '32px', border: '1px solid var(--clr-danger)' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '1rem', color: 'var(--clr-danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trash2 size={18} />
                    منطقة الخطر: حذف بيانات مادة بالكامل
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'center' }}>
                    <select
                        style={{ padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--clr-border)', background: 'var(--clr-surface)', color: 'var(--clr-text-1)', width: '100%', outline: 'none', fontFamily: 'inherit' }}
                        value={deleteSubjectName}
                        onChange={(e) => setDeleteSubjectName(e.target.value)}
                        disabled={isDeleting}
                    >
                        <option value="">-- اختر المادة للحذف --</option>
                        {subjects?.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <input
                        type="password"
                        placeholder="الرقم السري للمسح"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        style={{ padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--clr-border)', background: 'var(--clr-surface)', color: 'var(--clr-text-1)', width: '100%', outline: 'none', fontFamily: 'inherit' }}
                        disabled={isDeleting}
                    />

                    <button
                        className="btn btn-danger"
                        onClick={handleDeleteSubject}
                        disabled={isDeleting || !deleteSubjectName || !deletePassword}
                        style={{ height: '42px' }}
                    >
                        {isDeleting ? 'جاري المسح...' : 'حذف البيانات'}
                    </button>
                </div>
                <p style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--clr-text-3)' }}>
                    ملاحظة: هذه العملية لا يمكن التراجع عنها وستحذف جميع الطلاب المتعلقين بهذه المادة من النظام.
                </p>

                <hr style={{ border: 'none', borderTop: '1px solid var(--clr-border)', margin: '20px 0' }} />

                <h4 style={{ marginBottom: '12px', fontSize: '0.95rem', color: 'var(--clr-warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Undo2 size={16} />
                    تراجع عن آخر عملية رفع
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', maxWidth: '400px', margin: 0 }}>
                        هل قمت برفع شيت بالخطأ للتو؟ يمكنك حذف <strong>آخر شيت محدد</strong> تم رفعه للنظام بالكامل، بدلاً من حذف المادة بأكملها.
                    </p>
                    <button
                        className="btn btn-warning"
                        onClick={handleUndoBatch}
                        disabled={isDeleting}
                        style={{ height: '38px', whiteSpace: 'nowrap' }}
                    >
                        <Undo2 size={16} /> تراجع عن آخر رفع
                    </button>
                </div>
            </div>
        </div>
    );
}
