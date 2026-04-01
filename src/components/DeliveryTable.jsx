// ─────────────────────────────────────────────
// 📋 Delivery Table with "Mark as Delivered"
// ─────────────────────────────────────────────
import { useState } from 'react';
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
        // Generate hue from timestamp
        hue = Math.floor(batchId % 360);
    } else if (subjectName) {
        // Fallback for old data: generate hue from subject name string
        let hash = 0;
        for (let i = 0; i < subjectName.length; i++) {
            hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
        }
        hue = Math.abs(hash) % 360;
    } else {
        return 'transparent';
    }

    // Increased opacity from 0.15 to 0.25 so it's clearly visible
    return `hsla(${hue}, 65%, 35%, 0.25)`;
}

function DeliveryRow({ delivery }) {
    const [loading, setLoading] = useState(false);

    async function handleMarkDelivered() {
        if (delivery.status === 'delivered') return;
        setLoading(true);
        try {
            await markDelivered(delivery.id);
            toast.success(`✅ تم تسليم الكتاب لـ ${delivery.studentName}`);
        } catch (err) {
            toast.error('حدث خطأ، حاول مرة أخرى');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleUndoDelivery() {
        const pass = window.prompt("أدخل الرقم السري لإلغاء التسليم:");
        if (!pass) return;

        setLoading(true);
        try {
            await undoDelivery(delivery.id, pass);
            toast.success(`تم إلغاء التسليم لـ ${delivery.studentName}`);
        } catch (err) {
            toast.error(err.message || 'خطأ في إلغاء التسليم');
        } finally {
            setLoading(false);
        }
    }

    return (
        <tr style={{ backgroundColor: getBatchColor(delivery.uploadBatch, delivery.subjectName) }}>
            <td style={{ fontFamily: 'monospace', color: 'var(--clr-info)', fontWeight: 600 }}>
                {delivery.universityId}
            </td>
            <td style={{ fontWeight: 600 }}>{delivery.studentName}</td>
            <td style={{ color: 'var(--clr-text-2)' }}>{delivery.subjectName}</td>
            <td><StatusBadge status={delivery.status} /></td>
            <td style={{ color: 'var(--clr-text-3)', fontSize: '0.8rem' }}>
                {formatDate(delivery.createdAt)}
            </td>
            <td>
                {delivery.status === 'ready' ? (
                    <button
                        id={`deliver-${delivery.id}`}
                        className="btn btn-success"
                        onClick={handleMarkDelivered}
                        disabled={loading}
                        aria-label={`تسليم كتاب ${delivery.studentName}`}
                    >
                        {loading
                            ? <><Loader size={14} className="spin" /> جاري...</>
                            : <><CheckCircle size={14} /> تسليم</>
                        }
                    </button>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                        <span style={{ color: 'var(--clr-text-3)', fontSize: '0.8rem' }}>
                            {formatDate(delivery.deliveredAt)}
                        </span>
                        <button
                            className="btn btn-ghost"
                            style={{ padding: '2px 8px', fontSize: '0.8rem', color: 'var(--clr-danger)' }}
                            onClick={handleUndoDelivery}
                            disabled={loading}
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
                        <DeliveryRow key={d.id} delivery={d} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
