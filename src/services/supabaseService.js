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
        let allRecords = [];
        let from = 0;
        let to = 999;
        let finished = false;

        // Recursive fetch to overcome Supabase's 1000-record limit
        while (!finished) {
            const { data, error } = await supabase
                .from('deliveries')
                .select('*')
                .order('createdAt', { ascending: false })
                .order('id', { ascending: true })
                .range(from, to);

            if (error) throw error;

            if (data && data.length > 0) {
                allRecords = [...allRecords, ...data];
                // If fewer than we asked for, it's the last page
                if (data.length < 1000) {
                    finished = true;
                } else {
                    from += 1000;
                    to += 1000;
                }
            } else {
                finished = true;
            }

            // Safety limit (e.g. 15,000 students should be plenty for this system)
            if (allRecords.length >= 15000) break;
        }

        return allRecords;
    } catch (err) {
        console.error('Supabase Fetch Error:', err);
        return [];
    }
}

export async function fetchRejectedDuplicates() {
    try {
        const { data, error } = await supabase
            .from('rejected_duplicates')
            .select('*')
            .order('rejected_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Fetch Rejected Error:', err);
        return [];
    }
}

// ─────────────────────────────────────────────
// 📤 Batch Upload (Excel)
// ─────────────────────────────────────────────
export async function uploadDeliveries(newRows, subjectNameRaw, isIT = false) {
    try {
        let subjectName = subjectNameRaw.trim();
        if (isIT) {
            subjectName += ' (IT-1)';
        }
        const subjectSlug = slugify(subjectName);
        const uploadBatch = String(Date.now());

        let internalDuplicateCount = 0;
        let addedCount = 0;
        let updatedCount = 0;
        const rowsToInsert = [];
        const seenInBatch = new Set(); // Track UIDs seen within this Excel file
        const skippedList = []; // Details of internal duplicates (sheet-level)

        // ─────────────────────────────────────────────
        // STEP 1: Full DB fetch for this SUBJECT
        // Fetches ALL existing records for this subject.
        // We select status and delegate info to PRESERVE it.
        // ─────────────────────────────────────────────
        const { data: existingForSubject, error: fetchError } = await supabase
            .from('deliveries')
            .select('id, status, delegateId, deliveredAt, assignedAt, assignBatchId')
            .ilike('subjectName', subjectName);

        if (fetchError) throw fetchError;

        // Create a map of existing states to preserve them
        const stateMap = {};
        if (existingForSubject) {
            existingForSubject.forEach(r => {
                stateMap[r.id] = {
                    status: r.status,
                    delegateId: r.delegateId,
                    deliveredAt: r.deliveredAt,
                    assignedAt: r.assignedAt,
                    assignBatchId: r.assignBatchId
                };
            });
        }

        const isReupload = existingForSubject && existingForSubject.length > 0;

        // ─────────────────────────────────────────────
        // STEP 2: Deduplicate the incoming Excel rows
        // Keep the FIRST occurrence of each UID.
        // Log subsequent ones as internal sheet duplicates.
        // ─────────────────────────────────────────────
        for (const row of newRows) {
            const uid = String(row.universityId || '').trim();
            const name = String(row.studentName || '').trim();
            if (!uid || !name) { internalDuplicateCount++; continue; }

            // Use it1_ prefix for IT IDs to ensure total separation
            const id = isIT ? `it1_${uid}_${subjectSlug}` : `${uid}_${subjectSlug}`;

            // If same UID appears twice in this Excel file → log second, keep first
            if (seenInBatch.has(id)) {
                internalDuplicateCount++;
                skippedList.push({ universityId: uid, studentName: name });
                continue;
            }

            seenInBatch.add(id);

            // PRESERVE STATE: If this student already had a status, keep it!
            const oldState = stateMap[id];
            if (oldState) {
                updatedCount++;
            } else {
                addedCount++;
            }

            rowsToInsert.push({
                id,
                universityId: uid,
                studentName: name,
                subjectName,
                status: oldState?.status || 'ready',
                createdAt: new Date().toISOString(),
                uploadBatch,
                // Preserved fields
                delegateId: oldState?.delegateId || null,
                deliveredAt: oldState?.deliveredAt || null,
                assignedAt: oldState?.assignedAt || null,
                assignBatchId: oldState?.assignBatchId || null
            });
        }

        // ─────────────────────────────────────────────
        // STEP 3: Handle existing subject data
        // We NO LONGER delete old records. We use UPSERT to merge.
        // This ensures students who were NOT in the new Excel sheet but are in DB stay there.
        // ─────────────────────────────────────────────
        /* 
        // Logic removed to prevent data loss:
        if (isReupload) {
           await supabase.from('deliveries').delete().ilike('subjectName', subjectName);
        }
        */

        // ─────────────────────────────────────────────
        // STEP 4: Upsert all rows (Add new / Update existing)
        // ─────────────────────────────────────────────
        if (rowsToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('deliveries')
                .upsert(rowsToInsert, { onConflict: 'id' });

            if (insertError) throw insertError;
        }

        // ─────────────────────────────────────────────
        // STEP 5: Log internal (sheet-level) duplicates only (DISABLED per user request)
        // ─────────────────────────────────────────────
        /*
        if (skippedList.length > 0) {
            const rejectedRows = skippedList.map(s => ({
                student_id: s.universityId,
                student_name: s.studentName,
                subject_name: subjectName,
                rejected_at: new Date().toISOString(),
                upload_batch: uploadBatch
            }));
            await supabase.from('rejected_duplicates').insert(rejectedRows);
        }
        */

        return { addedCount, updatedCount, internalDuplicateCount, skippedList, isReupload };
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

    // Also delete from rejected duplicates log
    await supabase
        .from('rejected_duplicates')
        .delete()
        .eq('subject_name', subjectName);

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

    // Also delete from rejected duplicates log (cascading undo)
    await supabase
        .from('rejected_duplicates')
        .delete()
        .eq('upload_batch', batchId);

    return data?.length || 0;
}

// ─────────────────────────────────────────────
// 🔑 Auth & Config Helpers
// ─────────────────────────────────────────────
export async function fetchDelegates() {
    const { data, error } = await supabase
        .from('delegates')
        .select('*')
        .order('name');

    if (error) throw error;
    return data || [];
}

export async function validateDelegateCode(input) {
    if (!input) return null;
    const cleanInput = input.trim();

    // 1. Try matching by CODE (Main method)
    const { data: byCode, error } = await supabase
        .from('delegates')
        .select('*')
        .eq('code', cleanInput)
        .maybeSingle();

    return byCode;
}

export async function upsertDelegate(code, name, department = '') {
    if (!code || !name) return;
    const { error } = await supabase
        .from('delegates')
        .upsert({ code, name, department }, { onConflict: 'code' });

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

// ─────────────────────────────────────────────
// 🔄 Migrate Subject to IT
// ─────────────────────────────────────────────
export async function migrateSubjectToIT(oldName) {
    const newName = `${oldName} (IT-1)`;
    const newSlug = slugify(newName);

    // 1. Fetch all rows for the old subject
    const { data: rows, error: fetchError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('subjectName', oldName);

    if (fetchError) throw fetchError;
    if (!rows || rows.length === 0) return { success: true, count: 0 };

    // 2. Prepare new rows with it1_ prefix and new subject name
    const newRows = rows.map(row => {
        const uid = row.universityId;
        const newId = `it1_${uid}_${newSlug}`;
        return {
            ...row,
            id: newId,
            subjectName: newName
        };
    });

    // 3. Upsert new rows
    const { error: insertError } = await supabase.from('deliveries').upsert(newRows);
    if (insertError) throw insertError;

    // 4. Delete old rows
    const { error: deleteError } = await supabase
        .from('deliveries')
        .delete()
        .eq('subjectName', oldName);

    if (deleteError) throw deleteError;

    return { success: true, count: rows.length };
}

// ─────────────────────────────────────────────
// 🗺️ Sections & Student Mappings
// ─────────────────────────────────────────────

export async function fetchSectionsMap() {
    try {
        // 1. Fetch all sections metadata
        const { data: sections, error: secErr } = await supabase
            .from('sections')
            .select('*');

        if (secErr) throw secErr;

        // 2. Fetch all student mappings (pagination might be needed if > 1000)
        let allMappings = [];
        let from = 0;
        let to = 999;
        let finished = false;

        while (!finished) {
            const { data, error } = await supabase
                .from('student_sections')
                .select('*')
                .range(from, to);

            if (error) throw error;
            if (data && data.length > 0) {
                allMappings = [...allMappings, ...data];
                if (data.length < 1000) finished = true;
                else { from += 1000; to += 1000; }
            } else {
                finished = true;
            }
        }

        // 3. Reconstruct the JSON structure
        const result = {};
        sections.forEach(s => {
            result[s.section_key] = {
                name: s.name,
                students: []
            };
        });

        allMappings.forEach(m => {
            if (result[m.section_key]) {
                result[m.section_key].students.push(parseInt(m.university_id, 10));
            }
        });

        return result;
    } catch (err) {
        console.error('Error fetching sectionsMap:', err);
        return {};
    }
}
