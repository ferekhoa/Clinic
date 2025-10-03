// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import ProtectedRoute from "./components/ProtectedRoute";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import PatientsList from "./pages/patients/PatientsList";
import PatientForm from "./pages/patients/PatientForm";
import PatientDetails from "./pages/patients/PatientDetails";
import CalendarPage from "./pages/appointments/CalendarPage";

export default function App() {
  return (
    <>
      {/* Hide the nav on the signin page */}
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <>
                <NavBar />
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/patients" element={<PatientsList />} />
                  <Route path="/patients/new" element={<PatientForm />} />
                  <Route path="/patients/:id" element={<PatientDetails />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  {/* fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}
