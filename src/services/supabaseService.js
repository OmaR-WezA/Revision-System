import { supabase } from './supabaseClient';

// Utility to slugify subject (same as before for consistency)
function slugify(text) {
    return text.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
}

// ─────────────────────────────────────────────
// 📖 Read Data
// ─────────────────────────────────────────────
export async function fetchDeliveries() {
    try {
        const { data, error } = await supabase
            .from('deliveries')
            .select('*')
            .order('createdAt', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Supabase Fetch Error:', err);
        return [];
    }
}

// ─────────────────────────────────────────────
// 📤 Batch Upload (Excel)
// ─────────────────────────────────────────────
export async function uploadDeliveries(newRows, subjectName) {
    try {
        // 1. Fetch current IDs for this subject to prevent duplicates
        const { data: existingIds, error: fetchError } = await supabase
            .from('deliveries')
            .select('id')
            .eq('subjectName', subjectName);

        if (fetchError) throw fetchError;
        const idSet = new Set(existingIds.map(d => d.id));

        let newCount = 0;
        let skippedCount = 0;
        const uploadBatch = String(Date.now());
        const rowsToInsert = [];

        for (const row of newRows) {
            const uid = String(row.universityId || '').trim();
            const name = String(row.studentName || '').trim();
            if (!uid || !name) { skippedCount++; continue; }

            const id = `${uid}_${slugify(subjectName)}`;

            if (idSet.has(id)) {
                skippedCount++;
                continue;
            }

            rowsToInsert.push({
                id,
                universityId: uid,
                studentName: name,
                subjectName,
                status: 'ready',
                createdAt: new Date().toISOString(),
                uploadBatch
            });
            newCount++;
        }

        if (rowsToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('deliveries')
                .insert(rowsToInsert);

            if (insertError) throw insertError;
        }

        return { newCount, skippedCount };
    } catch (err) {
        console.error('Supabase Upload Error:', err);
        throw err;
    }
}

// ─────────────────────────────────────────────
// ✅ Mark Delivered
// ─────────────────────────────────────────────
export async function markDelivered(docId) {
    const { error } = await supabase
        .from('deliveries')
        .update({
            status: 'delivered',
            deliveredAt: new Date().toISOString()
        })
        .eq('id', docId);

    if (error) throw error;
}

// ─────────────────────────────────────────────
// 🤝 Assign to Section Delegate (Mass Assignment)
// ─────────────────────────────────────────────
export async function assignToDelegate(docIds, delegateCode) {
    if (!docIds || docIds.length === 0) return 0;

    const { error } = await supabase
        .from('deliveries')
        .update({
            status: 'with_delegate',
            delegateId: delegateCode,
            assignBatchId: String(Date.now()),
            assignedAt: new Date().toISOString()
        })
        .in('id', docIds);

    if (error) throw error;
    return docIds.length;
}

// ─────────────────────────────────────────────
// ⏪ Undo Delivery
// ─────────────────────────────────────────────
export async function undoDelivery(docId, password) {
    // 1. Check Password
    const correctPass = await getSystemPass('leader_pass');
    if (password !== correctPass) {
        throw new Error('كلمة المرور غير صحيحة');
    }

    // 2. Fetch current record to decide next status
    const { data, error: fetchError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('id', docId)
        .single();

    if (fetchError || !data) throw new Error('الطالب غير موجود');
    if (data.status === 'ready' || data.status === 'with_delegate') return;

    const newStatus = data.delegateId ? 'with_delegate' : 'ready';

    const { error: updateError } = await supabase
        .from('deliveries')
        .update({
            status: newStatus,
            deliveredAt: null
        })
        .eq('id', docId);

    if (updateError) throw updateError;
}

// ─────────────────────────────────────────────
// ⏪ Undo Last Batch Assignment (Admin)
// ─────────────────────────────────────────────
export async function undoLastAssignmentBatch(password) {
    const correctPass = await getSystemPass('leader_pass');
    if (password !== correctPass) {
        throw new Error('كلمة المرور غير صحيحة');
    }

    // 1. Find the latest batch ID
    const { data: latest, error: findError } = await supabase
        .from('deliveries')
        .select('assignBatchId')
        .not('assignBatchId', 'is', null)
        .eq('status', 'with_delegate')
        .order('assignBatchId', { ascending: false })
        .limit(1);

    if (findError) throw findError;
    if (!latest || latest.length === 0) {
        throw new Error('لا توجد عمليات تسقيم حديثة للتراجع عنها');
    }

    const batchId = latest[0].assignBatchId;

    // 2. Revert
    const { data: reverted, error: revertError } = await supabase
        .from('deliveries')
        .update({
            status: 'ready',
            delegateId: null,
            assignBatchId: null,
            assignedAt: null
        })
        .eq('assignBatchId', batchId)
        .select('id');

    if (revertError) throw revertError;
    return reverted?.length || 0;
}

// ─────────────────────────────────────────────
// 🗑️ Delete Entire Subject
// ─────────────────────────────────────────────
export async function deleteSubject(subjectName, password) {
    const correctPass = await getSystemPass('admin_pass');
    if (password !== correctPass) {
        throw new Error('كلمة المرور غير صحيحة');
    }

    const { data, error } = await supabase
        .from('deliveries')
        .delete()
        .eq('subjectName', subjectName)
        .select('id');

    if (error) throw error;
    return data?.length || 0;
}

// ─────────────────────────────────────────────
// 🗑️ Delete Last Uploaded Batch (Sheet)
// ─────────────────────────────────────────────
export async function deleteLastBatch(password) {
    const correctPass = await getSystemPass('admin_pass');
    if (password !== correctPass) {
        throw new Error('كلمة المرور غير صحيحة');
    }

    // 1. Find max batch
    const { data: latest, error: findError } = await supabase
        .from('deliveries')
        .select('uploadBatch')
        .order('uploadBatch', { ascending: false })
        .limit(1);

    if (findError) throw findError;
    if (!latest || latest.length === 0) throw new Error('لا توجد شيتات مرفوعة');

    const batchId = latest[0].uploadBatch;

    // 2. Delete
    const { data, error: deleteError } = await supabase
        .from('deliveries')
        .delete()
        .eq('uploadBatch', batchId)
        .select('id');

    if (deleteError) throw deleteError;
    return data?.length || 0;
}

// ─────────────────────────────────────────────
// 🔑 Auth & Config Helpers
// ─────────────────────────────────────────────
export async function validateDelegateCode(code) {
    if (!code) return null;
    const { data, error } = await supabase
        .from('delegates')
        .select('name')
        .eq('code', code)
        .single();

    if (error || !data) return null;
    return data.name;
}

export async function upsertDelegate(code, name) {
    if (!code || !name) return;
    const { error } = await supabase
        .from('delegates')
        .upsert({ code, name }, { onConflict: 'code' });

    if (error) throw error;
}

export async function getSystemPass(key) {
    try {
        const { data, error } = await supabase
            .from('system_config')
            .select('value')
            .eq('key', key)
            .single();

        if (error || !data) {
            // Fallback to defaults if table doesn't exist or key missing
            return key === 'admin_pass' ? '123mosa' : 'leader';
        }
        return data.value;
    } catch (err) {
        return key === 'admin_pass' ? '123mosa' : 'leader';
    }
}
