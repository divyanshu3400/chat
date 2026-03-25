import type {
  CollectionStoreState,
  FullListParams,
  RealtimeStoreOptions,
  RecordStoreState,
} from '@/src/types/pb-service.types';
import { PocketBaseCollectionService } from '@/src/services/pb-base.service';
import { CollectionRecordMap, RecordId } from '../types/pb-collections.types';

function upsertById<TRecord extends { id: RecordId }>(
  items: TRecord[],
  nextItem: TRecord,
): TRecord[] {
  const index = items.findIndex((item) => item.id === nextItem.id);

  if (index === -1) {
    return [nextItem, ...items];
  }

  return items.map((item) => (item.id === nextItem.id ? nextItem : item));
}

function removeById<TRecord extends { id: RecordId }>(
  items: TRecord[],
  id: RecordId,
): TRecord[] {
  return items.filter((item) => item.id !== id);
}

type Listener = () => void;
export class RealtimeCollectionStore<
  TCollection extends keyof CollectionRecordMap,
  TRecord extends CollectionRecordMap[TCollection] = CollectionRecordMap[TCollection],
> {
  private listeners = new Set<Listener>();
  private stopRealtime: (() => void) | null = null;
  private state: CollectionStoreState<TRecord> = {
    items: [],
    isLoading: false,
    error: null,
  };

  constructor(
    private readonly service: PocketBaseCollectionService<TCollection, TRecord>,
    private readonly options: RealtimeStoreOptions<TRecord> = {},
  ) { }
  getSnapshot(): CollectionStoreState<TRecord> {
    return this.state;
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }

  async load(params: FullListParams = {}): Promise<void> {
    this.state = { ...this.state, isLoading: true, error: null };
    this.emit();

    try {
      const items = await this.service.getFullList(params);
      this.state = { items, isLoading: false, error: null };
      this.emit();
    } catch (error) {
      this.state = {
        ...this.state,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to load records'),
      };
      this.emit();
    }
  }

  async start(params: FullListParams = {}): Promise<void> {
    await this.load(params);

    this.stopRealtime = await this.service.subscribe((event) => {
      if (event.action === 'delete') {
        this.state = {
          ...this.state,
          items: removeById(this.state.items as Array<TRecord & { id: RecordId }>, event.record.id),
        };
      } else {
        this.state = {
          ...this.state,
          items: upsertById(this.state.items as Array<TRecord & { id: RecordId }>, event.record),
        };
      }

      this.options.onEvent?.(event);
      this.emit();
    });
  }

  stop(): void {
    this.stopRealtime?.();
    this.stopRealtime = null;
  }
}

export class RealtimeRecordStore<
  // 1. Corrected the typo to 'keyof CollectionRecordMap'
  TCollection extends keyof CollectionRecordMap,
  // 2. TRecord can now safely index the map using TCollection
  TRecord extends CollectionRecordMap[TCollection] = CollectionRecordMap[TCollection],
> {
  private listeners = new Set<Listener>();
  private stopRealtime: (() => void) | null = null;
  private state: RecordStoreState<TRecord> = {
    item: null,
    isLoading: false,
    error: null,
  };

  constructor(private readonly service: PocketBaseCollectionService<TCollection, TRecord>) { }

  getSnapshot(): RecordStoreState<TRecord> {
    return this.state;
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }

  async start(id: string): Promise<void> {
    this.state = { ...this.state, isLoading: true, error: null };
    this.emit();

    try {
      const item = await this.service.getById(id);
      this.state = { item, isLoading: false, error: null };
      this.emit();

      this.stopRealtime = await this.service.subscribeById(id, (event) => {
        this.state = {
          ...this.state,
          item: event.action === 'delete' ? null : event.record,
        };
        this.emit();
      });
    } catch (error) {
      this.state = {
        item: null,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to load record'),
      };
      this.emit();
    }
  }

  stop(): void {
    this.stopRealtime?.();
    this.stopRealtime = null;
  }
}
