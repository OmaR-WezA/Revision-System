// Custom hook: real-time deliveries + subjects from Firestore
// WHY a custom hook?
//   → Keeps pages clean — they just call useDashboardData() and get data.
//   → Handles subscription cleanup automatically (memory-safe).

import { useEffect, useState, useMemo } from 'react';
import { fetchDeliveries } from '../services/githubService';

export function useDashboardData(filters) {
    const [allData, setAllData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        async function load() {
            const data = await fetchDeliveries();
            if (!active) return;
            setAllData(data);
            setLoading(false);
        }

        load();

        // Poll every 30s
        const interval = setInterval(load, 30000);
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, []); // Run only on mount

    // 1. Derive filtered array
    const filteredDeliveries = useMemo(() => {
        let filtered = [...allData];
        if (filters?.subjectName) {
            filtered = filtered.filter(d => d.subjectName === filters.subjectName);
        }
        if (filters?.status) {
            filtered = filtered.filter(d => d.status === filters.status);
        }
        if (filters?.searchId) {
            const query = filters.searchId.toLowerCase().trim();
            filtered = filtered.filter(d => String(d.universityId).toLowerCase().includes(query));
        }
        // Sort newest first
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return filtered;
    }, [allData, filters?.subjectName, filters?.status, filters?.searchId]);

    // 2. Derive distinct subjects
    const subjects = useMemo(() => {
        return [...new Set(allData.map(d => d.subjectName))].filter(Boolean).sort();
    }, [allData]);

    // 3. Derived stats
    const stats = useMemo(() => {
        const total = allData.length;
        const delivered = allData.filter(d => d.status === 'delivered').length;
        const pending = total - delivered;
        return { total, delivered, pending };
    }, [allData]);

    // Optimistic Update Function
    const updateLocalDelivery = useCallback((id, newStatus) => {
        setAllData(prev => prev.map(d => {
            if (d.id === id) {
                return {
                    ...d,
                    status: newStatus,
                    deliveredAt: newStatus === 'delivered' ? new Date().toISOString() : null
                };
            }
            return d;
        }));
    }, []);

    return {
        deliveries: filteredDeliveries,
        allDeliveries: allData,
        subjects,
        stats,
        loading,
        updateLocalDelivery
    };
}
