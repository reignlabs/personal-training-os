import { describe, expect, it } from 'vitest';
import { parseAllTables, parseFirstTable, tableAfterHeading, tableToObjects } from '../../src/domain/markdownTable';

const SAMPLE = `
# Heading

Some prose.

| id | name | fam |
|---|---|---|
| EX012 | Goblet Squat | KD |
| EX011 | Kettlebell Deadlift | HD |

More prose between tables.

### Second table

| a | b |
|---|---|
| 1 | 2 |
`;

describe('parseFirstTable', () => {
  it('parses headers and rows', () => {
    const found = parseFirstTable(SAMPLE);
    expect(found).not.toBeNull();
    expect(found!.table.headers).toEqual(['id', 'name', 'fam']);
    expect(found!.table.rows).toEqual([
      ['EX012', 'Goblet Squat', 'KD'],
      ['EX011', 'Kettlebell Deadlift', 'HD'],
    ]);
  });

  it('returns null when there is no table', () => {
    expect(parseFirstTable('just prose, no pipes')).toBeNull();
  });
});

describe('parseAllTables', () => {
  it('finds every table in document order', () => {
    const tables = parseAllTables(SAMPLE);
    expect(tables).toHaveLength(2);
    expect(tables[0].headers).toEqual(['id', 'name', 'fam']);
    expect(tables[1].headers).toEqual(['a', 'b']);
  });
});

describe('tableToObjects', () => {
  it('keys each row by its header', () => {
    const found = parseFirstTable(SAMPLE)!;
    const objs = tableToObjects(found.table);
    expect(objs[0]).toEqual({ id: 'EX012', name: 'Goblet Squat', fam: 'KD' });
  });
});

describe('tableAfterHeading', () => {
  it('finds the table under a matching heading', () => {
    const table = tableAfterHeading(SAMPLE, 'second table');
    expect(table).not.toBeNull();
    expect(table!.headers).toEqual(['a', 'b']);
  });

  it('returns null when the heading does not exist', () => {
    expect(tableAfterHeading(SAMPLE, 'nonexistent heading')).toBeNull();
  });
});
