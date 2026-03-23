'use client'

import { memo, useEffect, useState } from 'react'
import styles from './EnhancedEmptyState.module.css'
import { useGestureHint } from '@/lib/Usegesturehint'
import { useDragGesture } from '@/lib/Usedraggesture'

/* ═══════════════════════════════════════════════════════════════════════════
   PROPS
═══════════════════════════════════════════════════════════════════════════ */

interface Props {
    onNewChat: () => void
    onNewGroup?: () => void
    onSidebarOpen?: () => void
}

/* ═══════════════════════════════════════════════════════════════════════════
   NEURAL NETWORK VISUALIZATION
═══════════════════════════════════════════════════════════════════════════ */

const NeuralNetworkViz = memo(({ nodes, edges }: any) => (
    <svg
        className={styles.neuralIcon}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
    >
        <defs>
            <linearGradient
                id="neural-grad"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
            >
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <filter id="neural-glow">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>

        {/* Hexagon background */}
        <path
            d="M 50 15 L 85 35 L 85 65 L 50 85 L 15 65 L 15 35 Z"
            fill="none"
            stroke="url(#neural-grad)"
            strokeWidth="1.5"
            opacity="0.6"
        />

        {/* Inner circle */}
        <circle
            cx="50"
            cy="50"
            r="12"
            fill="url(#neural-grad)"
            filter="url(#neural-glow)"
        />

        {/* Connection lines */}
        {edges.map(([a, b]: number[], i: number) => {
            const na = nodes[a]
            const nb = nodes[b]
            return (
                <line
                    key={`edge-${i}`}
                    x1={na.cx}
                    y1={na.cy}
                    x2={nb.cx}
                    y2={nb.cy}
                    stroke="url(#neural-grad)"
                    strokeWidth="0.8"
                    opacity="0.4"
                />
            )
        })}

        {/* Nodes */}
        {nodes.map((node: any, i: number) => (
            <circle
                key={`node-${i}`}
                cx={node.cx}
                cy={node.cy}
                r={node.r}
                fill="url(#neural-grad)"
                opacity={node.primary ? 1 : 0.7}
                filter={node.primary ? 'url(#neural-glow)' : undefined}
            />
        ))}
    </svg>
))

NeuralNetworkViz.displayName = 'NeuralNetworkViz'

/* ═══════════════════════════════════════════════════════════════════════════
   GESTURE HINT COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

interface GestureHintProps {
    visible: boolean
    phase: number
    onDismiss: () => void
}

const GestureHint = memo(({ visible, phase, onDismiss }: GestureHintProps) => {
    if (!visible || phase === 0) return null

    const isFadingOut = phase === 2

    return (
        <div
            className={styles.gestureHintOverlay}
            style={{
                pointerEvents: isFadingOut ? 'none' : 'auto',
            }}
        >
            {/* Semi-transparent overlay */}
            <div
                className={styles.gestureHintOverlayDimmed}
                style={{
                    opacity: isFadingOut ? 0 : 0.5,
                    transition: 'opacity 0.3s ease',
                }}
            />

            {/* Gesture hint card */}
            <div
                className={`${styles.gestureHintContainer} ${isFadingOut ? styles.gestureHintContainerFadeOut : ''
                    }`}
                style={{
                    opacity: isFadingOut ? 0 : 1,
                    transition: 'opacity 0.3s ease',
                }}
            >
                {/* Hand icon with animation */}
                <div style={{ position: 'relative', width: 32, height: 32 }}>
                    <div className={styles.handIcon}>👆</div>
                    <div className={styles.fingerLine} />
                </div>

                {/* Text card */}
                <div className={styles.gestureText}>
                    <div style={{ position: 'relative', width: '100%' }}>
                        <button
                            onClick={onDismiss}
                            className={styles.dismissBtn}
                            aria-label="Dismiss gesture hint"
                        >
                            ✕
                        </button>
                    </div>
                    <div className={styles.gestureTextPrimary}>Drag to Open</div>
                    <div className={styles.gestureTextSecondary}>Swipe from left edge</div>
                </div>
            </div>
        </div>
    )
})

GestureHint.displayName = 'GestureHint'


interface Props {
    onNewChat: () => void
    onNewGroup?: () => void
    onSidebarOpen?: () => void
    /** Show skeleton loader while conversations are being fetched */
    loading?: boolean
    /** Show error state with retry CTA */
    error?: string
    onRetry?: () => void
}

const ConvSkeleton = memo(() => (
    <div className={styles.skeletonRow}>
        <div className={styles.skeletonAvatar} />
        <div className={styles.skeletonLines}>
            <div className={styles.skeletonLine} style={{ width: '55%' }} />
            <div className={styles.skeletonLine} style={{ width: '80%' }} />
        </div>
    </div>
))
ConvSkeleton.displayName = 'ConvSkeleton'

const LoadingState = memo(() => (
    <div className={styles.loadingState}>
        {/* Spinner ring */}
        <div className={styles.spinnerWrap}>
            <div className={styles.spinnerRing} />
            <div className={styles.spinnerCore}>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                    <path d="M10 1.5H6L4.5 8H7.5L5.5 14.5L13 6.5H9.5L10 1.5Z"
                        fill="var(--ac)" />
                </svg>
            </div>
        </div>

        <p className={styles.loadingLabel}>Loading conversations…</p>

        {/* Skeleton rows */}
        <div className={styles.skeletonList}>
            <ConvSkeleton />
            <ConvSkeleton />
            <ConvSkeleton />
        </div>
    </div>
))
LoadingState.displayName = 'LoadingState'

