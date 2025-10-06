import { useEffect, useRef, useState } from "react";

/**
 * Minimal select-like combobox: controlled input + dropdown list.
 */
export default function SelectLikeCombobox({
    inputValue,
    onInputChange,
    options = [],
    value = null,
    onChange,
    placeholder = "",
    getOptionLabel = (o) => o?.label ?? String(o?.value ?? ""),
}) {
    const [open, setOpen] = useState(false);
    const [activeIdx, setActiveIdx] = useState(-1);
    const wrapRef = useRef(null);

    useEffect(() => {
        function onDocClick(e) {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    function choose(idx) {
        const opt = options[idx];
        if (opt) {
            onChange?.(opt);
            setOpen(false);
        }
    }

    return (
        <div className="slc" ref={wrapRef}>
            <div className="slc-inputwrap">
                <input
                    className="slc-input"
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={(e) => {
                        onInputChange?.(e.target.value);
                        setOpen(true);
                        setActiveIdx(0);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(e) => {
                        if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
                            setOpen(true);
                            return;
                        }
                        if (e.key === "ArrowDown") {
                            setActiveIdx((i) => Math.min((options?.length ?? 0) - 1, i + 1));
                            e.preventDefault();
                        }
                        if (e.key === "ArrowUp") {
                            setActiveIdx((i) => Math.max(0, i - 1));
                            e.preventDefault();
                        }
                        if (e.key === "Enter") {
                            if (open && activeIdx >= 0) {
                                choose(activeIdx);
                                e.preventDefault();
                            }
                        }
                        if (e.key === "Escape") setOpen(false);
                    }}
                />
                {value && (
                    <span className="slc-chip" title={getOptionLabel(value)}>
                        {getOptionLabel(value)}
                    </span>
                )}
            </div>
            {open && options?.length > 0 && (
                <div className="slc-menu">
                    {options.map((opt, idx) => (
                        <div
                            key={`${opt.value}-${idx}`}
                            className={`slc-item ${idx === activeIdx ? "is-active" : ""}`}
                            onMouseEnter={() => setActiveIdx(idx)}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                choose(idx);
                            }}
                        >
                            {getOptionLabel(opt)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
