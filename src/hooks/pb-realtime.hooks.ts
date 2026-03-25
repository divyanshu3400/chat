'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';

import type { FullListParams } from '@/src/types/pb-service.types';
import { PocketBaseCollectionService } from '@/src/services/pb-base.service';
import { CollectionRecordMap } from '../types/pb-collections.types';
import { RealtimeCollectionStore, RealtimeRecordStore } from '../store/pb-realtime.store';

export function useRealtimeCollection<
  // 1. Force TCollection to be a valid key of the map
  TCollection extends keyof CollectionRecordMap,
  // 2. Now the index access TCollection is safe
  TRecord extends CollectionRecordMap[TCollection] = CollectionRecordMap[TCollection],
>(
  service: PocketBaseCollectionService<TCollection, TRecord>,
  params: FullListParams = {},
) {
  const storeRef = useRef<RealtimeCollectionStore<TCollection, TRecord> | null>(null);

  if (!storeRef.current) {
    storeRef.current = new RealtimeCollectionStore(service);
  }
  if (!storeRef.current) {
    storeRef.current = new RealtimeCollectionStore(service);
  }

  useEffect(() => {
    const store = storeRef.current!;
    void store.start(params);

    return () => {
      store.stop();
    };
  }, [service, JSON.stringify(params)]);

  return useSyncExternalStore(
    storeRef.current.subscribe,
    () => storeRef.current!.getSnapshot(),
    () => storeRef.current!.getSnapshot(),
  );
}

export function useRealtimeRecord<
  // 1. Constrain to the actual keys of your map
  TCollection extends keyof CollectionRecordMap,
  // 2. Now indexing is safe and typed correctly
  TRecord extends CollectionRecordMap[TCollection] = CollectionRecordMap[TCollection],
>(
  service: PocketBaseCollectionService<TCollection, TRecord>,
  id: string | null,
) {
  const storeRef = useRef<RealtimeRecordStore<TCollection, TRecord> | null>(null);

  if (!storeRef.current) {
    storeRef.current = new RealtimeRecordStore(service);
  }

  useEffect(() => {
    const store = storeRef.current!;

    if (!id) {
      store.stop();
      return;
    }

    void store.start(id);

    return () => {
      store.stop();
    };
  }, [service, id]);

  return useSyncExternalStore(
    storeRef.current.subscribe,
    () => storeRef.current!.getSnapshot(),
    () => storeRef.current!.getSnapshot(),
  );
}
