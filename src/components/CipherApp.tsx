'use client';

import { useEffect } from 'react';
import { useStore } from '@/src/store/store';
import { useScreen, useAiUI, usePanels } from '@/src/lib/ui';
import { useAuthStore } from '@/src/store/auth.store';
import { isMobileDevice } from '@/src/lib/utils';
import { initFirebase, resolveCfg } from '@/src/lib/firebase';
import { STORAGE_KEYS } from '@/src/lib/pb';

// listener hooks
import { useBootstrap } from '@/src/hooks/useBootstrap';
import { usePresenceListener } from '@/src/hooks/usePresenceListener';
import { useStoriesListener } from '@/src/hooks/useStoriesListener';
import { useCallListener } from '@/src/hooks/useCallListener';
import { usePushNotif } from '@/src/hooks/usePushNotif';

// action hooks
import { useConversationActions } from '@/src/hooks/useConversationActions';
import { useSignOut } from '@/src/hooks/useSignOut';
import { useCallActions, useOverlayOpen, useMinimized, useCallData } from '@/src/hooks/useCallingStore';

// UI
import AuthScreen from '@/src/components/AuthScreen';
import Sidebar from '@/src/components/Sidebar';
import ChatHeader from '@/src/components/chat/ChatHeader';
import ChatArea from '@/src/components/chat/ChatArea';
import EmptyState from '@/src/components/chat/EmptyState';
import SettingsPanel from '@/src/components/overlays/SettingsPanel';
import { NewChatPanel, NewGroupPanel, BookmarksPanel } from '@/src/components/overlays/Panels';
import { Lightbox, StoryViewer, Toast } from '@/src/components/overlays/Overlays';
import FloatingCallWindow from '@/src/components/overlays/FloatingCallWindow';
import FloatingCallPiP from '@/src/components/overlays/FloatingCallPiP';
import ActiveCallBar from '@/src/components/overlays/ActiveCallBar';
import ProfilePanel from './Profile';
import { useAuthSync } from '../hooks/useAuthSync';

