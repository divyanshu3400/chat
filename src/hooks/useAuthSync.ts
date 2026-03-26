// src/hooks/useAuthSync.ts
import { useEffect } from 'react';
import { createChatService } from '@/src/services/pb-chat.service';
import { pb } from '@/src/lib/pb';
import { useStore } from '@/src/store/store';
import { useAuthStore } from '@/src/store/auth.store';
import { useScreen, useAiUI, usePanels } from '@/src/lib/ui';

const chatService = createChatService(pb);

export function useAuthSync() {
    const authInitialized = useAuthStore((s) => s.initialized);
    const authStatus = useAuthStore((s) => s.status);
    const authUser = useAuthStore((s) => s.user);

    const { setScreen } = useScreen();
    const { setAiPanelOpen } = useAiUI();
    const { closeAllPanels } = usePanels();

    useEffect(() => {
        if (!authInitialized) return;

        if (authStatus === 'authenticated' && authUser) {
            // ✅ Load the full user record into the store
            chatService.services.users
                .getById(authUser.id)
                .then((user) => useStore.getState().setMe(user))
                .catch(() => {
                    // Fallback: use the auth user shape directly
                    useStore.getState().setMe({
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
            return;
        }

        // Logged out — clear everything
        useStore.getState().setMe(null);
        useStore.getState().setActiveCid(null);
        setScreen('auth');
        setAiPanelOpen(false);
        closeAllPanels();
    }, [authInitialized, authStatus, authUser?.id]);
}