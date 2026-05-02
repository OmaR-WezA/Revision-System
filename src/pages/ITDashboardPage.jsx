import { useState, useEffect, useMemo } from 'react';
import { Lock, LayoutDashboard, ShieldCheck, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDashboardData } from '../hooks/useDeliveries';
import StatsCards from '../components/StatsCards';
import FilterBar from '../components/FilterBar';
import DeliveryTable from '../components/DeliveryTable';
import { markDelivered, assignToDelegate, validateDelegateCode, upsertDelegate, migrateSubjectToIT } from '../services/supabaseService';
import * as XLSX from 'xlsx';

function DelegateManager({ is_it_only = false }) {
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [dept, setDept] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [foundDelegate, setFoundDelegate] = useState(null);

    const handleSearch = async () => {
        if (!code.trim()) return;
        setIsSearching(true);
        try {
            const data = await validateDelegateCode(code.trim());
            if (data) {
                setFoundDelegate(data);
                setName(data.name);
                setDept(data.department || '');
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
            // Note: upsertDelegate should handle the metadata
            await upsertDelegate(code.trim(), name.trim(), dept.trim());
            toast.success('تم حفظ بيانات المندوب بنجاح');
            setFoundDelegate({ code: code.trim(), name: name.trim(), department: dept.trim() });
        } catch (err) {
            toast.error('خطأ أثناء الحفظ');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="card" style={{ marginBottom: '24px', border: '1px solid var(--clr-primary)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--clr-primary)' }}>📇 إضافة/تعديل مناديب القسم</h3>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--clr-text-2)' }}>البحث بواسطة الكود:</label>
                    <input type="text" className="input" placeholder="أدخل كود المندوب..." value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
                </div>
                <button className="btn btn-primary" onClick={handleSearch} disabled={isSearching} style={{ height: '42px' }}>{isSearching ? 'جاري البحث...' : 'بحث'}</button>
            </div>
            {foundDelegate === 'not_found' && (
                <div className="card" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed var(--clr-danger)' }}>
                    <p style={{ color: 'var(--clr-danger)', marginBottom: '12px', fontWeight: 600 }}>⚠️ هذا المندوب غير مسجل! أدخل بياناته لإضافته:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <input className="input" placeholder="اسم المندوب" value={name} onChange={e => setName(e.target.value)} />
                        <input className="input" placeholder="سيكشن المندوب (G1 C1 مثلاً)" value={dept} onChange={e => setDept(e.target.value)} />
                    </div>
                    <button className="btn btn-success" style={{ marginTop: '12px', width: '100%' }} onClick={handleSave} disabled={isSaving}>إضافة مندوب جديد</button>
                </div>
            )}
            {foundDelegate && foundDelegate !== 'not_found' && (
                <div className="card" style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid var(--clr-success)' }}>
                    <h4 style={{ margin: '4px 0', fontSize: '1.2rem', color: 'var(--clr-success)' }}>{foundDelegate.name} ({foundDelegate.code})</h4>
                    <p style={{ margin: 0 }}>القسم الحالي: {foundDelegate.department || '—'}</p>
                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '16px 0' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <input className="input" placeholder="تعديل الاسم" value={name} onChange={e => setName(e.target.value)} />
                        <input className="input" placeholder="تعديل القسم" value={dept} onChange={e => setDept(e.target.value)} />
                    </div>
                    <button className="btn btn-ghost" style={{ marginTop: '12px', width: '100%', borderColor: 'var(--clr-success)' }} onClick={handleSave} disabled={isSaving}>تحديث البيانات</button>
                </div>
            )}
        </div>
    );
}

export default function ITDashboardPage() {
    // ... (rest of the component logic)
    const [password, setPassword] = useState('');
    const [isAuthorized, setIsAuthorized] = useState(() => sessionStorage.getItem('it_auth') === 'true');
    const [filters, setFilters] = useState({
        subjectName: '',
        status: '',
        searchId: '',
        delegateId: '',
        sectionFilter: '',
        specialFilter: '' // 'no_section' or 'no_delegate'
    });

    const [localSearch, setLocalSearch] = useState(filters.searchId);

    // Debounce search input to prevent UI lag on large datasets
    useEffect(() => {
        const timer = setTimeout(() => {
            setFilters(prev => ({ ...prev, searchId: localSearch }));
        }, 350);
        return () => clearTimeout(timer);
    }, [localSearch]);

    const handleLogin = (e) => {
        e.preventDefault();
        const itPass = import.meta.env.VITE_IT_PASSWORD || 'wfi';
        if (password === itPass) {
            sessionStorage.setItem('it_auth', 'true');
            setIsAuthorized(true);
            toast.success('مرحباً بك في لوحة تحكم IT الفرقة الأولى');
        } else {
            toast.error('الرقم السري غير صحيح');
        }
    };

    const {
        deliveries,
        allDeliveries,
        subjects,
        delegatesList,
        sectionsMap,
        stats,
        loading,
        updateLocalDelivery,
        massAssignLocalDeliveries
    } = useDashboardData(filters, { itOnly: true });

    // Check for bouns math migration
    const { allDeliveries: everyone } = useDashboardData({}, { excludeIT: true });
    const hasMathToMigrate = useMemo(() => {
        return everyone.some(d => d.subjectName === 'bouns math');
    }, [everyone]);

    const [isAutoAssigning, setIsAutoAssigning] = useState(false);
    const [selectedDelegateCode, setSelectedDelegateCode] = useState('');
    const [assignmentSummary, setAssignmentSummary] = useState(null);

    // ── Auto Assignment Logic ──
    const handlePrepareAutoAssign = (singleCode = null) => {
        const readyItems = deliveries.filter(d => d.status === 'ready');
        if (readyItems.length === 0) {
            toast.error('لا يوجد طلاب بحالة "جاهز للاستلام" حالياً لتوزيعهم.');
            return;
        }

        const assignmentGroups = {}; // { delegateCode: [docIds] }
        let skippedCount = 0;

        // Pre-process delegates to find matching tags
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
            let foundSection = null;
            for (const [sectionKey, sectionData] of Object.entries(sectionsMap)) {
                if (sectionData.students.includes(uid)) {
                    foundSection = sectionKey;
                    break;
                }
            }

            if (foundSection && delegateMap[foundSection]) {
                const dCode = delegateMap[foundSection];
                // If singleCode is provided, only include items for THAT delegate
                if (singleCode && dCode !== singleCode) {
                    skippedCount++;
                    return;
                }
                if (!assignmentGroups[dCode]) assignmentGroups[dCode] = [];
                assignmentGroups[dCode].push(item.id);
            } else {
                skippedCount++;
            }
        });

        if (Object.keys(assignmentGroups).length === 0) {
            toast.error('لم يتم العثور على أي طلاب ينتمون لسكاشن المناديب المحددة.');
            return;
        }

        setAssignmentSummary({
            groups: assignmentGroups,
            skipped: skippedCount,
            total: readyItems.length,
            isSingle: !!singleCode
        });
    };

    const handleConfirmAssign = async () => {
        if (!assignmentSummary) return;
        setIsAutoAssigning(true);
        try {
            const assignPromises = Object.entries(assignmentSummary.groups).map(([code, ids]) => {
                return assignToDelegate(ids, code);
            });
            await Promise.all(assignPromises);

            Object.entries(assignmentSummary.groups).forEach(([code, ids]) => {
                massAssignLocalDeliveries(ids, code);
            });

            const assignedCount = Object.values(assignmentSummary.groups).reduce((acc, curr) => acc + curr.length, 0);
            toast.success(`تم التوزيع بنجاح لـ ${assignedCount} طالب!`);
            setAssignmentSummary(null);
        } catch (err) {
            toast.error('حدث خطأ أثناء التوزيع');
        } finally {
            setIsAutoAssigning(false);
        }
    };

    const selectedDelegateInfo = useMemo(() => {
        if (!selectedDelegateCode) return null;
        const del = delegatesList.find(d => d.code === selectedDelegateCode);
        if (!del) return null;

        // Find which section this delegate handles
        const sectionKeys = Object.keys(sectionsMap).filter(key =>
            del.department && del.department.toUpperCase().includes(key.toUpperCase())
        );

        const currentBooklets = allDeliveries.filter(d =>
            String(d.delegateId) === String(selectedDelegateCode)
        ).length;

        return { ...del, sectionKeys, currentBooklets };
    }, [selectedDelegateCode, delegatesList, sectionsMap, allDeliveries]);

    const [isMigrating, setIsMigrating] = useState(false);

    // Orphan Detection: students in sections with no delegate
    const orphanedIds = useMemo(() => {
        const set = new Set();
        const delegateSections = new Set(delegatesList.map(d => d.department?.toUpperCase()));

        deliveries.forEach(d => {
            if (d.status === 'ready') {
                const uidNum = parseInt(d.universityId, 10);
                let foundKey = null;
                for (const [key, val] of Object.entries(sectionsMap)) {
                    if (val.students.includes(uidNum)) {
                        foundKey = key.toUpperCase();
                        break;
                    }
                }
                if (foundKey && !delegateSections.has(foundKey)) {
                    set.add(d.id);
                }
            }
        });
        return set;
    }, [deliveries, delegatesList, sectionsMap]);

    const handleExport = (mode = 'undelivered') => {
        let list = allDeliveries;
        if (mode === 'delivered') list = allDeliveries.filter(d => d.status === 'delivered');
        else if (mode === 'undelivered') list = allDeliveries.filter(d => d.status !== 'delivered');

        if (list.length === 0) {
            toast.error('لا توجد بيانات للتصدير!');
            return;
        }

        const data = list.map(d => {
            const uidNum = parseInt(d.universityId, 10);
            let section = "غير محدد";
            for (const [key, val] of Object.entries(sectionsMap)) {
                if (val.students.includes(uidNum)) {
                    section = key;
                    break;
                }
            }

            if (mode === 'all') {
                return {
                    'اسم الطالب': d.studentName,
                    'الرقم الأكاديمي': d.universityId,
                    'السكشن': section,
                    'المادة': d.subjectName,
                    'الحالة': d.status === 'delivered' ? '✓ تم التسليم' : (d.status === 'ready' ? '📦 مع الإدارة' : '🔄 مع المندوب')
                };
            } else {
                // For Delivered/Undelivered only: Name, ID, Section
                return {
                    'اسم الطالب': d.studentName,
                    'الرقم الأكاديمي': d.universityId,
                    'السكشن': section
                };
            }
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "البيانات");
        const filename = mode === 'all' ? 'it_full_data' : (mode === 'delivered' ? 'it_delivered' : 'it_not_delivered');
        XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success('تم تصدير الملف بنجاح!');
    };

    const handleMigrate = async () => {
        if (!window.confirm('هل أنت متأكد من نقل مادة "bouns math" إلى قسمك؟')) return;
        setIsMigrating(true);
        try {
            const { count } = await migrateSubjectToIT('bouns math');
            toast.success(`تم نقل ${count} طالب بنجاح!`);
            window.location.reload();
        } catch (err) {
            toast.error('حدث خطأ أثناء النقل');
        } finally {
            setIsMigrating(false);
        }
    };

    if (!isAuthorized) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
                <div className="card" style={{ padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center', border: '1px solid var(--clr-primary)' }}>
                    <div style={{ background: 'var(--clr-primary-dim)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <Lock size={40} color="var(--clr-primary)" />
                    </div>
                    <h2 style={{ marginBottom: '8px' }}>IT Dashboard</h2>
                    <p style={{ color: 'var(--clr-text-2)', marginBottom: '32px' }}>قسم IT - الفرقة الأولى</p>

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <input
                            type="password"
                            className="input"
                            placeholder="الرقم السري"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoFocus
                        />
                        <button type="submit" className="btn btn-primary" style={{ height: '48px', justifyContent: 'center' }}>
                            دخول القسم الخاص 🚀
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'var(--grad-primary)', padding: '10px', borderRadius: '12px', color: 'white' }}>
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h1 className="page-title">لوحة تحكم قسم IT</h1>
                        <p className="page-subtitle">الفرقة الأولى — القسم الخاص بك</p>
                    </div>
                </div>

                {hasMathToMigrate && (
                    <button
                        onClick={handleMigrate}
                        disabled={isMigrating}
                        className="btn btn-primary"
                        style={{ background: 'var(--grad-success)', border: 'none' }}
                    >
                        {isMigrating ? 'جاري النقل...' : 'نقل مادة bouns math للقسم 🔄'}
                    </button>
                )}

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => handleExport('all')}
                        className="btn btn-ghost"
                        style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
                    >
                        <Download size={16} />
                        كشف الكل (Excel)
                    </button>
                    <button
                        onClick={() => handleExport('delivered')}
                        className="btn btn-ghost"
                        style={{ border: '1px solid rgba(34, 197, 94, 0.2)', background: 'rgba(34, 197, 94, 0.05)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
                    >
                        ✓ المستلمين
                    </button>
                    <button
                        onClick={() => handleExport('undelivered')}
                        className="btn btn-primary"
                        style={{ border: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
                    >
                        <Download size={16} />
                        كشف غير المستلمين 📥
                    </button>
                </div>
            </div>

            <StatsCards stats={stats} isAdmin={true} delegateCodesCount={delegatesList?.length || 0} />

            <DelegateManager />

            {/* ── Auto-Assignment Controls ── */}
            <div className="card" style={{ marginBottom: '24px', border: '1px solid var(--clr-primary-dim)', position: 'relative' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                        <label className="filter-label">توزيع على مندوب محدد فقط:</label>
                        <select
                            className="input"
                            value={selectedDelegateCode}
                            onChange={e => setSelectedDelegateCode(e.target.value)}
                        >
                            <option value="">-- اختر المندوب (اختياري) --</option>
                            {delegatesList.map(d => (
                                <option key={d.code} value={d.code}>{d.name} ({d.code})</option>
                            ))}
                        </select>
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={() => handlePrepareAutoAssign(selectedDelegateCode || null)}
                        disabled={isAutoAssigning || loading}
                        style={{ height: '48px', padding: '0 24px', background: selectedDelegateCode ? 'var(--grad-primary)' : 'var(--grad-indigo)' }}
                    >
                        {selectedDelegateCode ? 'تحضير التوزيع للمندوب 👤' : '🚀 التوزيع الآلي الشامل للكل'}
                    </button>
                </div>

                {selectedDelegateInfo && (
                    <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', border: '1px dashed var(--clr-primary)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                            <div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', marginBottom: '4px' }}>سكشن المندوب:</p>
                                <p style={{ fontWeight: 600 }}>{selectedDelegateInfo.sectionKeys.join(', ') || 'غير محدد'}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', marginBottom: '4px' }}>نطاق الأرقام الأكاديمية:</p>
                                <div style={{ maxHeight: '80px', overflowY: 'auto', fontSize: '0.85rem', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '8px' }}>
                                    {selectedDelegateInfo.sectionKeys.length > 0 ? selectedDelegateInfo.sectionKeys.map(key => (
                                        <div key={key} style={{ marginBottom: '4px' }}>
                                            <b style={{ color: 'var(--clr-primary)' }}>{key}:</b> {sectionsMap[key]?.students.length} طالب
                                            <span style={{ margin: '0 8px', opacity: 0.6 }}>→</span>
                                            ({Math.min(...(sectionsMap[key]?.students || [0]))} - {Math.max(...(sectionsMap[key]?.students || [0]))})
                                        </div>
                                    )) : <span style={{ opacity: 0.5 }}>لا توجد بيانات سكشن</span>}
                                </div>
                            </div>
                            <div style={{ textAlign: 'center', background: 'rgba(99, 102, 241, 0.1)', padding: '12px', borderRadius: '12px' }}>
                                <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', marginBottom: '4px' }}>الملازم الحالية لديه:</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--clr-primary)', margin: 0 }}>{selectedDelegateInfo.currentBooklets}</p>
                                <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>ملزمة مستلمة</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Assignment Summary Modal ── */}
            {assignmentSummary && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
                    <div className="card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', animation: 'scaleUp 0.3s ease' }}>
                        <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <ShieldCheck color="var(--clr-primary)" />
                            {assignmentSummary.isSingle ? 'تأكيد التوزيع للمندوب' : 'ملخص التوزيع الآلي الشامل'}
                        </h2>

                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <p style={{ marginBottom: '16px', color: 'var(--clr-text-2)' }}>سيتم تعيين الملازم للمناديب كالتالي:</p>
                            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {Object.entries(assignmentSummary.groups).map(([code, ids]) => {
                                    const del = delegatesList.find(d => d.code === code);
                                    return (
                                        <li key={code} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                            <span style={{ fontWeight: 500 }}>{del ? del.name : code} <small style={{ opacity: 0.5 }}>({code})</small></span>
                                            <span style={{ fontWeight: 700, color: 'var(--clr-primary)' }}>{ids.length} ملزمة</span>
                                        </li>
                                    );
                                })}
                            </ul>
                            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '2px solid var(--clr-primary-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600 }}>إجمالي الملازم المقرر توزيعها:</span>
                                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--clr-primary)' }}>{Object.values(assignmentSummary.groups).flat().length}</span>
                            </div>
                            {assignmentSummary.skipped > 0 && (
                                <div style={{ fontSize: '0.85rem', color: '#fbbf24', marginTop: '16px', background: 'rgba(251, 191, 36, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                                    ⚠️ {assignmentSummary.skipped} طالب لم يتم العثور لسكشنهم على مندوب مسجل (أو لا ينتمون لهذا المندوب) وسيتم تجاهلهم حالياً.
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button className="btn" onClick={() => setAssignmentSummary(null)} style={{ background: 'rgba(255,255,255,0.1)', minWidth: '100px' }}>إلغاء</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleConfirmAssign}
                                disabled={isAutoAssigning}
                                style={{ minWidth: '160px', background: 'var(--grad-primary)' }}
                            >
                                {isAutoAssigning ? 'جاري الحفظ...' : 'تأكيد وحفظ التوزيع ✅'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <FilterBar
                subjects={subjects}
                delegatesList={delegatesList}
                sectionsMap={sectionsMap}
                isAdmin={true}
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
                isITContext={true}
            />

            <DeliveryTable
                deliveries={deliveries}
                loading={loading}
                updateLocalDelivery={updateLocalDelivery}
                massAssignLocalDeliveries={massAssignLocalDeliveries}
                isAdmin={true}
                orphanedIds={orphanedIds}
            />
        </div>
    );
}
