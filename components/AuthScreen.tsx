'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  onSignIn: () => void
}

/* ─────────────────────────────────────────────
   KEYFRAMES injected once into <head>
───────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500&display=swap');

@keyframes cipher-float {
  0%,100% { transform: translateY(0px) rotate(0deg); }
  33%      { transform: translateY(-8px) rotate(1deg); }
  66%      { transform: translateY(4px) rotate(-1deg); }
}
@keyframes cipher-pulse-ring {
  0%   { transform: scale(1);   opacity: .6; }
  100% { transform: scale(1.8); opacity: 0;  }
}
@keyframes cipher-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
@keyframes cipher-wordmark {
  0%   { opacity:0; transform: scale(.75) translateY(24px); filter: blur(12px); }
  100% { opacity:1; transform: scale(1)   translateY(0);    filter: blur(0);    }
}
@keyframes cipher-tagline {
  0%   { opacity:0; transform: translateY(10px); }
  100% { opacity:1; transform: translateY(0);    }
}
@keyframes cipher-card-in {
  0%   { opacity:0; transform: translateY(32px) scale(.96); }
  100% { opacity:1; transform: translateY(0)    scale(1);   }
}
@keyframes cipher-particle {
  0%   { transform: translateY(0)    translateX(0)    scale(1);   opacity:.7; }
  50%  { transform: translateY(-60px) translateX(20px) scale(1.2); opacity:1;  }
  100% { transform: translateY(0)    translateX(0)    scale(1);   opacity:.7; }
}
@keyframes cipher-scan {
  0%,100% { transform: scaleX(0); transform-origin: left; }
  45%     { transform: scaleX(1); transform-origin: left; }
  55%     { transform: scaleX(1); transform-origin: right; }
  99%     { transform: scaleX(0); transform-origin: right; }
}
@keyframes cipher-badge-glow {
  0%,100% { box-shadow: 0 0 12px rgba(16,185,129,.2); }
  50%     { box-shadow: 0 0 24px rgba(16,185,129,.5); }
}
@keyframes cipher-btn-idle {
  0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
  50%     { box-shadow: 0 0 0 6px rgba(99,102,241,.08); }
}

.cipher-btn-google {
  position: relative; overflow: hidden;
  animation: cipher-btn-idle 3s ease-in-out infinite;
}
.cipher-btn-google::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(90deg,
    transparent 0%, rgba(255,255,255,.06) 50%, transparent 100%);
  background-size: 200% 100%;
  animation: cipher-shimmer 3s ease-in-out infinite;
}
.cipher-btn-google:hover {
  animation: none !important;
  border-color: rgba(99,102,241,.8) !important;
  box-shadow:
    0 0 0 1px rgba(99,102,241,.5),
    0 8px 32px rgba(99,102,241,.25),
    inset 0 1px 0 rgba(255,255,255,.08) !important;
  transform: translateY(-2px) !important;
  background: rgba(255,255,255,.07) !important;
}
.cipher-btn-google:active {
  transform: translateY(0) !important;
}
`

/* ─────────────────────────────────────────────
   NEURAL NETWORK CANVAS BACKGROUND
───────────────────────────────────────────── */
function NeuralCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    let raf: number
    let W = 0, H = 0

    const NODES = 55
    type Node = { x: number; y: number; vx: number; vy: number; r: number }
    let nodes: Node[] = []

    function resize() {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
      nodes = Array.from({ length: NODES }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - .5) * .35,
        vy: (Math.random() - .5) * .35,
        r: Math.random() * 1.8 + .6,
      }))
    }

    function draw(t: number) {
      ctx.clearRect(0, 0, W, H)

      // Move
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy
        if (n.x < 0 || n.x > W) n.vx *= -1
        if (n.y < 0 || n.y > H) n.vy *= -1
      })

      // Edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const maxDist = 160
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * .18
            // Animate hue along edge
            const hue = (t * .02 + i * 7) % 360
            ctx.strokeStyle = `hsla(${hue},70%,65%,${alpha})`
            ctx.lineWidth = .5
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }

      // Nodes
      nodes.forEach((n, i) => {
        const hue = (t * .02 + i * 13) % 360
        const pulse = Math.sin(t * .001 + i) * .5 + .5
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r + pulse * .6, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${hue},80%,70%,${.4 + pulse * .4})`
        ctx.fill()
      })

      raf = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <canvas
      ref={ref}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  )
}

/* ─────────────────────────────────────────────
   LOGO MARK SVG (the ⚡ cipher glyph)
───────────────────────────────────────────── */
function CipherMark({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="cm-g1" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id="cm-g2" x1="64" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f43f5e" stopOpacity=".6" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity=".2" />
        </linearGradient>
        <filter id="cm-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Hexagon frame */}
      <path
        d="M32 4 L56 18 L56 46 L32 60 L8 46 L8 18 Z"
        fill="none" stroke="url(#cm-g1)" strokeWidth="1.5" strokeLinejoin="round"
        opacity=".8"
      />
      {/* Inner hex */}
      <path
        d="M32 14 L46 22 L46 42 L32 50 L18 42 L18 22 Z"
        fill="url(#cm-g2)" stroke="url(#cm-g1)" strokeWidth=".5" strokeLinejoin="round"
      />
      {/* Lightning bolt */}
      <path
        d="M35 16 L26 33 L32 33 L29 48 L38 31 L32 31 Z"
        fill="url(#cm-g1)" filter="url(#cm-glow)"
      />
    </svg>
  )
}

/* ─────────────────────────────────────────────
   GOOGLE ICON
───────────────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.8 2.5 30.3 0 24 0 14.8 0 6.9 5.4 3 13.3l7.8 6C12.7 13.2 17.9 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.6 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.2-10.1 7.2-17z" />
      <path fill="#FBBC05" d="M10.8 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6L2.5 13.4A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.5 10.7l8.3-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.1 0-11.3-3.7-13.2-9L2.5 35.7C6.4 43.3 14.6 48 24 48z" />
    </svg>
  )
}

/* ─────────────────────────────────────────────
   FEATURE PILLS
───────────────────────────────────────────── */
const FEATURES = [
  { icon: '🔐', label: 'E2E Encrypted' },
  { icon: '⚡', label: 'Realtime' },
  { icon: '🤖', label: '/ai Commands' },
  { icon: '📞', label: 'HD Calls' },
]

/* ─────────────────────────────────────────────
   MAIN AUTH SCREEN
───────────────────────────────────────────── */
export default function AuthScreen({ onSignIn }: Props) {
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Inject CSS once
    if (!document.getElementById('cipher-auth-css')) {
      const style = document.createElement('style')
      style.id = 'cipher-auth-css'
      style.textContent = CSS
      document.head.appendChild(style)
    }
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  async function handleSignIn() {
    setLoading(true)
    try { await onSignIn() }
    finally { setLoading(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900,
      background: '#050810',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', overflow: 'hidden',
      fontFamily: '"Geist", system-ui, sans-serif',
    }}>

      {/* Neural network canvas */}
      <NeuralCanvas />

      {/* Radial gradient vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 80% 60% at 50% 50%, transparent 20%, #050810 80%),
          radial-gradient(ellipse 500px 500px at 20% 80%, rgba(99,102,241,.07) 0%, transparent 70%),
          radial-gradient(ellipse 400px 400px at 80% 20%, rgba(6,182,212,.06) 0%, transparent 70%)
        `,
      }} />

      {/* Scan line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(99,102,241,.6), rgba(6,182,212,.6), transparent)',
        animation: 'cipher-scan 4s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* ── CARD ── */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        width: '100%', maxWidth: 400,
        opacity: mounted ? 1 : 0,
        transition: 'opacity .1s',
      }}>

        {/* Logo mark + pulse rings */}
        <div style={{
          position: 'relative', marginBottom: 28,
          animation: 'cipher-float 6s ease-in-out infinite',
        }}>
          {/* Pulse rings */}
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              position: 'absolute',
              inset: -(i + 1) * 14,
              borderRadius: '50%',
              border: `1px solid rgba(99,102,241,${.15 - i * .04})`,
              animation: `cipher-pulse-ring ${2 + i * .8}s ease-out infinite`,
              animationDelay: `${i * .6}s`,
            }} />
          ))}
          <CipherMark size={72} />
        </div>

        {/* Wordmark */}
        <div style={{
          fontSize: 52, fontWeight: 900, letterSpacing: -2,
          lineHeight: 1, marginBottom: 10,
          background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 40%, #10b981 70%, #6366f1 100%)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'cipher-wordmark .9s cubic-bezier(.34,1.56,.64,1) both, cipher-shimmer 4s linear infinite',
        }}>
          Cipher
        </div>

        {/* Tagline */}
        <div style={{
          fontFamily: '"Geist Mono", monospace',
          fontSize: 11, color: 'rgba(148,163,184,.6)',
          letterSpacing: '3px', textTransform: 'uppercase',
          marginBottom: 36,
          animation: 'cipher-tagline .7s ease both',
          animationDelay: '.3s',
        }}>
          // the AI-era messenger
        </div>

        {/* Glass card */}
        <div style={{
          width: '100%',
          background: 'rgba(255,255,255,.03)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 24,
          padding: '28px 24px',
          backdropFilter: 'blur(24px)',
          animation: 'cipher-card-in .6s cubic-bezier(.34,1.56,.64,1) both',
          animationDelay: '.15s',
          boxShadow: `
            0 0 0 1px rgba(255,255,255,.04) inset,
            0 32px 64px rgba(0,0,0,.4),
            0 0 80px rgba(99,102,241,.06)
          `,
        }}>

          {/* Card header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', marginBottom: 5 }}>
              Welcome to Cipher
            </div>
            <div style={{ fontSize: 13, color: 'rgba(148,163,184,.7)', lineHeight: 1.6 }}>
              Sign in to access your encrypted<br />conversations
            </div>
          </div>

          {/* Google Sign-In button */}
          <button
            className="cipher-btn-google"
            onClick={handleSignIn}
            disabled={loading}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 10,
              padding: '13px 20px', borderRadius: 12,
              background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.12)',
              color: '#f1f5f9', fontFamily: '"Geist", sans-serif',
              fontWeight: 600, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all .25s cubic-bezier(.4,0,.2,1)',
              opacity: loading ? .7 : 1, letterSpacing: '.1px',
            }}
          >
            {loading
              ? <LoadingSpinner />
              : <><GoogleIcon /> Continue with Google</>
            }
          </button>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            margin: '20px 0', opacity: .4,
          }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} />
            <span style={{ fontSize: 11, color: 'rgba(148,163,184,.6)', fontFamily: '"Geist Mono",monospace' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.1)' }} />
          </div>

          {/* Continue with email (coming soon) */}
          <button
            disabled
            style={{
              width: '100%', padding: '12px 20px', borderRadius: 12,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,.06)',
              color: 'rgba(148,163,184,.4)',
              fontFamily: '"Geist", sans-serif', fontWeight: 600, fontSize: 14,
              cursor: 'not-allowed', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>✉</span>
            Continue with Email
            <span style={{
              fontSize: 9, fontFamily: '"Geist Mono", monospace',
              background: 'rgba(99,102,241,.15)', border: '1px solid rgba(99,102,241,.2)',
              color: 'rgba(99,102,241,.6)', padding: '2px 6px', borderRadius: 20,
              letterSpacing: 1,
            }}>SOON</span>
          </button>

          {/* E2E badge */}
          <div style={{
            marginTop: 18, display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 7, padding: '9px 14px',
            background: 'rgba(16,185,129,.06)',
            border: '1px solid rgba(16,185,129,.15)',
            borderRadius: 10, fontSize: 12,
            color: 'rgba(16,185,129,.85)',
            animation: 'cipher-badge-glow 3s ease-in-out infinite',
            fontFamily: '"Geist Mono", monospace',
          }}>
            <span>🔐</span>
            <span>End-to-end encrypted · Zero knowledge</span>
          </div>
        </div>

        {/* Feature pills row */}
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap',
          justifyContent: 'center', marginTop: 20,
        }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 11px',
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.07)',
              borderRadius: 20, fontSize: 11,
              color: 'rgba(148,163,184,.6)',
              fontFamily: '"Geist Mono", monospace',
              animation: `cipher-card-in .5s ease both`,
              animationDelay: `${.3 + i * .07}s`,
            }}>
              <span style={{ fontSize: 13 }}>{f.icon}</span>
              {f.label}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 20, fontSize: 11,
          color: 'rgba(71,85,105,.7)',
          textAlign: 'center', lineHeight: 1.7,
          fontFamily: '"Geist Mono", monospace',
        }}>
          By signing in you agree to our{' '}
          <a href="#" style={{ color: 'rgba(99,102,241,.6)', textDecoration: 'none' }}>Terms</a>
          {' & '}
          <a href="#" style={{ color: 'rgba(99,102,241,.6)', textDecoration: 'none' }}>Privacy</a>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   LOADING SPINNER
───────────────────────────────────────────── */
function LoadingSpinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'cipher-wordmark .8s linear infinite' }}>
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,.2)" strokeWidth="2.5" />
      <path d="M12 2 A10 10 0 0 1 22 12" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}