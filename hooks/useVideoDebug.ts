/**
 * useVideoDebug.ts
 * Debugging hook to troubleshoot why videos aren't showing
 */

import { useEffect, useRef } from 'react'

export function useVideoDebug(localRef: React.RefObject<HTMLVideoElement>, remoteRef: React.RefObject<HTMLVideoElement>) {
    useEffect(() => {
        const debugInterval = setInterval(() => {
            if (!localRef.current && !remoteRef.current) return

            // Check local video
            if (localRef.current) {
                const localStream = localRef.current.srcObject as MediaStream | null
                const localReady = localRef.current.readyState === 4
                const localPlaying = !localRef.current.paused

                console.log('📹 LOCAL VIDEO DEBUG:', {
                    element: '✓ exists',
                    srcObject: localStream ? '✓ has stream' : '❌ NO STREAM',
                    tracks: localStream?.getTracks().length ?? 0,
                    readyState: localReady ? '✓ READY (4)' : `❌ ${localRef.current.readyState}`,
                    playing: localPlaying ? '✓ playing' : '❌ paused',
                    muted: localRef.current.muted ? '✓ muted' : '❌ not muted',
                    autoplay: localRef.current.autoplay ? '✓ autoplay' : '❌ no autoplay',
                })
            }

            // Check remote video
            if (remoteRef.current) {
                const remoteStream = remoteRef.current.srcObject as MediaStream | null
                const remoteReady = remoteRef.current.readyState === 4
                const remotePlaying = !remoteRef.current.paused

                console.log('📹 REMOTE VIDEO DEBUG:', {
                    element: '✓ exists',
                    srcObject: remoteStream ? '✓ has stream' : '❌ NO STREAM',
                    tracks: remoteStream?.getTracks().length ?? 0,
                    readyState: remoteReady ? '✓ READY (4)' : `❌ ${remoteRef.current.readyState}`,
                    playing: remotePlaying ? '✓ playing' : '❌ paused',
                    autoplay: remoteRef.current.autoplay ? '✓ autoplay' : '❌ no autoplay',
                })
            }
        }, 3000)

        return () => clearInterval(debugInterval)
    }, [localRef, remoteRef])
}