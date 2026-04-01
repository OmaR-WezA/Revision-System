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
    const { deliveries, subjects, stats, loading, updateLocalDelivery } = useDashboardData(filters);

    return (
        <div>
            {/* ── Page Header ── */}
            <div className="page-header">
                <h1 className="page-title">لوحة التحكم</h1>
                <p className="page-subtitle">نظرة عامة على حالة تسليم الملازم للطلاب</p>
            </div>

            {/* ── Stats Overview ── */}
            <StatsCards stats={stats} />

            {/* ── Dynamic Filter Bar ── */}
            <FilterBar
                subjects={subjects}
                filters={filters}
                onChange={setFilters}
            />

            {/* ── Data Table ── */}
            <DeliveryTable deliveries={deliveries} loading={loading} updateLocalDelivery={updateLocalDelivery} />

            {/* ── Result count ── */}
            {!loading && deliveries.length > 0 && (
                <p style={{ marginTop: '12px', color: 'var(--clr-text-3)', fontSize: '0.8rem', textAlign: 'center' }}>
                    يُعرض {deliveries.length} سجل
                </p>
            )}
        </div>
    );
}
