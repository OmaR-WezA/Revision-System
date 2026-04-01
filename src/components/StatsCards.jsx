// ─────────────────────────────────────────────
// 📊 Stats Cards
// Shows totals at a glance: Total / Ready / Delivered
// WHY separate component? → Reusable, easy to test
// ─────────────────────────────────────────────
export default function StatsCards({ stats }) {
    const { total, delivered, pending } = stats || { total: 0, delivered: 0, pending: 0 };
    const pct = total > 0 ? Math.round((delivered / total) * 100) : 0;

    const cards = [
        { label: 'إجمالي الطلاب', value: total, color: '#6366f1', bg: 'rgba(99,102,241,0.15)', icon: '👥' },
        { label: 'جاهز للاستلام', value: pending, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: '📦' },
        { label: 'تم التسليم', value: delivered, color: '#22c55e', bg: 'rgba(34,197,94,0.15)', icon: '✅' },
        { label: 'نسبة الإنجاز', value: `${pct}%`, color: '#38bdf8', bg: 'rgba(56,189,248,0.15)', icon: '📈' },
    ];

    return (
        <div className="stats-grid">
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
