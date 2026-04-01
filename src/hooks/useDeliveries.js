// Custom hook: real-time deliveries + subjects from Firestore
// WHY a custom hook?
//   → Keeps pages clean — they just call useDeliveries() and get data.
//   → Handles subscription cleanup automatically (memory-safe).

import { useEffect, useState } from 'react';
import { fetchDeliveries } from '../services/githubService';

export function useDeliveries(filters) {
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        async function load() {
            const allData = await fetchDeliveries();
            if (!active) return;

            // GitHub is a single JSON array, so we filter it locally in React
            let filtered = allData;
            if (filters && filters.subjectName) {
                filtered = filtered.filter(d => d.subjectName === filters.subjectName);
            }
            if (filters && filters.status) {
                filtered = filtered.filter(d => d.status === filters.status);
            }

            // Sort newest first
            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            setDeliveries(filtered);
            setLoading(false);
        }

        load();

        // Since GitHub doesn't have "Real-time" events, we poll every 30s
        const interval = setInterval(load, 30000);

        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [filters.subjectName, filters.status]);

    return { deliveries, loading };
}

export function useSubjects() {
    const [subjects, setSubjects] = useState([]);

    useEffect(() => {
        async function load() {
            const allData = await fetchDeliveries();
            const distinct = [...new Set(allData.map(d => d.subjectName))].filter(Boolean).sort();
            setSubjects(distinct);
        }
        load();
        const interval = setInterval(load, 60000); // 1 minute is enough for subjects list
        return () => clearInterval(interval);
    }, []);

    return subjects;
}
