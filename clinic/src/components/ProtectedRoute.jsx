// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export default function ProtectedRoute({ children }) {
    const { session, ready } = useAuth();
    const [allowed, setAllowed] = useState(null);
    const loc = useLocation();

    useEffect(() => {
        let active = true;

        async function check() {
            if (!ready) return;
            if (!session) { setAllowed(false); return; }

            // optional: enforce active profile
            const { data, error } = await supabase
                .from("profiles")
                .select("is_active")
                .eq("id", session.user.id)
                .single();

            if (!active) return;
            if (error || !data?.is_active) setAllowed(false);
            else setAllowed(true);
        }

        check();
        return () => { active = false; };
    }, [session, ready]);

    if (!ready || allowed === null) return <div style={{ padding: 24 }}>Loading…</div>;
    if (!session || allowed === false) return <Navigate to="/signin" state={{ from: loc }} replace />;
    return children;
}
