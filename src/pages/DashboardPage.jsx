import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useDashboardData } from '../hooks/useDeliveries';
import StatsCards from '../components/StatsCards';
import FilterBar from '../components/FilterBar';
import DeliveryTable from '../components/DeliveryTable';
import { validateDelegateCode } from '../services/supabaseService';

function DelegateHistoryCard({ allDeliveries, delegateId, isAdmin, showAll = false }) {
    const [showAllLocal, setShowAllLocal] = useState(false);
    if (!delegateId) return null;

    const history = {};
    for (const d of allDeliveries) {
        if (d.delegateId === delegateId && d.assignBatchId) {
            const date = new Date(d.assignedAt || d.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
            const key = `${date}_${d.subjectName}_${d.assignBatchId}`;
            if (!history[key]) {
                history[key] = {
                    date,
                    subjectName: d.subjectName,
                    count: 0,
                    minId: null,
                    maxId: null,
                    timestamp: Number(d.assignBatchId || 0)
                };
            }
            history[key].count++;

            const uid = parseInt(d.universityId, 10);
            if (!isNaN(uid)) {
                if (!history[key].minId || uid < history[key].minId) history[key].minId = uid;
                if (!history[key].maxId || uid > history[key].maxId) history[key].maxId = uid;
            }
        }
    }

    const allEntries = Object.values(history).sort((a, b) => b.timestamp - a.timestamp);
    const entries = (showAll || showAllLocal) ? allEntries : allEntries.slice(0, 2);

    if (allEntries.length === 0) return null;

    return (
        <div className="card" style={{ marginBottom: '16px', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '1rem', margin: 0, color: '#8b5cf6' }}>
                    {isAdmin ? 'سجل تسليم الدفعات لمندوب السكشن' : 'سجل استلام الدفعات من الإدارة'}
                </h3>
                {allEntries.length > 2 && !(showAll || showAllLocal) && (
                    <button
                        onClick={() => setShowAllLocal(true)}
                        className="btn-link"
                        style={{ background: 'none', border: 'none', fontSize: '0.8rem', color: '#8b5cf6', textDecoration: 'underline', cursor: 'pointer' }}
                    >
                        عرض السجل بالكامل ({allEntries.length})
                    </button>
                )}
                {allEntries.length > 2 && (showAll || showAllLocal) && !showAll && (
                    <button
                        onClick={() => setShowAllLocal(false)}
                        className="btn-link"
                        style={{ background: 'none', border: 'none', fontSize: '0.8rem', color: '#8b5cf6', textDecoration: 'underline', cursor: 'pointer' }}
                    >
                        إخفاء السجل الزائد
                    </button>
                )}
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {entries.map((e, idx) => (
                    <li key={idx} style={{ padding: '8px', background: 'var(--clr-surface)', borderRadius: '8px', fontSize: '0.9rem' }}>
                        📅 يوم <strong>{e.date}</strong> — {isAdmin ? 'سلمت' : 'استلمت'} <strong>{e.count}</strong> ملزمة <strong>{e.subjectName}</strong>
                        {e.minId && e.maxId ? <span style={{ color: 'var(--clr-text-2)' }}> (من {e.minId} إلى {e.maxId})</span> : ''}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function AdminHistoryCard({ allDeliveries, showAll = false }) {
    const history = {};
    for (const d of allDeliveries) {
        if (d.uploadBatch || d.createdAt) {
            const date = new Date(d.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
            const key = `${date}_${d.subjectName}_${d.uploadBatch || 'legacy'}`;
            if (!history[key]) {
                history[key] = {
                    date,
                    subjectName: d.subjectName,
                    count: 0,
                    minId: null,
                    maxId: null,
                    timestamp: d.uploadBatch ? Number(d.uploadBatch) : new Date(d.createdAt).getTime()
                };
            }
            history[key].count++;

            const uid = parseInt(d.universityId, 10);
            if (!isNaN(uid)) {
                if (!history[key].minId || uid < history[key].minId) history[key].minId = uid;
                if (!history[key].maxId || uid > history[key].maxId) history[key].maxId = uid;
            }
        }
    }

    // Sort by timestamp descending so newest batches are always first
    const allEntries = Object.values(history).sort((a, b) => b.timestamp - a.timestamp);
    const entries = showAll ? allEntries : allEntries.slice(0, 2);

    if (allEntries.length === 0) return null;

    return (
        <div className="card" style={{ marginBottom: '16px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '1rem', margin: 0, color: '#10b981' }}>
                    {showAll ? 'سجل الدفعات المرفوعة بالكامل' : 'آخر الدفعات المستلمة (المرفوعة)'}
                </h3>
                {allEntries.length > 2 && !showAll && (
                    <Link to="/leader/history" style={{ fontSize: '0.8rem', color: '#10b981', textDecoration: 'underline' }}>عرض السجل بالكامل ({allEntries.length})</Link>
                )}
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {entries.map((e, idx) => (
                    <li key={idx} style={{ padding: '8px', background: 'var(--clr-surface)', borderRadius: '8px', fontSize: '0.9rem' }}>
                        📅 يوم <strong>{e.date}</strong> — استلمت <strong>{e.count}</strong> ملزمة <strong>{e.subjectName}</strong>
                        {e.minId && e.maxId ? <span style={{ color: 'var(--clr-text-2)' }}> (من {e.minId} إلى {e.maxId})</span> : ''}
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ─────────────────────────────────────────────
// Full History Page (New Component)
// ─────────────────────────────────────────────
export function HistoryPage() {
    const { allDeliveries, loading } = useDashboardData({});

    if (loading) return <div className="card">جاري تحميل السجل...</div>;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">سجل الدفعات المرفوعة بالكامل</h1>
                <p className="page-subtitle">قائمة بجميع المواد والكميات التي تم رفعها للنظام</p>
            </div>
            <AdminHistoryCard allDeliveries={allDeliveries} showAll={true} />
        </div>
    );
}

// ─────────────────────────────────────────────
// 👤 Delegate Manager Component (Admin Only)
// ─────────────────────────────────────────────
function DelegateManager() {
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [dept, setDept] = useState('');
    const [foundDelegate, setFoundDelegate] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSearch = async () => {
        if (!code.trim()) return;
        setIsSearching(true);
        setFoundDelegate(null);
        try {
            const result = await validateDelegateCode(code.trim());
            if (result) {
                setFoundDelegate(result);
                setName(result.name);
                setDept(result.department || '');
            } else {
                setFoundDelegate('not_found');
                setName('');
                setDept('');
            }
        } catch (err) {
            toast.error('خطأ في البحث');
        } finally {
            setIsSearching(false);
        }
    };

    const handleSave = async () => {
        if (!code.trim() || !name.trim()) {
            toast.error('الرجاء إدخال الكود والاسم');
            return;
        }
        setIsSaving(true);
        try {
            await upsertDelegate(code.trim(), name.trim(), dept.trim());
            toast.success('تم حفظ بيانات المندوب بنجاح');
            // Refresh search state
            setFoundDelegate({ code: code.trim(), name: name.trim(), department: dept.trim() });
        } catch (err) {
            toast.error('خطأ أثناء الحفظ');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="card" style={{ marginBottom: '24px', border: '1px solid var(--clr-primary)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--clr-primary)' }}>📇 إدارة مسؤولي العهد (المناديب)</h3>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--clr-text-2)' }}>البحث بواسطة الكود:</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="أدخل كود المندوب..."
                        value={code}
                        onChange={e => setCode(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <button className="btn btn-primary" onClick={handleSearch} disabled={isSearching} style={{ height: '42px' }}>
                    {isSearching ? 'جاري البحث...' : 'بحث'}
                </button>
            </div>

            {foundDelegate === 'not_found' && (
                <div className="card" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed var(--clr-danger)' }}>
                    <p style={{ color: 'var(--clr-danger)', marginBottom: '12px', fontWeight: 600 }}>⚠️ هذا الكود غير مسجل! هل تريد إضافته؟</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <input className="input" placeholder="اسم المندوب" value={name} onChange={e => setName(e.target.value)} />
                        <input className="input" placeholder="القسم" value={dept} onChange={e => setDept(e.target.value)} />
                    </div>
                    <button className="btn btn-success" style={{ marginTop: '12px', width: '100%' }} onClick={handleSave} disabled={isSaving}>
                        إضافة مندوب جديد
                    </button>
                </div>
            )}

            {foundDelegate && foundDelegate !== 'not_found' && (
                <div className="card" style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid var(--clr-success)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--clr-text-3)' }}>بيانات المندوب المسجلة:</p>
                            <h4 style={{ margin: '4px 0', fontSize: '1.2rem', color: 'var(--clr-success)' }}>{foundDelegate.name}</h4>
                            <p style={{ margin: 0, fontWeight: 600 }}>القسم: {foundDelegate.department || '—'}</p>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <span className="badge badge-success" style={{ fontSize: '1rem' }}>{foundDelegate.code}</span>
                        </div>
                    </div>
                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '16px 0' }} />
                    <p style={{ fontSize: '0.85rem', marginBottom: '8px' }}>تعديل البيانات:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <input className="input" placeholder="تعديل الاسم" value={name} onChange={e => setName(e.target.value)} />
                        <input className="input" placeholder="تعديل القسم" value={dept} onChange={e => setDept(e.target.value)} />
                    </div>
                    <button className="btn btn-ghost" style={{ marginTop: '12px', width: '100%', borderColor: 'var(--clr-success)' }} onClick={handleSave} disabled={isSaving}>
                        تحديث البيانات
                    </button>
                </div>
            )}
        </div>
    );
}

export default function DashboardPage({ isAdmin }) {
    const [filters, setFilters] = useState({
        subjectName: '',
        status: isAdmin ? 'ready' : '',
        searchId: '',
        delegateId: isAdmin ? '' : (localStorage.getItem('delegateLogin') || '')
    });

    // Delegate auth state
    const [delegateInput, setDelegateInput] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    // Single hook fetches everything once
    const { deliveries, allDeliveries, subjects, delegateCodes, stats, loading, updateLocalDelivery, massAssignLocalDeliveries } = useDashboardData(filters);

    const handleDelegateLogin = async () => {
        const code = delegateInput.trim();
        if (!code) {
            setFilters(f => ({ ...f, delegateId: '' }));
            return;
        }

        setIsVerifying(true);
        try {
            // 1. Validate if delegate exists in the 'delegates' table
            const delegateData = await validateDelegateCode(code);

            if (!delegateData) {
                toast.error('كود المندوب غير صحيح أو غير مسجل في النظام.');
                return;
            }

            // 2. Check if they have assigned deliveries (Warning but don't block)
            if (!delegateCodes.includes(code)) {
                toast.error(`تنبيه: الكود صحيح ولكن لا توجد ملازم مخصصة لك حالياً في الجدول.`);
            }

            toast.success(`مرحباً مندوب سيكشن: ${delegateData.name}`);
            if (!isAdmin) {
                localStorage.setItem('delegateLogin', code);
            }
            setFilters(f => ({ ...f, delegateId: code }));
        } catch (err) {
            toast.error('حدث خطأ أثناء التحقق من الكود');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleDelegateLogout = () => {
        setDelegateInput('');
        localStorage.removeItem('delegateLogin');
        setFilters(f => ({ ...f, delegateId: '' }));
    };

    return (
        <div>
            {/* ── Page Header ── */}
            {/* ── Page Header ── */}
            <div className="page-header">
                <h1 className="page-title">{isAdmin ? 'لوحة تحكم الإدارة' : 'استعلام استلام الملازم'}</h1>
                <p className="page-subtitle">نظرة عامة على حالة وتسليم الملازم للطلاب</p>
            </div>

            {/* ── Public Access Control: Security Wall ── */}
            {!isAdmin && !filters.delegateId && (
                <div className="card" style={{ textAlign: 'center', padding: '48px 24px', marginBottom: '24px', border: '1px solid var(--clr-primary)', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(30, 41, 59, 0.1) 100%)' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '20px' }}>🔐</div>
                    <h2 style={{ marginBottom: '12px' }}>نظام تتبع الملازم المعتمد</h2>
                    <p style={{ color: 'var(--clr-text-2)', maxWidth: '500px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                        عذراً، هذا النظام مخصص للاستخدام الرسمي فقط.
                        يجب تسجيل الدخول باستخدام **كود مندوب السكشن** للوصول لقاعدة البيانات.
                    </p>

                    <div style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <input
                                type="text"
                                className="input"
                                placeholder="أدخل كود المندوب هنا..."
                                value={delegateInput}
                                onChange={e => setDelegateInput(e.target.value)}
                                style={{ padding: '12px', fontSize: '1.1rem' }}
                                onKeyDown={e => e.key === 'Enter' && handleDelegateLogin()}
                            />
                        </div>
                        <button
                            className="btn btn-primary"
                            style={{ height: '48px', padding: '0 24px' }}
                            onClick={handleDelegateLogin}
                            disabled={isVerifying}
                        >
                            {isVerifying ? 'جاري التحقق...' : 'دخول'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Main content (ONLY visible for Admin or Logged in Delegate) ── */}
            {(isAdmin || filters.delegateId) && (
                <>
                    {/* ── Logout Bar (For Delegates only) ── */}
                    {!isAdmin && filters.delegateId && (
                        <div className="card" style={{ marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center', border: '1px solid var(--clr-warning)' }}>
                            <span style={{ fontWeight: 600 }}>جلسة نشطة للمندوب:</span>
                            <span style={{ flex: 1, fontSize: '1.1rem', fontFamily: 'monospace', color: 'var(--clr-warning)' }}>{filters.delegateId}</span>
                            <button className="btn btn-ghost" onClick={handleDelegateLogout}>تسجيل الخروج</button>
                        </div>
                    )}

                    <StatsCards stats={stats} isAdmin={isAdmin} delegateCodesCount={delegateCodes?.length || 0} />

                    {isAdmin && !filters.delegateId && <DelegateManager />}
                    {isAdmin && !filters.delegateId && <AdminHistoryCard allDeliveries={allDeliveries} />}
                    {filters.delegateId && <DelegateHistoryCard allDeliveries={allDeliveries} delegateId={filters.delegateId} isAdmin={isAdmin} />}

                    <FilterBar
                        subjects={subjects}
                        delegateCodes={delegateCodes}
                        isAdmin={isAdmin}
                        filters={filters}
                        onChange={setFilters}
                        resultCount={deliveries.length}
                    />

                    <DeliveryTable
                        deliveries={deliveries}
                        loading={loading}
                        updateLocalDelivery={updateLocalDelivery}
                        massAssignLocalDeliveries={massAssignLocalDeliveries}
                        isAdmin={isAdmin}
                        isSectionDelegate={!!filters.delegateId && !isAdmin}
                    />
                </>
            )}
        </div>
    );
}