/* ═══════════════════════════════════════════════════════════════
   ERROR STATE
═══════════════════════════════════════════════════════════════ */
const ErrorState = memo(({ message, onRetry }: { message: string; onRetry?: () => void }) => (
    <div className={styles.errorState}>
        {/* Icon */}
        <div className={styles.errorIcon}>
            <svg width="32" height="32" viewBox="0 0 16 16" fill="none"
                stroke="var(--ac3)" strokeWidth="1.4" strokeLinecap="round">
                <circle cx="8" cy="8" r="6.5" />
                <path d="M8 5v3.5" />
                <circle cx="8" cy="11" r=".6" fill="var(--ac3)" stroke="none" />
            </svg>
        </div>

        <h3 className={styles.errorTitle}>Couldn't load conversations</h3>
        <p className={styles.errorMsg}>{message}</p>

        {onRetry && (
            <button className={styles.retryBtn} onClick={onRetry}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                    stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                    <path d="M2 8a6 6 0 0 1 6-6 6 6 0 0 1 5 2.7" />
                    <path d="M14 8a6 6 0 0 1-6 6 6 6 0 0 1-5-2.7" />
                    <path d="M13 4l1-2 1 2" />
                    <path d="M3 12l-1 2-1-2" />
                </svg>
                Try again
            </button>
        )}
    </div>
))
ErrorState.displayName = 'ErrorState'

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
const EnhancedEmptyState = memo(
    ({ onNewChat, onNewGroup, onSidebarOpen, loading, error, onRetry }: Props) => {
        const [dragProgress, setDragProgress] = useState(0)
        const [hintPhase, setHintPhase] = useState(0)
        const { showGestureHint, dismissHint } = useGestureHint()

        /* Neural network nodes */
        const nodes = [
            { cx: 50, cy: 50, r: 4, primary: true },
            { cx: 25, cy: 30, r: 2.5, primary: false },
            { cx: 75, cy: 30, r: 2.5, primary: false },
            { cx: 15, cy: 55, r: 2, primary: false },
            { cx: 85, cy: 55, r: 2, primary: false },
            { cx: 35, cy: 75, r: 2, primary: false },
            { cx: 65, cy: 75, r: 2, primary: false },
        ]

        const edges = [
            [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
            [1, 3], [2, 4], [3, 5], [4, 6],
        ]

        /* Gesture hint lifecycle */
        useEffect(() => {
            if (!showGestureHint) { setHintPhase(0); return }
            setHintPhase(1)
            const t = setTimeout(() => setHintPhase(2), 4500)
            return () => clearTimeout(t)
        }, [showGestureHint])

        const handleHintDismiss = () => {
            setHintPhase(2)
            setTimeout(dismissHint, 200)
        }

        /* Drag gesture — only active when idle (not loading/error) */
        useDragGesture(!loading && !error, {
            threshold: 80,
            onDragStart: () => { },
            onDragProgress: (p) => setDragProgress(p),
            onDragEnd: () => setDragProgress(0),
            onComplete: () => { dismissHint(); onSidebarOpen?.() },
        })

        /* ── LOADING ── */
        if (loading) {
            return (
                <div className={styles.emptyState}>
                    <LoadingState />
                </div>
            )
        }

        /* ── ERROR ── */
        if (error) {
            return (
                <div className={styles.emptyState}>
                    <ErrorState message={error} onRetry={onRetry} />
                </div>
            )
        }

        /* ── IDLE / EMPTY ── */
        return (
            <div className={styles.emptyState}>

                {/* Drag indicator on left edge */}
                <div
                    className={`${styles.dragIndicator} ${dragProgress > 0 ? styles.dragIndicatorActive : ''}`}
                    style={{ opacity: dragProgress * 0.8 }}
                />

                {/* Neural visualization */}
                <div className={styles.neuralVisualization}>
                    <NeuralNetworkViz nodes={nodes} edges={edges} />
                    <div className={styles.glowRing} />
                </div>

                {/* Content */}
                <div className={styles.emptyContent}>
                    <div className={styles.emptyHeading}>
                        <h1>Cipher AI Messenger</h1>
                        <p className={styles.emptySubtext}>
                            End-to-end encrypted conversations
                            <br />
                            with AI-powered insights
                        </p>
                    </div>

                    {/* CTAs */}
                    <div className={styles.emptyCtas}>
                        <button
                            className={`${styles.ctaBtn} ${styles.ctaBtnPrimary}`}
                            onClick={onNewChat}
                        >
                            <span>💬</span>
                            Start a Chat
                        </button>
                        {onNewGroup && (
                            <button
                                className={`${styles.ctaBtn} ${styles.ctaBtnSecondary}`}
                                onClick={onNewGroup}
                            >
                                <span>👥</span>
                                New Group
                            </button>
                        )}
                    </div>

                    {/* Features grid */}
                    <div className={styles.featuresGrid}>
                        {[
                            { icon: '🔐', name: 'E2E Encrypted' },
                            { icon: '✦', name: 'AI Insights' },
                            { icon: '⚡', name: 'Real-time' },
                            { icon: '🌍', name: 'Global Network' },
                        ].map(f => (
                            <div key={f.name} className={styles.featureCard}>
                                <div className={styles.featureIcon}>{f.icon}</div>
                                <div className={styles.featureName}>{f.name}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Gesture Hint — mobile only */}
                <GestureHint
                    visible={showGestureHint}
                    phase={hintPhase}
                    onDismiss={handleHintDismiss}
                />
            </div>
        )
    }
)

EnhancedEmptyState.displayName = 'EnhancedEmptyState'
export default EnhancedEmptyState