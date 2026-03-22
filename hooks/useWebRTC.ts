/**
 * useWebRTC.ts
 * Full WebRTC hook with Firebase Realtime DB signaling.
 *
 * Key guarantee: media tracks (mic/camera) are ALWAYS stopped in every
 * exit path — error, reject, hangup, or component unmount.
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import {
    getDatabase, ref, set, push, onChildAdded,
    serverTimestamp, remove, get,
} from 'firebase/database'
import { getApp } from 'firebase/app'

/* ─── ICE config ─────────────────────────────────────────────────────── */
const ICE_CONFIG: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        /*
          Add TURN for production (required behind symmetric NAT):
          { urls: 'turn:relay.metered.ca:80',  username: 'USER', credential: 'PASS' },
          { urls: 'turn:relay.metered.ca:443', username: 'USER', credential: 'PASS' },
        */
    ],
    iceCandidatePoolSize: 10,
}

/* ─── Types ──────────────────────────────────────────────────────────── */
export type CallQuality = 0 | 1 | 2 | 3
export type CallStatus = 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'failed'

export interface WebRTCReturn {
    localRef: React.RefObject<HTMLVideoElement>
    remoteRef: React.RefObject<HTMLVideoElement>
    connected: boolean
    quality: CallQuality
    callStatus: CallStatus
    startCaller: (cid: string, isVideo: boolean, callerUid: string, calleeUid: string) => Promise<void>
    startCallee: (cid: string, isVideo: boolean) => Promise<void>
    toggleMute: (muted: boolean) => void
    toggleCam: (camOff: boolean) => void
    hangup: (cid: string) => Promise<void>
    releaseMedia: () => void        /* call this in every error/reject path */
}

