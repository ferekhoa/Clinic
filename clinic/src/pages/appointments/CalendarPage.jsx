import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import { supabase } from "../../lib/supabase";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    getDay,
    locales,
});

export default function CalendarPage() {
    const [events, setEvents] = useState([]); // {id, title, start, end}
    const [err, setErr] = useState("");

    const load = useCallback(async () => {
        setErr("");
        const { data, error } = await supabase
            .from("appointments")
            .select(`
        id,
        starts_at,
        ends_at,
        status,
        room,
        patient_id,
        patient:patients ( first_name, last_name )
      `)
            .order("starts_at", { ascending: true });

        if (error) setErr(error.message);
        else
            setEvents(
                (data || []).map((a) => ({
                    id: a.id,
                    title: a.patient
                        ? `${a.patient.first_name} ${a.patient.last_name}`.trim()
                        : "Appointment",
                    start: new Date(a.starts_at),
                    end: new Date(a.ends_at),
                    resource: a,
                }))
            );
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // ---- helper: find patient by "First Last" (with sensible fallbacks) ----
    async function findPatientByFullName(input) {
        const raw = String(input || "").trim();
        if (!raw) return null;

        const parts = raw.split(/\s+/);
        const first = parts[0] ?? "";
        const last = parts.slice(1).join(" ").trim(); // supports middle names

        // 1) If both provided, try exact-ish (prefix) match on both fields.
        if (first && last) {
            const { data, error } = await supabase
                .from("patients")
                .select("id, first_name, last_name")
                .ilike("first_name", `${first}%`)
                .ilike("last_name", `${last}%`)
                .order("first_name", { ascending: true })
                .order("last_name", { ascending: true })
                .limit(20);

            if (!error && data?.length) {
                return await handleDisambiguation(raw, data);
            }
        }

        // 2) Fallback: search either column contains the typed text.
        const pattern = `%${raw}%`;
        const { data: anyData, error: anyErr } = await supabase
            .from("patients")
            .select("id, first_name, last_name")
            .or(`ilike.first_name.${pattern},ilike.last_name.${pattern}`)
            .order("first_name", { ascending: true })
            .order("last_name", { ascending: true })
            .limit(20);

        if (anyErr || !anyData?.length) return null;

        return await handleDisambiguation(raw, anyData);
    }

    async function handleDisambiguation(raw, rows) {
        if (rows.length === 1) return rows[0].id;

        // If there are multiple, ask the user which one.
        const message =
            `Multiple patients matched “${raw}”.\n` +
            rows
                .map(
                    (p, i) =>
                        `${i + 1}) ${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()
                )
                .join("\n") +
            `\n\nEnter the number (or cancel):`;

        const choice = prompt(message);
        if (!choice) return null;
        const idx = Number(choice) - 1;
        if (!Number.isInteger(idx) || idx < 0 || idx >= rows.length) return null;

        return rows[idx].id;
    }

    // ---- create appointment: now asks for full name, not patient_id ----
    async function createAppointment({ start, end }) {
        setErr("");

        const fullName = prompt(
            "Patient full name (First Last). You can type part of the name too:"
        );
        if (!fullName) return;

        const patientId = await findPatientByFullName(fullName);
        if (!patientId) {
            alert("No matching patient (or selection cancelled).");
            return;
        }

        const room = prompt("Room (optional)") || null;
        const { error } = await supabase.from("appointments").insert({
            patient_id: patientId,
            room,
            starts_at: start.toISOString(),
            ends_at: end.toISOString(),
            status: "booked",
        });

        if (error) alert(error.message); // overlap trigger errors show here
        else load();
    }

    const selectable = true;
    const defaultDate = useMemo(() => new Date(), []);

    return (
        <div className="page">
            <h1>Calendar</h1>
            {err && <div className="error">{err}</div>}
            <div className="card">
                <Calendar
                    localizer={localizer}
                    events={events}
                    defaultView="week"
                    selectable={selectable}
                    onSelectSlot={({ start, end, action }) => {
                        if (action === "select") createAppointment({ start, end });
                    }}
                    style={{ height: 600 }}
                    step={30}
                    timeslots={2}
                    defaultDate={defaultDate}
                />
            </div>
            <p style={{ opacity: 0.7, marginTop: 8 }}>
                Tip: Select a time range to create an appointment. You can type part of
                the patient’s name and pick from matches.
            </p>
        </div>
    );
}
