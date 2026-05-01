// Custom hook: real-time deliveries + subjects from Firestore
// WHY a custom hook?
//   → Keeps pages clean — they just call useDashboardData() and get data.
//   → Handles subscription cleanup automatically (memory-safe).

import { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchDeliveries, fetchDelegates, fetchSectionsMap } from '../services/supabaseService';

export function useDashboardData(filters = {}, options = {}) {
    const { itOnly = false, excludeIT = false } = options;
    const [allData, setAllData] = useState([]);
    const [delegatesList, setDelegatesList] = useState([]);
    const [sectionsMap, setSectionsMap] = useState({}); // Dynamic now
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        async function load() {
            // Check cache first for "Instant" feel
            const cache = sessionStorage.getItem('dashboard_cache');
            if (cache && allData.length === 0) {
                const parsed = JSON.parse(cache);
                setAllData(parsed.data);
                setDelegatesList(parsed.delegates);
                setSectionsMap(parsed.secMap);
                setLoading(false);
            }

            try {
                const [data, delegates, secMap] = await Promise.all([
                    fetchDeliveries(),
                    fetchDelegates(),
                    fetchSectionsMap()
                ]);
                if (!active) return;

                setAllData(data);
                setDelegatesList(delegates);
                setSectionsMap(secMap);
                setLoading(false);

                // Update cache
                sessionStorage.setItem('dashboard_cache', JSON.stringify({ data, delegates, secMap, ts: Date.now() }));
            } catch (err) {
                console.error("Load failed", err);
            }
        }

        load();

        // Poll every 30s
        const interval = setInterval(load, 30000);
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, []); // Run only on mount

    // ─── OPTIMIZATION: Reverse map for O(1) section lookups ───
    const studentSectionMap = useMemo(() => {
        const map = new Map();
        for (const [key, val] of Object.entries(sectionsMap || {})) {
            const sectionKey = key.toUpperCase().trim();
            val.students.forEach(id => map.set(parseInt(id, 10), sectionKey));
        }
        return map;
    }, [sectionsMap]);

    // 1. Derive filtered array
    const filteredDeliveries = useMemo(() => {
        let filtered = [...allData];

        // Apply Department Logic
        // NEW: If a delegateId is present, we DISREGARD excludeIT so they can see their assigned booklets (IT or not)
        if (itOnly) {
            filtered = filtered.filter(d => d.subjectName?.includes('(IT-1)') || d.department === 'IT-1');
        } else if (excludeIT && !filters?.delegateId) {
            filtered = filtered.filter(d => !d.subjectName?.includes('(IT-1)') && d.department !== 'IT-1');
        }

        if (filters?.subjectName) {
            filtered = filtered.filter(d => d.subjectName === filters.subjectName);
        }
        if (filters?.status) {
            filtered = filtered.filter(d => d.status === filters.status);
        }
        if (filters?.delegateId) {
            const activeDel = delegatesList.find(d => String(d.code).trim() === String(filters.delegateId).trim());
            const delDept = activeDel?.department?.toUpperCase().trim();

            filtered = filtered.filter(d => {
                const isExplicitlyAssigned = String(d.delegateId || '').trim() === String(filters.delegateId).trim();
                const studentSection = studentSectionMap.get(parseInt(d.universityId, 10));
                const isSectionMatch = studentSection && delDept && studentSection === delDept;

                // User requirement: See all section items that are NOT with administration
                if (isSectionMatch) {
                    return d.status !== 'ready';
                }

                return isExplicitlyAssigned;
            });
        }
        if (filters?.sectionFilter && sectionsMap[filters.sectionFilter]) {
            const allowedIds = new Set(sectionsMap[filters.sectionFilter].students.map(id => String(id)));
            filtered = filtered.filter(d => allowedIds.has(String(d.universityId)));
        }
        if (filters?.searchId) {
            const query = filters.searchId.toLowerCase().trim();
            filtered = filtered.filter(d => String(d.universityId).toLowerCase().includes(query));
        }

        // NEW: "Special Filters" (No Section / No Delegate)
        if (filters?.specialFilter === 'no_section') {
            filtered = filtered.filter(d => {
                const uidNum = parseInt(d.universityId, 10);
                return !studentSectionMap.has(uidNum);
            });
        } else if (filters?.specialFilter === 'no_delegate') {
            const delegateSections = new Set(delegatesList.map(d => d.department?.toUpperCase().trim()));
            filtered = filtered.filter(d => {
                const uidNum = parseInt(d.universityId, 10);
                const foundSection = studentSectionMap.get(uidNum);
                // Must have a section but NO delegate
                return (foundSection && !delegateSections.has(foundSection));
            });
        }
        // Sort newest first
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return filtered;
    }, [allData, filters?.subjectName, filters?.status, filters?.searchId, filters?.delegateId, filters?.sectionFilter, filters?.specialFilter, delegatesList, itOnly, excludeIT, studentSectionMap]);

    // 2. Derive distinct subjects
    const subjects = useMemo(() => {
        let list = allData;
        if (filters?.delegateId) {
            const activeDel = delegatesList.find(d => String(d.code).trim() === String(filters.delegateId).trim());
            const delDept = activeDel?.department?.toUpperCase().trim();
            list = allData.filter(d => {
                const isExplicitlyAssigned = String(d.delegateId || '').trim() === String(filters.delegateId).trim();
                const studentSection = studentSectionMap.get(parseInt(d.universityId, 10));
                const isSectionMatch = studentSection && delDept && studentSection === delDept;
                return isExplicitlyAssigned || (isSectionMatch && d.status !== 'ready');
            });
        } else if (itOnly) {
            list = allData.filter(d => d.subjectName?.includes('(IT-1)') || d.department === 'IT-1');
        } else if (excludeIT) {
            list = allData.filter(d => !d.subjectName?.includes('(IT-1)') && d.department !== 'IT-1');
        }
        return [...new Set(list.map(d => d.subjectName))].filter(Boolean).sort();
    }, [allData, itOnly, excludeIT, filters?.delegateId, delegatesList, studentSectionMap]);

    // Derived Delegate Codes (from actual data) - keeping for backwards compatibility or display
    const activeDelegateCodes = useMemo(() => {
        let list = allData;
        if (itOnly) {
            list = allData.filter(d => d.subjectName?.includes('(IT-1)') || d.department === 'IT-1');
        } else if (excludeIT) {
            list = allData.filter(d => !d.subjectName?.includes('(IT-1)') && d.department !== 'IT-1');
        }
        return [...new Set(list.map(d => String(d.delegateId || '').trim()))].filter(Boolean).sort();
    }, [allData, itOnly, excludeIT]);

    // 3. Derived stats
    const stats = useMemo(() => {
        let list = allData;
        if (filters?.delegateId) {
            list = allData.filter(d => String(d.delegateId || '').trim() === String(filters.delegateId).trim());
        } else if (itOnly) {
            list = allData.filter(d => d.subjectName?.includes('(IT-1)') || d.department === 'IT-1');
        } else if (excludeIT) {
            list = allData.filter(d => !d.subjectName?.includes('(IT-1)') && d.department !== 'IT-1');
        }

        const total = list.length;
        const delivered = list.filter(d => d.status === 'delivered').length;
        const pending = list.filter(d => d.status === 'ready').length;
        const withDelegate = list.filter(d => d.status === 'with_delegate').length;

        let delegateTotal = 0, delegateDelivered = 0, delegatePending = 0;
        if (filters?.delegateId && !itOnly && !excludeIT) {
            // If we are already filtered by delegateId above, we don't need to re-filter for "delegate stats" sub-view
            // But usually this hook is used with a specific delegateId in the filters.
            delegateTotal = total;
            delegateDelivered = delivered;
            delegatePending = pending + withDelegate;
        } else if (filters?.delegateId) {
            const delData = list.filter(d => String(d.delegateId || '').trim() === String(filters.delegateId).trim());
            delegateTotal = delData.length;
            delegateDelivered = delData.filter(d => d.status === 'delivered').length;
            delegatePending = delData.filter(d => d.status !== 'delivered').length;
        }

        return {
            total, delivered, pending, withDelegate,
            delegateTotal, delegateDelivered, delegatePending
        };
    }, [allData, filters?.delegateId, itOnly, excludeIT]);

    // Resulting Delegates List (Filtered)
    const filteredDelegates = useMemo(() => {
        if (itOnly) {
            return delegatesList.filter(d => d.is_it || (d.department && sectionsMap[d.department]));
        } else if (excludeIT) {
            return delegatesList.filter(d => !d.is_it && (!d.department || !sectionsMap[d.department]));
        }
        return delegatesList;
    }, [delegatesList, itOnly, excludeIT]);

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
        delegateCodes: activeDelegateCodes,
        delegatesList: filteredDelegates, // Still useful for filter dropdowns
        allDelegates: delegatesList,       // NEW: For lookups
        sectionsMap,
        studentSectionMap,
        stats,
        loading,
        updateLocalDelivery,
        massAssignLocalDeliveries
    };
}
