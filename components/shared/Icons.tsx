/**
 * components/shared/Icon.tsx
 * Complete icon library for Cipher.
 * All icons are 16×16 viewBox, stroke-based, currentColor.
 * Usage: <Icon.Send /> <Icon.Mic /> <Icon.Users /> etc.
 */

import { memo } from 'react'

/* ── Base props ──────────────────────────────────────────────────────── */
interface P {
    size?: number
    color?: string
    strokeWidth?: number
    className?: string
    style?: React.CSSProperties
}

function i(path: string | React.ReactNode, opts?: { fill?: boolean; viewBox?: string }) {
    return memo(({ size = 16, color = 'currentColor', strokeWidth = 1.6, className, style }: P) => (
        <svg
            width={size} height={size}
            viewBox={opts?.viewBox ?? '0 0 16 16'}
            fill={opts?.fill ? color : 'none'}
            stroke={opts?.fill ? 'none' : color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            style={style}
            aria-hidden="true"
        >
            {path}
        </svg>
    ))
}

/* ═══════════════════════════════════════════════════════════════════════
   MESSAGING & CHAT
═══════════════════════════════════════════════════════════════════════ */

/** Filled chat bubble */
export const MessageFill = i(
    <><path d="M14 9.5A6 6 0 0 0 8 3.5a6 6 0 0 0-6 6c0 1.1.3 2.1.8 3L2 15l2.5-.8A6 6 0 0 0 14 9.5Z" fill="currentColor" stroke="none" /></>,
    { fill: true }
)

/** Outline chat bubble */
export const Message = i(
    <path d="M14 9.5A6 6 0 0 0 8 3.5a6 6 0 0 0-6 6c0 1.1.3 2.1.8 3L2 15l2.5-.8A6 6 0 0 0 14 9.5Z" />
)

/** Two bubbles — conversations */
export const Messages = i(
    <><path d="M11 8.5A5 5 0 0 0 6 4a5 5 0 0 0-5 5 4.9 4.9 0 0 0 .7 2.5L1 14l2.5-.7A5 5 0 1 0 11 8.5Z" /><path d="M11 7a5 5 0 0 1 4 4.9 4.9 4.9 0 0 1-.7 2.5l.7 2.6-2.5-.7" /></>
)

/** Send (paper plane) */
export const Send = i(
    <><path d="M14.5 1.5 7 9" /><path d="M14.5 1.5 10 14.5l-3-5.5-5.5-3 13-4.5Z" /></>
)

/** Reply arrow */
export const Reply = i(
    <><path d="M1 8 6 3v3c5 0 8 2 8 7-2-3-5-4-8-4v3L1 8Z" /></>
)

/** Forward arrow */
export const Forward = i(
    <><path d="M15 8 10 3v3c-5 0-8 2-8 7 2-3 5-4 8-4v3l5-5Z" /></>
)

/** Mention @ */
export const At = i(
    <><circle cx="8" cy="8" r="3" /><path d="M11 8a3 3 0 1 0-3 3 3 3 0 0 0 3-3v1a3 3 0 0 1-3 3H5" /></>
)

/** Reaction / emoji face */
export const Emoji = i(
    <><circle cx="8" cy="8" r="6.5" /><path d="M5.5 9.5s.7 1.5 2.5 1.5 2.5-1.5 2.5-1.5" /><circle cx="5.5" cy="6.5" r=".6" fill="currentColor" stroke="none" /><circle cx="10.5" cy="6.5" r=".6" fill="currentColor" stroke="none" /></>
)

/** GIF badge */
export const Gif = i(
    <><rect x="1.5" y="4" width="13" height="8" rx="2" /><path d="M6.5 9H5V8h1.5" /><path d="M5 7h1.5a1 1 0 0 1 0 2" /><path d="M8.5 7v2M8.5 9h1.5M10 8H8.5" /><path d="M11.5 9V7a2 2 0 0 1 2 2" /></>
)

/** Sticker square */
export const Sticker = i(
    <><path d="M12.5 1.5h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h5.5l5.5-5.5V3.5a2 2 0 0 0-2-2Z" /><path d="M9 14.5V10h4.5" /><circle cx="6" cy="6" r=".8" fill="currentColor" stroke="none" /><circle cx="10" cy="6" r=".8" fill="currentColor" stroke="none" /><path d="M5.5 9s.6 1.5 2.5 1.5 2.5-1.5 2.5-1.5" /></>
)

/** Poll / bar chart */
export const Poll = i(
    <><path d="M2 13.5h3V8H2v5.5ZM6.5 13.5h3V2.5h-3v11ZM11 13.5h3V6h-3v7.5Z" /></>
)

/** Thread / nested reply */
export const Thread = i(
    <><path d="M4 4v5a2 2 0 0 0 2 2h5" /><path d="M9 9l2 2-2 2" /><circle cx="4" cy="3" r="1.5" /><circle cx="13" cy="11" r="1.5" /></>
)

/* ═══════════════════════════════════════════════════════════════════════
   PEOPLE & PRESENCE
═══════════════════════════════════════════════════════════════════════ */

/** Single user */
export const User = i(
    <><circle cx="8" cy="5.5" r="3" /><path d="M1.5 14.5a6.5 6.5 0 0 1 13 0" /></>
)

/** Two users / group */
export const Users = i(
    <><circle cx="5.5" cy="5.5" r="2.5" /><path d="M1 13.5a4.5 4.5 0 0 1 9 0" /><circle cx="12" cy="6" r="2" /><path d="M10.5 14a3.5 3.5 0 0 1 5 0" /></>
)

/** Add user */
export const UserPlus = i(
    <><circle cx="7" cy="5.5" r="3" /><path d="M1 14a6 6 0 0 1 12 0" /><path d="M13 3v6M10 6h6" /></>
)

/** Remove user */
export const UserMinus = i(
    <><circle cx="7" cy="5.5" r="3" /><path d="M1 14a6 6 0 0 1 12 0" /><path d="M10 6h6" /></>
)

/** Contact card */
export const Contact = i(
    <><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" /><circle cx="6" cy="7" r="2" /><path d="M2.5 13a3.5 3.5 0 0 1 7 0" /><path d="M10.5 6h2M10.5 8.5h2M10.5 11h2" /></>
)

/** Online presence dot with ring */
export const Online = i(
    <><circle cx="8" cy="8" r="3" fill="currentColor" stroke="none" /><circle cx="8" cy="8" r="6" /></>
)

/* ═══════════════════════════════════════════════════════════════════════
   MEDIA & ATTACHMENTS
═══════════════════════════════════════════════════════════════════════ */

/** Paperclip */
export const Paperclip = i(
    <path d="M13 7.5 7.5 13A4 4 0 0 1 2 7.5l6-6a2.5 2.5 0 0 1 3.5 3.5L6 10.5a1 1 0 0 1-1.4-1.4L9.5 4" />
)

/** Image */
export const Image = i(
    <><rect x="1.5" y="1.5" width="13" height="13" rx="2" /><circle cx="5.5" cy="5.5" r="1.5" /><path d="M1.5 11.5l3.5-4 3 3 2-2.5 3.5 5.5" /></>
)

/** Video camera */
export const Video = i(
    <><rect x="1" y="4.5" width="9" height="7" rx="1.5" /><path d="M10 6.5l5-2v7l-5-2V6.5Z" /></>
)

/** Video off */
export const VideoOff = i(
    <><path d="M10 6.5l5-2v7l-5-2" /><rect x="1" y="4.5" width="9" height="7" rx="1.5" /><path d="M1 1l14 14" /></>
)

/** Microphone */
export const Mic = i(
    <><rect x="5.5" y="1" width="5" height="8" rx="2.5" /><path d="M2.5 8A5.5 5.5 0 0 0 8 13.5 5.5 5.5 0 0 0 13.5 8" /><path d="M8 13.5V15.5" /><path d="M5.5 15.5h5" /></>
)

/** Microphone off */
export const MicOff = i(
    <><path d="M5.5 5v4a2.5 2.5 0 0 0 3.6 2.3M8 1a2.5 2.5 0 0 1 2.5 2.5v2.5" /><path d="M2.5 8A5.5 5.5 0 0 0 8 13.5 5.5 5.5 0 0 0 13.5 8" /><path d="M8 13.5V15.5M5.5 15.5h5" /><path d="M1 1l14 14" /></>
)

/** Audio waveform */
export const Waveform = i(
    <><path d="M1 8h1M3.5 5v6M6 3v10M8.5 5v6M11 3v10M13.5 5v6M15 8h0" /></>
)

/** Headphones */
export const Headphones = i(
    <><path d="M2.5 10V7a5.5 5.5 0 0 1 11 0v3" /><rect x="1" y="10" width="3" height="4" rx="1" /><rect x="12" y="10" width="3" height="4" rx="1" /></>
)

/** Speaker on */
export const Volume = i(
    <><path d="M3 6H1v4h2l4 3V3L3 6Z" /><path d="M11 5a4 4 0 0 1 0 6" /><path d="M13.5 3a7 7 0 0 1 0 10" /></>
)

/** Speaker off */
export const VolumeOff = i(
    <><path d="M3 6H1v4h2l4 3V3L3 6Z" /><path d="M14 5l-4 6M10 5l4 6" /></>
)

/** Play */
export const Play = i(
    <path d="M3 2.5l10 5.5L3 13.5V2.5Z" fill="currentColor" stroke="none" />, { fill: true }
)

/** Pause */
export const Pause = i(
    <><rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor" stroke="none" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor" stroke="none"></rect></>,
    { fill: true }
)

/** File / document */
export const File = i(
    <><path d="M9.5 1.5H4a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 4 14.5h8A1.5 1.5 0 0 0 13.5 13V5.5L9.5 1.5Z" /><path d="M9.5 1.5V5.5H13.5" /><path d="M5.5 8.5h5M5.5 11h5" /></>
)

/** Download */
export const Download = i(
    <><path d="M8 1.5v9M5 8l3 3 3-3" /><path d="M2.5 11.5v1A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5v-1" /></>
)

/** Upload */
export const Upload = i(
    <><path d="M8 10.5v-9M11 4l-3-3-3 3" /><path d="M2.5 11.5v1A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5v-1" /></>
)

/** Camera / take photo */
export const Camera = i(
    <><rect x="1.5" y="4.5" width="13" height="10" rx="2" /><circle cx="8" cy="10" r="3" /><path d="M5.5 4.5l1-3h3l1 3" /></>
)

/** Flip camera */
export const Flip = i(
    <><path d="M2 8a6 6 0 0 1 6-6 6 6 0 0 1 5 2.7" /><path d="M14 8a6 6 0 0 1-6 6 6 6 0 0 1-5-2.7" /><path d="M13 4l1-2 1 2" /><path d="M3 12l-1 2-1-2" /></>
)

/* ═══════════════════════════════════════════════════════════════════════
   CALLS
═══════════════════════════════════════════════════════════════════════ */

/** Phone */
export const Phone = i(
    <path d="M14.5 11.5v2a1 1 0 0 1-1 1 10 10 0 0 1-4.3-1.5 9.5 9.5 0 0 1-3-3 10 10 0 0 1-1.5-4.3 1 1 0 0 1 1-1h2a1 1 0 0 1 1 .8 6.5 6.5 0 0 0 .4 1.6 1 1 0 0 1-.2 1L8 9a8 8 0 0 0 3 3l.8-.9a1 1 0 0 1 1-.2 6.5 6.5 0 0 0 1.6.3 1 1 0 0 1 .8 1Z" />
)

/** Phone off */
export const PhoneOff = i(
    <><path d="M10.7 11.7A10 10 0 0 1 1.5 3.5M5 3a2 2 0 0 0-.3 1 6.5 6.5 0 0 0 .3 1.6 1 1 0 0 1-.2 1L4 7.5M12.5 12.5l-.8-.9a1 1 0 0 0-1-.2 6.5 6.5 0 0 1-1.6.3 1 1 0 0 1-.8-1v-.2M14.5 11.5v2a1 1 0 0 1-1 1 9.8 9.8 0 0 1-3-.8" /><path d="M1 1l14 14" /></>
)

/** Incoming call */
export const PhoneIncoming = i(
    <><path d="M14.5 11.5v2a1 1 0 0 1-1 1 10 10 0 0 1-4.3-1.5 9.5 9.5 0 0 1-3-3 10 10 0 0 1-1.5-4.3 1 1 0 0 1 1-1h2a1 1 0 0 1 1 .8 6.5 6.5 0 0 0 .4 1.6 1 1 0 0 1-.2 1L8 9a8 8 0 0 0 3 3l.8-.9a1 1 0 0 1 1-.2 6.5 6.5 0 0 0 1.6.3 1 1 0 0 1 .8 1Z" /><path d="M10 1.5h4.5V6" /><path d="M14.5 1.5l-5 5" /></>
)

/** Outgoing call */
export const PhoneOutgoing = i(
    <><path d="M14.5 11.5v2a1 1 0 0 1-1 1 10 10 0 0 1-4.3-1.5 9.5 9.5 0 0 1-3-3 10 10 0 0 1-1.5-4.3 1 1 0 0 1 1-1h2a1 1 0 0 1 1 .8 6.5 6.5 0 0 0 .4 1.6 1 1 0 0 1-.2 1L8 9a8 8 0 0 0 3 3l.8-.9a1 1 0 0 1 1-.2 6.5 6.5 0 0 0 1.6.3 1 1 0 0 1 .8 1Z" /><path d="M14.5 6V1.5H10" /><path d="M9.5 6.5l5-5" /></>
)

/** Missed call */
export const PhoneMissed = i(
    <><path d="M14.5 11.5v2a1 1 0 0 1-1 1 10 10 0 0 1-4.3-1.5 9.5 9.5 0 0 1-3-3 10 10 0 0 1-1.5-4.3 1 1 0 0 1 1-1h2a1 1 0 0 1 1 .8 6.5 6.5 0 0 0 .4 1.6 1 1 0 0 1-.2 1L8 9a8 8 0 0 0 3 3l.8-.9a1 1 0 0 1 1-.2 6.5 6.5 0 0 0 1.6.3 1 1 0 0 1 .8 1Z" /><path d="M9.5 1.5l-5 4 5 4" /></>
)

/* ═══════════════════════════════════════════════════════════════════════
   NAVIGATION & UI
═══════════════════════════════════════════════════════════════════════ */

/** Back / left chevron */
export const ChevronLeft = i(
    <path d="M10 3L4 8l6 5" />
)

/** Right chevron */
export const ChevronRight = i(
    <path d="M6 3l6 5-6 5" />
)

/** Up chevron */
export const ChevronUp = i(
    <path d="M3 10l5-6 5 6" />
)

/** Down chevron */
export const ChevronDown = i(
    <path d="M3 6l5 6 5-6" />
)

/** Close / X */
export const X = i(
    <><path d="M3 3l10 10M13 3 3 13" /></>
)

/** More horizontal (…) */
export const MoreH = i(
    <><circle cx="3.5" cy="8" r="1.2" fill="currentColor" stroke="none" /><circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" /><circle cx="12.5" cy="8" r="1.2" fill="currentColor" stroke="none" /></>
)

/** More vertical (⋮) */
export const MoreV = i(
    <><circle cx="8" cy="3.5" r="1.2" fill="currentColor" stroke="none" /><circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" /><circle cx="8" cy="12.5" r="1.2" fill="currentColor" stroke="none" /></>
)

/** Search / magnifier */
export const Search = i(
    <><circle cx="7" cy="7" r="5" /><path d="M11 11l3.5 3.5" /></>
)

/** Settings / gear */
export const Settings = i(
    <><circle cx="8" cy="8" r="2.5" /><path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.3 3.3l1 1M11.7 11.7l1 1M12.7 3.3l-1 1M4.3 11.7l-1 1" /></>
)

/** Menu / hamburger */
export const Menu = i(
    <><path d="M2 4h12M2 8h12M2 12h12" /></>
)

/** Home */
export const Home = i(
    <><path d="M1.5 7.5L8 2l6.5 5.5" /><path d="M3 6.5V14h4v-4h2v4h4V6.5" /></>
)

/** Back arrow */
export const ArrowLeft = i(
    <><path d="M13 8H3" /><path d="M7 4L3 8l4 4" /></>
)

/** Share / export */
export const Share = i(
    <><path d="M10 2.5a3 3 0 1 0 3 3 3 3 0 0 0-3-3M3 5.5a3 3 0 1 0 3 3 3 3 0 0 0-3-3M10 10.5a3 3 0 1 0 3 3 3 3 0 0 0-3-3" /><path d="M5.7 7.2l4.6-2.4M10.3 11.2 5.7 8.8" /></>
)

/** Plus / add */
export const Plus = i(
    <><path d="M8 2v12M2 8h12" /></>
)

/** Minus */
export const Minus = i(
    <path d="M2 8h12" />
)

/** Edit / pencil */
export const Edit = i(
    <><path d="M11.5 2.5a2 2 0 0 1 2 2L5 13H2.5v-2.5L11.5 2.5Z" /><path d="M9.5 4.5l2 2" /></>
)

/** Copy */
export const Copy = i(
    <><rect x="5.5" y="5.5" width="8" height="9" rx="1.5" /><path d="M5.5 5V4A1.5 1.5 0 0 0 4 2.5H3A1.5 1.5 0 0 0 1.5 4v7A1.5 1.5 0 0 0 3 12.5H4" /></>
)

/* ═══════════════════════════════════════════════════════════════════════
   CONTENT ACTIONS
═══════════════════════════════════════════════════════════════════════ */

/** Bookmark */
export const Bookmark = i(
    <path d="M11.5 1.5h-7A1 1 0 0 0 3.5 2.5V14l4.5-3 4.5 3V2.5a1 1 0 0 0-1-1Z" />
)

/** Bookmark filled */
export const BookmarkFill = i(
    <path d="M11.5 1.5h-7A1 1 0 0 0 3.5 2.5V14l4.5-3 4.5 3V2.5a1 1 0 0 0-1-1Z" fill="currentColor" stroke="none" />,
    { fill: true }
)

/** Star */
export const Star = i(
    <path d="M8 1.5l1.8 3.7 4 .6-2.9 2.8.7 4L8 10.4l-3.6 1.9.7-4-2.9-2.8 4-.6L8 1.5Z" />
)

/** Star filled */
export const StarFill = i(
    <path d="M8 1.5l1.8 3.7 4 .6-2.9 2.8.7 4L8 10.4l-3.6 1.9.7-4-2.9-2.8 4-.6L8 1.5Z" fill="currentColor" stroke="none" />,
    { fill: true }
)

/** Heart */
export const Heart = i(
    <path d="M8 13.5S2 9.5 2 5.5a3.5 3.5 0 0 1 6-2.4A3.5 3.5 0 0 1 14 5.5c0 4-6 8-6 8Z" />
)

/** Heart filled */
export const HeartFill = i(
    <path d="M8 13.5S2 9.5 2 5.5a3.5 3.5 0 0 1 6-2.4A3.5 3.5 0 0 1 14 5.5c0 4-6 8-6 8Z" fill="currentColor" stroke="none" />,
    { fill: true }
)

/** Trash / delete */
export const Trash = i(
    <><path d="M2.5 4.5h11" /><path d="M5.5 4.5v-2h5v2" /><rect x="3.5" y="4.5" width="9" height="9.5" rx="1.5" /><path d="M6.5 7.5v3.5M9.5 7.5v3.5" /></>
)

/** Pin */
export const Pin = i(
    <><path d="M9.5 1.5 14.5 6.5l-3 .5-4 4-.5 3L2.5 9.5 6 5.5l.5-3 3-1Z" /><path d="M1.5 14.5l3-3" /></>
)

/** Archive */
export const Archive = i(
    <><rect x="1.5" y="2.5" width="13" height="3" rx="1" /><path d="M2.5 5.5v7a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-7" /><path d="M6 9h4" /></>
)

/** Mute / no bell */
export const Mute = i(
    <><path d="M2.5 2.5l11 11" /><path d="M8 1.5A4 4 0 0 1 12 5.5v4l1.5 2H3L4.5 9.5" /><path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" /><path d="M4.5 9.5V5.5a3.5 3.5 0 0 1 .5-1.8" /></>
)

/** Bell / notifications */
export const Bell = i(
    <><path d="M8 1.5A4 4 0 0 0 4 5.5V9.5L2.5 11.5h11L12 9.5V5.5A4 4 0 0 0 8 1.5Z" /><path d="M6.5 11.5a1.5 1.5 0 0 0 3 0" /></>
)

/** Bell with badge */
export const BellDot = i(
    <><path d="M12.5 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" fill="currentColor" stroke="none" /><path d="M7 1.7A4 4 0 0 0 4 5.5V9.5L2.5 11.5h9.5" /><path d="M6.5 11.5a1.5 1.5 0 0 0 3 0" /><path d="M11 9.5V5.8" /></>
)

/* ═══════════════════════════════════════════════════════════════════════
   SECURITY & PRIVACY
═══════════════════════════════════════════════════════════════════════ */

/** Lock (closed) */
export const Lock = i(
    <><rect x="3" y="7" width="10" height="7.5" rx="1.5" /><path d="M5 7V5a3 3 0 0 1 6 0v2" /><circle cx="8" cy="11" r="1" fill="currentColor" stroke="none" /></>
)

/** Lock open */
export const LockOpen = i(
    <><rect x="3" y="7" width="10" height="7.5" rx="1.5" /><path d="M5 7V5a3 3 0 0 1 6 0" /><circle cx="8" cy="11" r="1" fill="currentColor" stroke="none" /></>
)

/** Shield */
export const Shield = i(
    <><path d="M8 1.5 2.5 4v5c0 3 2.5 5 5.5 5.5 3-.5 5.5-2.5 5.5-5.5V4L8 1.5Z" /><path d="M5.5 8l2 2 3-3" /></>
)

/** Key */
export const Key = i(
    <><circle cx="5.5" cy="7" r="3.5" /><path d="M8 8.5L14.5 15" /><path d="M12 13l1.5 1.5" /><path d="M13.5 11.5l1.5 1.5" /></>
)

/** Eye / visible */
export const Eye = i(
    <><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" /><circle cx="8" cy="8" r="2.5" /></>
)

/** Eye off */
export const EyeOff = i(
    <><path d="M1 1l14 14M6.5 5a5.5 5.5 0 0 1 8 5c0 .3 0 .7-.1 1M4.2 4.2A12 12 0 0 0 1.5 8S4 12.5 8 12.5a7.5 7.5 0 0 0 3.8-1.1" /></>
)

/* ═══════════════════════════════════════════════════════════════════════
   STATUS & FEEDBACK
═══════════════════════════════════════════════════════════════════════ */

/** Check / tick */
export const Check = i(
    <path d="M2 8.5l4 4 8-8" />
)

/** Double check (delivered) */
export const CheckCheck = i(
    <><path d="M1 8.5l4 4 8-8" /><path d="M6 8.5l4 4 4-4" /></>
)

/** Info circle */
export const Info = i(
    <><circle cx="8" cy="8" r="6.5" /><path d="M8 7.5V11.5" /><circle cx="8" cy="5.5" r=".7" fill="currentColor" stroke="none" /></>
)

/** Warning triangle */
export const Warning = i(
    <><path d="M8 2L1.5 13h13L8 2Z" /><path d="M8 6.5V10" /><circle cx="8" cy="11.5" r=".6" fill="currentColor" stroke="none" /></>
)

/** Error / x circle */
export const Error = i(
    <><circle cx="8" cy="8" r="6.5" /><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" /></>
)

/** Success / check circle */
export const Success = i(
    <><circle cx="8" cy="8" r="6.5" /><path d="M5 8l2.5 2.5 4-4" /></>
)

/* ═══════════════════════════════════════════════════════════════════════
   MISC APP-SPECIFIC
═══════════════════════════════════════════════════════════════════════ */

/** Lightning bolt — AI / Cipher brand */
export const Lightning = i(
    <path d="M10 1.5H6L4.5 8H7.5L5.5 14.5L13 6.5H9.5L10 1.5Z" fill="currentColor" stroke="none" />,
    { fill: true }
)

/** AI sparkle */
export const Sparkle = i(
    <><path d="M8 1.5 9 5.5l4 1-4 1-1 4-1-4-4-1 4-1 1-4Z" fill="currentColor" stroke="none" /><circle cx="3" cy="3" r=".8" fill="currentColor" stroke="none" /><circle cx="13" cy="11.5" r=".8" fill="currentColor" stroke="none" /></>,
    { fill: true }
)

/** Robot / AI assistant */
export const Robot = i(
    <><rect x="2.5" y="5.5" width="11" height="8" rx="2" /><path d="M5.5 9.5h1M9.5 9.5h1" /><path d="M6 12h4" /><path d="M8 5.5V3.5" /><circle cx="8" cy="2.5" r="1" /><path d="M4.5 5.5v-1" /><path d="M11.5 5.5v-1" /></>
)

/** Story / circle status */
export const Story = i(
    <><circle cx="8" cy="8" r="6" strokeDasharray="2 1.5" /><circle cx="8" cy="8" r="3" /></>
)

/** QR code / scan */
export const QrCode = i(
    <><rect x="2" y="2" width="5" height="5" rx=".5" /><rect x="9" y="2" width="5" height="5" rx=".5" /><rect x="2" y="9" width="5" height="5" rx=".5" /><path d="M9 9h2v2H9zM11 11h3M14 9v2M9 13h5v1M12 12v1" /><rect x="3" y="3" width="3" height="3" fill="currentColor" stroke="none" rx=".3" /><rect x="10" y="3" width="3" height="3" fill="currentColor" stroke="none" rx=".3" /><rect x="3" y="10" width="3" height="3" fill="currentColor" stroke="none" rx=".3" /></>
)

/** Link / chain */
export const Link = i(
    <><path d="M6.5 9.5A3.5 3.5 0 0 0 9.5 12l1 .5a3.5 3.5 0 0 0 0-7l-1 .5" /><path d="M9.5 6.5A3.5 3.5 0 0 0 6.5 4l-1-.5a3.5 3.5 0 0 0 0 7l1-.5" /></>
)

/** Location / map pin */
export const Location = i(
    <><path d="M8 1.5A4 4 0 0 0 4 5.5C4 9 8 14.5 8 14.5S12 9 12 5.5a4 4 0 0 0-4-4Z" /><circle cx="8" cy="5.5" r="1.5" /></>
)

/** Group / team */
export const Group = i(
    <><circle cx="8" cy="5.5" r="2.5" /><path d="M2 14a6 6 0 0 1 12 0" /><circle cx="2.5" cy="7" r="1.8" /><path d="M0 13a3.5 3.5 0 0 1 4.5-3.3" /><circle cx="13.5" cy="7" r="1.8" /><path d="M11.5 9.7A3.5 3.5 0 0 1 16 13" /></>
)

/** Translate / language */
export const Translate = i(
    <><path d="M2 3.5h7M5.5 1.5v2" /><path d="M3 6.5A5.5 5.5 0 0 0 7.5 11 5.5 5.5 0 0 1 4 7.5M6 7a5 5 0 0 1-3 3.5" /><path d="M9 8.5l3-7 3 7" /><path d="M9.8 7h4.4" /></>
)

/** Disappearing message / timer */
export const Timer = i(
    <><circle cx="8" cy="9" r="5.5" /><path d="M8 6.5V9l2 1.5" /><path d="M5.5 1.5h5" /><path d="M8 1.5V3.5" /></>
)

/** Read receipt tick (blue ticks) */
export const Seen = i(
    <><path d="M1.5 8l3.5 3.5L12.5 4" /><path d="M5 8l3.5 3.5L16 4" opacity=".5" /></>,
)

/* ═══════════════════════════════════════════════════════════════════════
   EXPORT — named namespace object for easy imports
   Usage: import { Icon } from '@/components/shared'
          <Icon.Send /> <Icon.Users /> <Icon.Lock />
═══════════════════════════════════════════════════════════════════════ */
export const Icon = {
    /* Messaging */
    MessageFill, Message, Messages, Send, Reply, Forward, At, Emoji, Gif, Sticker, Poll, Thread,
    /* People */
    User, Users, UserPlus, UserMinus, Contact, Online, Group,
    /* Media */
    Paperclip, Image, Video, VideoOff, Mic, MicOff, Waveform,
    Headphones, Volume, VolumeOff, Play, Pause, File, Download, Upload, Camera, Flip,
    /* Calls */
    Phone, PhoneOff, PhoneIncoming, PhoneOutgoing, PhoneMissed,
    /* Navigation */
    ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, MoreH, MoreV,
    Search, Settings, Menu, Home, ArrowLeft, Share, Plus, Minus, Edit, Copy,
    /* Content */
    Bookmark, BookmarkFill, Star, StarFill, Heart, HeartFill,
    Trash, Pin, Archive, Mute, Bell, BellDot,
    /* Security */
    Lock, LockOpen, Shield, Key, Eye, EyeOff,
    /* Status */
    Check, CheckCheck, Info, Warning, Error, Success,
    /* App-specific */
    Lightning, Sparkle, Robot, Story, QrCode, Link, Location, Translate, Timer, Seen,
}