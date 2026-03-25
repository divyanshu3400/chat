import { create } from 'zustand'
import { createRef } from 'react'
import { COLLECTIONS, pb } from '@/src/lib/pb'
import { createChatService } from '@/src/services/pb-chat.service'
import type { CallLogsRecord } from '@/src/types/pb-collections.types'

const chatService = createChatService(pb)

const ICE_CONFIG: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10,
}

type CallLogStatus = NonNullable<CallLogsRecord['status']>
type CallMode = 'audio' | 'video'
type CallSide = 'caller' | 'callee'
type SignalType = 'offer' | 'answer'

interface BaseRealtimeRecord<TCollection extends string> {
    id: string
    collectionId: string
    collectionName: TCollection
    created: string
    updated: string
}

interface CallSignalRecord extends BaseRealtimeRecord<'call_signals'> {
    call_log: string | null
    conversation?: string | null
    sender?: string | null
    recipient?: string | null
    signal_type?: SignalType | null
    side?: CallSide | null
    sdp_type?: string | null
    sdp?: string | null
}

interface CallIceCandidateRecord extends BaseRealtimeRecord<'call_ice_candidates'> {
    call_log: string | null
    conversation?: string | null
    sender?: string | null
    recipient?: string | null
    side?: CallSide | null
    candidate?: string | null
    sdp_mid?: string | null
    sdp_mline_index?: number | null
    username_fragment?: string | null
}

export type CallQuality = 0 | 1 | 2 | 3
export type CallStatus = 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'failed'

export interface CallData {
    cid: NonNullable<CallLogsRecord['conversation']> | string
    callLogId?: CallLogsRecord['id']
    callerUid?: NonNullable<CallLogsRecord['initiator']> | string
    calleeUid?: string
    participants?: NonNullable<CallLogsRecord['participants']>
    mode?: CallMode
    startedAt?: CallLogsRecord['started_at']
    endedAt?: CallLogsRecord['ended_at']
    duration?: CallLogsRecord['duration']
    isMissed?: CallLogsRecord['is_missed']
    status?: CallLogsRecord['status']
    peerName: string
    peerPhoto?: string
    state: string
    isIncoming: boolean
    callerName?: string
    callerPhoto?: string
}

const _localVideoRef = createRef<HTMLVideoElement>() as React.MutableRefObject<HTMLVideoElement | null>
const _remoteVideoRef = createRef<HTMLVideoElement>() as React.MutableRefObject<HTMLVideoElement | null>

interface CallingStore {
    localVideoRef: React.MutableRefObject<HTMLVideoElement | null>
    remoteVideoRef: React.MutableRefObject<HTMLVideoElement | null>
    pc: RTCPeerConnection | null
    localStream: MediaStream | null
    remoteStream: MediaStream | null
    callData: CallData | null
    callStatus: CallStatus
    quality: CallQuality
    connected: boolean
    overlayOpen: boolean
    minimized: boolean
    muted: boolean
    camOff: boolean
    speakerOff: boolean
    _unsubs: Array<() => void>
    _qualityInterval: ReturnType<typeof setInterval> | null
    _callLogId: string | null
    _callStartedAt: string | null
    _candidateQueue: RTCIceCandidateInit[]
    _remoteDescSet: boolean

