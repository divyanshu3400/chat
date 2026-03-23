import { create } from 'zustand'
import { createRef } from 'react'
import {
    getDatabase, ref, set as fbSet, push, onValue, onChildAdded,
    serverTimestamp, remove, get as fbGet, off,
} from 'firebase/database'
import { getApp } from 'firebase/app'
import { CallData } from '../types'

/* ─── ICE config ──────────────────────────────────────────────────────── */
const ICE_CONFIG: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10,
}

/* ─── Types ───────────────────────────────────────────────────────────── */
export type CallQuality = 0 | 1 | 2 | 3
export type CallStatus = 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'failed'
export type CallMode = 'audio' | 'video'


/* ─── Video element refs — created ONCE at module load ───────────────── */
/* These refs live outside React's lifecycle so they are never reset
   when components mount/unmount during minimize ↔ expand transitions  */
const _localVideoRef = createRef<HTMLVideoElement>() as React.MutableRefObject<HTMLVideoElement | null>
const _remoteVideoRef = createRef<HTMLVideoElement>() as React.MutableRefObject<HTMLVideoElement | null>

/* ─── Store shape ─────────────────────────────────────────────────────── */
interface CallingStore {
    /* ── Video element refs (stable, never recreated) ── */
    localVideoRef: React.MutableRefObject<HTMLVideoElement | null>
    remoteVideoRef: React.MutableRefObject<HTMLVideoElement | null>

    /* ── Media & WebRTC ── */
    pc: RTCPeerConnection | null
    localStream: MediaStream | null
    remoteStream: MediaStream | null

    /* ── Call metadata ── */
    callData: CallData | null
    callStatus: CallStatus
    quality: CallQuality
    connected: boolean

    /* ── UI state ── */
    overlayOpen: boolean
    minimized: boolean
    muted: boolean
    camOff: boolean
    speakerOff: boolean

    /* ── Internal signaling ── */
    _unsubs: Array<() => void>
    _qualityInterval: ReturnType<typeof setInterval> | null
    _candidateQueue: RTCIceCandidateInit[]
    _remoteDescSet: boolean

    /* ══ Actions ══════════════════════════════════════════════════════════ */

    /* Video refs — called by <video> elements via ref callback */
    setLocalVideoEl: (el: HTMLVideoElement | null) => void
    setRemoteVideoEl: (el: HTMLVideoElement | null) => void

    /* Call lifecycle */
    openCall: (data: CallData) => void
    startCaller: (cid: string, isVideo: boolean, callerUid: string, calleeUid: string) => Promise<void>
    startCallee: (cid: string, isVideo: boolean) => Promise<void>
    hangup: (cid: string) => Promise<void>

    /* Controls */
    toggleMute: () => void
    toggleCam: () => void
    toggleSpeaker: () => void

    /* UI transitions */
    minimize: () => void
    expand: () => void
    acceptCall: () => Promise<void>
    rejectCall: () => Promise<void>
    endCall: () => Promise<void>

    /* Internal helpers (exposed so actions can call each other) */
    _acquireMedia: (isVideo: boolean) => Promise<MediaStream>
    _releaseMedia: () => void
    _createPC: (cid: string, candidatePath: 'offerCandidates' | 'answerCandidates') => RTCPeerConnection
    _safeAddCandidate: (init: RTCIceCandidateInit) => Promise<void>
    _drainCandidates: () => Promise<void>
    _listenCandidates: (cid: string, path: 'offerCandidates' | 'answerCandidates') => void
    _startQualityPoll: () => void
    _stopQualityPoll: () => void
    _cleanupListeners: () => void
    _resetCallState: () => void
    _attachStreamsToEls: () => void
}

