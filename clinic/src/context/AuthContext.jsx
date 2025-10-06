// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";


const AuthContext = createContext(null);


export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [ready, setReady] = useState(false);


    useEffect(() => {
        let mounted = true;
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!mounted) return;
            setSession(session);
            setReady(true);
        })();


        const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
            setSession(s);
        });
        return () => sub.subscription.unsubscribe();
    }, []);


    return (
        <AuthContext.Provider value={{ session, ready }}>
            {children}
        </AuthContext.Provider>
    );
}


export function useAuth() {
    return useContext(AuthContext);
}