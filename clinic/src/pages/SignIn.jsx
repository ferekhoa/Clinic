// src/pages/SignIn.jsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function SignIn() {
    const nav = useNavigate();
    const loc = useLocation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    async function onSubmit(e) {
        e.preventDefault();
        setErrorMsg("");
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);
        if (error) setErrorMsg(error.message || "Invalid email or password.");
        else nav(loc.state?.from?.pathname || "/", { replace: true });
    }

    return (
        <div className="centered">
            <form className="card" onSubmit={onSubmit}>
                <h2>Staff Sign in</h2>
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                <label>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                {errorMsg && <div className="error">{errorMsg}</div>}
                <button disabled={loading}>{loading ? "Working…" : "Sign in"}</button>
            </form>
        </div>
    );
}
