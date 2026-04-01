// ─────────────────────────────────────────────
// 🔍 Filter Bar — Subject + Status dropdowns
// WHY controlled component?
//   → Parent (DashboardPage) owns filter state.
//   → Filter changes trigger new Firestore query.
// ─────────────────────────────────────────────
import { Filter, Search, X } from 'lucide-react';

export default function FilterBar({ subjects, filters, onChange }) {
    const hasFilters = filters.subjectName || filters.status || filters.searchId;

    return (
        <div className="filter-bar">
            <Filter size={18} style={{ color: 'var(--clr-text-2)', flexShrink: 0 }} />

            {/* Search by ID filter */}
            <div className="search-input-wrapper" style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-3)' }} />
                <input
                    type="text"
                    placeholder="بحث برقم الطالب..."
                    value={filters.searchId || ''}
                    onChange={(e) => onChange({ ...filters, searchId: e.target.value })}
                    style={{
                        padding: '10px 36px 10px 12px',
                        border: '1px solid var(--clr-border)',
                        borderRadius: 'var(--radius)',
                        background: 'var(--clr-surface)',
                        color: 'var(--clr-text-1)',
                        width: '100%',
                        outline: 'none',
                        fontFamily: 'inherit'
                    }}
                />
            </div>

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
                    onClick={() => onChange({ subjectName: '', status: '', searchId: '' })}
                    aria-label="مسح الفلاتر"
                >
                    <X size={14} />
                    مسح
                </button>
            )}
        </div>
    );
}
