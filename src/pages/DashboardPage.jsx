import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useDashboardData } from '../hooks/useDeliveries';
import StatsCards from '../components/StatsCards';
import FilterBar from '../components/FilterBar';
import DeliveryTable from '../components/DeliveryTable';
import { validateDelegateCode } from '../services/supabaseService';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';

const DelegateHistoryCard = memo(function DelegateHistoryCard({ allDeliveries, delegateId, isAdmin, showAll = false }) {
    const history = useMemo(() => {
        if (!delegateId) return {};
        const groups = {};
        for (const d of allDeliveries) {
            if (d.delegateId === delegateId && d.assignBatchId) {
                const date = new Date(d.assignedAt || d.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
                const key = `${date}_${d.subjectName}_${d.assignBatchId}`;
                if (!groups[key]) {
                    groups[key] = {
                        date,
                        subjectName: d.subjectName,
                        count: 0,
                        minId: null,
                        maxId: null,
                        timestamp: Number(d.assignBatchId || 0)
                    };
                }
                groups[key].count++;

                const uid = parseInt(d.universityId, 10);
                if (!isNaN(uid)) {
                    if (!groups[key].minId || uid < groups[key].minId) groups[key].minId = uid;
                    if (!groups[key].maxId || uid > groups[key].maxId) groups[key].maxId = uid;
                }
            }
        }
        return groups;
    }, [allDeliveries, delegateId]);

    const [showAllLocal, setShowAllLocal] = useState(false);
    if (!delegateId) return null;

    const allEntries = useMemo(() => Object.values(history).sort((a, b) => b.timestamp - a.timestamp), [history]);
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
});

const AdminHistoryCard = memo(function AdminHistoryCard({ allDeliveries, showAll = false }) {
    const history = useMemo(() => {
        const groups = {};
        for (const d of allDeliveries) {
            if (d.uploadBatch || d.createdAt) {
                const date = new Date(d.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
                const key = `${date}_${d.subjectName}_${d.uploadBatch || 'legacy'}`;
                if (!groups[key]) {
                    groups[key] = {
                        date,
                        subjectName: d.subjectName,
                        count: 0,
                        minId: null,
                        maxId: null,
                        timestamp: d.uploadBatch ? Number(d.uploadBatch) : new Date(d.createdAt).getTime()
                    };
                }
                groups[key].count++;

                const uid = parseInt(d.universityId, 10);
                if (!isNaN(uid)) {
                    if (!groups[key].minId || uid < groups[key].minId) groups[key].minId = uid;
                    if (!groups[key].maxId || uid > groups[key].maxId) groups[key].maxId = uid;
                }
            }
        }
        return groups;
    }, [allDeliveries]);

    const allEntries = useMemo(() => Object.values(history).sort((a, b) => b.timestamp - a.timestamp), [history]);
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
});

// ─────────────────────────────────────────────
// Full History Page (New Component)
// ─────────────────────────────────────────────
export function HistoryPage() {
    const { allDeliveries, loading } = useDashboardData({}, { excludeIT: true });

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
        delegateId: isAdmin ? '' : (localStorage.getItem('delegateLogin') || ''),
        sectionFilter: '' // Added
    });

    // Delegate auth state
    const [delegateInput, setDelegateInput] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isAutoAssigning, setIsAutoAssigning] = useState(false);
    const [localSearch, setLocalSearch] = useState(filters.searchId);

    // Debounce search input to prevent UI lag on large datasets
    useEffect(() => {
        const timer = setTimeout(() => {
            setFilters(prev => ({ ...prev, searchId: localSearch }));
        }, 350);
        return () => clearTimeout(timer);
    }, [localSearch]);

    // Single hook fetches everything once
    // Single hook fetches everything once
    // Single hook fetches everything once
    const { deliveries, allDeliveries, subjects, delegatesList, allDelegates, sectionsMap, studentSectionMap, stats, loading, updateLocalDelivery, massAssignLocalDeliveries } = useDashboardData(filters, { excludeIT: !filters.delegateId });

    const activeDelegate = useMemo(() => {
        if (!filters.delegateId) return null;
        return delegatesList.find(d => String(d.code) === String(filters.delegateId));
    }, [filters.delegateId, delegatesList]);

    const isITDelegate = activeDelegate?.is_it || (activeDelegate?.department && sectionsMap[activeDelegate.department]);

    // Orphan Detection: students in sections with no delegate
    const orphanedIds = useMemo(() => {
        const set = new Set();
        // Identify sections that DO have a delegate registered (UPPERCASE for consistent comparison)
        const delegateSections = new Set(delegatesList.map(d => d.department?.toUpperCase().trim()));

        deliveries.forEach(d => {
            if (d.status === 'ready') {
                const uidNum = parseInt(d.universityId, 10);
                const foundKey = studentSectionMap.get(uidNum);

                // If student has a section but NO delegate is registered for it
                if (foundKey && !delegateSections.has(foundKey)) {
                    set.add(d.id);
                }
            }
        });
        return set;
    }, [deliveries, delegatesList, studentSectionMap]);

    const handleExportUndelivered = () => {
        const undelivered = deliveries.filter(d => d.status !== 'delivered');
        if (undelivered.length === 0) {
            toast.error('لا يوجد طلاب لم يستلموا لتصديرهم!');
            return;
        }

        const data = undelivered.map(d => {
            const uidNum = parseInt(d.universityId, 10);
            const section = studentSectionMap.get(uidNum) || "غير محدد";
            return {
                'اسم الطالب': d.studentName,
                'الرقم الأكاديمي': d.universityId,
                'السكشن': section
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "المتأخرين");
        XLSX.writeFile(wb, `undelivered_${activeDelegate?.name || 'delegate'}_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success('تم تصدير كشف المتأخرين بنجاح!');
    };

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

            toast.success(`مرحباً مندوب سيكشن: ${delegateData.name}`);

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

    // ── Auto Assignment Logic ──
    const handleAutoAssign = async () => {
        if (!isAdmin) return;

        // Filter only 'ready' items from current filtered view
        const readyItems = deliveries.filter(d => d.status === 'ready');
        if (readyItems.length === 0) {
            toast.error('لا يوجد طلاب بحالة "جاهز للاستلام" في البحث الحالي لتوزيعهم.');
            return;
        }

        if (!confirm(`هل أنت متأكد من رغبتك في توزيع ${readyItems.length} ملزمة آلياً على المناديب بناءً على السكاشن؟`)) return;

        setIsAutoAssigning(true);

        try {
            const assignmentGroups = {}; // { delegateCode: [docIds] }
            let skippedCount = 0;

            // Pre-process delegates to find matching tags
            // We search for GX CY in the department string
            const delegateMap = {}; // { sectionKey: delegateCode }
            Object.keys(sectionsMap).forEach(sectionKey => {
                const match = delegatesList.find(d =>
                    d.department && d.department.toUpperCase().includes(sectionKey.toUpperCase())
                );
                if (match) {
                    delegateMap[sectionKey] = match.code;
                }
            });

            // Map each student to a delegate
            readyItems.forEach(item => {
                const uid = parseInt(item.universityId, 10);
                // Find which section this student belongs to
                const foundSection = studentSectionMap.get(uid);

                if (foundSection && delegateMap[foundSection]) {
                    const delegateCode = delegateMap[foundSection];
                    if (!assignmentGroups[delegateCode]) assignmentGroups[delegateCode] = [];
                    assignmentGroups[delegateCode].push(item.id);
                } else {
                    skippedCount++;
                }
            });

            // Execute batch assignments
            const assignPromises = Object.entries(assignmentGroups).map(([code, ids]) => {
                return assignToDelegate(ids, code);
            });

            await Promise.all(assignPromises);

            // Optimistically update local UI
            Object.entries(assignmentGroups).forEach(([code, ids]) => {
                massAssignLocalDeliveries(ids, code);
            });

            toast.success(`تم التوزيع بنجاح! 
                توزيع: ${readyItems.length - skippedCount} طالب.
                لم يتم إيجاد سكشن/مندوب لـ: ${skippedCount} طالب.`);

        } catch (err) {
            console.error(err);
            toast.error('حدث خطأ أثناء التوزيع الآلي');
        } finally {
            setIsAutoAssigning(false);
        }
    };

    return (
        <div>
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

                    <div style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px' }}>
                        <input
                            type="text"
                            className="input"
                            placeholder="أدخل كود المندوب..."
                            value={delegateInput}
                            onChange={e => setDelegateInput(e.target.value)}
                            style={{ padding: '14px', fontSize: '1.1rem', width: '100%' }}
                            onKeyDown={e => e.key === 'Enter' && handleDelegateLogin()}
                        />
                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '14px', fontSize: '1rem', justifyContent: 'center' }}
                            onClick={handleDelegateLogin}
                            disabled={isVerifying}
                        >
                            {isVerifying ? 'جاري التحقق...' : '🔑 دخول'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Main content (ONLY visible for Admin or Logged in Delegate) ── */}
            {(isAdmin || filters.delegateId) && (
                <>
                    {/* ── Logout Bar (For Delegates only) ── */}
                    {!isAdmin && filters.delegateId && (
                        <div className="card" style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', border: '1px solid var(--clr-warning)' }}>
                            <div style={{ flex: 1, minWidth: '0' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-2)', marginBottom: '2px' }}>جلسة نشطة للمندوب</div>
                                <div style={{ fontWeight: 700, color: 'var(--clr-warning)', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {activeDelegate?.name || filters.delegateId} <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({activeDelegate?.department})</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                {isITDelegate && (
                                    <button
                                        onClick={handleExportUndelivered}
                                        className="btn btn-ghost"
                                        style={{ fontSize: '0.85rem' }}
                                    >
                                        <Download size={14} />
                                        <span className="desktop-only">تصدير المتأخرين</span>
                                        <span className="mobile-only">Excel</span>
                                    </button>
                                )}
                                <button className="btn btn-ghost" onClick={handleDelegateLogout} style={{ fontSize: '0.85rem' }}>خروج</button>
                            </div>
                        </div>
                    )}

                    <StatsCards stats={stats} isAdmin={isAdmin} delegateCodesCount={delegatesList?.length || 0} />

                    {isAdmin && !filters.delegateId && <DelegateManager />}
                    {isAdmin && !filters.delegateId && <AdminHistoryCard allDeliveries={allDeliveries} />}
                    {filters.delegateId && <DelegateHistoryCard allDeliveries={allDeliveries} delegateId={filters.delegateId} isAdmin={isAdmin} />}

                    <FilterBar
                        subjects={subjects}
                        delegatesList={delegatesList}
                        sectionsMap={sectionsMap}
                        isAdmin={isAdmin}
                        filters={{ ...filters, searchId: localSearch }}
                        onChange={(newFilters) => {
                            // Intercept search updates: 
                            // 1. If it's a searchId change, ONLY update localSearch (don't touch global filters yet)
                            if (newFilters.searchId !== localSearch) {
                                setLocalSearch(newFilters.searchId);
                            } else {
                                // 2. If it's any other filter (subject, status), update global filters normally
                                setFilters(newFilters);
                            }
                        }}
                        resultCount={deliveries.length}
                    />

                    <DeliveryTable
                        deliveries={deliveries}
                        loading={loading}
                        updateLocalDelivery={updateLocalDelivery}
                        massAssignLocalDeliveries={massAssignLocalDeliveries}
                        isAdmin={isAdmin}
                        isSectionDelegate={!!filters.delegateId && !isAdmin}
                        orphanedIds={orphanedIds}
                        delegatesList={allDelegates}
                        studentSectionMap={studentSectionMap}
                    />
                </>
            )}
        </div>
    );
}

// Ensure assignToDelegate is imported if it's used directly or wrap it in a service call
import { upsertDelegate, assignToDelegate } from '../services/supabaseService';
