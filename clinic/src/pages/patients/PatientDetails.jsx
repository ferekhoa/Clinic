import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";


export default function PatientDetails() {
    const { id } = useParams();
    const [p, setP] = useState(null);
    const [visits, setVisits] = useState([]);
    const [files, setFiles] = useState([]);
    const [vform, setVform] = useState({ complaint: "", diagnosis: "", treatment: "", remarks: "" });
    const [uploading, setUploading] = useState(false);
    const [err, setErr] = useState("");


    async function loadAll() {
        const [pRes, vRes, fRes] = await Promise.all([
            supabase.from("patients").select("*").eq("id", id).single(),
            supabase.from("visits").select("*").eq("patient_id", id).order("visit_date", { ascending: false }),
            supabase.from("files").select("id, storage_key, file_name, mime_type, size_bytes, created_at").eq("patient_id", id).order("created_at", { ascending: false }),
        ]);
        if (!pRes.error) setP(pRes.data);
        if (!vRes.error) setVisits(vRes.data || []);
        if (!fRes.error) setFiles(fRes.data || []);
    }
    useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [id]);


    async function addVisit(e) {
        e.preventDefault();
        setErr("");
        const payload = { patient_id: id, ...vform };
        const { error } = await supabase.from("visits").insert(payload);
        if (error) setErr(error.message);
        else {
            setVform({ complaint: "", diagnosis: "", treatment: "", remarks: "" });
            loadAll();
        }
    }


    async function uploadFile(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setErr("");
        try {
            const fileId = crypto.randomUUID();
            const key = `patient/${id}/${fileId}-${file.name}`;
            const { error: upErr } = await supabase.storage.from("patient-files").upload(key, file, { upsert: false });
            if (upErr) throw upErr;
            const { error: recErr } = await supabase.from("files").insert({
                patient_id: id,
                visit_id: null,
                storage_key: key,
                file_name: file.name,
                mime_type: file.type,
                size_bytes: file.size,
            });
            if (recErr) throw recErr;
            await loadAll();
        } catch (e) {
            setErr(e.message);
        } finally {
            setUploading(false);
            e.target.value = ""; // reset input
        }
    }


    async function getSignedUrl(key) {
        const { data, error } = await supabase.storage.from("patient-files").createSignedUrl(key, 60 * 60); // 1h
        if (error) return null;
        return data.signedUrl;
    }


    const fullName = useMemo(() => p ? `${p.first_name} ${p.last_name}` : "", [p]);


    return (
        <div className="page">
            <div className="page-head">
                <h1>Patient</h1>
                <Link className="btn" to="/patients">Back</Link>
            </div>
            {!p ? <div>Loading…</div> : (
                <>

                    <div className="card">
                        <h3>{fullName}</h3>
                        <div>Phone: {p.phone || '—'}</div>
                        <div>DOB: {p.dob ? new Date(p.dob).toLocaleDateString() : '—'}</div>
                        <div>Notes: {p.notes || '—'}</div>
                    </div>


                    <div className="grid2">
                        <div className="card">
                            <h3>New Visit</h3>
                            <form onSubmit={addVisit} className="form">
                                <label>Complaint</label>
                                <textarea value={vform.complaint} onChange={e => setVform(s => ({ ...s, complaint: e.target.value }))} />
                                <label>Diagnosis</label>
                                <textarea value={vform.diagnosis} onChange={e => setVform(s => ({ ...s, diagnosis: e.target.value }))} />
                                <label>Treatment</label>
                                <textarea value={vform.treatment} onChange={e => setVform(s => ({ ...s, treatment: e.target.value }))} />
                                <label>Remarks</label>
                                <textarea value={vform.remarks} onChange={e => setVform(s => ({ ...s, remarks: e.target.value }))} />
                                <button>Add Visit</button>
                            </form>
                        </div>


                        <div className="card">
                            <h3>Upload file(s)</h3>
                            <input type="file" onChange={uploadFile} disabled={uploading} />
                            {uploading && <div>Uploading…</div>}
                        </div>
                    </div>

                    {err && <div className="error" style={{ marginTop: 12 }}>{err}</div>}


                    <div className="grid2">
                        <div className="card">
                            <h3>Visits</h3>
                            {!visits.length && <div>No visits yet.</div>}
                            {visits.map(v => (
                                <div key={v.id} className="item">
                                    <div><b>{new Date(v.visit_date).toLocaleString()}</b></div>
                                    {v.complaint && <div>Complaint: {v.complaint}</div>}
                                    {v.diagnosis && <div>Diagnosis: {v.diagnosis}</div>}
                                    {v.treatment && <div>Treatment: {v.treatment}</div>}
                                    {v.remarks && <div>Remarks: {v.remarks}</div>}
                                </div>
                            ))}
                        </div>


                        <div className="card">
                            <h3>Files</h3>
                            {!files.length && <div>No files.</div>}
                            {files.map(f => (
                                <FileRow key={f.id} f={f} getUrl={getSignedUrl} />
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function FileRow({ f, getUrl }) {
    const [url, setUrl] = useState(null);
    useEffect(() => { (async () => setUrl(await getUrl(f.storage_key)))(); }, [f.storage_key]);
    return (
        <div className="item">
            <div>{f.file_name} ({Math.round((f.size_bytes || 0) / 1024)} KB) – {new Date(f.created_at).toLocaleString()}</div>
            {url && <a href={url} target="_blank" rel="noreferrer">Open</a>}
        </div>
    );
}