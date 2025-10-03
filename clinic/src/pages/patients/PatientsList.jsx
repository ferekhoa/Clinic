import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";


export default function PatientsList() {
    const [rows, setRows] = useState([]);
    const [q, setQ] = useState("");


    async function load() {
        let query = supabase
            .from("patients")
            .select("id, first_name, last_name, phone, dob, created_at")
            .order("created_at", { ascending: false })
            .limit(200);


        const { data, error } = await query;
        if (!error) setRows(data || []);
    }


    useEffect(() => { load(); }, []);


    const filtered = rows.filter(r =>
        `${r.first_name} ${r.last_name} ${r.phone}`
            .toLowerCase()
            .includes(q.toLowerCase())
    );


    return (
        <div className="page">
            <div className="page-head">
                <h1>Patients</h1>
                <Link to="/patients/new" className="btn">+ Add Patient</Link>
            </div>
            <input placeholder="Search" value={q} onChange={e => setQ(e.target.value)} />
            <div className="table">
                <div className="thead">
                    <div>Full name</div>
                    <div>Phone</div>
                    <div>DOB</div>
                    <div>Actions</div>
                </div>
                {filtered.map(p => (
                    <div key={p.id} className="trow">
                        <div>{p.first_name} {p.last_name}</div>
                        <div>{p.phone || '—'}</div>
                        <div>{p.dob ? new Date(p.dob).toLocaleDateString() : '—'}</div>
                        <div><Link to={`/patients/${p.id}`}>Open</Link></div>
                    </div>
                ))}
            </div>
        </div>
    );
}