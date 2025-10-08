import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function PatientsList() {
    const [rows, setRows] = useState([]);
    const [q, setQ] = useState("");

    async function load() {
        const { data, error } = await supabase
            .from("patients")
            .select("id, first_name, last_name, phone, dob, created_at")
            .order("created_at", { ascending: false })
            .limit(200);
        if (!error) setRows(data || []);
    }

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return rows;
        return rows.filter((r) =>
            `${r.first_name} ${r.last_name} ${r.phone || ""}`.toLowerCase().includes(s)
        );
    }, [rows, q]);

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Patients</h1>
                    <div className="muted">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</div>
                </div>
                <Link to="/patients/new" className="btn btn-primary">+ Add Patient</Link>
            </div>

            <div className="card" style={{ marginBottom: 12 }}>
                <div className="searchbar">
                    <span className="search-ico" aria-hidden>🔎</span>
                    <input
                        className="search-input"
                        placeholder="Search by name or phone…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                    {q && (
                        <button className="search-clear" onClick={() => setQ("")} aria-label="Clear">✕</button>
                    )}
                </div>
            </div>

            <div className="table card">
                <div className="thead">
                    <div>Full name</div>
                    <div>Phone</div>
                    <div>DOB</div>
                    <div>Actions</div>
                </div>
                {filtered.map((p) => (
                    <div key={p.id} className="trow">
                        <div><b>{p.first_name} {p.last_name}</b></div>
                        <div>{p.phone || "—"}</div>
                        <div>{p.dob ? new Date(p.dob).toLocaleDateString() : "—"}</div>
                        <div><Link className="link" to={`/patients/${p.id}`}>Open</Link></div>
                    </div>
                ))}
                {!filtered.length && (
                    <div className="empty-state">
                        <div className="empty-emoji" aria-hidden>🗂️</div>
                        <div className="empty-title">No patients found</div>
                        <div className="empty-sub">Try a different search, or add a new patient.</div>
                    </div>
                )}
            </div>
        </div>
    );
}