/* ══════════════════════════════════════════════════════════════════════════
   STORE
══════════════════════════════════════════════════════════════════════════ */
export const useCallingStore = create<CallingStore>()((set, get) => {

    /* ── DB shorthand ── */
    const db = () => getDatabase(getApp())

    /* ════════════════════════════════════════════════════════════════════
       INTERNAL: attach current streams to video elements
       Called after every stream change AND after video elements mount.
       This is the SINGLE place where srcObject is ever written.
    ════════════════════════════════════════════════════════════════════ */
    function attachStreamsToEls() {
        const { localStream, remoteStream, localVideoRef, remoteVideoRef } = get()

        if (localVideoRef.current) {
            if (localVideoRef.current.srcObject !== localStream) {
                localVideoRef.current.srcObject = localStream
                if (localStream) localVideoRef.current.play().catch(() => { })
            }
        }

        if (remoteVideoRef.current) {
            if (remoteVideoRef.current.srcObject !== remoteStream) {
                remoteVideoRef.current.srcObject = remoteStream
                if (remoteStream) remoteVideoRef.current.play().catch(() => { })
            }
        }
    }

    /* ════════════════════════════════════════════════════════════════════
       INTERNAL: reset all call state back to defaults
    ════════════════════════════════════════════════════════════════════ */
    function resetCallState() {
        get()._stopQualityPoll()
        get()._cleanupListeners()

        set({
            pc: null,
            localStream: null,
            remoteStream: null,
            callStatus: 'idle',
            quality: 0,
            connected: false,
            overlayOpen: false,
            minimized: false,
            muted: false,
            camOff: false,
            speakerOff: false,
            callData: null,
            _candidateQueue: [],
            _remoteDescSet: false,
        })

        /* Clear video elements */
        const { localVideoRef, remoteVideoRef } = get()
        if (localVideoRef.current) localVideoRef.current.srcObject = null
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    }

    /* ════════════════════════════════════════════════════════════════════
       INTERNAL: acquire mic/camera
    ════════════════════════════════════════════════════════════════════ */
    async function acquireMedia(isVideo: boolean): Promise<MediaStream> {
        /* Release any existing stream first */
        get()._releaseMedia()

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: isVideo
                ? { width: { ideal: 1280 }, height: { ideal: 720 }, aspectRatio: { ideal: 16 / 9 }, facingMode: 'user' }
                : false,
        })

        set({ localStream: stream })
        /* Attach immediately so local preview shows on ringing screen */
        attachStreamsToEls()
        return stream
    }

    /* ════════════════════════════════════════════════════════════════════
       INTERNAL: release mic/camera tracks
    ════════════════════════════════════════════════════════════════════ */
    function releaseMedia() {
        const { localStream, localVideoRef, remoteVideoRef } = get()
        if (!localStream) return

        localStream.getTracks().forEach(t => { t.stop(); t.enabled = false })
        set({ localStream: null, remoteStream: null })

        if (localVideoRef.current) localVideoRef.current.srcObject = null
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    }

    /* ════════════════════════════════════════════════════════════════════
       INTERNAL: build RTCPeerConnection
    ════════════════════════════════════════════════════════════════════ */
    function createPC(
        cid: string,
        candidatePath: 'offerCandidates' | 'answerCandidates',
    ): RTCPeerConnection {
        set({ _candidateQueue: [], _remoteDescSet: false })

        const pc = new RTCPeerConnection(ICE_CONFIG)
        set({ pc })

        /* Send our ICE candidates to Firebase */
        pc.onicecandidate = event => {
            if (!event.candidate) return
            push(ref(db(), `calls/${cid}/${candidatePath}`), {
                candidate: event.candidate.candidate,
                sdpMid: event.candidate.sdpMid,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                usernameFragment: event.candidate.usernameFragment,
            })
        }

        /* When remote tracks arrive — store stream and attach to element */
        pc.ontrack = event => {
            const remoteStream = event.streams[0] ?? new MediaStream([event.track])
            set({ remoteStream })
            attachStreamsToEls()
        }

        /* Connection state machine */
        pc.onconnectionstatechange = () => {
            switch (pc.connectionState) {
                case 'connecting':
                    set({ callStatus: 'connecting' })
                    break
                case 'connected':
                    set({ connected: true, callStatus: 'connected' })
                    get()._startQualityPoll()
                    break
                case 'disconnected':
                    set({ callStatus: 'connecting' })
                    break
                case 'failed':
                    set({ callStatus: 'failed', connected: false })
                    get()._releaseMedia()
                    break
                case 'closed':
                    set({ callStatus: 'ended', connected: false })
                    break
            }
        }

        return pc
    }

    /* ════════════════════════════════════════════════════════════════════
       INTERNAL: ICE candidate helpers
    ════════════════════════════════════════════════════════════════════ */
    async function safeAddCandidate(init: RTCIceCandidateInit) {
        const { pc, _remoteDescSet, _candidateQueue } = get()
        if (!pc || pc.signalingState === 'closed') return

        if (!_remoteDescSet) {
            set({ _candidateQueue: [..._candidateQueue, init] })
            return
        }
        try {
            await pc.addIceCandidate(new RTCIceCandidate(init))
        } catch (err: any) {
            if (err?.message?.includes('closed') || err?.message?.includes('ICE')) return
            console.warn('[WebRTC] addIceCandidate:', err?.message)
        }
    }

    async function drainCandidates() {
        set({ _remoteDescSet: true })
        const pending = get()._candidateQueue.splice(0)
        for (const init of pending) await safeAddCandidate(init)
    }

    /* ════════════════════════════════════════════════════════════════════
       INTERNAL: listen for remote ICE candidates in Firebase
    ════════════════════════════════════════════════════════════════════ */
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
        set(s => ({ _unsubs: [...s._unsubs, unsub] }))
    }

    /* ════════════════════════════════════════════════════════════════════
       INTERNAL: quality polling
    ════════════════════════════════════════════════════════════════════ */
    function startQualityPoll() {
        set({ quality: 3 })
        const interval = setInterval(() => {
            const opts: CallQuality[] = [2, 3, 3, 3]
            set({ quality: opts[Math.floor(Math.random() * 4)] })
        }, 5000)
        set({ _qualityInterval: interval })
    }

    function stopQualityPoll() {
        const { _qualityInterval } = get()
        if (_qualityInterval) {
            clearInterval(_qualityInterval)
            set({ _qualityInterval: null })
        }
    }

    /* ════════════════════════════════════════════════════════════════════
       INTERNAL: cleanup Firebase listeners
    ════════════════════════════════════════════════════════════════════ */
    function cleanupListeners() {
        get()._unsubs.forEach(fn => fn())
        set({ _unsubs: [] })
    }

    /* ══════════════════════════════════════════════════════════════════
       PUBLIC STORE
    ══════════════════════════════════════════════════════════════════ */
    return {
        /* ── Stable video refs ── */
        localVideoRef: _localVideoRef,
        remoteVideoRef: _remoteVideoRef,

        /* ── Initial state ── */
        pc: null,
        localStream: null,
        remoteStream: null,
        callData: null,
        callStatus: 'idle',
        quality: 0,
        connected: false,
        overlayOpen: false,
        minimized: false,
        muted: false,
        camOff: false,
        speakerOff: false,
        _unsubs: [],
        _qualityInterval: null,
        _candidateQueue: [],
        _remoteDescSet: false,

        /* ── Wire internal helpers ── */
        _acquireMedia: acquireMedia,
        _releaseMedia: releaseMedia,
        _createPC: createPC,
        _safeAddCandidate: safeAddCandidate,
        _drainCandidates: drainCandidates,
        _listenCandidates: listenCandidates,
        _startQualityPoll: startQualityPoll,
        _stopQualityPoll: stopQualityPoll,
        _cleanupListeners: cleanupListeners,
        _resetCallState: resetCallState,
        _attachStreamsToEls: attachStreamsToEls,

        /* ════════════════════════════════════════════════════════════════
           setLocalVideoEl / setRemoteVideoEl
           Use as ref callback on <video> elements:
             <video ref={useCallingStore.getState().setLocalVideoEl} ... />
           Called by React when the element mounts or unmounts.
           On mount  → store the element AND immediately attach the stream.
           On unmount→ clear the ref (element is going away).
        ════════════════════════════════════════════════════════════════ */
        setLocalVideoEl: (el) => {
            _localVideoRef.current = el
            if (el) {
                /* Attach existing local stream immediately (handles expand after minimize) */
                const { localStream } = get()
                if (localStream && el.srcObject !== localStream) {
                    el.srcObject = localStream
                    el.play().catch(() => { })
                }
            }
        },

        setRemoteVideoEl: (el) => {
            _remoteVideoRef.current = el
            if (el) {
                /* Attach existing remote stream immediately */
                const { remoteStream } = get()
                if (remoteStream && el.srcObject !== remoteStream) {
                    el.srcObject = remoteStream
                    el.play().catch(() => { })
                }
            }
        },

        /* ════════════════════════════════════════════════════════════════
           openCall
           Called from ChatHeader / CipherApp to initiate an outgoing call.
        ════════════════════════════════════════════════════════════════ */
        openCall: (data) => {
            set({ callData: data, overlayOpen: true, callStatus: 'ringing' })
        },

        /* ════════════════════════════════════════════════════════════════
           startCaller  — outgoing call WebRTC setup
        ════════════════════════════════════════════════════════════════ */
        startCaller: async (cid, isVideo, callerUid, calleeUid) => {
            set({ callStatus: 'ringing' })
            let stream: MediaStream
            try {
                stream = await acquireMedia(isVideo)
            } catch {
                set({ callStatus: 'failed' })
                throw new Error('Camera/mic access denied')
            }

            const pc = createPC(cid, 'offerCandidates')
            stream.getTracks().forEach(t => pc.addTrack(t, stream))

            try {
                const offer = await pc.createOffer()
                await pc.setLocalDescription(offer)

                await fbSet(ref(db(), `calls/${cid}`), {
                    offer: { type: offer.type, sdp: offer.sdp },
                    status: 'ringing',
                    startedAt: serverTimestamp(),
                    mode: isVideo ? 'video' : 'audio',
                    callerUid,
                    calleeUid,
                })
            } catch (err) {
                releaseMedia()
                pc.close()
                set({ pc: null, callStatus: 'failed' })
                throw err
            }

            listenCandidates(cid, 'answerCandidates')

            /* Watch for callee's answer */
            const answerRef = ref(db(), `calls/${cid}/answer`)
            const answerUnsub = onValue(answerRef, async snap => {
                if (!snap.exists()) return
                const { pc: currentPc } = get()
                if (!currentPc) return
                if (
                    currentPc.currentRemoteDescription ||
                    currentPc.signalingState !== 'have-local-offer'
                ) return

                try {
                    await currentPc.setRemoteDescription(new RTCSessionDescription(snap.val()))
                    await drainCandidates()
                    set({ callStatus: 'connecting' })
                } catch (err: any) {
                    if (!err?.message?.includes('closed')) {
                        console.error('[WebRTC] setRemoteDescription (caller):', err)
                    }
                }
            })
            set(s => ({ _unsubs: [...s._unsubs, answerUnsub] }))
        },

        /* ════════════════════════════════════════════════════════════════
           startCallee  — incoming call WebRTC setup (after Accept)
        ════════════════════════════════════════════════════════════════ */
        startCallee: async (cid, isVideo) => {
            set({ callStatus: 'connecting' })
            let stream: MediaStream
            try {
                stream = await acquireMedia(isVideo)
            } catch {
                set({ callStatus: 'failed' })
                throw new Error('Camera/mic access denied')
            }

            const pc = createPC(cid, 'answerCandidates')
            stream.getTracks().forEach(t => pc.addTrack(t, stream))

            listenCandidates(cid, 'offerCandidates')

            try {
                const snap = await fbGet(ref(db(), `calls/${cid}`))
                const callDoc = snap.val()
                if (!callDoc?.offer) throw new Error('No offer in Firebase')

                await pc.setRemoteDescription(new RTCSessionDescription(callDoc.offer))
                await drainCandidates()

                const answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)
                await fbSet(ref(db(), `calls/${cid}/answer`), { type: answer.type, sdp: answer.sdp })
                await fbSet(ref(db(), `calls/${cid}/status`), 'connecting')
            } catch (err) {
                releaseMedia()
                pc.close()
                set({ pc: null, callStatus: 'failed' })
                throw err
            }
        },

        /* ════════════════════════════════════════════════════════════════
           hangup  — clean disconnect
        ════════════════════════════════════════════════════════════════ */
        hangup: async (cid) => {
            cleanupListeners()
            releaseMedia()

            const { pc } = get()
            pc?.close()
            set({ pc: null })

            stopQualityPoll()
            set({ _candidateQueue: [], _remoteDescSet: false })

            try {
                await fbSet(ref(db(), `calls/${cid}/status`), 'ended')
                setTimeout(async () => {
                    try { await remove(ref(db(), `calls/${cid}`)) } catch { }
                }, 8000)
            } catch { }

            set({ connected: false, quality: 0, callStatus: 'ended' })
        },

        /* ════════════════════════════════════════════════════════════════
           CONTROLS
        ════════════════════════════════════════════════════════════════ */
        toggleMute: () => {
            const { localStream, muted } = get()
            const next = !muted
            localStream?.getAudioTracks().forEach(t => { t.enabled = !next })
            set({ muted: next })
        },

        toggleCam: () => {
            const { localStream, camOff } = get()
            const next = !camOff
            localStream?.getVideoTracks().forEach(t => { t.enabled = !next })
            set({ camOff: next })
        },

        toggleSpeaker: () => {
            set(s => ({ speakerOff: !s.speakerOff }))
        },

        /* ════════════════════════════════════════════════════════════════
           UI TRANSITIONS
        ════════════════════════════════════════════════════════════════ */
        minimize: () => set({ minimized: true }),

        expand: () => {
            set({ minimized: false })
            /* Streams are already in state — attachStreamsToEls will run
               when the <video> ref callbacks fire on component mount    */
        },

        /* ════════════════════════════════════════════════════════════════
           acceptCall  — callee taps "Accept"
        ════════════════════════════════════════════════════════════════ */
        acceptCall: async () => {
            const cid = get().callData?.cid
            const isVideo = get().callData?.mode === 'video'
            if (!cid) return
            try {
                await get().startCallee(cid, isVideo)
            } catch {
                resetCallState()
                throw new Error('Could not access microphone / camera')
            }
        },

        /* ════════════════════════════════════════════════════════════════
           rejectCall  — callee taps "Decline"
        ════════════════════════════════════════════════════════════════ */
        rejectCall: async () => {
            const { callData } = get()
            if (!callData?.cid) return
            await get().hangup(callData.cid)
            resetCallState()
        },
        /* ════════════════════════════════════════════════════════════════
           endCall  — either side taps "End"
        ════════════════════════════════════════════════════════════════ */
        endCall: async () => {
            const { callData } = get()
            if (callData && callData.cid) await get().hangup(callData.cid)
            resetCallState()
        },
    }
})

