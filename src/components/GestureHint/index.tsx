'use client'

import { memo, useEffect, useState } from 'react'

interface Props {
    visible: boolean
    onDismiss: () => void
}

const GestureHint = memo(({ visible, onDismiss }: Props) => {
    const [phase, setPhase] = useState(0) // 0: idle, 1: animating, 2: fading

    useEffect(() => {
        if (!visible) {
            setPhase(0)
            return
        }

        setPhase(1)

        // Auto-dismiss after 4.5 seconds
        const timeout = setTimeout(() => {
            setPhase(2)
        }, 4500)

        return () => clearTimeout(timeout)
    }, [visible])

    const handleDismiss = () => {
        setPhase(2)
        setTimeout(onDismiss, 200)
    }

    if (!visible || phase === 0) return null

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                pointerEvents: phase === 2 ? 'none' : 'auto',
                zIndex: 998,
            }}
        >
            <style>{`
        @keyframes dragHintSlideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes dragHandPulse {
          0%, 100% {
            transform: translateX(0) rotate(-15deg);
            opacity: 0.7;
          }
          50% {
            transform: translateX(12px) rotate(-15deg);
            opacity: 1;
          }
        }

        @keyframes fingerSlide {
          0%, 10% {
            opacity: 0;
            transform: translateX(-30px);
          }
          20%, 80% {
            opacity: 1;
            transform: translateX(0);
          }
          90%, 100% {
            opacity: 0;
            transform: translateX(30px);
          }
        }

        @keyframes fadeOutUp {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(-20px);
          }
        }

        .gesture-hint-container {
          position: fixed;
          left: 20px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          z-index: 999;
          animation: dragHintSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .gesture-hint-container.fade-out {
          animation: fadeOutUp 0.3s ease forwards;
        }

        .hand-icon {
          font-size: 32px;
          animation: dragHandPulse 1.2s ease-in-out infinite;
          filter: drop-shadow(0 4px 12px rgba(99, 102, 241, 0.2));
        }

        .finger-line {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 2px;
          height: 40px;
          background: linear-gradient(
            to right,
            rgba(99, 102, 241, 0.6),
            rgba(6, 182, 212, 0)
          );
          animation: fingerSlide 1.4s ease-in-out infinite;
          pointer-events: none;
        }

        .gesture-text {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          background: linear-gradient(
            135deg,
            rgba(11, 14, 26, 0.92),
            rgba(15, 19, 32, 0.88)
          );
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px 16px;
          box-shadow: 0 8px 32px rgba(99, 102, 241, 0.15);
          animation: dragHintSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
          max-width: 140px;
          text-align: center;
        }

        .gesture-text-primary {
          font-size: 12px;
          font-weight: 700;
          color: #f0f4ff;
          letter-spacing: -0.3px;
          font-family: 'Syne', system-ui, sans-serif;
        }

        .gesture-text-secondary {
          font-size: 10px;
          color: #a8b4d0;
          font-family: 'IBM Plex Mono', monospace;
        }

        .dismiss-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #a8b4d0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          transition: all 0.2s;
        }

        .dismiss-btn:hover {
          background: rgba(0, 245, 255, 0.1);
          border-color: rgba(0, 245, 255, 0.3);
          color: #00f5ff;
        }
      `}</style>

            {/* Semi-transparent overlay */}
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.3)',
                    opacity: phase === 2 ? 0 : 0.5,
                    transition: 'opacity 0.3s ease',
                    pointerEvents: 'none',
                }}
            />

            {/* Gesture hint card */}
            <div
                className={`gesture-hint-container ${phase === 2 ? 'fade-out' : ''}`}
                style={{
                    opacity: phase === 2 ? 0 : 1,
                    transition: 'opacity 0.3s ease',
                }}
            >
                {/* Hand icon with animation */}
                <div style={{ position: 'relative', width: 32, height: 32 }}>
                    <div className="hand-icon">👆</div>
                    <div className="finger-line" />
                </div>

                {/* Text card */}
                <div className="gesture-text">
                    <div style={{ position: 'relative', width: '100%' }}>
                        <button
                            onClick={handleDismiss}
                            className="dismiss-btn"
                            aria-label="Dismiss gesture hint"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="gesture-text-primary">Drag to Open</div>
                    <div className="gesture-text-secondary">Swipe from left edge</div>
                </div>
            </div>
        </div>
    )
})

GestureHint.displayName = 'GestureHint'

export default GestureHint