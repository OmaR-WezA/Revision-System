// ─────────────────────────────────────────────
// 📋 Delivery Table with "Mark as Delivered"
// ─────────────────────────────────────────────
import { useState } from 'react';
import { CheckCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { markDelivered } from '../services/githubService';

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

function DeliveryRow({ delivery }) {
    const [loading, setLoading] = useState(false);

    async function handleMarkDelivered() {
        if (delivery.status === 'delivered') return;
        setLoading(true);
        try {
            // WHY we pass delivery.id (the composite key)?
            // Because that's the exact Firestore document ID.
            await markDelivered(delivery.id);
            toast.success(`✅ تم تسليم الكتاب لـ ${delivery.studentName}`);
        } catch (err) {
            toast.error('حدث خطأ، حاول مرة أخرى');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <tr>
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
                    <span style={{ color: 'var(--clr-text-3)', fontSize: '0.8rem' }}>
                        {formatDate(delivery.deliveredAt)}
                    </span>
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
