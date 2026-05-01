// ─────────────────────────────────────────────
// 🔍 Filter Bar — Subject + Status dropdowns
import { Filter, Search, X, Users, MapPin } from 'lucide-react';

export default function FilterBar({ subjects, delegatesList, sectionsMap, isAdmin, filters, onChange, resultCount, isITContext = false }) {
    const hasFilters = filters.subjectName || filters.status || filters.searchId || filters.delegateId || filters.sectionFilter || filters.specialFilter;

    // Filter delegateList to only show those who have active assignments if needed, 
    // but usually, we want to show all registered delegates for filtering.
    const sections = Object.keys(sectionsMap || {}).sort();

    return (
        <div className="filter-bar">
            {resultCount !== undefined && (
                <span style={{ fontWeight: 600, color: 'var(--clr-primary)', background: 'var(--clr-primary-dim)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', flexShrink: 0 }}>
                    متاح {resultCount} نتيجة
                </span>
            )}

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

            {/* Section filter (New) */}
            <select
                id="filter-section"
                value={filters.sectionFilter || ''}
                onChange={(e) => onChange({ ...filters, sectionFilter: e.target.value })}
                aria-label="فلتر السكشن"
                style={{ border: filters.sectionFilter ? '1px solid var(--clr-primary)' : '1px solid var(--clr-border)' }}
            >
                <option value="">🗺️ كل السكاشن</option>
                {sections.map((s) => (
                    <option key={s} value={s}>{s} ({sectionsMap[s].name})</option>
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
                <option value="ready">📦 جاهز للاستلام (مع الإدارة)</option>
                <option value="with_delegate">🔄 مع المندوب</option>
                <option value="delivered">✅ تم التسليم</option>
            </select>

            {/* Special Filters (No Section / No Delegate) - Redesigned as dropdown */}
            {isITContext && (
                <select
                    id="filter-special"
                    value={filters.specialFilter || ''}
                    onChange={(e) => onChange({ ...filters, specialFilter: e.target.value })}
                    aria-label="حالات خاصة"
                    style={{ border: filters.specialFilter ? '1px solid #ef4444' : '1px solid var(--clr-border)' }}
                >
                    <option value="">⚙️ حالات خاصة</option>
                    <option value="no_section">❌ بدون سكشن</option>
                    <option value="no_delegate">👨‍💼 بدون مندوب</option>
                </select>
            )}

            {/* Delegate filter (Admin only) */}
            {isAdmin && delegatesList && delegatesList.length > 0 && (
                <select
                    id="filter-delegate"
                    value={filters.delegateId || ''}
                    onChange={(e) => onChange({ ...filters, delegateId: e.target.value })}
                >
                    <option value="">👨‍💼 كل المناديب</option>
                    {delegatesList.map(d => (
                        <option key={d.code} value={d.code}>
                            {d.name} ({d.code})
                        </option>
                    ))}
                </select>
            )}

            {/* Clear filters button */}
            {hasFilters && (
                <button
                    className="btn btn-ghost"
                    onClick={() => onChange({ subjectName: '', status: '', searchId: '', delegateId: '', sectionFilter: '', specialFilter: '' })}
                    aria-label="مسح الفلاتر"
                >
                    <X size={14} />
                    مسح
                </button>
            )}
        </div>
    );
}
