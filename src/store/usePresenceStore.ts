// src/store/presence.store.ts
import { create } from 'zustand';

interface PresenceStore {
    presence: Record<string, any>;
    setPresence: (id: string, value: any) => void;
}

export const usePresenceStore = create<PresenceStore>((set) => ({
    presence: {},
    setPresence: (id, value) =>
        set((s) => ({ presence: { ...s.presence, [id]: value } })),
}));