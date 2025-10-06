import { supabase } from "./supabase";

export default async function uploadPatientFiles(patientId, visitId, files) {
    for (const file of files) {
        const fileId = crypto.randomUUID();
        const key = `patient/${patientId}/${fileId}-${file.name}`;
        const { error: upErr } = await supabase.storage
            .from("patient-files")
            .upload(key, file, { upsert: false });
        if (upErr) throw upErr;

        const { error: recErr } = await supabase.from("files").insert({
            patient_id: patientId,
            visit_id: visitId ?? null,
            storage_key: key,
            file_name: file.name,
            mime_type: file.type,
            size_bytes: file.size,
        });
        if (recErr) throw recErr;
    }
}
