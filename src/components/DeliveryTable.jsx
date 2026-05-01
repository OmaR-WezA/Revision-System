// ─────────────────────────────────────────────
// 📋 Delivery Table with "Mark as Delivered"
// ─────────────────────────────────────────────
import { useState } from 'react';
import { CheckCircle, Loader, RotateCcw, Link, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { markDelivered, undoDelivery, assignToDelegate, undoLastAssignmentBatch, upsertDelegate, fetchDelegates } from '../services/supabaseService';

function formatDate(dateValue) {
    if (!dateValue) return '—';
    const date = new Date(dateValue);
    if (isNaN(date)) return '—';
    return new Intl.DateTimeFormat('ar-EG', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function StatusBadge({ status, delegateId }) {
    if (status === 'delivered') return <span className="badge badge-delivered">✅ تم التسليم للطالب</span>;
    if (status === 'with_delegate') return <span className="badge badge-warning">🔄 مع المندوب ({delegateId})</span>;
    return <span className="badge badge-ready">📦 مع الإدارة</span>;
}

function getBatchColor(batchId, subjectName) {
    let hue = 0;
    if (batchId) {
        hue = Math.floor(batchId % 360);
    } else if (subjectName) {
        let hash = 0;
        for (let i = 0; i < subjectName.length; i++) {
            hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
        }
        hue = Math.abs(hash) % 360;
    } else {
        return 'transparent';
    }
    return `hsla(${hue}, 65%, 35%, 0.25)`;
}

function DeliveryRow({ delivery, index, globalActionLoading, setGlobalActionLoading, updateLocalDelivery, isAdmin, isSectionDelegate, isSelected, toggleSelection, isOrphan }) {
    const [loading, setLoading] = useState(false);

    async function handleMarkDelivered() {
        if (delivery.status === 'delivered') return;
        setLoading(true);
        setGlobalActionLoading(true);
        try {
            await markDelivered(delivery.id);
            await new Promise((resolve) => setTimeout(resolve, 1500));
            toast.success(`✅ تم تسليم الكتاب لـ ${delivery.studentName}`);

            // Immediate UI update!
            if (updateLocalDelivery) {
                updateLocalDelivery(delivery.id, 'delivered');
            }
        } catch (err) {
            toast.error('حدث خطأ، حاول مرة أخرى');
            console.error(err);
        } finally {
            setLoading(false);
            setGlobalActionLoading(false);
        }
    }

    async function handleUndoDelivery() {
        const pass = window.prompt("أدخل الرقم السري للإدارة لإلغاء التسليم:");
        if (!pass) return;

        setLoading(true);
        setGlobalActionLoading(true);
        try {
            await undoDelivery(delivery.id, pass);
            await new Promise((resolve) => setTimeout(resolve, 1500));
            toast.success(`تم التراجع وتصفير حالة ${delivery.studentName}`);

            // Immediate UI update!
            if (updateLocalDelivery) {
                const newStatus = delivery.delegateId ? 'with_delegate' : 'ready';
                updateLocalDelivery(delivery.id, newStatus, false);
            }
        } catch (err) {
            toast.error(err.message || 'خطأ في إلغاء التسليم');
        } finally {
            setLoading(false);
            setGlobalActionLoading(false);
        }
    }

    // Color the row based on status and orphan state
    let rowColor = getBatchColor(delivery.uploadBatch, delivery.subjectName);
    if (delivery.status === 'delivered') {
        rowColor = 'rgba(34, 197, 94, 0.1)';
    } else if (delivery.status === 'with_delegate') {
        rowColor = 'rgba(245, 158, 11, 0.1)';
    }

    return (
        <tr style={{
            backgroundColor: rowColor,
            transition: 'background-color 0.3s ease',
            borderRight: isOrphan ? '4px solid var(--clr-danger)' : 'none'
        }}>
            {isAdmin && (
                <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-3)', fontWeight: 'bold' }}>#{index + 1}</span>
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelection(delivery.id)}
                            disabled={delivery.status !== 'ready'}
                            style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                        />
                    </div>
                </td>
            )}
            <td style={{ fontFamily: 'monospace', color: 'var(--clr-info)', fontWeight: 600 }}>
                {delivery.universityId}
            </td>
            <td style={{ fontWeight: 600 }}>{delivery.studentName}</td>
            <td style={{ color: 'var(--clr-text-2)' }}>{delivery.subjectName}</td>
            <td><StatusBadge status={delivery.status} delegateId={delivery.delegateId} /></td>
            <td style={{ color: 'var(--clr-text-3)', fontSize: '0.8rem' }}>
                {formatDate(delivery.createdAt)}
            </td>
            {(isAdmin || isSectionDelegate) && (
                <td>
                    {(delivery.status === 'ready' || delivery.status === 'with_delegate') ? (
                        <button
                            id={`deliver-${delivery.id}`}
                            className="btn btn-success"
                            onClick={handleMarkDelivered}
                            disabled={globalActionLoading || loading}
                            aria-label={`تسليم كتاب ${delivery.studentName}`}
                            style={{ cursor: globalActionLoading && !loading ? 'wait' : '' }}
                        >
                            {loading
                                ? <><Loader size={14} className="spin" /> جاري...</>
                                : <><CheckCircle size={14} /> تسليم للطالب</>
                            }
                        </button>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                            <span style={{ color: 'var(--clr-text-3)', fontSize: '0.8rem' }}>
                                {formatDate(delivery.deliveredAt)}
                            </span>
                            {/* UNDO BUTTON ONLY FOR ADMIN */}
                            {isAdmin && (
                                <button
                                    className="btn btn-ghost"
                                    style={{ padding: '2px 8px', fontSize: '0.8rem', color: 'var(--clr-danger)', cursor: globalActionLoading && !loading ? 'wait' : '' }}
                                    onClick={handleUndoDelivery}
                                    disabled={globalActionLoading || loading}
                                    title="إلغاء التسليم"
                                >
                                    {loading ? <Loader size={12} className="spin" /> : <><RotateCcw size={12} /> تراجع للإدارة</>}
                                </button>
                            )}
                        </div>
                    )}
                </td>
            )}
        </tr>
    );
}

function MobileDeliveryCard({ delivery, isOrphan, isAdmin, isSectionDelegate, globalActionLoading, setGlobalActionLoading, updateLocalDelivery }) {
    const [loading, setLoading] = useState(false);

    async function handleMarkDelivered() {
        if (delivery.status === 'delivered') return;
        setLoading(true); setGlobalActionLoading(true);
        try {
            await markDelivered(delivery.id);
            await new Promise(r => setTimeout(r, 1500));
            toast.success(`✅ تم تسليم الكتاب لـ ${delivery.studentName}`);
            if (updateLocalDelivery) updateLocalDelivery(delivery.id, 'delivered');
        } catch { toast.error('حدث خطأ'); }
        finally { setLoading(false); setGlobalActionLoading(false); }
    }

    async function handleUndoDelivery() {
        const pass = window.prompt('أدخل الرقم السري لإلغاء التسليم:');
        if (!pass) return;
        setLoading(true); setGlobalActionLoading(true);
        try {
            await undoDelivery(delivery.id, pass);
            await new Promise(r => setTimeout(r, 1500));
            toast.success(`تم التراجع`);
            if (updateLocalDelivery) updateLocalDelivery(delivery.id, delivery.delegateId ? 'with_delegate' : 'ready', false);
        } catch (err) { toast.error(err.message || 'خطأ'); }
        finally { setLoading(false); setGlobalActionLoading(false); }
    }

    return (
        <div className="mobile-delivery-card" style={{ borderRight: isOrphan ? '4px solid var(--clr-danger)' : '' }}>
            <div className="mobile-card-row">
                <span className="mobile-card-name">{delivery.studentName}</span>
                <span className="mobile-card-id">{delivery.universityId}</span>
            </div>
            <div className="mobile-card-row">
                <span className="mobile-card-subject">{delivery.subjectName}</span>
                <StatusBadge status={delivery.status} delegateId={delivery.delegateId} />
            </div>
            {(isAdmin || isSectionDelegate) && (
                <div style={{ marginTop: '4px' }}>
                    {(delivery.status === 'ready' || delivery.status === 'with_delegate') ? (
                        <button
                            className="btn btn-success mobile-card-action"
                            onClick={handleMarkDelivered}
                            disabled={globalActionLoading || loading}
                        >
                            {loading ? <><Loader size={14} className="spin" /> جاري...</> : <><CheckCircle size={14} /> تسليم للطالب</>}
                        </button>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--clr-text-3)', textAlign: 'center' }}>{formatDate(delivery.deliveredAt)}</span>
                            {isAdmin && (
                                <button
                                    className="btn btn-ghost mobile-card-action"
                                    style={{ color: 'var(--clr-danger)', fontSize: '0.85rem' }}
                                    onClick={handleUndoDelivery}
                                    disabled={globalActionLoading || loading}
                                >
                                    {loading ? <Loader size={12} className="spin" /> : <><RotateCcw size={12} /> تراجع للإدارة</>}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function DeliveryTable({ deliveries, loading, updateLocalDelivery, massAssignLocalDeliveries, isAdmin, isSectionDelegate, orphanedIds = new Set() }) {
    const [globalActionLoading, setGlobalActionLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [assigning, setAssigning] = useState(false);

    // Range Selection
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');
    const [rangeResult, setRangeResult] = useState(null);

    // Custom Prompt State
    const [promptConfig, setPromptConfig] = useState(null);
    const showPrompt = (message, type = 'password', options = null) => {
        return new Promise((resolve) => {
            setPromptConfig({
                message,
                type,
                options,
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

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 50;

    const checkableDeliveries = deliveries.filter(d => d.status === 'ready');
    const isAllSelected = checkableDeliveries.length > 0 && selectedIds.size === checkableDeliveries.length;

    const toggleAll = () => {
        if (isAllSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(checkableDeliveries.map(d => d.id)));
        }
    };

    const toggleSelection = (id) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleRangeSelect = () => {
        const startId = parseInt(rangeStart.trim(), 10);
        const endId = parseInt(rangeEnd.trim(), 10);

        if (isNaN(startId) || isNaN(endId)) {
            toast.error('يرجى إدخال أرقام جلوس البداية والنهاية الصحيحة.');
            return;
        }

        const min = Math.min(startId, endId);
        const max = Math.max(startId, endId);

        const next = new Set(selectedIds);
        let addedCount = 0;
        let subjectsDist = {};

        for (const d of deliveries) {
            const uid = parseInt(d.universityId, 10);
            if (!isNaN(uid) && uid >= min && uid <= max && d.status === 'ready') {
                next.add(d.id);
                addedCount++;
                subjectsDist[d.subjectName] = (subjectsDist[d.subjectName] || 0) + 1;
            }
        }

        setSelectedIds(next);
        setRangeStart('');
        setRangeEnd('');


        if (addedCount > 0) {
            const summary = Object.entries(subjectsDist).map(([subj, count]) => `عدد ${count} لمادة ${subj}`);
            setRangeResult({ summary });
            toast.success(`تم تحديد من ${min} إلى ${max}`, { duration: 3000 });
        } else {
            toast.error('لم يتم العثور على كتب قابلة للتسليم في هذا النطاق.');
        }
    };

    const handleMassAssign = async () => {
        if (selectedIds.size === 0) return;

        // 1. Fetch available delegates
        const delegates = await fetchDelegates();
        const selection = await showPrompt(
            `اختر المندوب لتسليمه عدد ${selectedIds.size} طالب:`,
            'select',
            delegates
        );

        if (!selection) return;

        let code, name, dept;
        if (selection === 'new') {
            code = await showPrompt('أدخل كود المندوب الجديد:', 'text');
            if (!code) return;
            name = await showPrompt('أدخل اسم المندوب الجديد:', 'text');
            if (!name) return;
            dept = await showPrompt('أدخل القسم (اختياري):', 'text') || '';
        } else {
            code = selection.code;
            name = selection.name;
            dept = selection.department || '';
        }

        setAssigning(true);
        setGlobalActionLoading(true);
        try {
            // 2. Sync delegate info
            await upsertDelegate(code, name, dept);

            // 3. Assign the students
            const arrIds = Array.from(selectedIds);
            const count = await assignToDelegate(arrIds, code);
            toast.success(`تم التكليف بنجاح! ${count} طالب مع المندوب: ${name} (${code})`);

            if (massAssignLocalDeliveries) {
                massAssignLocalDeliveries(arrIds, code);
            }
            setSelectedIds(new Set()); // clear selection
            setRangeResult(null);
        } catch (err) {
            toast.error(err.message || 'حدث خطأ أثناء التسليم للمندوب');
        } finally {
            setAssigning(false);
            setGlobalActionLoading(false);
        }
    };

    const handleUndoBatchAssign = async () => {
        const pass = await showPrompt("هذا الخيار يتراجع عن آخر دفعة كاملة (كجروب) سلمتها لأي مندوب. أدخل باسوورد الإدارة:", 'password');
        if (!pass) return;

        setAssigning(true);
        setGlobalActionLoading(true);
        try {
            const count = await undoLastAssignmentBatch(pass);
            toast.success(`تم التراجع بنجاح وإعادة عدد ${count} طالب للإدارة`);
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (err) {
            toast.error(err.message || 'خطأ أثناء الاسترجاع');
        } finally {
            setAssigning(false);
            setGlobalActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="table-wrapper">
                <div className="loading-overlay">
                    <div className="loading-spinner" />
                    <span>جاري تحميل البيانات...</span>
                </div>
            </div>
        );
    }

    if (deliveries.length === 0) {
        return (
            <div className="table-wrapper">
                <div className="empty-state">
                    <span className="empty-state-icon">📭</span>
                    <p style={{ fontWeight: 600, marginBottom: '8px' }}>لا توجد بيانات</p>
                    <p style={{ fontSize: '0.85rem' }}>{!isAdmin ? 'لا توجد ملازم متاحة لك حالياً' : 'ارفع ملف Excel من صفحة الرفع لبدء التتبع'}</p>
                </div>
            </div>
        );
    }

    const displayDeliveries = rangeResult
        ? deliveries.filter(d => selectedIds.has(d.id))
        : deliveries;

    const totalPages = Math.ceil(displayDeliveries.length / PAGE_SIZE);
    const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages || 1);
    const startIndexForPage = (validCurrentPage - 1) * PAGE_SIZE;
    const paginatedDeliveries = displayDeliveries.slice(startIndexForPage, startIndexForPage + PAGE_SIZE);

    return (
        <div className="table-wrapper">
            {/* Mass Action Toolbar */}
            {isAdmin && (
                <div style={{ padding: '12px 16px', background: 'rgba(34, 197, 94, 0.05)', borderBottom: '1px solid var(--clr-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--clr-text-2)' }}>تحديد سريع من وإلى:</span>
                        <input
                            type="text"
                            className="input"
                            placeholder="من رقم جامعي"
                            value={rangeStart}
                            onChange={e => setRangeStart(e.target.value)}
                            style={{ width: '130px', padding: '6px' }}
                        />
                        <span style={{ color: 'var(--clr-text-3)' }}>—</span>
                        <input
                            type="text"
                            className="input"
                            placeholder="إلى رقم جامعي"
                            value={rangeEnd}
                            onChange={e => setRangeEnd(e.target.value)}
                            style={{ width: '130px', padding: '6px' }}
                        />
                        <button className="btn btn-ghost" onClick={handleRangeSelect} style={{ padding: '6px 12px' }}>حدد</button>
                        {rangeResult && (
                            <button className="btn btn-ghost" onClick={() => { setRangeResult(null); setSelectedIds(new Set()); }} style={{ padding: '6px 12px', color: 'var(--clr-danger)' }}>إلغاء وفك الفلتر</button>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {selectedIds.size > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <span style={{ fontWeight: 600, color: '#22c55e' }}>تم تحديد {selectedIds.size} طالب</span>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleMassAssign}
                                    disabled={assigning || globalActionLoading}
                                >
                                    {assigning ? <><Loader size={16} className="spin" /> جاري التعيين...</> : <><Link size={16} /> تسليم لمندوب السيكشن</>}
                                </button>
                            </div>
                        )}

                        <button
                            className="btn btn-warning"
                            onClick={handleUndoBatchAssign}
                            disabled={assigning || globalActionLoading}
                            title="استرجاع آخر مجموعة تم تسليمها لمندوب سيكشن"
                        >
                            <Undo2 size={16} /> استرجاع التسليم Group
                        </button>
                    </div>
                </div>
            )}

            {rangeResult && rangeResult.summary && (
                <div style={{ padding: '16px', background: 'rgba(56, 189, 248, 0.1)', borderBottom: '1px solid var(--clr-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h4 style={{ color: 'var(--clr-info)', margin: 0 }}>تفاصيل التحديد الحالي ({selectedIds.size} طالب):</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {rangeResult.summary.map(s => <span key={s} style={{ fontWeight: 600 }}>• {s}</span>)}
                    </div>
                </div>
            )}

            <table className="data-table" role="table" aria-label="جدول التسليمات">
                <thead>
                    <tr>
                        {isAdmin && (
                            <th style={{ width: '80px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                    <span>م</span>
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={toggleAll}
                                        disabled={checkableDeliveries.length === 0}
                                        style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                                    />
                                </div>
                            </th>
                        )}
                        <th>الرقم الجامعي</th>
                        <th>اسم الطالب</th>
                        <th>المادة</th>
                        <th>الحالة</th>
                        <th>تاريخ الإضافة</th>
                        {(isAdmin || isSectionDelegate) && <th>الإجراء</th>}
                    </tr>
                </thead>
                <tbody>
                    {paginatedDeliveries.map((d, index) => (
                        <DeliveryRow
                            key={d.id}
                            index={startIndexForPage + index}
                            delivery={d}
                            globalActionLoading={globalActionLoading}
                            setGlobalActionLoading={setGlobalActionLoading}
                            updateLocalDelivery={updateLocalDelivery}
                            isAdmin={isAdmin}
                            isSectionDelegate={isSectionDelegate}
                            isSelected={selectedIds.has(d.id)}
                            toggleSelection={toggleSelection}
                            isOrphan={orphanedIds.has(d.id)}
                        />
                    ))}
                </tbody>
            </table>

            {/* ── Mobile Card List (shown on small screens via CSS) ── */}
            <div className="mobile-card-list">
                {paginatedDeliveries.map((d) => {
                    const isOrphan = orphanedIds.has(d.id);
                    return (
                        <MobileDeliveryCard
                            key={d.id}
                            delivery={d}
                            isOrphan={isOrphan}
                            isAdmin={isAdmin}
                            isSectionDelegate={isSectionDelegate}
                            globalActionLoading={globalActionLoading}
                            setGlobalActionLoading={setGlobalActionLoading}
                            updateLocalDelivery={updateLocalDelivery}
                        />
                    );
                })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--clr-surface)', borderTop: '1px solid var(--clr-border)', borderBottomLeftRadius: 'var(--radius)', borderBottomRightRadius: 'var(--radius)' }}>
                    <button
                        className="btn btn-ghost"
                        disabled={validCurrentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                    >
                        السابق
                    </button>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--clr-text-2)' }}>صفحة {validCurrentPage} من {totalPages}</span>
                    <button
                        className="btn btn-ghost"
                        disabled={validCurrentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                    >
                        التالي
                    </button>
                </div>
            )}

            {promptConfig && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(3px)' }}>
                    <div className="card" style={{ width: '90%', maxWidth: '400px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ fontSize: '1.05rem', margin: 0, lineHeight: 1.5 }}>{promptConfig.message}</h3>

                        {promptConfig.type === 'select' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <select
                                    className="input"
                                    id="custom-prompt-select"
                                    style={{ padding: '12px', fontSize: '1.1rem' }}
                                    defaultValue=""
                                >
                                    <option value="" disabled>اختر مندوب...</option>
                                    {promptConfig.options.map(d => (
                                        <option key={d.code} value={JSON.stringify(d)}>
                                            {d.name} ({d.code}) {d.department ? `- ${d.department}` : ''}
                                        </option>
                                    ))}
                                    <option value="new" style={{ fontWeight: 'bold', color: 'var(--clr-primary)' }}>+ إضافة مندوب جديد غير موجود</option>
                                </select>
                            </div>
                        ) : (
                            <input
                                type={promptConfig.type}
                                className="input"
                                autoFocus
                                id="custom-prompt-input"
                                onKeyDown={e => {
                                    if (e.key === 'Enter') promptConfig.onConfirm(e.target.value);
                                    if (e.key === 'Escape') promptConfig.onCancel();
                                }}
                                placeholder={promptConfig.type === 'password' ? 'الرقم السري' : 'أدخل البيانات هنا...'}
                                style={{ padding: '12px', fontSize: '1.1rem' }}
                            />
                        )}

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <button className="btn btn-ghost" onClick={promptConfig.onCancel}>إلغاء</button>
                            <button className="btn btn-primary" onClick={() => {
                                if (promptConfig.type === 'select') {
                                    const val = document.getElementById('custom-prompt-select').value;
                                    if (!val) { toast.error('يرجى الاختيار'); return; }
                                    promptConfig.onConfirm(val === 'new' ? 'new' : JSON.parse(val));
                                } else {
                                    promptConfig.onConfirm(document.getElementById('custom-prompt-input').value);
                                }
                            }}>تأكيد</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