    setLocalVideoEl: (el: HTMLVideoElement | null) => void
    setRemoteVideoEl: (el: HTMLVideoElement | null) => void
    openCall: (data: CallData) => void
    startCaller: (cid: string, isVideo: boolean, callerUid: string, calleeUid: string) => Promise<void>
    startCallee: (cid: string, isVideo: boolean) => Promise<void>
    hangup: (cid: string) => Promise<void>
    toggleMute: () => void
    toggleCam: () => void
    toggleSpeaker: () => void
    minimize: () => void
    expand: () => void
    acceptCall: () => Promise<void>
    rejectCall: () => Promise<void>
    endCall: () => Promise<void>
    _acquireMedia: (isVideo: boolean) => Promise<MediaStream>
    _releaseMedia: () => void
    _createPC: (callLogId: string, side: CallSide) => RTCPeerConnection
    _safeAddCandidate: (init: RTCIceCandidateInit) => Promise<void>
    _drainCandidates: () => Promise<void>
    _startQualityPoll: () => void
    _stopQualityPoll: () => void
    _cleanupListeners: () => void
    _resetCallState: () => void
    _attachStreamsToEls: () => void
    _subscribeToCallLog: (callLogId: string) => Promise<void>
    _syncFromCallLog: (record: CallLogsRecord) => void
    _updateCallLog: (data: Partial<CallLogsRecord>) => Promise<void>
    _listenForCandidates: (callLogId: string, remoteSide: CallSide) => Promise<void>
    _waitForSignal: (callLogId: string, signalType: SignalType, side: CallSide) => Promise<CallSignalRecord>
    _waitForAnswer: (callLogId: string) => Promise<void>
}

