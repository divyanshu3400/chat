import PocketBase from 'pocketbase';

export type PocketBaseClient = PocketBase;

export function createPocketBaseClient(baseUrl: string): PocketBaseClient {
  return new PocketBase(baseUrl);
}
