// =============================================
// 📦 Delivery Service — All Firestore Logic
// =============================================
// WHY a separate service file?
//   → Components don't touch Firestore directly.
//   → If we ever change the DB, we only update THIS file.
//   → Easy to test and reason about.
// =============================================

import {
    collection,
    doc,
    setDoc,
    updateDoc,
    getDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const COLLECTION = 'deliveries';

// ─────────────────────────────────────────────
// 🔑 Composite Key Generator
// WHY: This is our main deduplication strategy.
// universityId + subjectSlug → unique document ID.
// Same student + same subject → same ID → Firestore
// simply overwrites (merge:true keeps existing status).
// ─────────────────────────────────────────────
export function buildDocId(universityId, subjectName) {
    const slug = subjectName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')       // spaces → underscores
        .replace(/[^\w_]/g, '');   // remove special chars
    return `${universityId}_${slug}`;
}

// ─────────────────────────────────────────────
// 📤 Batch Upload (from Excel)
// WHY setDoc + merge:true?
//   → If doc doesn't exist → creates it (status = "ready")
//   → If doc already exists → silently updates only
//     non-protected fields; "delivered" status is preserved.
// ─────────────────────────────────────────────
export async function uploadDeliveries(rows, subjectName) {
    let newCount = 0;
    let skippedCount = 0;

    // Use a for-loop (not Promise.all) to avoid Firestore rate limits
    for (const row of rows) {
        const uid = String(row.universityId || '').trim();
        const name = String(row.studentName || '').trim();

        // Skip empty rows
        if (!uid || !name) { skippedCount++; continue; }

        const docId = buildDocId(uid, subjectName);
        const docRef = doc(db, COLLECTION, docId);

        // Single direct read — fast, no query needed
        const snap = await getDoc(docRef);

        if (snap.exists()) {
            skippedCount++; // already in DB → skip (preserves delivered status)
            continue;
        }

        await setDoc(docRef, {
            universityId: uid,
            studentName: name,
            subjectName: subjectName,
            status: 'ready',
            createdAt: serverTimestamp(),
            deliveredAt: null,
        });
        newCount++;
    }

    return { newCount, skippedCount };
}

// ─────────────────────────────────────────────
// ✅ Mark a single delivery as Delivered
// ─────────────────────────────────────────────
export async function markDelivered(docId) {
    const docRef = doc(db, COLLECTION, docId);
    await updateDoc(docRef, {
        status: 'delivered',
        deliveredAt: serverTimestamp(),
    });
}

// ─────────────────────────────────────────────
// 🔍 Real-time listener with optional filters
// WHY onSnapshot?
//   → Two delivery staff see updates INSTANTLY.
//   → No polling. Firebase pushes changes automatically.
//
// Returns an unsubscribe function — call it to stop listening.
// ─────────────────────────────────────────────
export function subscribeToDeliveries(filters, callback) {
    let q = collection(db, COLLECTION);

    const constraints = [];

    if (filters.subjectName) {
        constraints.push(where('subjectName', '==', filters.subjectName));
    }
    if (filters.status) {
        constraints.push(where('status', '==', filters.status));
    }

    // Always sort by creation date (newest first)
    constraints.push(orderBy('createdAt', 'desc'));

    q = query(q, ...constraints);

    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            // Convert Firestore Timestamp → JS Date for display
            createdAt: d.data().createdAt?.toDate?.() ?? null,
            deliveredAt: d.data().deliveredAt?.toDate?.() ?? null,
        }));
        callback(data);
    });
}

// ─────────────────────────────────────────────
// 📋 Get distinct subject names (for the filter dropdown)
// ─────────────────────────────────────────────
export function subscribeToSubjects(callback) {
    const q = collection(db, COLLECTION);
    return onSnapshot(q, (snapshot) => {
        const subjects = [...new Set(snapshot.docs.map((d) => d.data().subjectName))]
            .filter(Boolean)
            .sort();
        callback(subjects);
    });
}
