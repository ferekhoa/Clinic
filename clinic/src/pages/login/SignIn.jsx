// src/pages/login/SignIn.jsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "../login/LoginPage.css"; // <-- import the new styles

export default function SignIn() {
    const nav = useNavigate();
    const loc = useLocation();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(true);
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Prefill from "remember me"
    useEffect(() => {
        const remembered = localStorage.getItem("rememberEmail");
        if (remembered) setEmail(remembered);
    }, []);

    const emailInvalid = email !== "" && !/^\S+@\S+\.\S+$/.test(email);
    const pwInvalid = password !== "" && password.length < 6;

    async function onSubmit(e) {
        e.preventDefault();
        setErrorMsg("");
        setLoading(true);

        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        setLoading(false);

        if (error) {
            setErrorMsg(error.message || "Invalid email or password.");
            return;
        }

        // remember email optionally
        if (remember) localStorage.setItem("rememberEmail", email.trim());
        else localStorage.removeItem("rememberEmail");

        // redirect to the intended route or home
        nav(loc.state?.from?.pathname || "/", { replace: true });
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-brand">
                    <div className="auth-logo" aria-hidden />
                    <div className="auth-title">Welcome back</div>
                    <div className="auth-subtitle">Sign in to continue</div>
                </div>

                {errorMsg && (
                    <div role="alert" className="auth-alert auth-alert--error">
                        {errorMsg}
                    </div>
                )}

                <form className="auth-form" onSubmit={onSubmit} noValidate>
                    <div className="auth-field">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            className={`auth-input ${emailInvalid ? "is-invalid" : ""}`}
                            type="email"
                            inputMode="email"
                            autoComplete="username email"
                            placeholder="you@clinic.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            aria-invalid={emailInvalid || undefined}
                            aria-describedby={emailInvalid ? "email-err" : undefined}
                        />
                        {emailInvalid && (
                            <div id="email-err" className="auth-hint auth-hint--error">
                                Please enter a valid email.
                            </div>
                        )}
                    </div>

                    <div className="auth-field">
                        <label htmlFor="password">Password</label>
                        <div className="auth-input-wrap">
                            <input
                                id="password"
                                className={`auth-input ${pwInvalid ? "is-invalid" : ""}`}
                                type={showPw ? "text" : "password"}
                                autoComplete="current-password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                aria-invalid={pwInvalid || undefined}
                                aria-describedby={pwInvalid ? "pw-err" : undefined}
                            />
                            <button
                                type="button"
                                className="auth-eye"
                                onClick={() => setShowPw((s) => !s)}
                                aria-label={showPw ? "Hide password" : "Show password"}
                                disabled={loading}
                            >
                                {showPw ? "🙈" : "👁️"}
                            </button>
                        </div>
                        {pwInvalid && (
                            <div id="pw-err" className="auth-hint auth-hint--error">
                                Minimum 6 characters.
                            </div>
                        )}
                    </div>

                    <div className="auth-row">
                        <label className="auth-check">
                            <input
                                type="checkbox"
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                                disabled={loading}
                            />
                            <span>Remember me</span>
                        </label>

                        {/* Optional: route to your reset page if you have it */}
                        <a className="auth-link" href="/forgot-password">
                            Forgot password?
                        </a>
                    </div>

                    <button
                        type="submit"
                        className="auth-btn auth-btn--primary"
                        disabled={loading || emailInvalid || pwInvalid || !email || !password}
                        aria-busy={loading || undefined}
                    >
                        {loading ? <span className="auth-spinner" aria-hidden /> : <span>Sign in</span>}
                    </button>
                </form>

                <div className="auth-foot">
                    <span>Don’t have an account?</span>{" "}
                    <a className="auth-link" href="/register">
                        Create one
                    </a>
                </div>
            </div>
        </div>
    );
}
