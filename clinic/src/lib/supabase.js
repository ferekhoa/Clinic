import { createClient } from "@supabase/supabase-js";


const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// src/lib/supabase.js
console.log("SB URL", import.meta.env.VITE_SUPABASE_URL);
console.log("SB KEY starts", (import.meta.env.VITE_SUPABASE_ANON_KEY || "").slice(0, 10));
export const supabase = createClient(url, anon, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
});