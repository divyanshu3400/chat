import type { PocketBaseClient } from './pb-client';
import { createCollectionServiceMap } from './pb-base.service';

export type PocketBaseServiceRegistry = ReturnType<typeof createCollectionServiceMap>;

export function createPocketBaseServices(client: PocketBaseClient): PocketBaseServiceRegistry {
  return createCollectionServiceMap(client);
}
