// src/hooks/useSignOut.ts
import { useCallback } from 'react';
import { createChatService } from '@/src/services/pb-chat.service';
import { pb } from '@/src/lib/pb';
import { useStore } from '@/src/store/store';
import { useAuthStore } from '@/src/store/auth.store';

const chatService = createChatService(pb);

export function useSignOut() {
  const logout = useAuthStore((s) => s.logout);

  return useCallback(async () => {
    const { me } = useStore.getState();
    if (me?.id) {
      await chatService
        .setPresence({ userId: me.id, online: false, lastSeen: new Date().toISOString() })
        .catch(() => undefined);
    }
    logout();
  }, [logout]);
}