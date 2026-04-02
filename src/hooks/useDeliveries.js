// Custom hook: real-time deliveries + subjects from Firestore
// WHY a custom hook?
//   → Keeps pages clean — they just call useDashboardData() and get data.
//   → Handles subscription cleanup automatically (memory-safe).

import { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchDeliveries } from '../services/supabaseService';

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
        if (filters?.delegateId) {
            filtered = filtered.filter(d => d.delegateId === filters.delegateId);
        }
        if (filters?.searchId) {
            const query = filters.searchId.toLowerCase().trim();
            filtered = filtered.filter(d => String(d.universityId).toLowerCase().includes(query));
        }
        // Sort newest first
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return filtered;
    }, [allData, filters?.subjectName, filters?.status, filters?.searchId, filters?.delegateId]);

    // 2. Derive distinct subjects
    const subjects = useMemo(() => {
        return [...new Set(allData.map(d => d.subjectName))].filter(Boolean).sort();
    }, [allData]);

    // Derived Delegate Codes
    const delegateCodes = useMemo(() => {
        return [...new Set(allData.map(d => String(d.delegateId || '')))].filter(Boolean).sort();
    }, [allData]);

    // 3. Derived stats
    const stats = useMemo(() => {
        const total = allData.length;
        const delivered = allData.filter(d => d.status === 'delivered').length;
        const pending = allData.filter(d => d.status === 'ready').length;
        const withDelegate = allData.filter(d => d.status === 'with_delegate').length;

        let delegateTotal = 0, delegateDelivered = 0, delegatePending = 0;
        if (filters?.delegateId) {
            const delData = allData.filter(d => d.delegateId === filters.delegateId);
            delegateTotal = delData.length;
            delegateDelivered = delData.filter(d => d.status === 'delivered').length;
            delegatePending = delData.filter(d => d.status !== 'delivered').length;
        }

        return {
            total, delivered, pending, withDelegate,
            delegateTotal, delegateDelivered, delegatePending
        };
    }, [allData, filters?.delegateId]);

    // Optimistic Update Function
    const updateLocalDelivery = useCallback((id, newStatus, resetDelegate = false) => {
        setAllData(prev => prev.map(d => {
            if (d.id === id) {
                return {
                    ...d,
                    status: newStatus,
                    delegateId: resetDelegate ? null : d.delegateId,
                    deliveredAt: newStatus === 'delivered' ? new Date().toISOString() : null
                };
            }
            return d;
        }));
    }, []);

    // Optimistic Mass Assign
    const massAssignLocalDeliveries = useCallback((ids, delegateCode) => {
        setAllData(prev => prev.map(d => {
            if (ids.includes(d.id)) {
                return {
                    ...d,
                    status: 'with_delegate',
                    delegateId: delegateCode
                };
            }
            return d;
        }));
    }, []);

    return {
        deliveries: filteredDeliveries,
        allDeliveries: allData,
        subjects,
        delegateCodes,
        stats,
        loading,
        updateLocalDelivery,
        massAssignLocalDeliveries
    };
}
