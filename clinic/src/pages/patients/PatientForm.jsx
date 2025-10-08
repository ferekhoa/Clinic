import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function PatientForm() {
    const nav = useNavigate();
    const [f, setF] = useState({ first_name: "", last_name: "", phone: "", dob: "", notes: "" });
    const [err, setErr] = useState("");

    function upd(k, v) { setF((s) => ({ ...s, [k]: v })); }

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");
        const { data, error } = await supabase
            .from("patients")
            .insert({
                first_name: f.first_name.trim(),
                last_name: f.last_name.trim(),
                phone: f.phone.trim() || null,
                dob: f.dob || null,
                notes: f.notes || null,
            })
            .select()
            .single();

        if (error) setErr(error.message);
        else nav(`/patients/${data.id}`);
    }

    return (
        <div className="page">
            <div className="page-head">
                <h1>New Patient</h1>
                <div className="muted">Create a patient record</div>
            </div>

            <div className="card form-card">
                <form className="form form-patient" onSubmit={onSubmit} noValidate>
                    <div className="form-row two">
                        <div className="form-col">
                            <label>First name</label>
                            <input
                                className="input"
                                value={f.first_name}
                                onChange={(e) => upd("first_name", e.target.value)}
                                required
                                placeholder="John"
                            />
                        </div>
                        <div className="form-col">
                            <label>Last name</label>
                            <input
                                className="input"
                                value={f.last_name}
                                onChange={(e) => upd("last_name", e.target.value)}
                                required
                                placeholder="Doe"
                            />
                        </div>
                    </div>

                    <div className="form-row two">
                        <div className="form-col">
                            <label>Phone</label>
                            <input
                                className="input"
                                value={f.phone}
                                onChange={(e) => upd("phone", e.target.value)}
                                placeholder="+961 03 123 456"
                                inputMode="tel"
                            />
                        </div>
                        <div className="form-col">
                            <label>Date of birth</label>
                            <input
                                className="input"
                                type="date"
                                value={f.dob}
                                onChange={(e) => upd("dob", e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-col">
                            <label>Notes</label>
                            <textarea
                                className="input"
                                value={f.notes}
                                onChange={(e) => upd("notes", e.target.value)}
                                placeholder="Allergies, medical history, etc."
                            />
                        </div>
                    </div>

                    {err && <div className="error">{err}</div>}

                    <div className="row" style={{ marginTop: 8, gap: 8 }}>
                        <button type="submit" className="btn btn-primary">Create</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