function quote(value: string): string {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function nowIso(): string {
    return new Date().toISOString()
}

function statusFromRecord(status: CallLogsRecord['status']): CallStatus {
    switch (status) {
        case 'ringing':
            return 'ringing'
        case 'active':
            return 'connected'
        case 'ended':
        case 'rejected':
        case 'missed':
            return 'ended'
        default:
            return 'idle'
    }
}

function callTypeToMode(callType: CallLogsRecord['call_type']): CallMode {
    return callType === 'video' ? 'video' : 'audio'
}

function asRtcDescription(record: CallSignalRecord): RTCSessionDescriptionInit | null {
    if (!record.sdp || !record.sdp_type) return null
    return {
        type: record.sdp_type as RTCSdpType,
        sdp: record.sdp,
    }
}

export const useCallingStore = create<CallingStore>()((set, get) => {
    function attachStreamsToEls() {
        const { localStream, remoteStream, localVideoRef, remoteVideoRef } = get()

        if (localVideoRef.current && localVideoRef.current.srcObject !== localStream) {
            localVideoRef.current.srcObject = localStream
            if (localStream) localVideoRef.current.play().catch(() => { })
        }

        if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream
            if (remoteStream) remoteVideoRef.current.play().catch(() => { })
        }
    }

    function cleanupListeners() {
        const { _unsubs } = get()
        _unsubs.forEach((unsub) => {
            try { unsub() } catch { }
        })
        set({ _unsubs: [] })
    }

    function stopQualityPoll() {
        const { _qualityInterval } = get()
        if (_qualityInterval) clearInterval(_qualityInterval)
        set({ _qualityInterval: null, quality: 0 })
    }

    function startQualityPoll() {
        stopQualityPoll()
        set({ quality: 3 })
        const interval = setInterval(() => {
            if (get().connected) {
                set({ quality: 3 })
            }
        }, 5000)
        set({ _qualityInterval: interval })
    }

    function releaseMedia() {
        const { localStream, remoteStream, localVideoRef, remoteVideoRef } = get()
        localStream?.getTracks().forEach((track) => {
            track.stop()
            track.enabled = false
        })
        remoteStream?.getTracks().forEach((track) => {
            track.stop()
            track.enabled = false
        })

        set({ localStream: null, remoteStream: null })

        if (localVideoRef.current) localVideoRef.current.srcObject = null
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    }

    async function acquireMedia(isVideo: boolean): Promise<MediaStream> {
        releaseMedia()
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: isVideo
                ? { width: { ideal: 1280 }, height: { ideal: 720 }, aspectRatio: { ideal: 16 / 9 }, facingMode: 'user' }
                : false,
        })

        set({ localStream: stream, remoteStream: null, camOff: !isVideo })
        attachStreamsToEls()
        return stream
    }

    function syncFromCallLog(record: CallLogsRecord) {
        const nextStatus = statusFromRecord(record.status)
        const connected = record.status === 'active'
        const mode = callTypeToMode(record.call_type)

        set((state) => ({
            _callLogId: record.id,
            _callStartedAt: record.started_at ?? state._callStartedAt,
            callStatus: connected ? 'connected' : nextStatus,
            connected,
            quality: connected ? 3 : 0,
            callData: state.callData
                ? {
                    ...state.callData,
                    callLogId: record.id,
                    cid: record.conversation ?? state.callData.cid,
                    callerUid: record.initiator ?? state.callData.callerUid,
                    participants: record.participants ?? state.callData.participants,
                    mode,
                    startedAt: record.started_at,
                    endedAt: record.ended_at,
                    duration: record.duration,
                    isMissed: record.is_missed,
                    status: record.status,
                    state: connected
                        ? 'Connected'
                        : record.status === 'ringing'
                            ? (state.callData.isIncoming ? 'Incoming…' : 'Ringing…')
                            : record.status === 'rejected'
                                ? 'Rejected'
                                : record.status === 'missed'
                                    ? 'Missed'
                                    : 'Ended',
                }
                : null,
        }))

        if (connected) {
            startQualityPoll()
            return
        }

        if (record.status === 'ended' || record.status === 'rejected' || record.status === 'missed') {
            stopQualityPoll()
            releaseMedia()
            const { pc } = get()
            pc?.close()
            set({ pc: null })
        }
    }

    async function subscribeToCallLog(callLogId: string) {
        const unsubscribe = await pb.collection(COLLECTIONS.CALL_LOGS).subscribe<CallLogsRecord>(callLogId, (event) => {
            if (event.action === 'update' || event.action === 'create') {
                syncFromCallLog(event.record)
            }
        })
        set((state) => ({ _unsubs: [...state._unsubs, unsubscribe], _callLogId: callLogId }))
    }

    async function updateCallLog(data: Partial<CallLogsRecord>) {
        const callLogId = get()._callLogId ?? get().callData?.callLogId
        if (!callLogId) return
        const updated = await chatService.services.call_logs.update(callLogId, data as never)
        syncFromCallLog(updated)
    }

    async function safeAddCandidate(init: RTCIceCandidateInit) {
        const { pc, _remoteDescSet, _candidateQueue } = get()
        if (!pc || pc.signalingState === 'closed') return

        if (!_remoteDescSet) {
            set({ _candidateQueue: [..._candidateQueue, init] })
            return
        }

        try {
            await pc.addIceCandidate(new RTCIceCandidate(init))
        } catch (error: any) {
            if (error?.message?.includes('closed') || error?.message?.includes('ICE')) return
            console.warn('[WebRTC] addIceCandidate failed:', error?.message)
        }
    }

    async function drainCandidates() {
        set({ _remoteDescSet: true })
        const pending = get()._candidateQueue.splice(0)
        for (const init of pending) {
            await safeAddCandidate(init)
        }
    }

    function createPC(callLogId: string, side: CallSide): RTCPeerConnection {
        set({ _candidateQueue: [], _remoteDescSet: false })
        const pc = new RTCPeerConnection(ICE_CONFIG)

        pc.onicecandidate = (event) => {
            if (!event.candidate) return
            const callData = get().callData
            const sender = side === 'caller' ? (callData?.callerUid ?? null) : (callData?.calleeUid ?? null)
            const recipient = side === 'caller' ? (callData?.calleeUid ?? null) : (callData?.callerUid ?? null)

            void pb.collection(COLLECTIONS.CALL_ICE_CANDIDATES).create<CallIceCandidateRecord>({
                call_log: callLogId,
                conversation: callData?.cid ?? null,
                sender,
                recipient,
                side,
                candidate: event.candidate.candidate,
                sdp_mid: event.candidate.sdpMid,
                sdp_mline_index: event.candidate.sdpMLineIndex,
                username_fragment: event.candidate.usernameFragment,
            })
        }

        pc.ontrack = (event) => {
            const remoteStream = event.streams[0] ?? new MediaStream([event.track])
            set({ remoteStream, connected: true, callStatus: 'connected', quality: 3 })
            attachStreamsToEls()
        }

        pc.onconnectionstatechange = () => {
            switch (pc.connectionState) {
                case 'connecting':
                    set({ callStatus: 'connecting' })
                    break
                case 'connected':
                    set({ connected: true, callStatus: 'connected' })
                    startQualityPoll()
                    break
                case 'disconnected':
                    set({ callStatus: 'connecting' })
                    break
                case 'failed':
                    set({ connected: false, callStatus: 'failed' })
                    break
                case 'closed':
                    set({ connected: false, callStatus: 'ended' })
                    break
            }
        }

        set({ pc })
        return pc
    }

    async function listenForCandidates(callLogId: string, remoteSide: CallSide) {
        const filter = `call_log = ${quote(callLogId)} && side = ${quote(remoteSide)}`
        const existing = await pb.collection(COLLECTIONS.CALL_ICE_CANDIDATES).getFullList<CallIceCandidateRecord>({
            filter,
            sort: 'created',
        })

        for (const row of existing) {
            if (!row.candidate) continue
            await safeAddCandidate({
                candidate: row.candidate,
                sdpMid: row.sdp_mid ?? undefined,
                sdpMLineIndex: row.sdp_mline_index ?? undefined,
                usernameFragment: row.username_fragment ?? undefined,
            })
        }

        const unsubscribe = await pb.collection(COLLECTIONS.CALL_ICE_CANDIDATES).subscribe<CallIceCandidateRecord>('*', (event) => {
            if (event.action !== 'create') return
            const row = event.record
            if (row.call_log !== callLogId || row.side !== remoteSide || !row.candidate) return
            void safeAddCandidate({
                candidate: row.candidate,
                sdpMid: row.sdp_mid ?? undefined,
                sdpMLineIndex: row.sdp_mline_index ?? undefined,
                usernameFragment: row.username_fragment ?? undefined,
            })
        }, { filter })

        set((state) => ({ _unsubs: [...state._unsubs, unsubscribe] }))
    }

    async function waitForSignal(callLogId: string, signalType: SignalType, side: CallSide): Promise<CallSignalRecord> {
        const filter = `call_log = ${quote(callLogId)} && signal_type = ${quote(signalType)} && side = ${quote(side)}`
        const existing = await pb.collection(COLLECTIONS.CALL_SIGNALS).getFullList<CallSignalRecord>({
            filter,
            sort: '-created',
            batch: 1,
        })
        if (existing[0]) {
            return existing[0]
        }

        return new Promise<CallSignalRecord>((resolve, reject) => {
            let realtimeUnsub: (() => void) | null = null
            const timeout = setTimeout(() => {
                if (realtimeUnsub) {
                    try { realtimeUnsub() } catch { }
                }
                reject(new Error(`Timed out waiting for ${signalType} signal`))
            }, 15000)

            pb.collection(COLLECTIONS.CALL_SIGNALS).subscribe<CallSignalRecord>('*', (event) => {
                if (event.action !== 'create' && event.action !== 'update') return
                if (event.record.call_log !== callLogId || event.record.signal_type !== signalType || event.record.side !== side) return
                clearTimeout(timeout)
                if (realtimeUnsub) {
                    try { realtimeUnsub() } catch { }
                    realtimeUnsub = null
                }
                resolve(event.record)
            }, { filter }).then((unsubscribe) => {
                realtimeUnsub = unsubscribe
                set((state) => ({ _unsubs: [...state._unsubs, unsubscribe] }))
            }).catch((error) => {
                clearTimeout(timeout)
                reject(error)
            })
        })
    }

    async function waitForAnswer(callLogId: string) {
        const applyAnswer = async (signal: CallSignalRecord) => {
            const description = asRtcDescription(signal)
            const { pc } = get()
            if (!pc || !description) return
            if (pc.currentRemoteDescription || pc.signalingState !== 'have-local-offer') return
            await pc.setRemoteDescription(new RTCSessionDescription(description))
            await drainCandidates()
            set({ callStatus: 'connecting' })
        }

        const answerSignal = await waitForSignal(callLogId, 'answer', 'callee')
        await applyAnswer(answerSignal)
    }

    function resetCallState() {
        stopQualityPoll()
        cleanupListeners()
        releaseMedia()

        const { pc, localVideoRef, remoteVideoRef } = get()
        pc?.close()
        if (localVideoRef.current) localVideoRef.current.srcObject = null
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null

        set({
            pc: null,
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
            _callLogId: null,
            _callStartedAt: null,
            _candidateQueue: [],
            _remoteDescSet: false,
        })
    }

    return {
        localVideoRef: _localVideoRef,
        remoteVideoRef: _remoteVideoRef,
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
        _callLogId: null,
        _callStartedAt: null,
        _candidateQueue: [],
        _remoteDescSet: false,

        _acquireMedia: acquireMedia,
        _releaseMedia: releaseMedia,
        _createPC: createPC,
        _safeAddCandidate: safeAddCandidate,
        _drainCandidates: drainCandidates,
        _startQualityPoll: startQualityPoll,
        _stopQualityPoll: stopQualityPoll,
        _cleanupListeners: cleanupListeners,
        _resetCallState: resetCallState,
        _attachStreamsToEls: attachStreamsToEls,
        _subscribeToCallLog: subscribeToCallLog,
        _syncFromCallLog: syncFromCallLog,
        _updateCallLog: updateCallLog,
        _listenForCandidates: listenForCandidates,
        _waitForSignal: waitForSignal,
        _waitForAnswer: waitForAnswer,

        setLocalVideoEl: (el) => {
            _localVideoRef.current = el
            if (el) {
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
                const { remoteStream } = get()
                if (remoteStream && el.srcObject !== remoteStream) {
                    el.srcObject = remoteStream
                    el.play().catch(() => { })
                }
            }
        },

        openCall: (data) => {
            set({
                callData: {
                    ...data,
                    mode: data.mode ?? 'audio',
                    state: data.state || (data.isIncoming ? 'Incoming…' : 'Ringing…'),
                },
                callStatus: 'ringing',
                overlayOpen: true,
                minimized: false,
                connected: false,
                quality: 0,
                _callLogId: data.callLogId ?? null,
            })

            if (data.callLogId) {
                void subscribeToCallLog(data.callLogId)
            }
        },

        startCaller: async (cid, isVideo, callerUid, calleeUid) => {
            set({ callStatus: 'ringing', connected: false })

            let stream: MediaStream
            try {
                stream = await acquireMedia(isVideo)
            } catch {
                set({ callStatus: 'failed' })
                throw new Error('Camera/mic access denied')
            }

            const startedAt = nowIso()
            const callLog = await chatService.createCallLog({
                conversationId: cid,
                initiatorId: callerUid,
                participants: [callerUid, calleeUid].filter(Boolean),
                callType: isVideo ? 'video' : 'voice',
                startedAt,
                status: 'ringing',
                isMissed: false,
            })

            set((state) => ({
                _callLogId: callLog.id,
                _callStartedAt: startedAt,
                callData: state.callData
                    ? {
                        ...state.callData,
                        callLogId: callLog.id,
                        cid,
                        callerUid,
                        calleeUid,
                        participants: callLog.participants ?? state.callData.participants,
                        mode: isVideo ? 'video' : 'audio',
                        startedAt,
                        status: 'ringing',
                        state: 'Ringing…',
                    }
                    : null,
            }))

            await subscribeToCallLog(callLog.id)
            const pc = createPC(callLog.id, 'caller')
            stream.getTracks().forEach((track) => pc.addTrack(track, stream))
            await listenForCandidates(callLog.id, 'callee')
            const answerPromise = waitForAnswer(callLog.id)

            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            await pb.collection(COLLECTIONS.CALL_SIGNALS).create<CallSignalRecord>({
                call_log: callLog.id,
                conversation: cid,
                sender: callerUid,
                recipient: calleeUid,
                signal_type: 'offer',
                side: 'caller',
                sdp_type: offer.type,
                sdp: offer.sdp,
            })

            await answerPromise
        },

        startCallee: async (cid, isVideo) => {
            set({ callStatus: 'connecting' })

            let stream: MediaStream
            try {
                stream = await acquireMedia(isVideo)
            } catch {
                set({ callStatus: 'failed' })
                throw new Error('Camera/mic access denied')
            }

            const callLogId = get()._callLogId ?? get().callData?.callLogId
            const callerUid = get().callData?.callerUid ?? null
            const calleeUid = get().callData?.calleeUid ?? null
            if (!callLogId) {
                throw new Error('Missing PocketBase call log for incoming call')
            }

            await subscribeToCallLog(callLogId)
            const pc = createPC(callLogId, 'callee')
            stream.getTracks().forEach((track) => pc.addTrack(track, stream))
            await listenForCandidates(callLogId, 'caller')

            const offerSignal = await waitForSignal(callLogId, 'offer', 'caller')
            const remoteOffer = asRtcDescription(offerSignal)
            if (!remoteOffer) {
                throw new Error('PocketBase offer signal is missing SDP data')
            }

            await pc.setRemoteDescription(new RTCSessionDescription(remoteOffer))
            await drainCandidates()

            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            await pb.collection(COLLECTIONS.CALL_SIGNALS).create<CallSignalRecord>({
                call_log: callLogId,
                conversation: cid,
                sender: calleeUid,
                recipient: callerUid,
                signal_type: 'answer',
                side: 'callee',
                sdp_type: answer.type,
                sdp: answer.sdp,
            })

            await updateCallLog({ status: 'active' as CallLogStatus, is_missed: false })
            set({ callStatus: 'connecting' })
        },

        hangup: async (_cid) => {
            cleanupListeners()
            stopQualityPoll()

            const startedAt = get()._callStartedAt
            const duration = startedAt
                ? Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000))
                : null

            try {
                await updateCallLog({
                    status: 'ended' as CallLogStatus,
                    ended_at: nowIso(),
                    duration: duration ?? undefined,
                })
            } catch {
            }

            releaseMedia()
            const { pc } = get()
            pc?.close()
            set({ pc: null, connected: false, quality: 0, callStatus: 'ended' })
        },

        toggleMute: () => {
            const { localStream, muted } = get()
            const next = !muted
            localStream?.getAudioTracks().forEach((track) => { track.enabled = !next })
            set({ muted: next })
        },

        toggleCam: () => {
            const { localStream, camOff } = get()
            const next = !camOff
            localStream?.getVideoTracks().forEach((track) => { track.enabled = !next })
            set({ camOff: next })
        },

        toggleSpeaker: () => {
            set((state) => ({ speakerOff: !state.speakerOff }))
        },

        minimize: () => set({ minimized: true }),
        expand: () => set({ minimized: false }),

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

        rejectCall: async () => {
            try {
                await updateCallLog({ status: 'rejected' as CallLogStatus, ended_at: nowIso(), is_missed: true })
            } catch {
            }
            resetCallState()
        },

        endCall: async () => {
            await get().hangup(get().callData?.cid ?? '')
            resetCallState()
        },
    }
})

export const useLocalVideoRef = () => useCallingStore((s) => s.setLocalVideoEl)
export const useRemoteVideoRef = () => useCallingStore((s) => s.setRemoteVideoEl)
export const useCallData = () => useCallingStore((s) => s.callData)
export const useCallStatus = () => useCallingStore((s) => s.callStatus)
export const useCallQuality = () => useCallingStore((s) => s.quality)
export const useConnected = () => useCallingStore((s) => s.connected)
export const useOverlayOpen = () => useCallingStore((s) => s.overlayOpen)
export const useMinimized = () => useCallingStore((s) => s.minimized)
export const useMuted = () => useCallingStore((s) => s.muted)
export const useCamOff = () => useCallingStore((s) => s.camOff)
export const useSpeakerOff = () => useCallingStore((s) => s.speakerOff)

export const useCallActions = () => useCallingStore((s) => ({
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
