import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";


export default function PatientForm() {
    const nav = useNavigate();
    const [f, setF] = useState({ first_name: "", last_name: "", phone: "", dob: "", notes: "" });
    const [err, setErr] = useState("");


    function upd(k, v) { setF(s => ({ ...s, [k]: v })); }


    async function onSubmit(e) {
        e.preventDefault();
        setErr("");
        const { data, error } = await supabase.from("patients").insert({
            first_name: f.first_name.trim(),
            last_name: f.last_name.trim(),
            phone: f.phone.trim() || null,
            dob: f.dob || null,
            notes: f.notes || null,
        }).select().single();
        if (error) setErr(error.message);
        else nav(`/patients/${data.id}`);
    }


    return (
        <div className="page">
            <h1>New Patient</h1>
            <form className="form" onSubmit={onSubmit}>
                <label>First name</label>
                <input value={f.first_name} onChange={e => upd('first_name', e.target.value)} required />
                <label>Last name</label>
                <input value={f.last_name} onChange={e => upd('last_name', e.target.value)} required />
                <label>Phone</label>
                <input value={f.phone} onChange={e => upd('phone', e.target.value)} />
                <label>Date of birth</label>
                <input type="date" value={f.dob} onChange={e => upd('dob', e.target.value)} />
                <label>Notes</label>
                <textarea value={f.notes} onChange={e => upd('notes', e.target.value)} />
                {err && <div className="error">{err}</div>}
                <div className="row">
                    <button type="submit">Create</button>
                </div>
            </form>
        </div>
    );
}