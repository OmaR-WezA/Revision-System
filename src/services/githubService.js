// =============================================
// 📦 GitHub Storage Service — JSON "Database"
// =============================================
// WHY: Alternative to Firebase that uses your GitHub repo as a DB.
// HOW: Reads/Writes to `sheets_db/deliveries.json` via GitHub API.
// =============================================

const REPO_OWNER = import.meta.env.VITE_GITHUB_OWNER; // e.g. "OmaR-WezA"
const REPO_NAME = import.meta.env.VITE_GITHUB_REPO;  // e.g. "Revision-System"
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const FILE_PATH = 'sheets_db/deliveries.json';

// Utility to slugify subject
function slugify(text) {
    return text.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
}

// ─────────────────────────────────────────────
// 📖 Read Data
// ─────────────────────────────────────────────
export async function fetchDeliveries() {
    try {
        // We use the Cache-Busting query param to ensure we get latest data
        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?t=${Date.now()}`;
        const res = await fetch(url, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3.raw'
            }
        });

        if (res.status === 404) return []; // File doesn't exist yet
        if (!res.ok) throw new Error('Failed to fetch from GitHub');

        return await res.json();
    } catch (err) {
        console.error('GitHub Fetch Error:', err);
        return [];
    }
}

// ─────────────────────────────────────────────
// ✍️ Save Data (Update JSON file)
// ─────────────────────────────────────────────
async function updateGitHubFile(data, message) {
    // 1. Get current file SHA (required by GitHub API to update)
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
    const getRes = await fetch(url, {
        headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
    });

    let sha = null;
    if (getRes.ok) {
        const fileInfo = await getRes.json();
        sha = fileInfo.sha;
    }

    // 2. Push update
    const putRes = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message,
            content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))), // base64 encode
            sha
        })
    });

    if (!putRes.ok) {
        const error = await putRes.json();
        throw new Error(`GitHub Save Error: ${error.message}`);
    }
}

// ─────────────────────────────────────────────
// 📤 Batch Upload (Excel)
// ─────────────────────────────────────────────
export async function uploadDeliveries(newRows, subjectName) {
    const existingRows = await fetchDeliveries();
    let newCount = 0;
    let skippedCount = 0;

    const updatedData = [...existingRows];
    const batchId = Date.now(); // Track this specific upload batch

    for (const row of newRows) {
        const uid = String(row.universityId || '').trim();
        const name = String(row.studentName || '').trim();
        if (!uid || !name) { skippedCount++; continue; }

        const id = `${uid}_${slugify(subjectName)}`;

        // Check if ID already exists in the JSON array
        if (updatedData.some(d => d.id === id)) {
            skippedCount++;
            continue;
        }

        updatedData.push({
            id,
            universityId: uid,
            studentName: name,
            subjectName,
            status: 'ready',
            createdAt: new Date().toISOString(),
            deliveredAt: null,
            uploadBatch: batchId
        });
        newCount++;
    }

    if (newCount > 0) {
        await updateGitHubFile(updatedData, `Add ${newCount} students for ${subjectName}`);
    }

    return { newCount, skippedCount };
}

// ─────────────────────────────────────────────
// ✅ Mark Delivered
// ─────────────────────────────────────────────
export async function markDelivered(docId) {
    const data = await fetchDeliveries();
    const index = data.findIndex(d => d.id === docId);

    if (index !== -1) {
        data[index].status = 'delivered';
        data[index].deliveredAt = new Date().toISOString();
        await updateGitHubFile(data, `Mark ${data[index].studentName} as delivered`);
    }
}

// ─────────────────────────────────────────────
// 🤝 Assign to Section Delegate (Mass Assignment)
// ─────────────────────────────────────────────
export async function assignToDelegate(docIds, delegateCode) {
    if (!docIds || docIds.length === 0) return 0;
    const data = await fetchDeliveries();
    let updated = 0;
    const assignBatchId = Date.now();
    const assignedAt = new Date().toISOString();

    data.forEach(d => {
        if (docIds.includes(d.id)) {
            d.status = 'with_delegate';
            d.delegateId = delegateCode;
            d.assignBatchId = assignBatchId;
            d.assignedAt = assignedAt;
            updated++;
        }
    });

    if (updated > 0) {
        await updateGitHubFile(data, `Assigned ${updated} records to delegate ${delegateCode}`);
    }
    return updated;
}

// ─────────────────────────────────────────────
// ⏪ Undo Delivery
// ─────────────────────────────────────────────
export async function undoDelivery(docId, password) {
    if (password !== 'leader') {
        throw new Error('كلمة المرور غير صحيحة');
    }

    const data = await fetchDeliveries();
    const index = data.findIndex(d => d.id === docId);

    if (index !== -1) {
        if (data[index].status === 'ready' || data[index].status === 'with_delegate') return;

        if (data[index].delegateId) {
            data[index].status = 'with_delegate';
        } else {
            data[index].status = 'ready';
        }

        data[index].deliveredAt = null;
        await updateGitHubFile(data, `Undo delivery for ${data[index].studentName}`);
    } else {
        throw new Error('الطالب غير موجود');
    }
}

// ─────────────────────────────────────────────
// ⏪ Undo Last Batch Assignment (Admin)
// ─────────────────────────────────────────────
export async function undoLastAssignmentBatch(password) {
    if (password !== 'leader') {
        throw new Error('كلمة المرور غير صحيحة');
    }

    const data = await fetchDeliveries();

    let maxBatch = 0;
    for (const d of data) {
        if (d.status === 'with_delegate' && d.assignBatchId && d.assignBatchId > maxBatch) {
            maxBatch = d.assignBatchId;
        }
    }

    if (maxBatch === 0) {
        throw new Error('لا توجد عملية تسليم حديثة يمكن التراجع عنها، أو كانت بطريقة قديمة.');
    }

    let reverted = 0;
    data.forEach(d => {
        if (d.status === 'with_delegate' && d.assignBatchId === maxBatch) {
            d.status = 'ready';
            d.delegateId = null;
            d.assignedAt = null;
            d.assignBatchId = null;
            reverted++;
        }
    });

    if (reverted > 0) {
        await updateGitHubFile(data, `Undo delegate assignment batch (${reverted} records)`);
    }
    return reverted;
}

// ─────────────────────────────────────────────
// 🗑️ Delete Entire Subject
// ─────────────────────────────────────────────
export async function deleteSubject(subjectName, password) {
    if (password !== '123mosa') {
        throw new Error('كلمة المرور غير صحيحة');
    }

    const data = await fetchDeliveries();

    // Filter out all students belonging to this subject
    const updatedData = data.filter(d => d.subjectName !== subjectName);

    if (data.length === updatedData.length) {
        throw new Error('لم يتم العثور على المادة');
    }

    const deletedCount = data.length - updatedData.length;
    await updateGitHubFile(updatedData, `Deleted subject: ${subjectName} (${deletedCount} records)`);
    return deletedCount;
}

// ─────────────────────────────────────────────
// 🗑️ Delete Last Uploaded Batch (Sheet)
// ─────────────────────────────────────────────
export async function deleteLastBatch(password) {
    if (password !== '123mosa') {
        throw new Error('كلمة المرور غير صحيحة');
    }

    const data = await fetchDeliveries();

    // Find highest uploadBatch
    let maxBatch = 0;
    for (const d of data) {
        if (d.uploadBatch && d.uploadBatch > maxBatch) {
            maxBatch = d.uploadBatch;
        }
    }

    if (maxBatch === 0) {
        throw new Error('لا يوجد أي شيت حديث تم رفعه باستخدام النظام الجديد لدعمه بالحذف.');
    }

    const updatedData = data.filter(d => d.uploadBatch !== maxBatch);
    const deletedCount = data.length - updatedData.length;

    await updateGitHubFile(updatedData, `Deleted last uploaded batch (${deletedCount} records)`);
    return deletedCount;
}
