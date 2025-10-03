import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";


export default function Dashboard() {
    const [rows, setRows] = useState([]);


    useEffect(() => {
        (async () => {
            const now = new Date().toISOString();
            const { data, error } = await supabase
                .from("appointments")
                .select(`
    id,
    starts_at,
    ends_at,
    status,
    room,
    patient_id,
    patient:patients ( first_name, last_name )
  `)
                .gte("starts_at", now)
                .order("starts_at", { ascending: true })
                .limit(10);

            if (!error) setRows(data || []);
        })();
    }, []);


    return (
        <div className="page">
            <h1>Dashboard</h1>
            <div className="list">
                {rows.map((r) => (
                    <div key={r.id} className="item">
                        <div>
                            <b>{new Date(r.starts_at).toLocaleString()}</b> → {new Date(r.ends_at).toLocaleTimeString()}
                        </div>
                        <div>
                            Status: {r.status} • Room: {r.room || "—"} • Patient:{" "}
                            {r.patient ? `${r.patient.first_name} ${r.patient.last_name}` : "—"}
                        </div>
                    </div>
                ))}
                {!rows.length && <div>No upcoming appointments.</div>}
            </div>
        </div>
    );
}