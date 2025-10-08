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

    function statusBadge(s) {
        const label = s === "no_show" ? "No-show" : s?.charAt(0).toUpperCase() + s?.slice(1);
        const cls =
            s === "completed" ? "badge badge--success" :
                s === "no_show" ? "badge badge--danger" :
                    "badge badge--info";
        return <span className={cls}>{label || "Booked"}</span>;
    }

    return (
        <div className="page">
            <div className="page-head">
                <h1>Dashboard</h1>
                <div className="muted">Next 10 upcoming appointments</div>
            </div>

            <div className="card">
                {rows.length ? (
                    <div className="list">
                        {rows.map((r) => (
                            <div key={r.id} className="appt-item">
                                <div className="appt-left">
                                    <div className="appt-time">
                                        {new Date(r.starts_at).toLocaleDateString()}&nbsp;
                                        <span className="appt-time-sub">
                                            {new Date(r.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            {" — "}
                                            {new Date(r.ends_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                    </div>
                                    <div className="appt-meta">
                                        {statusBadge(r.status)}
                                        <span className="dot">•</span>
                                        <span className="muted">Room</span>&nbsp;<span className="chip">{r.room || "—"}</span>
                                    </div>
                                </div>
                                <div className="appt-right">
                                    <div className="appt-patient">
                                        {r.patient ? `${r.patient.first_name} ${r.patient.last_name}` : "—"}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-emoji" aria-hidden>📅</div>
                        <div className="empty-title">No upcoming appointments</div>
                        <div className="empty-sub">New bookings will appear here.</div>
                    </div>
                )}
            </div>
        </div>
    );
}
