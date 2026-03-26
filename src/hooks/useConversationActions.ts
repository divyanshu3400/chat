// src/hooks/useConversationActions.ts
import { useCallback, useMemo } from 'react';
import { createChatService } from '@/src/services/pb-chat.service';
import { pb } from '@/src/lib/pb';
import { useStore } from '@/src/store/store';

export function useConversationActions() {
    const chatService = useMemo(() => createChatService(pb), []);
    const setActiveCid = useCallback((v: string) => useStore.getState().setActiveCid(v), []);
    const showToast = useCallback((m: string) => useStore.getState().showToast(m), []);

    const doNewChat = useCallback(async (email: string) => {
        const { me } = useStore.getState();
        if (!me || !email.trim()) return;
        if (email.toLowerCase() === me.email.toLowerCase()) {
            showToast("That's your own email!"); return;
        }
        try {
            const found = await chatService.services.users
                .getFullList({ filter: `email = "${email.trim().toLowerCase()}"`, batch: 1 })
                .then((r) => r[0] ?? null);
            if (!found) { showToast('User not found — they must sign in first'); return; }
            const bundle = await chatService.createDirectConversation({
                currentUserId: me.id, otherUserId: found.id,
                createdBy: me.id, name: found.name ?? 'Direct chat',
            });
            setActiveCid(bundle.conversation.id);
            showToast('Chat started!');
        } catch (e: any) { showToast(e?.message ?? 'Failed to start chat'); }
    }, [chatService]);

    const doNewGroup = useCallback(async (name: string, emails: string[]) => {
        const { me } = useStore.getState();
        if (!me || !name.trim() || !emails.length) return;
        try {
            const memberIds = [me.id];
            for (const email of emails) {
                const found = await chatService.services.users
                    .getFullList({ filter: `email = "${email.toLowerCase()}"`, batch: 1 })
                    .then((r) => r[0] ?? null);
                if (found) memberIds.push(found.id);
            }
            const bundle = await chatService.createGroupConversation({
                createdBy: me.id, name: name.trim(), memberIds,
            });
            setActiveCid(bundle.conversation.id);
            showToast(`Group "${name}" created!`);
        } catch (e: any) { showToast(e?.message ?? 'Failed to create group'); }
    }, [chatService]);

    return { doNewChat, doNewGroup };
}