// ─────────────────────────────────────────────
// 🔍 Filter Bar — Subject + Status dropdowns
// WHY controlled component?
//   → Parent (DashboardPage) owns filter state.
//   → Filter changes trigger new Firestore query.
// ─────────────────────────────────────────────
import { Filter, Search, X } from 'lucide-react';

export default function FilterBar({ subjects, filters, onChange }) {
    const hasFilters = filters.subjectName || filters.status;

    return (
        <div className="filter-bar">
            <Filter size={18} style={{ color: 'var(--clr-text-2)', flexShrink: 0 }} />

            {/* Subject filter */}
            <select
                id="filter-subject"
                value={filters.subjectName}
                onChange={(e) => onChange({ ...filters, subjectName: e.target.value })}
                aria-label="فلتر المادة"
            >
                <option value="">📚 كل المواد</option>
                {subjects.map((s) => (
                    <option key={s} value={s}>{s}</option>
                ))}
            </select>

            {/* Status filter */}
            <select
                id="filter-status"
                value={filters.status}
                onChange={(e) => onChange({ ...filters, status: e.target.value })}
                aria-label="فلتر الحالة"
            >
                <option value="">🔄 كل الحالات</option>
                <option value="ready">📦 جاهز للاستلام</option>
                <option value="delivered">✅ تم التسليم</option>
            </select>

            {/* Clear filters button */}
            {hasFilters && (
                <button
                    className="btn btn-ghost"
                    onClick={() => onChange({ subjectName: '', status: '' })}
                    aria-label="مسح الفلاتر"
                >
                    <X size={14} />
                    مسح
                </button>
            )}
        </div>
    );
}
