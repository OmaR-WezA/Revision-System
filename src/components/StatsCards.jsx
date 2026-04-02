// ─────────────────────────────────────────────
// 📊 Stats Cards
// Shows totals at a glance: Total / Ready / Delivered
// WHY separate component? → Reusable, easy to test
// ─────────────────────────────────────────────
export default function StatsCards({ stats, isAdmin, delegateCodesCount }) {
    const { total, delivered, pending, withDelegate, delegateTotal, delegateDelivered, delegatePending } = stats || {};

    const cards = [];
    if (isAdmin) {
        cards.push({ label: 'إجمالي الملازم', value: total || 0, color: '#6366f1', bg: 'rgba(99,102,241,0.15)', icon: '👥' });
        cards.push({ label: 'مع الإدارة', value: pending || 0, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: '📦' });
        cards.push({ label: 'مع المناديب', value: withDelegate || 0, color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', icon: '👨‍💼' });
        cards.push({ label: 'إجمالي المناديب', value: delegateCodesCount || 0, color: '#06b6d4', bg: 'rgba(6,182,212,0.15)', icon: '🏢' });
        cards.push({ label: 'مسلّم للطلاب', value: delivered || 0, color: '#22c55e', bg: 'rgba(34,197,94,0.15)', icon: '✅' });
        const pct = total > 0 ? Math.round((delivered / total) * 100) : 0;
        cards.push({ label: 'نسبة الإنجاز', value: `${pct}%`, color: '#38bdf8', bg: 'rgba(56,189,248,0.15)', icon: '📈' });
    } else if (delegateTotal > 0 || delegatePending > 0 || delegateDelivered > 0) {
        cards.push({ label: 'إجمالي الدفعات لك', value: delegateTotal, color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', icon: '👥' });
        cards.push({ label: 'تم توزيعه', value: delegateDelivered, color: '#22c55e', bg: 'rgba(34,197,94,0.15)', icon: '✅' });
        cards.push({ label: 'متبقي للتسليم', value: delegatePending, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: '⏳' });
        const pct = delegateTotal > 0 ? Math.round((delegateDelivered / delegateTotal) * 100) : 0;
        cards.push({ label: 'نسبة إنجازك', value: `${pct}%`, color: '#38bdf8', bg: 'rgba(56,189,248,0.15)', icon: '📈' });
    }

    if (cards.length === 0) return null;

    return (
        <div className="stats-grid" style={{ gridTemplateColumns: isAdmin ? 'repeat(auto-fit, minmax(140px, 1fr))' : 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {cards.map((c) => (
                <div key={c.label} className="stat-card">
                    <div className="stat-icon" style={{ background: c.bg }}>
                        <span>{c.icon}</span>
                    </div>
                    <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
                    <div className="stat-label">{c.label}</div>
                </div>
            ))}
        </div>
    );
}
