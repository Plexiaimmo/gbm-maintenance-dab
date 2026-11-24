import { expect, test } from 'vitest';
import { normaliserSN } from './sn';
test('SN normalisé', () => {
  expect(normaliserSN(' ab 12 ')).toBe('AB12');
  expect(normaliserSN('')).toBeNull();
  expect(normaliserSN('   ')).toBeNull();
});
