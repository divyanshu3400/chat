import { CollectionRecordMap, RecordId } from "../types/pb-collections.types";

export type CollectionName = keyof CollectionRecordMap;

export type SystemFieldKeys =
  | 'id'
  | 'collectionId'
  | 'collectionName'
  | 'created'
  | 'updated';

export type CreateInput<TRecord> = Omit<TRecord, SystemFieldKeys>;
export type UpdateInput<TRecord> = Partial<CreateInput<TRecord>>;

export interface ListParams {
  page?: number;
  perPage?: number;
  sort?: string;
  filter?: string;
  expand?: string;
  fields?: string;
  skipTotal?: boolean;
  requestKey?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface FullListParams {
  sort?: string;
  filter?: string;
  expand?: string;
  fields?: string;
  batch?: number;
  requestKey?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface SearchParams extends Omit<ListParams, 'filter'> {
  mode?: 'contains' | 'startsWith' | 'exact';
  filter?: string;
}

export interface ViewParams {
  expand?: string;
  fields?: string;
  requestKey?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginatedResult<TRecord> {
  items: TRecord[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

export type RealtimeAction = 'create' | 'update' | 'delete';

export interface RealtimeEvent<TRecord> {
  action: RealtimeAction;
  record: TRecord;
}

export interface CollectionStoreState<TRecord> {
  items: TRecord[];
  isLoading: boolean;
  error: Error | null;
}

export interface RecordStoreState<TRecord> {
  item: TRecord | null;
  isLoading: boolean;
  error: Error | null;
}

export interface RealtimeStoreOptions<TRecord> {
  onEvent?: (event: RealtimeEvent<TRecord>) => void;
}

export type RecordIdentity<TRecord> = TRecord & { id: RecordId };
