'use client'

/* ─── React ─────────────────────────────────────────────────────────── */
import { useEffect, useRef, useCallback } from 'react'

/* ─── Data store ─────────────────────────────────────────────────────── */
import { useStore } from '@/lib/store'

/* ─── UI store slices ────────────────────────────────────────────────── */
import {
  useScreen, useSetupDone, useAiUI, usePanels, useCallUI,
} from '@/lib/ui'
import { useActiveCall } from '@/hooks/useActiveCall'

/* ─── Global video refs (shared between FloatingCallWindow and PiP) ─── */
import { globalLocalRef, globalRemoteRef } from '@/hooks/useWebRTCRefs'

/* ─── Firebase ───────────────────────────────────────────────────────── */
import { resolveCfg, initFirebase } from '@/lib/firebase'
import { loadOrGenKeys } from '@/lib/crypto'
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  onAuthStateChanged, signOut as fbSignOut, updateProfile,
} from 'firebase/auth'
import {
  getDatabase, ref, set, get, update, onValue,
  serverTimestamp, onDisconnect, off,
} from 'firebase/database'
import {
  getStorage, ref as sref,
  uploadBytesResumable, getDownloadURL,
} from 'firebase/storage'

/* ─── Push notifications ─────────────────────────────────────────────── */
import { usePushNotif } from '@/hooks/usePushNotif'

/* ─── Types ──────────────────────────────────────────────────────────── */
import type { Conversation } from '@/types'
import type { FirebaseConfig } from '@/lib/firebase'

/* ─── Pages / screens ───────────────────────────────────────────────── */
import SetupScreen from '@/components/SetupScreen'
import AuthScreen from '@/components/AuthScreen'

/* ─── Layout ─────────────────────────────────────────────────────────── */
import StatusBar from '@/components/Statusbar'
import Sidebar from '@/components/Sidebar'

/* ─── Chat ───────────────────────────────────────────────────────────── */
import ChatHeader from '@/components/chat/ChatHeader'
import ChatArea from '@/components/chat/ChatArea'
import EmptyState from '@/components/chat/EmptyState'

/* ─── Overlays / panels ──────────────────────────────────────────────── */
import SettingsPanel from '@/components/overlays/SettingsPanel'
import ProfilePanel from '@/components/overlays/ProfilePanel'
import { NewChatPanel, NewGroupPanel, BookmarksPanel } from '@/components/overlays/Panels'
import { Lightbox, StoryViewer, Toast } from '@/components/overlays/Overlays'

/* ─── Call components ────────────────────────────────────────────────── */
import FloatingCallWindow from '@/components/overlays/FloatingCallWindow'
import FloatingCallPiP from '@/components/overlays/FloatingCallPiP'
import ActiveCallBar from '@/components/overlays/ActiveCallBar'
import { getApp } from 'firebase/app'
import { AIPanel } from './chat/AIPanel'

/* ─── NOTE on useWebRTC ──────────────────────────────────────────────────
   We do NOT call useWebRTC() here.

   FloatingCallWindow owns the WebRTC lifecycle (startCaller, startCallee,
   hangup, releaseMedia). It uses globalLocalRef / globalRemoteRef so the
   stream binding persists when minimized.

   The minimized UIs (FloatingCallPiP / ActiveCallBar) need to call
   toggleMute / toggleCam / hangup — they get these via their own props
   which are wired in CipherApp below using a shared ref pattern.
   See `callActionsRef` below.
─────────────────────────────────────────────────────────────────────── */

