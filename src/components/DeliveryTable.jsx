// ─────────────────────────────────────────────
// 📋 Delivery Table with "Mark as Delivered"
// ─────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { CheckCircle, Loader, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { markDelivered, undoDelivery } from '../services/githubService';

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

function StatusBadge({ status }) {
    return status === 'delivered'
        ? <span className="badge badge-delivered">✅ تم التسليم</span>
        : <span className="badge badge-ready">📦 جاهز للاستلام</span>;
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

function DeliveryRow({ delivery, globalActionLoading, setGlobalActionLoading }) {
    const [loading, setLoading] = useState(false);
    const [localStatus, setLocalStatus] = useState(delivery.status);
    const [localDeliveredAt, setLocalDeliveredAt] = useState(delivery.deliveredAt);

    // Sync with parent data if it updates in background
    useEffect(() => {
        setLocalStatus(delivery.status);
        setLocalDeliveredAt(delivery.deliveredAt);
    }, [delivery.status, delivery.deliveredAt]);

    async function handleMarkDelivered() {
        if (localStatus === 'delivered') return;
        setLoading(true);
        setGlobalActionLoading(true);
        try {
            await markDelivered(delivery.id);
            await new Promise((resolve) => setTimeout(resolve, 3500));
            toast.success(`✅ تم تسليم الكتاب لـ ${delivery.studentName}`);

            // Immediate UI update!
            setLocalStatus('delivered');
            setLocalDeliveredAt(new Date().toISOString());
        } catch (err) {
            toast.error('حدث خطأ، حاول مرة أخرى');
            console.error(err);
        } finally {
            setLoading(false);
            setGlobalActionLoading(false);
        }
    }

    async function handleUndoDelivery() {
        const pass = window.prompt("أدخل الرقم السري لإلغاء التسليم:");
        if (!pass) return;

        setLoading(true);
        setGlobalActionLoading(true);
        try {
            await undoDelivery(delivery.id, pass);
            await new Promise((resolve) => setTimeout(resolve, 1500));
            toast.success(`تم إلغاء التسليم لـ ${delivery.studentName}`);

            // Immediate UI update!
            setLocalStatus('ready');
            setLocalDeliveredAt(null);
        } catch (err) {
            toast.error(err.message || 'خطأ في إلغاء التسليم');
        } finally {
            setLoading(false);
            setGlobalActionLoading(false);
        }
    }

    // Color the row green if locally delivered to make it ultra obvious
    const rowColor = localStatus === 'delivered'
        ? 'rgba(34, 197, 94, 0.1)'
        : getBatchColor(delivery.uploadBatch, delivery.subjectName);

    return (
        <tr style={{ backgroundColor: rowColor, transition: 'background-color 0.3s ease' }}>
            <td style={{ fontFamily: 'monospace', color: 'var(--clr-info)', fontWeight: 600 }}>
                {delivery.universityId}
            </td>
            <td style={{ fontWeight: 600 }}>{delivery.studentName}</td>
            <td style={{ color: 'var(--clr-text-2)' }}>{delivery.subjectName}</td>
            <td><StatusBadge status={localStatus} /></td>
            <td style={{ color: 'var(--clr-text-3)', fontSize: '0.8rem' }}>
                {formatDate(delivery.createdAt)}
            </td>
            <td>
                {localStatus === 'ready' ? (
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
                            : <><CheckCircle size={14} /> تسليم</>
                        }
                    </button>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                        <span style={{ color: 'var(--clr-text-3)', fontSize: '0.8rem' }}>
                            {formatDate(localDeliveredAt)}
                        </span>
                        <button
                            className="btn btn-ghost"
                            style={{ padding: '2px 8px', fontSize: '0.8rem', color: 'var(--clr-danger)', cursor: globalActionLoading && !loading ? 'wait' : '' }}
                            onClick={handleUndoDelivery}
                            disabled={globalActionLoading || loading}
                            title="إلغاء التسليم"
                        >
                            {loading ? <Loader size={12} className="spin" /> : <><RotateCcw size={12} /> تراجع</>}
                        </button>
                    </div>
                )}
            </td>
        </tr>
    );
}

export default function DeliveryTable({ deliveries, loading }) {
    const [globalActionLoading, setGlobalActionLoading] = useState(false);

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
                    <p style={{ fontSize: '0.85rem' }}>ارفع ملف Excel من صفحة الرفع لبدء التتبع</p>
                </div>
            </div>
        );
    }

    return (
        <div className="table-wrapper">
            <table className="data-table" role="table" aria-label="جدول التسليمات">
                <thead>
                    <tr>
                        <th>الرقم الجامعي</th>
                        <th>اسم الطالب</th>
                        <th>المادة</th>
                        <th>الحالة</th>
                        <th>تاريخ الإضافة</th>
                        <th>الإجراء</th>
                    </tr>
                </thead>
                <tbody>
                    {deliveries.map((d) => (
                        <DeliveryRow
                            key={d.id}
                            delivery={d}
                            globalActionLoading={globalActionLoading}
                            setGlobalActionLoading={setGlobalActionLoading}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
