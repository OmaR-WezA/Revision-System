// ─────────────────────────────────────────────
// 🖥️ Dashboard Page — Main delivery view
// ─────────────────────────────────────────────
import { useState } from 'react';
import { useDashboardData } from '../hooks/useDeliveries';
import StatsCards from '../components/StatsCards';
import FilterBar from '../components/FilterBar';
import DeliveryTable from '../components/DeliveryTable';

export default function DashboardPage() {
    const [filters, setFilters] = useState({ subjectName: '', status: '', searchId: '' });

    // Single hook fetches everything once
    const { deliveries, allDeliveries, subjects, loading } = useDashboardData(filters);

    return (
        <div>
            {/* ── Page Header ── */}
            <div className="page-header">
                <h1 className="page-title">لوحة تتبع التسليم</h1>
                <p className="page-subtitle">
                    تتبع استلام الطلاب لكتبهم المطبوعة في الوقت الفعلي
                </p>
            </div>

            {/* ── Summary Numbers ── */}
            <StatsCards deliveries={allDeliveries} />

            {/* ── Filters ── */}
            <FilterBar
                subjects={subjects}
                filters={filters}
                onChange={setFilters}
            />

            {/* ── Delivery Table ── */}
            <DeliveryTable deliveries={deliveries} loading={loading} />

            {/* ── Result count ── */}
            {!loading && deliveries.length > 0 && (
                <p style={{ marginTop: '12px', color: 'var(--clr-text-3)', fontSize: '0.8rem', textAlign: 'center' }}>
                    يُعرض {deliveries.length} سجل
                </p>
            )}
        </div>
    );
}
