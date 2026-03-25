import type PocketBase from 'pocketbase';

import type {
  CreateInput,
  FullListParams,
  ListParams,
  PaginatedResult,
  RealtimeEvent,
  SearchParams,
  UpdateInput,
  ViewParams,
} from '@/src/types/pb-service.types';
import { CollectionRecordMap } from '../types/pb-collections.types';

type SearchMode = NonNullable<SearchParams['mode']>;

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildSearchClause(
  fields: string[],
  term: string,
  mode: SearchMode,
): string {
  const safeTerm = escapeFilterValue(term.trim());

  if (!safeTerm || fields.length === 0) {
    return '';
  }

  const operator = mode === 'exact' ? '=' : '~';
  const normalizedTerm = mode === 'startsWith' ? `${safeTerm}%` : safeTerm;

  return fields.map((field) => `${field} ${operator} "${normalizedTerm}"`).join(' || ');
}
export class PocketBaseCollectionService<
  TCollection extends keyof CollectionRecordMap,
  TRecord extends CollectionRecordMap[TCollection] = CollectionRecordMap[TCollection],
> {
  constructor(
    private readonly client: PocketBase,
    public readonly collectionName: TCollection,
  ) { }

  private collection() {
    return this.client.collection(this.collectionName);
  }

  async list(params: ListParams = {}): Promise<PaginatedResult<TRecord>> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 30;
    const result = await this.collection().getList<TRecord>(page, perPage, params);

    return {
      items: result.items,
      page: result.page,
      perPage: result.perPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  }

  async getFullList(params: FullListParams = {}): Promise<TRecord[]> {
    return this.collection().getFullList<TRecord>(params);
  }

  async search(
    fields: string[],
    term: string,
    params: SearchParams = {},
  ): Promise<PaginatedResult<TRecord>> {
    const mode = params.mode ?? 'contains';
    const searchClause = buildSearchClause(fields, term, mode);
    const filter = [params.filter, searchClause].filter(Boolean).join(' && ');

    return this.list({
      ...params,
      filter: filter || undefined,
    });
  }

  async getById(id: string, params: ViewParams = {}): Promise<TRecord> {
    return this.collection().getOne<TRecord>(id, params);
  }

  async create(data: CreateInput<TRecord>, params: ViewParams = {}): Promise<TRecord> {
    return this.collection().create<TRecord>(data, params);
  }

  async update(
    id: string,
    data: UpdateInput<TRecord>,
    params: ViewParams = {},
  ): Promise<TRecord> {
    return this.collection().update<TRecord>(id, data, params);
  }

  async delete(id: string): Promise<boolean> {
    return this.collection().delete(id);
  }

  async subscribe(
    callback: (event: RealtimeEvent<TRecord>) => void,
    options?: { filter?: string; expand?: string; fields?: string },
  ): Promise<() => void> {
    await this.collection().subscribe<TRecord>(
      '*',
      (event) => {
        callback({
          action: event.action as RealtimeEvent<TRecord>['action'],
          record: event.record as TRecord,
        });
      },
      options,
    );

    return () => {
      this.collection().unsubscribe('*');
    };
  }

  async subscribeById(
    id: string,
    callback: (event: RealtimeEvent<TRecord>) => void,
    options?: { expand?: string; fields?: string },
  ): Promise<() => void> {
    await this.collection().subscribe<TRecord>(
      id,
      (event) => {
        callback({
          action: event.action as RealtimeEvent<TRecord>['action'],
          record: event.record as TRecord,
        });
      },
      options,
    );

    return () => {
      this.collection().unsubscribe(id);
    };
  }

  unsubscribeAll(): void {
    this.collection().unsubscribe();
  }
}

export function createCollectionServiceMap(client: PocketBase) {
  return {
    '_superusers': new PocketBaseCollectionService(client, '_superusers'),
    users: new PocketBaseCollectionService(client, 'users'),
    _authOrigins: new PocketBaseCollectionService(client, '_authOrigins'),
    _externalAuths: new PocketBaseCollectionService(client, '_externalAuths'),
    _mfas: new PocketBaseCollectionService(client, '_mfas'),
    _otps: new PocketBaseCollectionService(client, '_otps'),
    attachments: new PocketBaseCollectionService(client, 'attachments'),
    blocked_users: new PocketBaseCollectionService(client, 'blocked_users'),
    call_logs: new PocketBaseCollectionService(client, 'call_logs'),
    conversation_members: new PocketBaseCollectionService(client, 'conversation_members'),
    conversation_roles: new PocketBaseCollectionService(client, 'conversation_roles'),
    conversation_settings: new PocketBaseCollectionService(client, 'conversation_settings'),
    conversations: new PocketBaseCollectionService(client, 'conversations'),
    message_edits: new PocketBaseCollectionService(client, 'message_edits'),
    message_reactions: new PocketBaseCollectionService(client, 'message_reactions'),
    messages: new PocketBaseCollectionService(client, 'messages'),
    poll_votes: new PocketBaseCollectionService(client, 'poll_votes'),
    polls: new PocketBaseCollectionService(client, 'polls'),
    presence: new PocketBaseCollectionService(client, 'presence'),
    pubkeys: new PocketBaseCollectionService(client, 'pubkeys'),
    push_tokens: new PocketBaseCollectionService(client, 'push_tokens'),
    read_receipts: new PocketBaseCollectionService(client, 'read_receipts'),
    stories: new PocketBaseCollectionService(client, 'stories'),
    typing: new PocketBaseCollectionService(client, 'typing'),
    story_settings: new PocketBaseCollectionService(client, 'story_settings'),
    story_close_friends: new PocketBaseCollectionService(client, 'story_close_friends'),
    story_allowed_viewers: new PocketBaseCollectionService(client, 'story_allowed_viewers'),
    story_hidden_users: new PocketBaseCollectionService(client, 'story_hidden_users'),
    story_views: new PocketBaseCollectionService(client, 'story_views'),
    story_reactions: new PocketBaseCollectionService(client, 'story_reactions'),
    story_replies: new PocketBaseCollectionService(client, 'story_replies'),
  } as const;
}
