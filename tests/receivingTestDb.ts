import { BaseDB } from '@common/db/storage/baseDb';
import { receivingCache } from '../src/db/receivingDatabase';
export class ReceivingDB extends BaseDB {
  constructor(scope: string) { super(receivingCache.name(scope), receivingCache.schema, receivingCache.version); }
}
