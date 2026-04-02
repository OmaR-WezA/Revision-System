// ─────────────────────────────────────────────
// 📤 Upload Page — Excel file import
// ─────────────────────────────────────────────
import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Trash2, Undo2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { parseExcelFile, extractSubjectFromFilename } from '../utils/excelParser';
import { uploadDeliveries, deleteSubject, deleteLastBatch, fetchRejectedDuplicates } from '../services/supabaseService';
import { useDashboardData } from '../hooks/useDeliveries';

// ─────────────────────────────────────────────
// 📜 Rejected Log Component (Embedded)
// ─────────────────────────────────────────────
function RejectedLogSection() {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [show, setShow] = useState(false);

    const load = async () => {
        if (show) { setShow(false); return; }
        setLoading(true);
        const data = await fetchRejectedDuplicates();
        setList(data);
        setLoading(false);
        setShow(true);
    };

    return (
        <div className="card" style={{ marginTop: '32px', border: '1px solid var(--clr-warning)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ marginBottom: 0, fontSize: '1rem', color: 'var(--clr-warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={18} /> سجل المحاولات المرفوضة (المكررة)
                </h3>
                <button className="btn btn-ghost" onClick={load} disabled={loading} style={{ fontSize: '0.85rem' }}>
                    {loading ? 'جاري التحميل...' : (show ? 'إخفاء السجل' : 'عرض السجل بالكامل')}
                </button>
            </div>

            {show && (
                <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                    {list.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--clr-text-3)', padding: '20px' }}>لا توجد مرفوضات مسجلة حتى الآن.</p>
                    ) : (
                        <div style={{ maxHeight: '400px', overflowY: 'auto', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <table className="delivery-table" style={{ fontSize: '0.85rem' }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                    <tr>
                                        <th>الاسم</th>
                                        <th>الكود</th>
                                        <th>المادة</th>
                                        <th>الوقت</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {list.map((item) => (
                                        <tr key={item.id}>
                                            <td style={{ fontWeight: 600 }}>{item.student_name}</td>
                                            <td><span className="badge badge-pending">{item.student_id}</span></td>
                                            <td>{item.subject_name}</td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)', whiteSpace: 'nowrap' }}>
                                                {new Date(item.rejected_at).toLocaleString('ar-EG')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
// Upload result summary card
// ─────────────────────────────────────────────
function UploadResult({ result }) {
    const [showSkipped, setShowSkipped] = useState(false);
    if (!result) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

            {result.skippedList && result.skippedList.length > 0 && (
                <div className="card" style={{ padding: '16px', border: '1px solid var(--clr-warning)', background: 'rgba(245, 158, 11, 0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showSkipped ? '12px' : 0 }}>
                        <h4 style={{ fontSize: '0.9rem', margin: 0, color: 'var(--clr-warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={16} /> قائمة الطلاب الذين تم تخطيهم ({result.skippedList.length})
                        </h4>
                        <button
                            className="btn-link"
                            style={{ fontSize: '0.8rem', background: 'none', border: 'none', color: 'var(--clr-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => setShowSkipped(!showSkipped)}
                        >
                            {showSkipped ? 'إخفاء القائمة' : 'عرض الأسماء'}
                        </button>
                    </div>
                    {showSkipped && (
                        <>
                            <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem', color: 'var(--clr-text-2)' }}>
                                    {result.skippedList.map((s, idx) => (
                                        <li key={idx} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{s.studentName}</span>
                                            <code style={{ opacity: 0.7 }}>{s.universityId}</code>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            
                        </>
                    )}
                </div>
            )}
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

    // Custom Prompt State
    const [promptConfig, setPromptConfig] = useState(null);
    const showPrompt = (message, type = 'password') => {
        return new Promise((resolve) => {
            setPromptConfig({
                message,
                type,
                onConfirm: (val) => {
                    setPromptConfig(null);
                    resolve(val);
                },
                onCancel: () => {
                    setPromptConfig(null);
                    resolve(null);
                }
            });
        });
    };

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
            const { newCount, skippedCount, skippedList } = await uploadDeliveries(rows, subjectName);

            setProgress(100);
            setResult({ subjectName, newCount, skippedCount, skippedList });
            setSelectedFile(null); // Reset the file picker to prevent accidental re-uploads
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
    const [selectedFile, setSelectedFile] = useState(null);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) setSelectedFile(file);
    }, []);

    const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
    const handleDragLeave = () => setDragging(false);
    const handleFileInput = (e) => {
        const file = e.target.files[0];
        if (file) setSelectedFile(file);
    };

    const handleStartUpload = async () => {
        if (!selectedFile) return;
        const pass = await showPrompt("أدخل الرقم السري لعملية الرصد والرفع:", 'password');
        if (pass === '123mosa') {
            processFile(selectedFile);
        } else if (pass !== null) {
            toast.error("الرقم السري غير صحيح");
        }
    };

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

        const confirm1 = await showPrompt(`هل أنت متأكد من مسح جميع بيانات "${deleteSubjectName}" بشكل نهائي ولا رجعة فيه؟`, 'confirm');
        if (!confirm1) return;

        setIsDeleting(true);
        try {
            const deletedCount = await deleteSubject(deleteSubjectName, deletePassword);
            toast.success(`تم حذف ${deletedCount} سجل خاص بمادة "${deleteSubjectName}" بنجاح.`);
            setDeleteSubjectName('');
            setDeletePassword('');
        } catch (err) {
            toast.error(err.message || 'حدث خطأ أثناء الحذف');
        } finally {
            setIsDeleting(false);
        }
    };

    // ─── Undo Last Batch handler ───
    const handleUndoBatch = async () => {
        const pass = await showPrompt("هذا الخيار سيحذف آخر شيت إكسيل قمت برفعه بالكامل. أدخل الرقم السري للتأكيد:", 'password');
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
                style={{ paddingBottom: selectedFile ? '24px' : '48px' }}
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
                        <p className="upload-title">جاري المعالجة والرفع...</p>
                        <div className="progress-bar" style={{ maxWidth: '320px', margin: '16px auto' }}>
                            <div className="progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                    </>
                ) : (
                    <>
                        <span className="upload-icon">
                            <FileSpreadsheet size={48} color={selectedFile ? '#22c55e' : 'var(--clr-primary)'} />
                        </span>

                        {!selectedFile ? (
                            <>
                                <p className="upload-title">اسحب وأفلت ملف Excel هنا</p>
                                <p className="upload-subtitle">أو انقر للاختيار يدوياً — .xlsx / .xls</p>
                            </>
                        ) : (
                            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', zIndex: 10, position: 'relative' }}>
                                <p className="upload-title" style={{ color: '#22c55e', margin: 0 }}>تم اختيار الملف: {selectedFile.name}</p>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        className="btn btn-primary"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStartUpload(); }}
                                        style={{ padding: '10px 32px', fontSize: '1.1rem', background: 'var(--grad-primary)' }}
                                    >
                                        رصد ورفع البيانات 🚀
                                    </button>
                                    <button
                                        className="btn btn-ghost"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedFile(null); }}
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        )}
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

            <hr style={{ border: 'none', borderTop: '1px solid var(--clr-border)', margin: '32px 0' }} />
            <RejectedLogSection />

            {/* Custom Prompt Modal (Generic) */}
            {promptConfig && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(3px)' }}>
                    <div className="card" style={{ width: '90%', maxWidth: '400px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ fontSize: '1.05rem', margin: 0, lineHeight: 1.5, color: promptConfig.type === 'confirm' ? 'var(--clr-danger)' : 'var(--clr-text-1)' }}>{promptConfig.message}</h3>

                        {promptConfig.type !== 'confirm' && (
                            <input
                                type={promptConfig.type}
                                className="input"
                                autoFocus
                                id="custom-prompt-input"
                                onKeyDown={e => {
                                    if (e.key === 'Enter') promptConfig.onConfirm(e.target.value);
                                    if (e.key === 'Escape') promptConfig.onCancel();
                                }}
                                placeholder={promptConfig.type === 'password' ? 'الرقم السري' : 'إدخال القيمة'}
                                style={{ padding: '12px', fontSize: '1.1rem' }}
                            />
                        )}

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <button className="btn btn-ghost" onClick={promptConfig.onCancel}>إلغاء</button>
                            <button className={promptConfig.type === 'confirm' ? "btn btn-danger" : "btn btn-primary"} onClick={() => promptConfig.onConfirm(promptConfig.type === 'confirm' ? true : document.getElementById('custom-prompt-input').value)}>تأكيد</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