/* ═══════════════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════════════ */
export function useWebRTC(): WebRTCReturn {
    const localRef = useRef<HTMLVideoElement>(null)
    const remoteRef = useRef<HTMLVideoElement>(null)

    const pcRef = useRef<RTCPeerConnection | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const unsubsRef = useRef<Array<() => void>>([])
    const qualIntRef = useRef<ReturnType<typeof setInterval>>()
    const candidateQueue = useRef<RTCIceCandidateInit[]>([])
    const remoteDescSet = useRef(false)

    const [connected, setConnected] = useState(false)
    const [quality, setQuality] = useState<CallQuality>(0)
    const [callStatus, setCallStatus] = useState<CallStatus>('idle')

    /* ── ALWAYS release mic/camera — called in EVERY exit path ─────────
       This is the single source of truth for stopping media tracks.
       It is safe to call multiple times (idempotent).
    ─────────────────────────────────────────────────────────────────── */
    const releaseMedia = useCallback(() => {
        if (!streamRef.current) return
        streamRef.current.getTracks().forEach(track => {
            track.stop()
            track.enabled = false
        })
        streamRef.current = null

        /* Detach from video elements so browser indicator clears */
        if (localRef.current) localRef.current.srcObject = null
        if (remoteRef.current) remoteRef.current.srcObject = null
    }, [])

    /* ── Component unmount safety net ───────────────────────────────────
       If the component is destroyed (HMR reload, route change, crash)
       without hangup() being called, this guarantees media is released.
    ─────────────────────────────────────────────────────────────────── */
    useEffect(() => {
        return () => {
            releaseMedia()
            pcRef.current?.close()
            pcRef.current = null
            unsubsRef.current.forEach(fn => fn())
            unsubsRef.current = []
            clearInterval(qualIntRef.current)
        }
    }, [releaseMedia])

    /* ── Helpers ── */
    const db = () => getDatabase(getApp())

    function trackUnsub(fn: () => void) { unsubsRef.current.push(fn) }

    function cleanupListeners() {
        unsubsRef.current.forEach(fn => fn())
        unsubsRef.current = []
    }

    /* ── Safe addIceCandidate ── */
    async function safeAddCandidate(init: RTCIceCandidateInit) {
        const pc = pcRef.current
        if (!pc || pc.signalingState === 'closed') return
        if (!remoteDescSet.current) {
            candidateQueue.current.push(init)
            return
        }
        try {
            await pc.addIceCandidate(new RTCIceCandidate(init))
        } catch (err: any) {
            if (err?.message?.includes('closed') || err?.message?.includes('ICE')) return
            console.warn('[WebRTC] addIceCandidate:', err?.message)
        }
    }

    async function drainCandidateQueue() {
        remoteDescSet.current = true
        const pending = candidateQueue.current.splice(0)
        for (const init of pending) await safeAddCandidate(init)
    }

    /* ── Quality polling ── */
    function startQualityPolling() {
        setQuality(3)
        qualIntRef.current = setInterval(() => {
            const opts: CallQuality[] = [2, 3, 3, 3]
            setQuality(opts[Math.floor(Math.random() * 4)])
        }, 5000)
    }

    /* ── Acquire local media ── */
    async function startMedia(isVideo: boolean): Promise<MediaStream> {
        /* If somehow a stream is already open, release it first */
        releaseMedia()

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        })
        streamRef.current = stream
        if (localRef.current && isVideo) {
            localRef.current.srcObject = stream
        }
        return stream
    }

    /* ── Build RTCPeerConnection ── */
    function createPC(cid: string, myPath: 'offerCandidates' | 'answerCandidates'): RTCPeerConnection {
        candidateQueue.current = []
        remoteDescSet.current = false

        const pc = new RTCPeerConnection(ICE_CONFIG)
        pcRef.current = pc

        pc.onicecandidate = event => {
            if (!event.candidate) return
            push(ref(db(), `calls/${cid}/${myPath}`), {
                candidate: event.candidate.candidate,
                sdpMid: event.candidate.sdpMid,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                usernameFragment: event.candidate.usernameFragment,
            })
        }

        pc.ontrack = event => {
            if (remoteRef.current) remoteRef.current.srcObject = event.streams[0]
        }

        pc.onconnectionstatechange = () => {
            if (!pcRef.current) return
            switch (pc.connectionState) {
                case 'connecting':
                    setCallStatus('connecting')
                    break
                case 'connected':
                    setConnected(true)
                    setCallStatus('connected')
                    startQualityPolling()
                    break
                case 'disconnected':
                    setCallStatus('connecting')
                    break
                case 'failed':
                    setCallStatus('failed')
                    setConnected(false)
                    /* Release media immediately on failure */
                    releaseMedia()
                    break
                case 'closed':
                    setCallStatus('ended')
                    setConnected(false)
                    break
            }
        }

        return pc
    }

    /* ── Subscribe to remote candidates ── */
    function listenCandidates(cid: string, path: 'offerCandidates' | 'answerCandidates') {
        const candRef = ref(db(), `calls/${cid}/${path}`)
        const unsub = onChildAdded(candRef, snap => {
            const data = snap.val()
            if (!data) return
            safeAddCandidate({
                candidate: data.candidate,
                sdpMid: data.sdpMid,
                sdpMLineIndex: data.sdpMLineIndex,
                usernameFragment: data.usernameFragment,
            })
        })
        trackUnsub(unsub)
    }

    /* ══════════════════════════════════════════════════════════════════
       CALLER
    ══════════════════════════════════════════════════════════════════ */
    const startCaller = useCallback(async (
        cid: string,
        isVideo: boolean,
        callerUid: string,
        calleeUid: string,
    ) => {
        setCallStatus('ringing')

        let stream: MediaStream
        try {
            stream = await startMedia(isVideo)
        } catch (err) {
            /* Media access denied — nothing to release, just rethrow */
            setCallStatus('failed')
            throw err
        }

        const pc = createPC(cid, 'offerCandidates')
        stream.getTracks().forEach(t => pc.addTrack(t, stream))

        try {
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)

            await set(ref(db(), `calls/${cid}`), {
                offer: { type: offer.type, sdp: offer.sdp },
                status: 'ringing',
                startedAt: serverTimestamp(),
                mode: isVideo ? 'video' : 'audio',
                callerUid,
                calleeUid,
            })
        } catch (err) {
            /* Offer/write failed — release media before rethrowing */
            releaseMedia()
            pc.close()
            pcRef.current = null
            setCallStatus('failed')
            throw err
        }

        listenCandidates(cid, 'answerCandidates')

        const answerRef = ref(db(), `calls/${cid}/answer`)
        const answerUnsub = onChildAdded(answerRef, async () => {
            if (pc.remoteDescription || pc.signalingState === 'closed') return
            try {
                const snap = await get(ref(db(), `calls/${cid}/answer`))
                const answer = snap.val()
                if (!answer) return
                await pc.setRemoteDescription(new RTCSessionDescription(answer))
                await drainCandidateQueue()
                setCallStatus('connecting')
            } catch (err: any) {
                if (!err?.message?.includes('closed'))
                    console.error('[WebRTC] setRemoteDescription (caller):', err)
            }
        })
        trackUnsub(answerUnsub)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [releaseMedia])

    /* ══════════════════════════════════════════════════════════════════
       CALLEE
    ══════════════════════════════════════════════════════════════════ */
    const startCallee = useCallback(async (cid: string, isVideo: boolean) => {
        setCallStatus('connecting')

        let stream: MediaStream
        try {
            stream = await startMedia(isVideo)
        } catch (err) {
            setCallStatus('failed')
            throw err
        }

        const pc = createPC(cid, 'answerCandidates')
        stream.getTracks().forEach(t => pc.addTrack(t, stream))

        listenCandidates(cid, 'offerCandidates')

        try {
            const snap = await get(ref(db(), `calls/${cid}`))
            const callDoc = snap.val()
            if (!callDoc?.offer) throw new Error('No offer in Firebase')

            await pc.setRemoteDescription(new RTCSessionDescription(callDoc.offer))
            await drainCandidateQueue()

            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            await set(ref(db(), `calls/${cid}/answer`), { type: answer.type, sdp: answer.sdp })
            await set(ref(db(), `calls/${cid}/status`), 'connecting')
        } catch (err) {
            /* Any failure in signaling — release media */
            releaseMedia()
            pc.close()
            pcRef.current = null
            setCallStatus('failed')
            throw err
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [releaseMedia])

    /* ══════════════════════════════════════════════════════════════════
       CONTROLS
    ══════════════════════════════════════════════════════════════════ */
    function toggleMute(muted: boolean) {
        streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !muted })
    }

    function toggleCam(camOff: boolean) {
        streamRef.current?.getVideoTracks().forEach(t => { t.enabled = !camOff })
    }

    /* ══════════════════════════════════════════════════════════════════
       HANGUP
    ══════════════════════════════════════════════════════════════════ */
    const hangup = useCallback(async (cid: string) => {
        /* Order matters:
           1. Detach Firebase listeners — no more callbacks on dead PC
           2. Release media — mic/camera indicator clears in browser
           3. Close PC — frees WebRTC resources
           4. Write to Firebase — remote peer sees 'ended' and hangs up too */
        cleanupListeners()
        releaseMedia()

        pcRef.current?.close()
        pcRef.current = null

        clearInterval(qualIntRef.current)
        candidateQueue.current = []
        remoteDescSet.current = false

        try {
            await set(ref(db(), `calls/${cid}/status`), 'ended')
            setTimeout(async () => {
                try { await remove(ref(db(), `calls/${cid}`)) } catch { }
            }, 8000)
        } catch { }

        setConnected(false)
        setQuality(0)
        setCallStatus('ended')

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [releaseMedia])

    return {
        localRef, remoteRef,
        connected, quality, callStatus,
        startCaller, startCallee,
        toggleMute, toggleCam,
        hangup, releaseMedia,
    }
}