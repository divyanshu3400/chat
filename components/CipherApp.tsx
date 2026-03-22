'use client'

import { useEffect, useRef } from 'react'
import {
  getAuth, onAuthStateChanged, signInWithPopup,
  GoogleAuthProvider, signOut as fbSignOut, updateProfile,
} from 'firebase/auth'
import {
  getDatabase, ref, set, get, onValue,
  onDisconnect, serverTimestamp, update,
  off,
} from 'firebase/database'
import { getStorage, uploadBytesResumable, getDownloadURL, ref as sref } from 'firebase/storage'

import { useStore } from '@/lib/store'
import { FirebaseConfig, initFirebase, resolveCfg } from '@/lib/firebase'
import { loadOrGenKeys } from '@/lib/crypto'

import AuthScreen from '@/components/AuthScreen'
import SetupScreen from '@/components/SetupScreen'
import Sidebar from '@/components/Sidebar'

import type { Conversation } from '@/types'
import { BookmarksPanel, NewChatPanel, NewGroupPanel } from './overlays/Panels';
import CallOverlay from './overlays/CallOverlay';
import { Lightbox, StoryViewer, Toast } from './overlays/Overlays';
import SettingsPanel from './overlays/SettingsPanel';
import { AIPanel } from './chat/AIPanel';
import ProfilePanel from './overlays/ProfilePanel';
import ChatArea from './chat/ChatArea';
import EmptyState from './chat/EmptyState'
import StatusBar from './Statusbar'
import ChatHeader from './chat/ChatHeader'
import { useAiUI, useCallUI, usePanels, useScreen, useSetupDone } from '@/lib/ui'
import { getApp } from 'firebase/app'
import { usePushNotif } from '@/hooks/usePushNotif'

