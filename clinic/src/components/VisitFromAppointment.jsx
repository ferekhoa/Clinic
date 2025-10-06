import { useState } from "react";
import { supabase } from "../lib/supabase";
import uploadPatientFiles from "../lib/uploadPatientFiles";

export default function VisitFromAppointment({ appointment, onDone }) {
    const [f, setF] = useState({ complaint: "", diagnosis: "", treatment: "", remarks: "" });
    const [files, setFiles] = useState([]);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    function upd(k, v) { setF((s) => ({ ...s, [k]: v })); }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!appointment?.patient_id) { setErr("Missing patient"); return; }
        setBusy(true); setErr("");
        try {
            // 1) Insert visit (DB default visit_date = now)
            const payload = { patient_id: appointment.patient_id, ...f };
            const { data: visit, error: vErr } = await supabase
                .from("visits").insert(payload).select("id").single();
            if (vErr) throw vErr;

            // 2) Upload files (if any), attach to visit
            if (files?.length) {
                await uploadPatientFiles(appointment.patient_id, visit.id, files);
            }

            // 3) Mark appointment as completed
            const { error: aErr } = await supabase
                .from("appointments")
                .update({ status: "completed" })
                .eq("id", appointment.id);
            if (aErr) throw aErr;

            onDone?.();
        } catch (e) {
            setErr(e.message || String(e));
        } finally {
            setBusy(false);
        }
    }

    return (
        <form className="form" onSubmit={handleSubmit}>
            <div style={{ marginBottom: 8 }}>
                <b>{appointment?.patient?.first_name} {appointment?.patient?.last_name}</b>
                <div style={{ opacity: 0.7, fontSize: 12 }}>
                    {new Date(appointment.starts_at).toLocaleString()} → {new Date(appointment.ends_at).toLocaleTimeString()} • Room {appointment.room || "—"}
                </div>
            </div>

            <label>Complaint</label>
            <textarea value={f.complaint} onChange={(e) => upd("complaint", e.target.value)} />

            <label>Diagnosis</label>
            <textarea value={f.diagnosis} onChange={(e) => upd("diagnosis", e.target.value)} />

            <label>Treatment</label>
            <textarea value={f.treatment} onChange={(e) => upd("treatment", e.target.value)} />

            <label>Remarks</label>
            <textarea value={f.remarks} onChange={(e) => upd("remarks", e.target.value)} />

            <label>Attach files (optional)</label>
            <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />

            {err && <div className="error" style={{ marginTop: 6 }}>{err}</div>}

            <div className="row" style={{ marginTop: 10 }}>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                    {busy ? "Saving…" : "Save visit & complete"}
                </button>
            </div>
        </form>
    );
}
