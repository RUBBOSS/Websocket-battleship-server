import { generateUUID } from '../src/utils/uuid.js';

describe('UUID Generator', () => {
  test('generates a valid UUID string', () => {
    const uuid = generateUUID();
    expect(typeof uuid).toBe('string');
    expect(uuid.length).toBe(36);
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  test('generates unique UUIDs', () => {
    const uuid1 = generateUUID();
    const uuid2 = generateUUID();
    expect(uuid1).not.toEqual(uuid2);
  });
});
