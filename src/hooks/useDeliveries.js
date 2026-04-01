// Custom hook: real-time deliveries + subjects from Firestore
// WHY a custom hook?
//   → Keeps pages clean — they just call useDeliveries() and get data.
//   → Handles subscription cleanup automatically (memory-safe).

import { useEffect, useState } from 'react';
import { subscribeToDeliveries, subscribeToSubjects } from '../services/deliveryService';

export function useDeliveries(filters) {
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = subscribeToDeliveries(filters, (data) => {
            setDeliveries(data);
            setLoading(false);
        });

        // Cleanup: unsubscribe when component unmounts or filters change
        return () => unsubscribe();
    }, [filters.subjectName, filters.status]);

    return { deliveries, loading };
}

export function useSubjects() {
    const [subjects, setSubjects] = useState([]);

    useEffect(() => {
        const unsubscribe = subscribeToSubjects(setSubjects);
        return () => unsubscribe();
    }, []);

    return subjects;
}