/* ═══════════════════════════════════════════════════════════════════════
   ROOT COMPONENT
═══════════════════════════════════════════════════════════════════════ */
export default function CipherApp() {

  /* ── Data store ──────────────────────────────────────────────────── */
  const {
    me, setMe,
    setMyKP,
    activeCid, setActiveCid,
    setSidebarOpen,
    setStories,
    setPresence,
    setPrefs,
    showToast,
    callOverlayOpen, setCallOverlayOpen,
    conversations,
    convsLoading,
    convsError,
    refetchConvs,
  } = useStore()

  /* ── Push notifications ──────────────────────────────────────────── */
  const { initPush } = usePushNotif()

  /* ── UI store slices ─────────────────────────────────────────────── */
  const { screen, setScreen } = useScreen()
  const { setupDone, markSetupDone } = useSetupDone()
  const {
    aiPanelOpen, globalAiActive,
    toggleAiPanel, setAiPanelOpen, toggleGlobalAi, setSmartReply,
  } = useAiUI()
  const { panels, openPanel, closePanel, closeAllPanels } = usePanels()
  const { callData, setCallData, endCall } = useCallUI()

  /* ── Minimized call state ─────────────────────────────────────────── */
  const {
    minimized, setMinimized,
    muted, setMuted,
    camOff, setCamOff,
    reset: resetCallUI,
  } = useActiveCall()

  /* ── callActionsRef ──────────────────────────────────────────────────
     FloatingCallWindow registers its toggleMute/toggleCam/hangup/
     releaseMedia here after it mounts. The minimized UIs then call
     these through the ref — no duplicate useWebRTC() needed in CipherApp.
  ─────────────────────────────────────────────────────────────────────── */
  const callActionsRef = useRef<{
    toggleMute: (muted: boolean) => void
    toggleCam: (camOff: boolean) => void
    hangup: (cid: string) => Promise<void>
    releaseMedia: () => void
    pcRef: React.MutableRefObject<RTCPeerConnection | null> | null
  }>({
    toggleMute: (_muted) => { },
    toggleCam: (_camOff) => { },
    hangup: (_cid) => Promise.resolve(),
    releaseMedia: () => { },
    pcRef: null,
  })

  /* ── Firebase subscription cleanup refs ─────────────────────────── */
  const presenceUnsubsRef = useRef<Map<string, () => void>>(new Map())
  const storiesUnsubRef = useRef<(() => void) | null>(null)
  const touchX = useRef(0)

  /* ── Derived ─────────────────────────────────────────────────────── */
  const activeConv: Conversation | null =
    activeCid ? (conversations[activeCid] ?? null) : null

  /* ════════════════════════════════════════════════════════════════════
     CALL HELPERS
     Single source of truth for ending/closing calls.
  ════════════════════════════════════════════════════════════════════ */

  /** End the call completely — releases media, clears all state */
  const closeCall = useCallback(() => {
    setCallOverlayOpen(false)
    endCall()      // clears callData in UI store
    resetCallUI()  // clears minimized / muted / camOff
  }, [setCallOverlayOpen, endCall, resetCallUI])

  /** Open an outgoing call */
  function openCall(mode: 'audio' | 'video') {
    if (!activeConv || !me) return
    setCallData({
      peerName: activeConv.otherName ?? 'Unknown',
      peerPhoto: activeConv.otherPhoto ?? '',
      state: 'Ringing…',
      isIncoming: false,
      mode,
      cid: activeCid ?? undefined,
      callerUid: me.uid,
      calleeUid: activeConv.otherUid ?? '',
    })
    setCallOverlayOpen(true)
  }

  /* ════════════════════════════════════════════════════════════════════
     MINIMIZED CALL HANDLERS
     These use callActionsRef so no extra useWebRTC() is needed here.
  ════════════════════════════════════════════════════════════════════ */

  function handleMinimizedEnd() {
    callActionsRef.current.releaseMedia()
    callActionsRef.current.hangup(callData?.cid ?? '')
    closeCall()
  }

  function handleMinimizedMute() {
    const next = !muted
    callActionsRef.current.toggleMute(next)
    setMuted(next)
  }

  function handleMinimizedCam() {
    const next = !camOff
    callActionsRef.current.toggleCam(next)
    setCamOff(next)
  }

  /* ════════════════════════════════════════════════════════════════════
     MOBILE SWIPE SIDEBAR
  ════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const ts = (e: TouchEvent) => { touchX.current = e.touches[0].clientX }
    const te = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchX.current
      if (touchX.current < 30 && dx > 60) setSidebarOpen(true)
      if (dx < -60) setSidebarOpen(false)
    }
    document.addEventListener('touchstart', ts, { passive: true })
    document.addEventListener('touchend', te, { passive: true })
    return () => {
      document.removeEventListener('touchstart', ts)
      document.removeEventListener('touchend', te)
    }
  }, [setSidebarOpen])

  /* ── Preferences ─────────────────────────────────────────────────── */
  useEffect(() => {
    try { setPrefs(JSON.parse(localStorage.getItem('cipher_prefs') ?? '{}')) }
    catch { }
  }, [setPrefs])

  /* ── Push notifications init ─────────────────────────────────────── */
  useEffect(() => {
    if (me?.uid) initPush(me.uid)
  }, [me?.uid, initPush])

  /* ── Firebase boot ───────────────────────────────────────────────── */
  useEffect(() => {
    const cfg = resolveCfg()
    if (!cfg) { setScreen('setup'); return }
    bootApp(cfg)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupDone])

  /* ── Incoming call listener ──────────────────────────────────────────
     Watches calls/{cid}/status for every known conversation.
     When status = 'ringing' and calleeUid = me.uid → show incoming UI.
  ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!me) return
    const db = getDatabase(getApp())
    const convKeys = Object.keys(conversations)
    const unsubs: Array<() => void> = []

    convKeys.forEach(cid => {
      const statusRef = ref(db, `calls/${cid}/status`)
      const unsub = onValue(statusRef, async snap => {
        if (snap.val() !== 'ringing') return

        const callSnap = await get(ref(db, `calls/${cid}`))
        const callDoc = callSnap.val()
        if (!callDoc) return
        if (callDoc.calleeUid !== me.uid) return  // not for us
        if (callDoc.callerUid === me.uid) return  // we are the caller

        const conv = conversations[cid]
        if (!conv) return

        setCallData({
          peerName: conv.otherName ?? 'Unknown',
          peerPhoto: conv.otherPhoto ?? '',
          callerName: conv.otherName ?? 'Unknown',
          callerPhoto: conv.otherPhoto ?? '',
          state: 'Incoming…',
          isIncoming: true,
          mode: callDoc.mode ?? 'audio',
          cid,
          callerUid: callDoc.callerUid,
          calleeUid: callDoc.calleeUid,
        })
        setCallOverlayOpen(true)
      })
      unsubs.push(() => off(statusRef, 'value', unsub as any))
    })

    return () => unsubs.forEach(fn => fn())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.uid, Object.keys(conversations).join(',')])

  /* ── SW messages (notification Accept/Decline taps) ─────────────── */
  useEffect(() => {
    function onSWMessage(event: MessageEvent) {
      const { type, cid: swCid } = event.data ?? {}
      if (type === 'ACCEPT_CALL') setCallOverlayOpen(true)
      if (type === 'DECLINE_CALL' && swCid) {
        set(ref(getDatabase(getApp()), `calls/${swCid}/status`), 'ended').catch(() => { })
        closeCall()
      }
    }
    navigator.serviceWorker?.addEventListener('message', onSWMessage)
    return () => navigator.serviceWorker?.removeEventListener('message', onSWMessage)
  }, [closeCall])

  /* ════════════════════════════════════════════════════════════════════
     FIREBASE BOOT
  ════════════════════════════════════════════════════════════════════ */
  async function bootApp(cfg: FirebaseConfig) {
    const app = initFirebase(cfg)
    const auth = getAuth(app)
    const db = getDatabase(app)

    onAuthStateChanged(auth, async user => {
      if (user) {
        setMe({ uid: user.uid, displayName: user.displayName ?? 'User', email: user.email ?? '', photoURL: user.photoURL ?? '' })
        setScreen('app')

        const kp = await loadOrGenKeys(user.uid) as CryptoKeyPair
        setMyKP(kp)
        const { Crypto } = await import('@/lib/crypto')
        set(ref(db, `pubkeys/${user.uid}`), { pubkey: await Crypto.exportPub(kp.publicKey), uid: user.uid })

        set(ref(db, `users/${user.uid}`), {
          uid: user.uid, displayName: user.displayName ?? 'User',
          email: user.email, photoURL: user.photoURL ?? '', lastSeen: serverTimestamp(),
        })

        const pr = ref(db, `presence/${user.uid}`)
        set(pr, { online: true, lastSeen: serverTimestamp() })
        onDisconnect(pr).set({ online: false, lastSeen: serverTimestamp() })

        watchContactPresence(user.uid, db)
        attachStoriesListener(db)
      } else {
        setMe(null)
        setScreen('auth')
        setActiveCid(null)
        setAiPanelOpen(false)
        closeAllPanels()
        presenceUnsubsRef.current.forEach(unsub => unsub())
        presenceUnsubsRef.current.clear()
        storiesUnsubRef.current?.()
        storiesUnsubRef.current = null
      }
    })
  }

  function watchContactPresence(uid: string, db: ReturnType<typeof getDatabase>) {
    onValue(ref(db, `conversations/${uid}`), snap => {
      const convs = (snap.val() ?? {}) as Record<string, Conversation>
      Object.values(convs).forEach(c => {
        if (!c.otherUid || presenceUnsubsRef.current.has(c.otherUid)) return
        const pRef = ref(db, `presence/${c.otherUid}`)
        onValue(pRef, ps => setPresence(c.otherUid!, ps.val() ?? { online: false }))
        presenceUnsubsRef.current.set(c.otherUid, () => off(pRef))
      })
    })
  }

  function attachStoriesListener(db: ReturnType<typeof getDatabase>) {
    storiesUnsubRef.current?.()
    const sRef = ref(db, 'stories')
    onValue(sRef, snap => {
      const now = Date.now()
      setStories(Object.values(snap.val() ?? {}).filter((s: any) => now - s.ts < 86_400_000) as any[])
    })
    storiesUnsubRef.current = () => off(sRef)
  }

  /* ════════════════════════════════════════════════════════════════════
     AUTH / PROFILE / CHAT ACTIONS  (unchanged from before)
  ════════════════════════════════════════════════════════════════════ */
  async function signIn() {
    const cfg = resolveCfg(); if (!cfg) return
    try { await signInWithPopup(getAuth(initFirebase(cfg)), new GoogleAuthProvider()) }
    catch (e: any) { showToast('Sign-in failed: ' + e.message) }
  }

  async function signOutUser() {
    const cfg = resolveCfg(); if (!cfg) return
    await fbSignOut(getAuth(initFirebase(cfg)))
  }

  async function saveProfile(name: string, status: string) {
    if (!me) return
    const app = initFirebase(resolveCfg()!)
    await updateProfile(getAuth(app).currentUser!, { displayName: name })
    setMe({ ...me, displayName: name, status } as typeof me)
    update(ref(getDatabase(app), `users/${me.uid}`), { displayName: name, status })
    showToast('Profile saved ✓')
  }

  async function uploadAvatar(file: File) {
    if (!me) return
    const app = initFirebase(resolveCfg()!)
    const stor = getStorage(app)
    showToast('Uploading photo…')
    const task = uploadBytesResumable(sref(stor, `avatars/${me.uid}`), file)
    task.on('state_changed', null,
      () => showToast('Upload failed'),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        await updateProfile(getAuth(app).currentUser!, { photoURL: url })
        await update(ref(getDatabase(app), `users/${me.uid}`), { photoURL: url })
        setMe({ ...me, photoURL: url })
        showToast('Photo updated ✓')
      }
    )
  }

  async function doNewChat(email: string) {
    if (!me || !email.trim()) return
    const db = getDatabase(initFirebase(resolveCfg()!))
    if (email.toLowerCase() === me.email.toLowerCase()) { showToast("That's your own email!"); return }
    const snap = await get(ref(db, 'users'))
    const found = Object.values(snap.val() ?? {}).find((u: any) => u.email?.toLowerCase() === email.trim().toLowerCase()) as any
    if (!found) { showToast('User not found — they must sign in first'); return }
    const cid = [me.uid, found.uid].sort().join('_')
    const base = { updatedAt: serverTimestamp(), lastMsg: '', isGroup: false }
    await Promise.all([
      set(ref(db, `conversations/${me.uid}/${cid}`), { ...base, otherUid: found.uid, otherName: found.displayName, otherPhoto: found.photoURL ?? '' }),
      set(ref(db, `conversations/${found.uid}/${cid}`), { ...base, otherUid: me.uid, otherName: me.displayName, otherPhoto: me.photoURL ?? '' }),
    ])
    setActiveCid(cid)
    closePanel('newChat')
    showToast('Chat started!')
  }

  async function doNewGroup(name: string, emails: string[]) {
    if (!me || !name.trim() || emails.length < 1) return
    const db = getDatabase(initFirebase(resolveCfg()!))
    const snap = await get(ref(db, 'users'))
    const allUsers = snap.val() ?? {}
    const members: Record<string, boolean> = { [me.uid]: true }
    for (const email of emails) {
      const found = Object.values(allUsers).find((u: any) => u.email?.toLowerCase() === email.toLowerCase()) as any
      if (found) members[found.uid] = true
    }
    const gid = `grp_${Date.now()}`
    const base = { updatedAt: serverTimestamp(), lastMsg: '', isGroup: true, name: name.trim() }
    await Promise.all(Object.keys(members).map(uid => set(ref(db, `conversations/${uid}/${gid}`), base)))
    setActiveCid(gid)
    closePanel('newGroup')
    showToast(`Group "${name}" created!`)
  }

  /* ════════════════════════════════════════════════════════════════════
     RENDER GUARDS
  ════════════════════════════════════════════════════════════════════ */
  if (screen === 'setup') return <SetupScreen onComplete={() => { markSetupDone(); setScreen('auth') }} />
  if (screen === 'auth') return <AuthScreen onSignIn={signIn} />

  /* ════════════════════════════════════════════════════════════════════
     MINIMIZED CALL UI
     Shown when user minimizes the call.
     Video → FloatingCallPiP   Audio → ActiveCallBar
  ════════════════════════════════════════════════════════════════════ */
  const minimizedCallUI = callData && callOverlayOpen && minimized
    ? callData.mode === 'video'
      ? (
        <FloatingCallPiP
          callData={callData}
          localRef={globalLocalRef as React.RefObject<HTMLVideoElement>}
          remoteRef={globalRemoteRef as React.RefObject<HTMLVideoElement>}
          pcRef={callActionsRef.current.pcRef ?? undefined}
          onExpand={() => setMinimized(false)}
          onEnd={handleMinimizedEnd}
          onToggleMute={handleMinimizedMute}
          onToggleCam={handleMinimizedCam}
        />
      )
      : (
        <ActiveCallBar
          callData={callData}
          onExpand={() => setMinimized(false)}
          onEnd={handleMinimizedEnd}
          onToggleMute={handleMinimizedMute}
        />
      )
    : null

  /* ════════════════════════════════════════════════════════════════════
     MAIN APP
  ════════════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* ── Status bar ── */}
      <StatusBar aiActive={globalAiActive} onToggleAI={toggleGlobalAi} />

      {/* ── Minimized call (renders above everything else) ── */}
      {minimizedCallUI}

      {/* ── App shell ── */}
      <div style={{
        display: 'flex',
        height: '100dvh',
        paddingTop: 36,
        background: 'var(--bg)',
        overflow: 'hidden',
      }}>

        <Sidebar
          onNewChat={() => openPanel('newChat')}
          onNewGroup={() => openPanel('newGroup')}
          onProfile={() => openPanel('profile')}
          onSettings={() => openPanel('settings')}
          onOpenChat={cid => {
            setActiveCid(cid)
            setSidebarOpen(false)
            if (globalAiActive) setAiPanelOpen(true)
          }}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', minWidth: 0 }}>
          {activeCid && activeConv ? (
            <>
              <ChatHeader
                conv={activeConv}
                onBack={() => setActiveCid(null)}
                onSearch={() => { }}
                onStartCall={openCall}
                onToggleAI={toggleAiPanel}
              />
              <ChatArea
                key={activeCid}
                cid={activeCid}
                conv={activeConv}
                onBack={() => setActiveCid(null)}
              />
            </>
          ) : (
            <EmptyState
              onNewChat={() => openPanel('newChat')}
              onNewGroup={() => openPanel('newGroup')}
              loading={convsLoading}
              error={convsError ?? undefined}
              onRetry={refetchConvs}
            />
          )}
        </div>

        {aiPanelOpen && globalAiActive && activeConv && (
          <AIPanel
            conv={activeConv}
            messages={[]}
            onSmartReply={setSmartReply}
            onClose={() => setAiPanelOpen(false)}
          />
        )}
      </div>

      {/* ── Panels ── */}
      <SettingsPanel open={panels.settings} onClose={() => closePanel('settings')} onSignOut={signOutUser} />
      <ProfilePanel open={panels.profile} onClose={() => closePanel('profile')} onSave={saveProfile} onAvatarChange={uploadAvatar} />
      <NewChatPanel open={panels.newChat} onClose={() => closePanel('newChat')} onStart={doNewChat} />
      <NewGroupPanel open={panels.newGroup} onClose={() => closePanel('newGroup')} onCreate={doNewGroup} />
      <BookmarksPanel open={panels.bookmarks} onClose={() => closePanel('bookmarks')} bookmarks={[]} />

      {/* ── Full-screen call overlay ──────────────────────────────────────
          Renders when callOverlayOpen && !minimized.
          When minimized=true it returns null and minimizedCallUI takes over.

          onEnd / onAccept / onReject all funnel through closeCall()
          so state is always cleaned up consistently.

          FloatingCallWindow registers its WebRTC actions into callActionsRef
          via the registerCallActions prop so CipherApp can call them from
          the minimized handlers without a second useWebRTC() instance.
      ─────────────────────────────────────────────────────────────────── */}
      <FloatingCallWindow
        callData={callData}
        onEnd={closeCall}
        onAccept={() => {
          /* Call connected — nothing extra needed, FloatingCallWindow
             handles the WebRTC accept internally */
        }}
        onReject={closeCall}
        onRegisterActions={actions => { callActionsRef.current = { ...actions, pcRef: (actions as any).pcRef ?? null } }}
      />

      {/* ── Global singletons ── */}
      <Lightbox />
      <StoryViewer />
      <Toast />
    </>
  )
}