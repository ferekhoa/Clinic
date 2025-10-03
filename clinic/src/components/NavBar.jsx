import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";


export default function NavBar() {
    const nav = useNavigate();
    async function logout() {
        await supabase.auth.signOut();
        nav("/signin");
    }
    return (
        <nav className="nav">
            <div className="nav-left">
                <Link to="/" className="brand">Clinic</Link>
                <Link to="/patients">Patients</Link>
                <Link to="/calendar">Calendar</Link>
            </div>
            <div className="nav-right">
                <button onClick={logout}>Sign out</button>
            </div>
        </nav>
    );
}