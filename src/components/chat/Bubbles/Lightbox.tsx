import { memo, useEffect, useRef, useState, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════
   LIGHTBOX — Advanced with smooth animations
═══════════════════════════════════════════════════════════════ */

type LightboxProps = {
    url: string;
    type: "image" | "video";
    onClose: () => void;
};

export const Lightbox = memo(({ url, type, onClose }: LightboxProps) => {
    const [phase, setPhase] = useState<"entering" | "open" | "closing">("entering");
    const [zoom, setZoom] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const contentRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const dragAccumRef = useRef({ x: 0, y: 0 });

    /* ── Enter animation ── */
    useEffect(() => {
        const raf = requestAnimationFrame(() => setPhase("open"));
        return () => cancelAnimationFrame(raf);
    }, []);

    /* ── Keyboard support ── */
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") triggerClose();
            if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + 0.25, 4));
            if (e.key === "-") setZoom((z) => Math.max(z - 0.25, 0.5));
            if (e.key === "0") setZoom(1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    /* ── Lock body scroll ── */
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, []);

    const triggerClose = useCallback(() => {
        setPhase("closing");
        setTimeout(onClose, 320);
    }, [onClose]);

    /* ── Zoom wheel ── */
    const onWheel = useCallback((e: React.WheelEvent) => {
        if (type !== "image") return;
        e.preventDefault();
        setZoom((z) => Math.min(Math.max(z - e.deltaY * 0.001, 0.5), 4));
    }, [type]);

    /* ── Drag to reposition when zoomed ── */
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if (zoom <= 1) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - dragAccumRef.current.x, y: e.clientY - dragAccumRef.current.y });
        e.preventDefault();
    }, [zoom]);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging) return;
        const next = { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y };
        dragAccumRef.current = next;
        setDragOffset(next);
    }, [isDragging, dragStart]);

    const onMouseUp = useCallback(() => setIsDragging(false), []);

    /* ── Reset drag when zoom returns to 1 ── */
    useEffect(() => {
        if (zoom <= 1) {
            dragAccumRef.current = { x: 0, y: 0 };
            setDragOffset({ x: 0, y: 0 });
        }
    }, [zoom]);

    /* ── Touch swipe-down to close ── */
    const touchStartY = useRef<number | null>(null);
    const onTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
    const onTouchEnd = (e: React.TouchEvent) => {
        if (touchStartY.current === null) return;
        const delta = e.changedTouches[0].clientY - touchStartY.current;
        if (delta > 80 && zoom <= 1) triggerClose();
        touchStartY.current = null;
    };

    /* ── Computed styles ── */
    const isOpen = phase === "open";
    const isClosing = phase === "closing";

    const backdropStyle: React.CSSProperties = {
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.92)",
        backdropFilter: `blur(${isOpen ? 12 : 0}px)`,
        WebkitBackdropFilter: `blur(${isOpen ? 12 : 0}px)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
        opacity: isClosing ? 0 : isOpen ? 1 : 0,
        transition: "opacity 300ms cubic-bezier(.4,0,.2,1), backdrop-filter 300ms cubic-bezier(.4,0,.2,1)",
        userSelect: "none",
    };

    const contentStyle: React.CSSProperties = {
        maxWidth: "96vw", maxHeight: "92dvh",
        borderRadius: zoom > 1 ? 4 : 14,
        objectFit: "contain",
        transform: `scale(${isClosing ? 0.88 : isOpen ? zoom : 0.88}) translate(${dragOffset.x / zoom}px, ${dragOffset.y / zoom}px)`,
        opacity: isClosing ? 0 : isOpen ? 1 : 0,
        transition: isDragging
            ? "none"
            : "transform 320ms cubic-bezier(.34,1.2,.64,1), opacity 280ms cubic-bezier(.4,0,.2,1), border-radius 200ms ease",
        boxShadow: isOpen ? "0 32px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.06)" : "none",
        willChange: "transform, opacity",
        pointerEvents: "auto",
    };

    const btnBase: React.CSSProperties = {
        position: "absolute", background: "rgba(255,255,255,.08)",
        border: "1px solid rgba(255,255,255,.12)", color: "#fff",
        borderRadius: "50%", cursor: "pointer", display: "flex",
        alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        transition: "background 150ms ease, transform 150ms ease, opacity 200ms ease",
        opacity: isOpen ? 1 : 0,
    };

    return (
        <div
            ref={backdropRef}
            style={backdropStyle}
            onClick={zoom > 1 ? undefined : triggerClose}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            {/* ── Media ── */}
            {type === "image" ? (
                <img
                    ref={contentRef as React.RefObject<HTMLImageElement>}
                    src={url}
                    alt=""
                    draggable={false}
                    style={contentStyle}
                    onWheel={onWheel}
                    onMouseDown={onMouseDown}
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <video
                    ref={contentRef as React.RefObject<HTMLVideoElement>}
                    src={url}
                    controls
                    autoPlay
                    style={contentStyle}
                    onClick={(e) => e.stopPropagation()}
                />
            )}

            {/* ── Close ── */}
            <button
                style={{ ...btnBase, top: 16, right: 16, width: 38, height: 38, fontSize: 16 }}
                onClick={triggerClose}
                title="Close (Esc)"
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.18)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.08)")}
            >
                ✕
            </button>

            {/* ── Zoom controls (image only) ── */}
            {type === "image" && (
                <div style={{
                    position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
                    display: "flex", gap: 6, alignItems: "center",
                    opacity: isOpen ? 1 : 0,
                    transition: "opacity 400ms ease 200ms",
                }}>
                    <ZoomBtn label="−" title="Zoom out (−)" onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))} />
                    <span style={{
                        color: "rgba(255,255,255,.55)", fontSize: 11, fontFamily: "monospace",
                        minWidth: 36, textAlign: "center", letterSpacing: "0.05em",
                    }}>
                        {Math.round(zoom * 100)}%
                    </span>
                    <ZoomBtn label="+" title="Zoom in (+)" onClick={() => setZoom((z) => Math.min(z + 0.25, 4))} />
                    {zoom !== 1 && (
                        <ZoomBtn label="⊙" title="Reset zoom (0)" onClick={() => setZoom(1)} />
                    )}
                </div>
            )}

            {/* ── Hint pill ── */}
            {type === "image" && zoom <= 1 && (
                <div style={{
                    position: "absolute", bottom: 62, left: "50%", transform: "translateX(-50%)",
                    color: "rgba(255,255,255,.28)", fontSize: 10.5, fontFamily: "system-ui",
                    letterSpacing: "0.06em", whiteSpace: "nowrap",
                    opacity: isOpen ? 1 : 0,
                    transition: "opacity 600ms ease 600ms",
                    pointerEvents: "none",
                }}>
                    scroll to zoom · swipe down to close
                </div>
            )}
        </div>
    );
});
Lightbox.displayName = "Lightbox";

/* ── Small zoom button ── */
const ZoomBtn = ({ label, title, onClick }: { label: string; title: string; onClick: () => void }) => (
    <button
        title={title}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.14)",
            color: "#fff", fontSize: 15, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            transition: "background 140ms ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.2)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.1)")}
    >
        {label}
    </button>
);