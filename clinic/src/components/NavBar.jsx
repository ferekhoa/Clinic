import { NavLink, useNavigate } from "react-router-dom";
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
                <NavLink to="/" className="brand">
                    Clinic
                </NavLink>

                <NavLink
                    to="/patients"
                    className={({ isActive }) =>
                        isActive ? "nav-link active" : "nav-link"
                    }
                >
                    Patients
                </NavLink>

                <NavLink
                    to="/calendar"
                    className={({ isActive }) =>
                        isActive ? "nav-link active" : "nav-link"
                    }
                >
                    Calendar
                </NavLink>
            </div>

            <div className="nav-right">
                <button className="btn btn-ghost" onClick={logout}>
                    Sign out
                </button>
            </div>
        </nav>
    );
}
