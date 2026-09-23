import assert from 'node:assert/strict';
import test from 'node:test';
import { isForeignKeyViolation, titleCase } from '../src/server/bulkProductHelpers.ts';

test('titleCase turns a slug id into a display name', () => {
  assert.equal(titleCase('deep-groove'), 'Deep Groove');
  assert.equal(titleCase('rolling-bearings'), 'Rolling Bearings');
  assert.equal(titleCase('single'), 'Single');
});

test('isForeignKeyViolation recognizes Postgres FK error code 23503', () => {
  assert.equal(isForeignKeyViolation({ code: '23503' }), true);
});

test('isForeignKeyViolation rejects other errors', () => {
  assert.equal(isForeignKeyViolation({ code: '23505' }), false);
  assert.equal(isForeignKeyViolation(new Error('boom')), false);
  assert.equal(isForeignKeyViolation(null), false);
  assert.equal(isForeignKeyViolation('not an object'), false);
});
