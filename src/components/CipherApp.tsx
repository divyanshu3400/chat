'use client';

import { useEffect, useCallback, useMemo, useRef } from 'react';

import { useStore } from '@/src/store/store';
import { useScreen, useAiUI, usePanels } from '@/src/lib/ui';
import { loadOrGenKeys } from '@/src/lib/crypto';
import { usePushNotif } from '@/src/hooks/usePushNotif';

import AuthScreen from '@/src/components/AuthScreen';
import Sidebar from '@/src/components/Sidebar';
import ChatHeader from '@/src/components/chat/ChatHeader';
import ChatArea from '@/src/components/chat/ChatArea';
import EmptyState from '@/src/components/chat/EmptyState';

import SettingsPanel from '@/src/components/overlays/SettingsPanel';
import ProfilePanel from '@/src/components/overlays/ProfilePanel';
import { NewChatPanel, NewGroupPanel, BookmarksPanel } from '@/src/components/overlays/Panels';
import { Lightbox, StoryViewer, Toast } from '@/src/components/overlays/Overlays';
import FloatingCallWindow from '@/src/components/overlays/FloatingCallWindow';
import FloatingCallPiP from '@/src/components/overlays/FloatingCallPiP';
import ActiveCallBar from '@/src/components/overlays/ActiveCallBar';
import { AIPanel } from './chat/AIPanel';

import { initFirebase, resolveCfg } from '@/src/lib/firebase';
import { pb, getPbFileUrl, STORAGE_KEYS } from '@/src/lib/pb';
import {
  useCallingStore,
  useOverlayOpen,
  useMinimized,
  useCallData,
  useCallActions,
} from '@/src/hooks/useCallingStore';

import type { ConversationState } from '@/src/store/store';
import { createChatService } from '../services/pb-chat.service';
import { useAuthStore } from '../store/auth.store';