export default function CipherApp() {
  const authInitialized = useAuthStore((s) => s.initialized);
  const authStatus = useAuthStore((s) => s.status);
  const authUser = useAuthStore((s) => s.user);
  const initializeAuth = useAuthStore((s) => s.initialize);

  useEffect(() => { initializeAuth(); }, [initializeAuth]);

  useAuthSync();

  const isAuthenticated = authStatus === 'authenticated';
  useBootstrap(isAuthenticated ? authUser?.id ?? null : null);
  usePresenceListener(isAuthenticated);
  useStoriesListener(isAuthenticated);
  useCallListener(isAuthenticated ? authUser?.id ?? null : null);

  // ── app state ─────────────────────────────────────────
  const me = useStore((s) => s.me);
  const activeCid = useStore((s) => s.activeCid);
  const conversations = useStore((s) => s.conversations);
  const convsLoading = useStore((s) => s.convsLoading);
  const convsError = useStore((s) => s.convsError);
  const activeConv = activeCid ? (conversations[activeCid] ?? null) : null;

  // ── UI ────────────────────────────────────────────────
  const { screen, setScreen } = useScreen();
  const { globalAiActive, toggleAiPanel, setAiPanelOpen } = useAiUI();
  const { panels, openPanel, closePanel, closeAllPanels } = usePanels();
  const isMob = isMobileDevice();

  const setActiveCid = (v: string | null) => useStore.getState().setActiveCid(v);
  const setSidebarOpen = (v: boolean) => useStore.getState().setSidebarOpen(v);
  const setPrefs = (v: any) => useStore.getState().setPrefs(v);
  const refetchConvs = () => useStore.getState().refetchConvs();

  // ── calling ───────────────────────────────────────────
  const overlayOpen = useOverlayOpen();
  const minimized = useMinimized();
  const callData = useCallData();
  const { openCall: storeOpenCall } = useCallActions();

  const { initPush } = usePushNotif();
  useEffect(() => { if (me?.id) initPush(me.id); }, [me?.id]);

  // ── screen sync ───────────────────────────────────────
  useEffect(() => {
    if (!authInitialized) return;
    if (authStatus === 'authenticated') { setScreen('app'); return; }
    setScreen('auth');
    setActiveCid(null);
    setAiPanelOpen(false);
    closeAllPanels();
  }, [authInitialized, authStatus]);

  // ── firebase init ─────────────────────────────────────
  useEffect(() => {
    const cfg = resolveCfg();
    if (cfg) initFirebase(cfg);
  }, []);

  // ── prefs ─────────────────────────────────────────────
  useEffect(() => {
    try { setPrefs(JSON.parse(localStorage.getItem(STORAGE_KEYS.PREFS) ?? '{}')); }
    catch { /* no-op */ }
  }, []);

  // ── mobile sidebar ────────────────────────────────────
  useEffect(() => { if (isMob) setSidebarOpen(true); }, [isMob]);

  useEffect(() => {
    const onStart = (e: TouchEvent) => { (window as any).__tx = e.touches[0].clientX; };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - ((window as any).__tx ?? 0);
      if ((window as any).__tx < 30 && dx > 60) setSidebarOpen(true);
      if (dx < -60) setSidebarOpen(false);
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
    };
  }, []);

  // ── actions ───────────────────────────────────────────
  const { doNewChat, doNewGroup } = useConversationActions();
  const signOut = useSignOut();

  const openCall = (mode: 'audio' | 'video') => {
    const { me: m, activeCid: cid, conversations: convs } = useStore.getState();
    if (!cid || !m) return;
    const peer = convs[cid]?.otherUser;
    storeOpenCall({
      cid, isIncoming: false, mode,
      peerName: peer?.name ?? peer?.email ?? 'Unknown',
      peerPhoto: '',
      callerUid: m.id,
      calleeUid: peer?.id ?? '',
      state: 'Ringing…',
    });
  };

  // ── render ────────────────────────────────────────────
  if (screen === 'auth' || authStatus === 'anonymous') return <AuthScreen />;

  const minimizedCallUI =
    callData && overlayOpen && minimized
      ? callData.mode === 'video' ? <FloatingCallPiP /> : <ActiveCallBar />
      : null;

  return (
    <>
      {minimizedCallUI}
      <div style={{ display: 'flex', height: '100dvh', background: 'var(--bg)', overflow: 'hidden' }}>
        {!isMob && (
          <Sidebar
            onNewChat={() => openPanel('newChat')}
            onNewGroup={() => openPanel('newGroup')}
            onProfile={() => openPanel('profile')}
            onSettings={() => openPanel('settings')}
            onOpenChat={(cid) => {
              setActiveCid(cid);
              setSidebarOpen(false);
              if (globalAiActive) setAiPanelOpen(true);
            }}
          />
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', minWidth: 0 }}>
          {activeCid && activeConv ? (
            <>
              <ChatHeader conv={activeConv} onBack={() => { setActiveCid(null); setSidebarOpen(true); }} onStartCall={openCall} onToggleAI={toggleAiPanel} />
              <ChatArea key={activeCid} cid={activeCid} conv={activeConv} />
            </>
          ) : isMob ? (
            <div style={{ flex: 1, height: '100%', width: '100%' }}>
              <Sidebar
                onNewChat={() => openPanel('newChat')}
                onNewGroup={() => openPanel('newGroup')}
                onProfile={() => openPanel('profile')}
                onSettings={() => openPanel('settings')}
                onOpenChat={(cid) => setActiveCid(cid)}
              />
            </div>
          ) : (
            <EmptyState onNewChat={() => openPanel('newChat')} onNewGroup={() => openPanel('newGroup')} loading={convsLoading} error={convsError ?? undefined} onRetry={refetchConvs} />
          )}
        </div>
      </div>

      <SettingsPanel open={panels.settings} onClose={() => closePanel('settings')} onSignOut={signOut} />
      <ProfilePanel open={panels.profile} onClose={() => closePanel('profile')} />
      <NewChatPanel open={panels.newChat} onClose={() => closePanel('newChat')} onStart={doNewChat} />
      <NewGroupPanel open={panels.newGroup} onClose={() => closePanel('newGroup')} onCreate={doNewGroup} />
      <BookmarksPanel open={panels.bookmarks} onClose={() => closePanel('bookmarks')} bookmarks={[]} />
      <FloatingCallWindow />
      <Lightbox />
      <StoryViewer />
      <Toast />
    </>
  );
}