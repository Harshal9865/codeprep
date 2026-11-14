import { SQL_BATCH_1 } from './sqlBatch1';
import { SQL_BATCH_2 } from './sqlBatch2';
import { SQL_BATCH_3 } from './sqlBatch3';
import { SQL_EXTENDED_300 } from './sqlExtended';
import { SqlProblemDefinition } from './sqlHelper';

export type { SqlProblemDefinition } from './sqlHelper';

export const SQL_100_PROBLEMS: SqlProblemDefinition[] = [
  ...SQL_BATCH_1,
  ...SQL_BATCH_2,
  ...SQL_BATCH_3,
  ...SQL_EXTENDED_300,
];
