import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import Modal from "../../components/Modal";

export default function PatientDetails() {
    const { id: patientId } = useParams();
    const [p, setP] = useState(null);

    const [visits, setVisits] = useState([]);                 // visits array
    const [filesByVisit, setFilesByVisit] = useState(new Map()); // visitId -> files[]
    const [vform, setVform] = useState({ complaint: "", diagnosis: "", treatment: "", remarks: "" });
    const [vfile, setVfile] = useState(null);                 // optional file for new visit
    const [uploading, setUploading] = useState(false);
    const [err, setErr] = useState("");

    // modal for viewing a single visit in detail
    const [openVisit, setOpenVisit] = useState(null);         // a visit row or null
    const [openVisitUrlMap, setOpenVisitUrlMap] = useState({}); // fileId -> signedUrl (for modal)

    async function loadAll() {
        // Patient
        const pRes = await supabase.from("patients").select("*").eq("id", patientId).single();
        if (!pRes.error) setP(pRes.data);

        // Visits (newest first)
        const vRes = await supabase
            .from("visits")
            .select("*")
            .eq("patient_id", patientId)
            .order("visit_date", { ascending: false });

        if (!vRes.error) {
            const vs = vRes.data || [];
            setVisits(vs);

            // Load all files for these visits in one go
            if (vs.length) {
                const ids = vs.map((v) => v.id);
                const fRes = await supabase
                    .from("files")
                    .select("id, visit_id, storage_key, file_name, mime_type, size_bytes, created_at")
                    .in("visit_id", ids)
                    .order("created_at", { ascending: false });

                const map = new Map();
                if (!fRes.error) {
                    (fRes.data || []).forEach((f) => {
                        if (!map.has(f.visit_id)) map.set(f.visit_id, []);
                        map.get(f.visit_id).push(f);
                    });
                }
                setFilesByVisit(map);
            } else {
                setFilesByVisit(new Map());
            }
        }
    }

    useEffect(() => {
        loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId]);

    // ----- utils -----
    async function signedUrl(key) {
        const { data, error } = await supabase.storage.from("patient-files").createSignedUrl(key, 60 * 60);
        if (error) return null;
        return data.signedUrl;
    }

    async function uploadToStorageForVisit(visitId, file) {
        const fileId = crypto.randomUUID();
        const key = `patient/${patientId}/visit/${visitId}/${fileId}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("patient-files").upload(key, file, { upsert: false });
        if (upErr) throw upErr;
        const { error: recErr } = await supabase.from("files").insert({
            patient_id: patientId, // keep denormalized for convenience
            visit_id: visitId,
            storage_key: key,
            file_name: file.name,
            mime_type: file.type,
            size_bytes: file.size,
        });
        if (recErr) throw recErr;
        return key;
    }

    // ----- create visit (optionally attach file) -----
    async function addVisit(e) {
        e.preventDefault();
        setErr("");
        setUploading(true);
        try {
            // 1) create visit
            const { data: v, error: vErr } = await supabase
                .from("visits")
                .insert({ patient_id: patientId, ...vform })
                .select()
                .single();
            if (vErr) throw vErr;

            // 2) optional file
            if (vfile) {
                await uploadToStorageForVisit(v.id, vfile);
                setVfile(null);
            }

            setVform({ complaint: "", diagnosis: "", treatment: "", remarks: "" });
            await loadAll();
        } catch (e) {
            setErr(e.message || String(e));
        } finally {
            setUploading(false);
        }
    }

    // ----- add file to an existing visit (from modal) -----
    async function addFileForVisit(visitId, file) {
        if (!file) return;
        setErr("");
        setUploading(true);
        try {
            await uploadToStorageForVisit(visitId, file);
            await loadAll();

            // if modal is open on this visit, refresh its signed URLs
            if (openVisit?.id === visitId) {
                await prepareModalFiles(visitId);
            }
        } catch (e) {
            setErr(e.message || String(e));
        } finally {
            setUploading(false);
        }
    }

    async function prepareModalFiles(visitId) {
        const files = filesByVisit.get(visitId) || [];
        const entries = await Promise.all(files.map(async (f) => [f.id, await signedUrl(f.storage_key)]));
        const map = {};
        entries.forEach(([id, u]) => (map[id] = u));
        setOpenVisitUrlMap(map);
    }

    const fullName = useMemo(() => (p ? `${p.first_name} ${p.last_name}` : ""), [p]);
    const initials = useMemo(() => {
        if (!p) return "";
        const first = (p.first_name || "").trim()[0] || "";
        const last = (p.last_name || "").trim()[0] || "";
        return (first + last).toUpperCase();
    }, [p]);

    return (
        <div className="page">
            <div className="page-head">
                <h1>Patient</h1>
                <Link className="btn" to="/patients">Back</Link>
            </div>

            {!p ? (
                <div>Loading…</div>
            ) : (
                <>
                    {/* Patient core card */}
                    <div className="card patient-card">
                        <div className="patient-hero">
                            <div className="patient-avatar" aria-hidden>{initials || "👤"}</div>
                            <div className="patient-id-block">
                                <div className="patient-name">{fullName}</div>
                                <div className="patient-meta">
                                    <span className="chip">{p.dob ? new Date(p.dob).toLocaleDateString() : "DOB —"}</span>
                                    <span className="chip">{p.phone || "Phone —"}</span>
                                </div>
                            </div>
                        </div>
                        {p.notes && (
                            <div className="patient-notes">
                                <div className="label">Notes</div>
                                <div className="note-text">{p.notes}</div>
                            </div>
                        )}
                    </div>

                    {/* New Visit form */}
                    <div className="grid2" style={{ marginTop: 12 }}>
                        <div className="card">
                            <div className="section-head">
                                <h3>New Visit</h3>
                                <span className="muted">Fill in details and attach an optional file</span>
                            </div>
                            <form onSubmit={addVisit} className="form form-visit">
                                <div className="form-row">
                                    <div className="form-col">
                                        <label>Complaint</label>
                                        <textarea
                                            className="input"
                                            value={vform.complaint}
                                            onChange={(e) => setVform((s) => ({ ...s, complaint: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="form-row two">
                                    <div className="form-col">
                                        <label>Diagnosis</label>
                                        <textarea
                                            className="input"
                                            value={vform.diagnosis}
                                            onChange={(e) => setVform((s) => ({ ...s, diagnosis: e.target.value }))}
                                        />
                                    </div>
                                    <div className="form-col">
                                        <label>Treatment</label>
                                        <textarea
                                            className="input"
                                            value={vform.treatment}
                                            onChange={(e) => setVform((s) => ({ ...s, treatment: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-col">
                                        <label>Remarks</label>
                                        <textarea
                                            className="input"
                                            value={vform.remarks}
                                            onChange={(e) => setVform((s) => ({ ...s, remarks: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="form-row align-center">
                                    <label className="muted">Attach file (optional)</label>
                                    <input className="input-file" type="file" onChange={(e) => setVfile(e.target.files?.[0] || null)} />
                                </div>

                                <div className="row" style={{ marginTop: 6 }}>
                                    <button className="btn btn-primary" disabled={uploading}>
                                        {uploading ? "Saving…" : "Add Visit"}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Right column placeholder (kept empty for balance / future widgets) */}
                        <div className="card soft-card">
                            <div className="section-head">
                                <h3>Overview</h3>
                                <span className="muted">Visits: {visits.length}</span>
                            </div>
                            <div className="muted" style={{ fontSize: 14 }}>
                                Most recent: {visits[0] ? new Date(visits[0].visit_date).toLocaleString() : "—"}
                            </div>
                        </div>
                    </div>

                    {err && <div className="error" style={{ marginTop: 12 }}>{err}</div>}

                    {/* Visits list (stylish, compact, clickable items) */}
                    <div className="card" style={{ marginTop: 12 }}>
                        <div className="section-head">
                            <h3>Visits</h3>
                            <span className="muted">Click to view details and files</span>
                        </div>
                        {!visits.length && <div>No visits yet.</div>}
                        {!!visits.length && (
                            <div className="visit-list">
                                {visits.map((v, idx) => {
                                    const complaint = (v.complaint || "").trim();
                                    const fCount = (filesByVisit.get(v.id) || []).length;
                                    return (
                                        <div key={v.id}>
                                            <button
                                                className="visit-item"
                                                onClick={async () => {
                                                    setOpenVisit(v);
                                                    await prepareModalFiles(v.id);
                                                }}
                                                title="Open visit details"
                                            >
                                                <div className="visit-date">
                                                    {new Date(v.visit_date).toLocaleDateString()}
                                                    <span className="visit-time">
                                                        {new Date(v.visit_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                    </span>
                                                </div>
                                                <div className="visit-complaint">
                                                    {complaint || <span className="muted">No complaint recorded</span>}
                                                </div>
                                                <div className="visit-right">
                                                    {fCount > 0 && <span className="pill">{fCount}</span>}
                                                    <span className="visit-arrow">›</span>
                                                </div>
                                            </button>

                                            {idx < visits.length - 1 && <div className="visit-sep" />}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Visit Details Modal */}
            <Modal
                open={!!openVisit}
                onClose={() => {
                    setOpenVisit(null);
                    setOpenVisitUrlMap({});
                }}
                title={openVisit ? `Visit — ${new Date(openVisit.visit_date).toLocaleString()}` : "Visit"}
            >
                {openVisit && (
                    <div className="stack gap-2 visit-modal">
                        <div className="vm-row">
                            <div className="vm-label">Complaint</div>
                            <div className="vm-value">{openVisit.complaint || <span className="muted">—</span>}</div>
                        </div>
                        <div className="vm-row">
                            <div className="vm-label">Diagnosis</div>
                            <div className="vm-value">{openVisit.diagnosis || <span className="muted">—</span>}</div>
                        </div>
                        <div className="vm-row">
                            <div className="vm-label">Treatment</div>
                            <div className="vm-value">{openVisit.treatment || <span className="muted">—</span>}</div>
                        </div>
                        <div className="vm-row">
                            <div className="vm-label">Remarks</div>
                            <div className="vm-value">{openVisit.remarks || <span className="muted">—</span>}</div>
                        </div>

                        {/* Files for this visit */}
                        <div className="vm-files">
                            <div className="vm-files-head">
                                <b>Files</b>
                                <span className="muted">({(filesByVisit.get(openVisit.id) || []).length})</span>
                            </div>

                            {!(filesByVisit.get(openVisit.id) || []).length && <div className="muted">No files</div>}

                            {(filesByVisit.get(openVisit.id) || []).map((f) => (
                                <div key={f.id} className="vm-file-row">
                                    <div className="vm-file-info">
                                        <div className="vm-file-name">{f.file_name}</div>
                                        <div className="vm-file-meta">
                                            {Math.round((f.size_bytes || 0) / 1024)} KB • {new Date(f.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                    {openVisitUrlMap[f.id] && (
                                        <a href={openVisitUrlMap[f.id]} target="_blank" rel="noreferrer" className="btn">Open</a>
                                    )}
                                </div>
                            ))}

                            <div className="vm-file-add">
                                <label className="stack gap-1">
                                    <span className="muted">Add file to this visit</span>
                                    <input
                                        type="file"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) await addFileForVisit(openVisit.id, file);
                                            e.target.value = "";
                                        }}
                                    />
                                </label>
                                {uploading && <div className="muted" style={{ fontSize: 13 }}>Uploading…</div>}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