export default function CipherApp() {

  /* ── Global data store ───────────────────────────────────────────── */
  const {
    me, setMe,
    setMyKP,
    activeCid, setActiveCid,
    setSidebarOpen,
    setStories,
    setPresence,
    setPrefs,
    showToast,
    setCallOverlayOpen,
    conversations,
  } = useStore()
  const { initPush } = usePushNotif()

  /* ── UI store slices ─────────────────────────────────────────────── */
  const { screen, setScreen } = useScreen()
  const { setupDone, markSetupDone } = useSetupDone()
  const {
    aiPanelOpen, globalAiActive,
    toggleAiPanel, setAiPanelOpen, toggleGlobalAi,
    setSmartReply,
  } = useAiUI()
  const { panels, openPanel, closePanel, closeAllPanels } = usePanels()
  const { callData, setCallData, endCall } = useCallUI()

  /* ── Refs for non-reactive Firebase subscriptions ────────────────── */
  const presenceUnsubsRef = useRef<Map<string, () => void>>(new Map())
  const storiesUnsubRef = useRef<(() => void) | null>(null)
  const touchX = useRef(0)

  /* ── Derived ─────────────────────────────────────────────────────── */
  const activeConv: Conversation | null =
    activeCid ? (conversations[activeCid] ?? null) : null

  /* ── Mobile swipe sidebar ────────────────────────────────────────── */
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

  /* ── Firebase boot (re-runs after SetupScreen completes) ─────────── */
  useEffect(() => {
    const cfg = resolveCfg()
    if (!cfg) { setScreen('setup'); return }
    bootApp(cfg)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupDone])
  // 2c. Add useEffect that runs after user signs in:
  useEffect(() => {
    /* Initialize push notifications once user is authenticated */
    if (me?.uid) {
      initPush(me.uid)
    }
  }, [me?.uid, initPush])

  // Put this useEffect inside CipherApp, alongside the other useEffects.
  useEffect(() => {
    if (!me) return

    const db = getDatabase(getApp())

    const convKeys = Object.keys(conversations)
    const listeners: Array<() => void> = []

    convKeys.forEach(cid => {
      const statusRef = ref(db, `calls/${cid}/status`)
      const unsub = onValue(statusRef, async (snap) => {
        const status = snap.val()
        if (status !== 'ringing') return

        // Get full call doc
        const callRef = ref(db, `calls/${cid}`)
        const callSnap = await (await import('firebase/database')).get(callRef)
        const callDoc = callSnap.val()

        if (!callDoc) return
        if (callDoc.calleeUid !== me.uid) return     // not for us
        if (callDoc.callerUid === me.uid) return     // we are the caller

        // Find the conversation to get caller info
        const conv = conversations[cid]
        if (!conv) return

        // Show incoming call UI
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

      listeners.push(() => off(statusRef, 'value', unsub as any))
    })

    return () => listeners.forEach(fn => fn())
  }, [me, conversations])

  /* ═══════════════════════════════════════════════════════════
     BOOT
  ═══════════════════════════════════════════════════════════ */
  async function bootApp(cfg: FirebaseConfig) {
    const app = initFirebase(cfg)
    const auth = getAuth(app)
    const db = getDatabase(app)

    onAuthStateChanged(auth, async user => {
      if (user) {
        /* 1 — Hydrate user */
        setMe({
          uid: user.uid,
          displayName: user.displayName ?? 'User',
          email: user.email ?? '',
          photoURL: user.photoURL ?? '',
        })
        setScreen('app')

        /* 2 — E2E keys */
        const kp = await loadOrGenKeys(user.uid) as CryptoKeyPair
        setMyKP(kp)
        const { Crypto } = await import('@/lib/crypto')
        set(ref(db, `pubkeys/${user.uid}`), {
          pubkey: await Crypto.exportPub(kp.publicKey),
          uid: user.uid,
        })

        /* 3 — User record */
        set(ref(db, `users/${user.uid}`), {
          uid: user.uid,
          displayName: user.displayName ?? 'User',
          email: user.email,
          photoURL: user.photoURL ?? '',
          lastSeen: serverTimestamp(),
        })

        /* 4 — Presence */
        const pr = ref(db, `presence/${user.uid}`)
        set(pr, { online: true, lastSeen: serverTimestamp() })
        onDisconnect(pr).set({ online: false, lastSeen: serverTimestamp() })

        /* 5 — Conversations: owned by store via refetchConvs / subscribeWithSelector */

        /* 6 — Contact presence */
        watchContactPresence(user.uid, db)

        /* 7 — Stories */
        attachStoriesListener(db)

      } else {
        /* Signed out */
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

  /* ── Contact presence ────────────────────────────────────────────── */
  function watchContactPresence(uid: string, db: ReturnType<typeof getDatabase>) {
    onValue(ref(db, `conversations/${uid}`), snap => {
      const convs = (snap.val() ?? {}) as Record<string, Conversation>
      Object.values(convs).forEach(c => {
        if (!c.otherUid) return
        if (presenceUnsubsRef.current.has(c.otherUid)) return
        const pRef = ref(db, `presence/${c.otherUid}`)
        onValue(pRef, pSnap => setPresence(c.otherUid!, pSnap.val() ?? { online: false }))
        presenceUnsubsRef.current.set(c.otherUid, () => off(pRef))
      })
    })
  }

  /* ── Stories ─────────────────────────────────────────────────────── */
  function attachStoriesListener(db: ReturnType<typeof getDatabase>) {
    storiesUnsubRef.current?.()
    const sRef = ref(db, 'stories')
    onValue(sRef, snap => {
      const now = Date.now()
      setStories(
        Object.values(snap.val() ?? {})
          .filter((s: any) => now - s.ts < 86_400_000) as any[]
      )
    })
    storiesUnsubRef.current = () => off(sRef)
  }

  /* ═══════════════════════════════════════════════════════════
     AUTH
  ═══════════════════════════════════════════════════════════ */
  async function signIn() {
    const cfg = resolveCfg(); if (!cfg) return
    try { await signInWithPopup(getAuth(initFirebase(cfg)), new GoogleAuthProvider()) }
    catch (e: any) { showToast('Sign-in failed: ' + e.message) }
  }

  async function signOutUser() {
    const cfg = resolveCfg(); if (!cfg) return
    await fbSignOut(getAuth(initFirebase(cfg)))
  }

  /* ═══════════════════════════════════════════════════════════
     PROFILE
  ═══════════════════════════════════════════════════════════ */
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
    const auth = getAuth(app)
    const db = getDatabase(app)
    const stor = getStorage(app)
    showToast('Uploading photo…')
    const task = uploadBytesResumable(sref(stor, `avatars/${me.uid}`), file)
    task.on('state_changed', null,
      () => showToast('Upload failed'),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        await updateProfile(auth.currentUser!, { photoURL: url })
        await update(ref(db, `users/${me.uid}`), { photoURL: url })
        setMe({ ...me, photoURL: url })
        showToast('Photo updated ✓')
      }
    )
  }

  /* ═══════════════════════════════════════════════════════════
     NEW CHAT / GROUP
  ═══════════════════════════════════════════════════════════ */
  async function doNewChat(email: string) {
    if (!me || !email.trim()) return
    const db = getDatabase(initFirebase(resolveCfg()!))
    if (email.toLowerCase() === me.email.toLowerCase()) {
      showToast("That's your own email!"); return
    }
    const snap = await get(ref(db, 'users'))
    const found = Object.values(snap.val() ?? {}).find(
      (u: any) => u.email?.toLowerCase() === email.trim().toLowerCase()
    ) as any
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
      const found = Object.values(allUsers).find(
        (u: any) => u.email?.toLowerCase() === email.toLowerCase()
      ) as any
      if (found) members[found.uid] = true
    }
    const gid = `grp_${Date.now()}`
    const base = { updatedAt: serverTimestamp(), lastMsg: '', isGroup: true, name: name.trim() }
    await Promise.all(
      Object.keys(members).map(uid => set(ref(db, `conversations/${uid}/${gid}`), base))
    )
    setActiveCid(gid)
    closePanel('newGroup')
    showToast(`Group "${name}" created!`)
  }

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

  function closeCall() {
    setCallOverlayOpen(false)
    endCall()
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER GUARDS
  ═══════════════════════════════════════════════════════════ */
  if (screen === 'setup') {
    return (
      <SetupScreen
        onComplete={() => { markSetupDone(); setScreen('auth') }}
      />
    )
  }

  if (screen === 'auth') {
    return <AuthScreen onSignIn={signIn} />
  }

  /* ═══════════════════════════════════════════════════════════
     MAIN APP
  ═══════════════════════════════════════════════════════════ */
  return (
    <>
      <StatusBar
        aiActive={globalAiActive}
        onToggleAI={toggleGlobalAi}
      />

      <div style={{
        display: 'flex',
        height: '100dvh',
        paddingTop: 36,
        background: 'var(--bg)',
        overflow: 'hidden',
      }}>

        {/* ── SIDEBAR ── */}
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

        {/* ── MAIN AREA ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          minWidth: 0,
        }}>
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
              onSidebarOpen={() => setSidebarOpen(true)}
            />
          )}
        </div>

        {/* ── AI PANEL ── */}
        {aiPanelOpen && globalAiActive && activeConv && (
          <AIPanel
            conv={activeConv}
            messages={[]}
            onSmartReply={setSmartReply}
            onClose={() => setAiPanelOpen(false)}
          />
        )}
      </div>

      {/* ── OVERLAYS ── */}
      <SettingsPanel
        open={panels.settings}
        onClose={() => closePanel('settings')}
        onSignOut={signOutUser}
      />
      <ProfilePanel
        open={panels.profile}
        onClose={() => closePanel('profile')}
        onSave={saveProfile}
        onAvatarChange={uploadAvatar}
      />
      <NewChatPanel
        open={panels.newChat}
        onClose={() => closePanel('newChat')}
        onStart={doNewChat}
      />
      <NewGroupPanel
        open={panels.newGroup}
        onClose={() => closePanel('newGroup')}
        onCreate={doNewGroup}
      />
      <BookmarksPanel
        open={panels.bookmarks}
        onClose={() => closePanel('bookmarks')}
        bookmarks={[]}
      />
      <CallOverlay
        callData={callData}
        onEnd={closeCall}
        onAccept={() => showToast('Call accepted')}
        onReject={closeCall}
      />
      <Lightbox />
      <StoryViewer />
      <Toast />
    </>
  )
}