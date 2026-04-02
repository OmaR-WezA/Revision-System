// ─────────────────────────────────────────────
// 🖥️ Dashboard Page — Main delivery view
// ─────────────────────────────────────────────
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useDashboardData } from '../hooks/useDeliveries';
import StatsCards from '../components/StatsCards';
import FilterBar from '../components/FilterBar';
import DeliveryTable from '../components/DeliveryTable';

function DelegateHistoryCard({ allDeliveries, delegateId, isAdmin }) {
    if (!delegateId) return null;

    const history = {};
    for (const d of allDeliveries) {
        if (d.delegateId === delegateId && d.assignBatchId) {
            const date = new Date(d.assignedAt || d.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
            const key = `${date}_${d.subjectName}_${d.assignBatchId}`;
            if (!history[key]) {
                history[key] = { date, subjectName: d.subjectName, count: 0, minId: null, maxId: null };
            }
            history[key].count++;

            const uid = parseInt(d.universityId, 10);
            if (!isNaN(uid)) {
                if (!history[key].minId || uid < history[key].minId) history[key].minId = uid;
                if (!history[key].maxId || uid > history[key].maxId) history[key].maxId = uid;
            }
        }
    }

    const entries = Object.values(history);
    if (entries.length === 0) return null;

    return (
        <div className="card" style={{ marginBottom: '16px', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '12px', color: '#8b5cf6' }}>
                {isAdmin ? 'سجل تسليم الدفعات لمندوب السكشن' : 'سجل استلام الدفعات من المندوب'}
            </h3>
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

function AdminHistoryCard({ allDeliveries }) {
    const history = {};
    for (const d of allDeliveries) {
        if (d.uploadBatch || d.createdAt) {
            const date = new Date(d.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
            const key = `${date}_${d.subjectName}_${d.uploadBatch || 'legacy'}`;
            if (!history[key]) {
                history[key] = { date, subjectName: d.subjectName, count: 0, minId: null, maxId: null };
            }
            history[key].count++;

            const uid = parseInt(d.universityId, 10);
            if (!isNaN(uid)) {
                if (!history[key].minId || uid < history[key].minId) history[key].minId = uid;
                if (!history[key].maxId || uid > history[key].maxId) history[key].maxId = uid;
            }
        }
    }

    // Reverse to show newest batches first
    const entries = Object.values(history).reverse();
    if (entries.length === 0) return null;

    return (
        <div className="card" style={{ marginBottom: '16px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '12px', color: '#10b981' }}>سجل الدفعات المستلمة من الإدارة (المرفوعة)</h3>
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

export default function DashboardPage({ isAdmin }) {
    const [filters, setFilters] = useState({ subjectName: '', status: isAdmin ? 'ready' : '', searchId: '', delegateId: '' });

    // Delegate auth state
    const [delegateInput, setDelegateInput] = useState('');

    // Single hook fetches everything once
    const { deliveries, allDeliveries, subjects, delegateCodes, stats, loading, updateLocalDelivery, massAssignLocalDeliveries } = useDashboardData(filters);

    const handleDelegateLogin = () => {
        if (!delegateInput.trim()) {
            setFilters(f => ({ ...f, delegateId: '' }));
            return;
        }

        // Ensure they entered a valid code that exists in the database
        if (!delegateCodes.includes(delegateInput.trim())) {
            toast.error('لم يتم العثور على أي طلاب مخصصين لمندوب بهذا الكود.');
            return;
        }

        toast.success(`مرحباً مندوب سيكشن: ${delegateInput.trim()}`);
        setFilters(f => ({ ...f, delegateId: delegateInput.trim() }));
    };

    const handleDelegateLogout = () => {
        setDelegateInput('');
        setFilters(f => ({ ...f, delegateId: '' }));
    };

    return (
        <div>
            {/* ── Page Header ── */}
            <div className="page-header">
                <h1 className="page-title">{isAdmin ? 'لوحة تحكم الإدارة' : 'استعلام استلام الملازم'}</h1>
                <p className="page-subtitle">نظرة عامة على حالة وتسليم الملازم للطلاب</p>
            </div>

            {/* ── Stats Overview ── */}
            <StatsCards stats={stats} isAdmin={isAdmin} delegateCodesCount={delegateCodes?.length || 0} />

            {/* ── Admin History (Received from Uploads) ── */}
            {isAdmin && !filters.delegateId && <AdminHistoryCard allDeliveries={allDeliveries} />}

            {/* ── Section Delegate Public Access Picker ── */}
            {!isAdmin && (
                <div className="card" style={{ marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', border: filters.delegateId ? '1px solid var(--clr-warning)' : '1px solid var(--clr-border)' }}>
                    <span style={{ fontWeight: 600 }}>تسجيل دخول المندوب:</span>
                    {!filters.delegateId ? (
                        <>
                            <input
                                type="text"
                                className="input"
                                placeholder="أدخل كود المندوب السري هنا..."
                                value={delegateInput}
                                onChange={e => setDelegateInput(e.target.value)}
                                style={{ flex: 1, minWidth: '200px', padding: '10px' }}
                                onKeyDown={e => e.key === 'Enter' && handleDelegateLogin()}
                            />
                            <button className="btn btn-primary" onClick={handleDelegateLogin}>تحقق ودخول</button>
                        </>
                    ) : (
                        <>
                            <span style={{ flex: 1, fontSize: '1.1rem', fontFamily: 'monospace', color: 'var(--clr-warning)' }}>{filters.delegateId}</span>
                            <span className="badge badge-warning" style={{ background: 'var(--clr-warning)', color: '#000' }}>متاح التسليم</span>
                            <button className="btn btn-ghost" onClick={handleDelegateLogout}>إنهاء الجلسة</button>
                        </>
                    )}
                </div>
            )}

            {/* ── Delegate History ── */}
            {filters.delegateId && <DelegateHistoryCard allDeliveries={allDeliveries} delegateId={filters.delegateId} isAdmin={isAdmin} />}

            {/* ── Dynamic Filter Bar ── */}
            <FilterBar
                subjects={subjects}
                delegateCodes={delegateCodes}
                isAdmin={isAdmin}
                filters={filters}
                onChange={setFilters}
                resultCount={deliveries.length}
            />

            {!isAdmin && !filters.delegateId && !filters.searchId ? (
                <div className="card" style={{ textAlign: 'center', padding: '48px 24px', marginTop: '16px', border: '1px solid var(--clr-border)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>🔒</div>
                    <h2 style={{ marginBottom: '8px' }}>البيانات محمية</h2>
                    <p style={{ color: 'var(--clr-text-2)' }}>ابحث برقمك الجامعي أعلاه، أو قم بتسجيل دخول المندوب لاستعراض الملازم.</p>
                </div>
            ) : (
                <>
                    {/* ── Data Table ── */}
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