export default function CipherApp() {
  const chatService = useMemo(() => createChatService(pb), []);

  const me = useStore((s) => s.me);
  const activeCid = useStore((s) => s.activeCid);
  const conversations = useStore((s) => s.conversations);
  const convsLoading = useStore((s) => s.convsLoading);
  const convsError = useStore((s) => s.convsError);

  const setMe = useCallback((v: Parameters<ReturnType<typeof useStore.getState>['setMe']>[0]) => useStore.getState().setMe(v), []);
  const setMyKP = useCallback((v: Parameters<ReturnType<typeof useStore.getState>['setMyKP']>[0]) => useStore.getState().setMyKP(v), []);
  const setActiveCid = useCallback((v: Parameters<ReturnType<typeof useStore.getState>['setActiveCid']>[0]) => useStore.getState().setActiveCid(v), []);
  const setStories = useCallback((v: Parameters<ReturnType<typeof useStore.getState>['setStories']>[0]) => useStore.getState().setStories(v), []);
  const setPresence = useCallback((id: string, v: any) => useStore.getState().setPresence(id, v), []);
  const setPrefs = useCallback((v: Parameters<ReturnType<typeof useStore.getState>['setPrefs']>[0]) => useStore.getState().setPrefs(v), []);
  const showToast = useCallback((msg: string) => useStore.getState().showToast(msg), []);
  const setSidebarOpen = useCallback((v: boolean) => useStore.getState().setSidebarOpen(v), []);
  const refetchConvs = useCallback(() => useStore.getState().refetchConvs(), []);

  const { initPush } = usePushNotif();
  const { screen, setScreen } = useScreen();
  const { aiPanelOpen, globalAiActive, toggleAiPanel, setAiPanelOpen, setSmartReply } = useAiUI();
  const { panels, openPanel, closePanel, closeAllPanels } = usePanels();

  const overlayOpen = useOverlayOpen();
  const minimized = useMinimized();
  const callData = useCallData();
  const { openCall: storeOpenCall } = useCallActions();

  // â”€â”€â”€ FIX: Stable auth selector using shallow comparison â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // useAuthStore with a single combined selector prevents multiple
  // subscriptions from firing individually on each auth field change.
  const authInitialized = useAuthStore((s) => s.initialized);
  const authStatus = useAuthStore((s) => s.status);
  const authUser = useAuthStore((s) => s.user);
  const initializeAuth = useAuthStore((s) => s.initialize);
  const logoutAuth = useAuthStore((s) => s.logout);

  const bootedRef = useRef(false);
  const presenceUnsubsRef = useRef<Map<string, () => void>>(new Map());
  const storiesUnsubRef = useRef<(() => void) | null>(null);
  const callUnsubsRef = useRef<Array<() => void>>([]);
  // â”€â”€â”€ FIX: conversations ref stays in sync but is never in a dep array â”€â”€â”€â”€â”€
  const conversationsRef = useRef(conversations);
  const touchX = useRef(0);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const activeConv: ConversationState | null =
    activeCid ? (conversations[activeCid] ?? null) : null;

  useEffect(() => {
    const cfg = resolveCfg();
    if (cfg) {
      initFirebase(cfg);
    }
  }, []); // only on mount

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    return () => {
      presenceUnsubsRef.current.forEach((fn) => fn());
      presenceUnsubsRef.current.clear();
      storiesUnsubRef.current?.();
      storiesUnsubRef.current = null;
      callUnsubsRef.current.forEach((fn) => fn());
      callUnsubsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!authInitialized) return;

    if (authStatus === 'authenticated' && authUser) {
      chatService.services.users.getById(authUser.id).then((user) => {
        setMe(user);
      }).catch(() => {
        setMe({
          id: authUser.id,
          name: authUser.name ?? 'User',
          email: authUser.email ?? '',
          avatar: authUser.avatar ?? '',
          collectionId: authUser.collectionId || '_pb_users_auth_',
          collectionName: 'users',
          created: authUser.created || new Date().toISOString(),
          updated: authUser.updated || new Date().toISOString(),
          username: authUser.username ?? '',
          password: '',
          tokenKey: '',
          emailVisibility: false,
          verified: true,
        });
      });
      setScreen('app');

      void (async () => {
        const kp = (await loadOrGenKeys(authUser.id)) as CryptoKeyPair;
        setMyKP(kp);

        const { Crypto } = await import('@/src/lib/crypto');
        const pubkey = await Crypto.exportPub(kp.publicKey);

        await chatService.services.pubkeys.getFullList({
          filter: `userId = "${authUser.id}"`,
          batch: 1,
        }).then(async (rows) => {
          if (rows[0]?.id) {
            await chatService.services.pubkeys.update(rows[0].id, { userId: authUser.id, pubkey });
          } else {
            await chatService.services.pubkeys.create({ userId: authUser.id, pubkey });
          }
        }).catch(() => undefined);

        await chatService.setPresence({ userId: authUser.id, online: true }).catch(() => undefined);
        await chatService.services.users.update(authUser.id, {
          last_seen: new Date().toISOString(),
        }).catch(() => undefined);
      })();

      const beforeUnload = () => { void setOffline(authUser.id); };
      window.addEventListener('beforeunload', beforeUnload, { once: true });

      watchContactPresence();
      attachStoriesListener();
      attachCallListener(authUser.id);

      return () => {
        window.removeEventListener('beforeunload', beforeUnload);
      };
    }

    // Logged out â€” reset everything
    setMe(null);
    setScreen('auth');
    setActiveCid(null);
    setAiPanelOpen(false);
    closeAllPanels();

    presenceUnsubsRef.current.forEach((fn) => fn());
    presenceUnsubsRef.current.clear();
    storiesUnsubRef.current?.();
    storiesUnsubRef.current = null;
    callUnsubsRef.current.forEach((fn) => fn());
    callUnsubsRef.current = [];

    // â”€â”€â”€ FIX: only 3 deps now instead of 10+ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // authUser.id (not authUser) prevents re-runs when the authUser object
    // reference changes but the actual user hasn't changed.
  }, [authInitialized, authStatus, authUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // â”€â”€â”€ Stable helper functions (useCallback so they never change ref) â”€â”€â”€â”€â”€â”€â”€â”€

  const watchContactPresence = useCallback(() => {
    presenceUnsubsRef.current.get('global')?.();

    chatService
      .subscribePresence((event) => {
        if (event.action === 'create' || event.action === 'update') {
          setPresence(event.record.userId ?? '', event.record);
        }
      })
      .then((unsubscribe) => {
        presenceUnsubsRef.current.set('global', unsubscribe);
      })
      .catch(() => undefined);
  }, [chatService, setPresence]);

  const attachStoriesListener = useCallback(() => {
    storiesUnsubRef.current?.();
    storiesUnsubRef.current = null;

    const since = new Date(Date.now() - 86_400_000).toISOString();

    const reloadStories = () =>
      chatService.services.stories
        .list({ page: 1, perPage: 200, filter: `created >= "${since}"`, sort: '-created' })
        .then((result) => setStories(result.items as any[]))
        .catch(() => undefined);

    void reloadStories();

    chatService.services.stories
      .subscribe(() => { void reloadStories(); })
      .then((unsubscribe) => { storiesUnsubRef.current = unsubscribe; })
      .catch(() => undefined);
  }, [chatService, setStories]);

  const attachCallListener = useCallback((uid: string) => {
    callUnsubsRef.current.forEach((fn) => fn());
    callUnsubsRef.current = [];

    chatService.services.call_logs
      .subscribe((event) => {
        if (event.action !== 'create' && event.action !== 'update') return;
        const call = event.record;

        const callerUid = call.initiator;
        const cid = call.conversation;
        const mode = call.call_type === 'video' ? 'video' : 'audio';
        const participants = call.participants ?? [];

        if (call.status !== 'ringing') return;
        if (!participants.includes(uid)) return;
        if (callerUid === uid) return;

        // â”€â”€â”€ FIX: Read conversations from ref, not from closure â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // If we captured `conversations` from the outer scope, it would be
        // stale after the first render. The ref is always current.
        const conv = Object.values(conversationsRef.current).find(
          (item) => item.otherUser?.id === callerUid,
        );
        const peerUser = conv?.otherUser;

        const makePbUrl = (user: typeof peerUser) =>
          user?.avatar
            ? getPbFileUrl(
              { id: user.id, collectionId: '_pb_users_auth_', collectionName: 'users' },
              user.avatar,
            )
            : '';

        storeOpenCall({
          cid: cid ?? call.id,
          callLogId: call.id,
          isIncoming: true,
          mode,
          peerName: peerUser?.name ?? peerUser?.username ?? peerUser?.email ?? 'Unknown',
          peerPhoto: makePbUrl(peerUser),
          callerName: peerUser?.name ?? peerUser?.username ?? peerUser?.email ?? 'Unknown',
          callerPhoto: makePbUrl(peerUser),
          callerUid: callerUid ?? '',
          calleeUid: uid,
          state: 'Incomingâ€¦',
        });
      })
      .then((unsubscribe) => { callUnsubsRef.current.push(unsubscribe); })
      .catch(() => undefined);
  }, [chatService, storeOpenCall]);

  const setOffline = useCallback(async (uid: string) => {
    try {
      await chatService.setPresence({
        userId: uid,
        online: false,
        lastSeen: new Date().toISOString(),
      });
    } catch {
      // no-op
    }
  }, [chatService]);

  const openCall = useCallback((mode: 'audio' | 'video') => {
    // â”€â”€â”€ FIX: Read me/activeCid from store directly to avoid stale closure â”€â”€
    const { me: currentMe, activeCid: currentCid, conversations: currentConvs } = useStore.getState();
    if (!currentCid || !currentMe) return;
    const conv = currentConvs[currentCid];
    const peerUser = conv?.otherUser;

    storeOpenCall({
      cid: currentCid,
      isIncoming: false,
      mode,
      peerName: peerUser?.name ?? peerUser?.username ?? peerUser?.email ?? 'Unknown',
      peerPhoto: peerUser?.avatar
        ? getPbFileUrl({ id: peerUser.id, collectionId: '_pb_users_auth_', collectionName: 'users' }, peerUser.avatar)
        : '',
      callerUid: currentMe.id,
      calleeUid: peerUser?.id ?? '',
      state: 'Ringingâ€¦',
    });
  }, [storeOpenCall]);

  const signOutUser = useCallback(async () => {
    const { me: currentMe } = useStore.getState();
    if (currentMe?.id) {
      await setOffline(currentMe.id);
    }
    logoutAuth();
  }, [setOffline, logoutAuth]);

  const doNewChat = useCallback(async (email: string) => {
    const { me: currentMe } = useStore.getState();
    if (!currentMe || !email.trim()) return;
    if (email.toLowerCase() === currentMe.email.toLowerCase()) {
      showToast("That's your own email!");
      return;
    }

    try {
      const result = await chatService.services.users
        .getFullList({ filter: `email = "${email.trim().toLowerCase()}"`, batch: 1 })
        .then((rows) => rows[0] ?? null);

      if (!result) {
        showToast('User not found â€” they must sign in first');
        return;
      }

      const bundle = await chatService.createDirectConversation({
        currentUserId: currentMe.id,
        otherUserId: result.id,
        createdBy: currentMe.id,
        name: result.name ?? 'Direct chat',
      });

      setActiveCid(bundle.conversation.id);
      closePanel('newChat');
      showToast('Chat started!');
    } catch (error: any) {
      console.log(error)
      showToast(error?.message ?? 'Failed to start chat');
    }
  }, [chatService, closePanel, setActiveCid, showToast]);

  const doNewGroup = useCallback(async (name: string, emails: string[]) => {
    const { me: currentMe } = useStore.getState();
    if (!currentMe || !name.trim() || emails.length < 1) return;

    try {
      const memberIds = [currentMe.id];

      for (const email of emails) {
        const found = await chatService.services.users
          .getFullList({ filter: `email = "${email.toLowerCase()}"`, batch: 1 })
          .then((rows) => rows[0] ?? null);
        if (found) memberIds.push(found.id);
      }

      const bundle = await chatService.createGroupConversation({
        createdBy: currentMe.id,
        name: name.trim(),
        memberIds,
      });

      setActiveCid(bundle.conversation.id);
      closePanel('newGroup');
      showToast(`Group "${name}" created!`);
    } catch (error: any) {
      showToast(error?.message ?? 'Failed to create group');
    }
  }, [chatService, closePanel, setActiveCid, showToast]);

  // â”€â”€â”€ Touch gesture handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const onTouchStart = (event: TouchEvent) => {
      touchX.current = event.touches[0].clientX;
    };
    const onTouchEnd = (event: TouchEvent) => {
      const dx = event.changedTouches[0].clientX - touchX.current;
      if (touchX.current < 30 && dx > 60) setSidebarOpen(true);
      if (dx < -60) setSidebarOpen(false);
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [setSidebarOpen]);

  // â”€â”€â”€ Load prefs from localStorage once on mount â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    try {
      setPrefs(JSON.parse(localStorage.getItem(STORAGE_KEYS.PREFS) ?? '{}'));
    } catch {
      // no-op
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // â”€â”€â”€ Push notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (me?.id) {
      initPush(me.id);
    }
  }, [initPush, me?.id]);

  // â”€â”€â”€ Service worker message handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    async function onSWMessage(event: MessageEvent) {
      const { type, cid } = event.data ?? {};
      if (type !== 'DECLINE_CALL' || !cid) return;

      try {
        const call = await chatService.services.call_logs
          .getFullList({ filter: `conversation = "${cid}"`, batch: 1 })
          .then((rows) => rows[0] ?? null);

        if (call) {
          await chatService.services.call_logs.update(call.id, { status: 'ended' });
        }
      } catch {
        // no-op
      }

      useCallingStore.getState().endCall();
    }

    navigator.serviceWorker?.addEventListener('message', onSWMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onSWMessage);
  }, [chatService]);

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (screen === 'auth' || authStatus === 'anonymous') {
    return <AuthScreen />;
  }

  const minimizedCallUI =
    callData && overlayOpen && minimized
      ? callData.mode === 'video'
        ? <FloatingCallPiP />
        : <ActiveCallBar />
      : null;

  return (
    <>
      {minimizedCallUI}

      <div
        style={{
          display: 'flex',
          height: '100dvh',
          background: 'var(--bg)',
          overflow: 'hidden',
        }}
      >
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

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
            minWidth: 0,
          }}
        >
          {activeCid && activeConv ? (
            <>
              <ChatHeader
                conv={activeConv}
                onBack={() => setActiveCid(null)}
                onSearch={() => undefined}
                onStartCall={openCall}
                onToggleAI={toggleAiPanel}
              />
              <ChatArea key={activeCid} cid={activeCid} conv={activeConv} />
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

      <SettingsPanel open={panels.settings} onClose={() => closePanel('settings')} onSignOut={signOutUser} />
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