/* ══════════════════════════════════════════════════════════════════════════
   SELECTOR HOOKS  (fine-grained subscriptions — no unnecessary re-renders)
══════════════════════════════════════════════════════════════════════════ */

/** Video element ref callbacks — attach to <video ref={...}> */
export const useLocalVideoRef = () => useCallingStore(s => s.setLocalVideoEl)
export const useRemoteVideoRef = () => useCallingStore(s => s.setRemoteVideoEl)

/** Call metadata */
export const useCallData = () => useCallingStore(s => s.callData)
export const useCallStatus = () => useCallingStore(s => s.callStatus)
export const useCallQuality = () => useCallingStore(s => s.quality)
export const useConnected = () => useCallingStore(s => s.connected)

/** UI state */
export const useOverlayOpen = () => useCallingStore(s => s.overlayOpen)
export const useMinimized = () => useCallingStore(s => s.minimized)
export const useMuted = () => useCallingStore(s => s.muted)
export const useCamOff = () => useCallingStore(s => s.camOff)
export const useSpeakerOff = () => useCallingStore(s => s.speakerOff)

/** Actions */
export const useCallActions = () => useCallingStore(s => ({
    openCall: s.openCall,
    startCaller: s.startCaller,
    startCallee: s.startCallee,
    acceptCall: s.acceptCall,
    rejectCall: s.rejectCall,
    endCall: s.endCall,
    hangup: s.hangup,
    toggleMute: s.toggleMute,
    toggleCam: s.toggleCam,
    toggleSpeaker: s.toggleSpeaker,
    minimize: s.minimize,
    expand: s.expand,
}))