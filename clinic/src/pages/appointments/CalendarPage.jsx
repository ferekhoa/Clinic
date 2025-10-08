import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import { supabase } from "../../lib/supabase";
import "react-big-calendar/lib/css/react-big-calendar.css";
import Modal from "../../components/Modal";
import VisitFromAppointment from "../../components/VisitFromAppointment";
import SelectLikeCombobox from "../../components/SelectLikeCombobox";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import useMediaQuery from "../../hooks/useMediaQuery";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    getDay,
    locales,
});

export default function CalendarPage() {
    const isMobile = useMediaQuery("(max-width: 640px)");

    const [events, setEvents] = useState([]); // {id, title, start, end, resource}
    const [err, setErr] = useState("");

    // toolbar control
    const [view, setView] = useState("week");        // "month" | "week" | "day" | "agenda"
    const [date, setDate] = useState(new Date());    // current visible date

    // create-appointment modal state
    const [createOpen, setCreateOpen] = useState(false);
    const [slot, setSlot] = useState({ start: null, end: null });
    const [saving, setSaving] = useState(false);

    // combobox state (patient, room)
    const [patientQuery, setPatientQuery] = useState("");
    const debPatientQuery = useDebouncedValue(patientQuery, 250);
    const [patientOptions, setPatientOptions] = useState([]); // {value,label,raw}
    const [patientOpt, setPatientOpt] = useState(null);

    const [roomQuery, setRoomQuery] = useState("");
    const debRoomQuery = useDebouncedValue(roomQuery, 200);
    const [roomOptions, setRoomOptions] = useState([]); // {value,label}
    const [roomOpt, setRoomOpt] = useState(null);

    // event action modal (complete / no-show) + visit modal
    const [actionAppt, setActionAppt] = useState(null); // raw appointment row
    const [visitModalOpen, setVisitModalOpen] = useState(false);

    // switch to Day view automatically on small screens; Week on larger
    useEffect(() => {
        setView((prev) => {
            if (isMobile && (prev === "week" || prev === "month" || prev === "agenda")) return "day";
            if (!isMobile && prev === "day") return "week";
            return prev;
        });
    }, [isMobile]);

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
        patient:patients ( id, first_name, last_name, phone, dob )
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

    useEffect(() => { load(); }, [load]);

    // --- combobox loaders ---
    useEffect(() => {
        (async () => {
            const q = debPatientQuery.trim();
            const or = q ? `ilike.first_name.%${q}%,ilike.last_name.%${q}%` : undefined;
            let query = supabase
                .from("patients")
                .select("id, first_name, last_name")
                .order("first_name", { ascending: true })
                .order("last_name", { ascending: true })
                .limit(20);
            if (or) query = query.or(or);
            const { data, error } = await query;
            if (!error) {
                const opts = (data || []).map((p) => ({
                    value: p.id,
                    label: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
                    raw: p,
                }));
                setPatientOptions(opts);
            }
        })();
    }, [debPatientQuery]);

    useEffect(() => {
        (async () => {
            const q = debRoomQuery.trim();
            let rows = [];
            const roomsTable = await supabase
                .from("rooms")
                .select("name")
                .ilike("name", q ? `%${q}%` : "%")
                .order("name", { ascending: true })
                .limit(20);
            if (!roomsTable.error && roomsTable.data) {
                rows = roomsTable.data.map((r) => r.name);
            } else {
                const { data, error } = await supabase
                    .from("appointments")
                    .select("room")
                    .not("room", "is", null)
                    .order("room", { ascending: true });
                if (!error && data) {
                    const all = Array.from(new Set(data.map((r) => r.room).filter(Boolean)));
                    rows = q ? all.filter((r) => String(r).toLowerCase().includes(q.toLowerCase())) : all;
                }
            }
            const opts = rows.slice(0, 20).map((r) => ({ value: r, label: r }));
            if (q && !opts.find((o) => o.label.toLowerCase() === q.toLowerCase())) {
                opts.unshift({ value: q, label: q });
            }
            setRoomOptions(opts);
        })();
    }, [debRoomQuery]);

    // --- create appointment flow ---
    function onSelectSlot({ start, end, action }) {
        if (action !== "select") return;
        setSlot({ start, end });
        setCreateOpen(true);
        setPatientQuery("");
        setPatientOpt(null);
        setRoomQuery("");
        setRoomOpt(null);
    }

    async function saveAppointment() {
        if (!patientOpt?.value) {
            alert("Please select a patient");
            return;
        }
        const room = roomOpt?.value || null;
        try {
            setSaving(true);
            setErr("");
            const { error } = await supabase.from("appointments").insert({
                patient_id: patientOpt.value,
                room,
                starts_at: slot.start.toISOString(),
                ends_at: slot.end.toISOString(),
                status: "booked",
            });
            if (error) throw error;
            setCreateOpen(false);
            await load();
        } catch (e) {
            setErr(e.message || String(e));
            alert(e.message || String(e));
        } finally {
            setSaving(false);
        }
    }

    // event click → actions
    function onEventSelect(ev) {
        setActionAppt(ev.resource); // raw appointment row
    }

    async function markNoShow() {
        if (!actionAppt) return;
        const { error } = await supabase
            .from("appointments")
            .update({ status: "no_show" })
            .eq("id", actionAppt.id);
        if (error) alert(error.message);
        setActionAppt(null);
        load();
    }

    function startVisitFlow() {
        setVisitModalOpen(true);
    }

    // color appointments by status
    const eventPropGetter = useCallback((event) => {
        const status = event?.resource?.status || "booked";
        let bg = "var(--primary)";       // booked
        let color = "#fff";
        if (status === "completed") bg = "#17c964";     // green
        if (status === "no_show") bg = "#e5484d";      // red
        return {
            style: {
                backgroundColor: bg,
                color,
                border: 0,
                borderRadius: 8,
            }
        };
    }, []);

    const selectable = true;
    const defaultDate = useMemo(() => new Date(), []);
    const minTime = useMemo(() => new Date(1970, 1, 1, 8, 0, 0), []);
    const maxTime = useMemo(() => new Date(1970, 1, 1, 20, 0, 0), []);
    const scrollToTime = minTime; // initial scroll position

    // touch-friendly long-press selection for mobile
    const longPressThreshold = isMobile ? 250 : 50;

    // make the card height adapt a bit on mobile
    const calendarHeight = isMobile ? 520 : 600;

    return (
        <div className="page">
            <h1>Calendar</h1>
            {err && <div className="error">{err}</div>}
            <div className="card">
                <Calendar
                    localizer={localizer}
                    events={events}
                    views={["month", "week", "day", "agenda"]}
                    popup                              // show "+x more" as popup in month view
                    view={view}
                    onView={(v) => setView(v)}
                    date={date}
                    onNavigate={(newDate) => setDate(newDate)}
                    selectable={selectable}
                    onSelectSlot={onSelectSlot}
                    onSelectEvent={onEventSelect}
                    eventPropGetter={eventPropGetter}
                    min={minTime}
                    max={maxTime}
                    scrollToTime={scrollToTime}
                    longPressThreshold={longPressThreshold}
                    step={30}
                    timeslots={2}
                    style={{ height: calendarHeight }}
                    defaultDate={defaultDate}
                    showMultiDayTimes={!isMobile}
                />
            </div>

            {/* Choose action for a clicked appointment */}
            <Modal
                open={!!actionAppt && !visitModalOpen}
                onClose={() => setActionAppt(null)}
                title="Appointment actions"
            >
                {!actionAppt ? null : (
                    <div className="stack gap-2">
                        <div>
                            <b>{(actionAppt.patient?.first_name || "")} {(actionAppt.patient?.last_name || "")}</b>
                            <div style={{ opacity: 0.7, fontSize: 12 }}>
                                {new Date(actionAppt.starts_at).toLocaleString()}
                                {" → "}
                                {new Date(actionAppt.ends_at).toLocaleTimeString()}
                                {" • Room "}
                                {actionAppt.room || "—"}
                            </div>
                            <div style={{ marginTop: 4 }}>Current status: {actionAppt.status}</div>
                        </div>
                        <div className="row gap-1" style={{ marginTop: 12 }}>
                            <button className="btn btn-primary" onClick={startVisitFlow}>Patient came & finished</button>
                            <button className="btn btn-ghost" onClick={markNoShow}>No-show</button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Visit details flow */}
            <Modal
                open={visitModalOpen}
                onClose={() => { setVisitModalOpen(false); setActionAppt(null); }}
                title="Finish Visit"
            >
                {actionAppt && (
                    <VisitFromAppointment
                        appointment={actionAppt}
                        onDone={() => { setVisitModalOpen(false); setActionAppt(null); load(); }}
                    />
                )}
            </Modal>

            {/* New appointment modal */}
            <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Appointment">
                <div className="form">
                    <div style={{ marginBottom: 8 }}>
                        <div><b>Start:</b> {slot.start ? new Date(slot.start).toLocaleString() : "—"}</div>
                        <div><b>End:</b> {slot.end ? new Date(slot.end).toLocaleString() : "—"}</div>
                    </div>

                    <label>Patient</label>
                    <SelectLikeCombobox
                        placeholder="Type to search patients…"
                        inputValue={patientQuery}
                        onInputChange={setPatientQuery}
                        options={patientOptions}
                        value={patientOpt}
                        onChange={setPatientOpt}
                        getOptionLabel={(o) => o.label}
                    />

                    <label style={{ marginTop: 8 }}>Room</label>
                    <SelectLikeCombobox
                        placeholder="Type to search or add a room…"
                        inputValue={roomQuery}
                        onInputChange={setRoomQuery}
                        options={roomOptions}
                        value={roomOpt}
                        onChange={setRoomOpt}
                        getOptionLabel={(o) => o.label}
                    />

                    <div className="row" style={{ marginTop: 12, gap: 8 }}>
                        <button className="btn" onClick={() => setCreateOpen(false)} type="button">Cancel</button>
                        <button className="btn btn-primary" onClick={saveAppointment} disabled={saving || !patientOpt}>
                            {saving ? "Saving…" : "Save"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
