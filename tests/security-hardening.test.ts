import { describe, expect, test } from 'bun:test';
import { ownedSourcePath } from '../supabase/functions/_shared/sourceFileAccess';
import { platformIp } from '../supabase/functions/_shared/platformIp';

const uid = '11111111-2222-4333-8444-555555555555';
const other = '99999999-2222-4333-8444-555555555555';
const hash = 'a'.repeat(64);

describe('ownedSourcePath', () => {
  test('the path extract-document writes for this document is allowed', () => {
    expect(ownedSourcePath({ user_id: uid, document_hash: hash, file_url: `${uid}/${hash}.pdf` })).toBe(`${uid}/${hash}.pdf`);
  });
  test("a path in another user's folder is refused", () => {
    expect(ownedSourcePath({ user_id: uid, document_hash: hash, file_url: `${other}/${hash}.pdf` })).toBeNull();
  });
  test('a different file in the same folder is refused', () => {
    expect(ownedSourcePath({ user_id: uid, document_hash: hash, file_url: `${uid}/${'b'.repeat(64)}.pdf` })).toBeNull();
  });
  test('legacy or odd paths are refused', () => {
    expect(ownedSourcePath({ user_id: uid, document_hash: hash, file_url: 'guest/x.pdf' })).toBeNull();
    expect(ownedSourcePath({ user_id: uid, document_hash: hash, file_url: `${uid}/../${other}/${hash}.pdf` })).toBeNull();
    expect(ownedSourcePath({ user_id: null, document_hash: hash, file_url: `${uid}/${hash}.pdf` })).toBeNull();
  });
});

describe('platformIp', () => {
  test('prefers the address Cloudflare saw over client-set forwarding headers', () => {
    expect(platformIp(new Headers({ 'cf-connecting-ip': '1.1.1.1', 'x-forwarded-for': '6.6.6.6, 2.2.2.2' }))).toBe('1.1.1.1');
    expect(platformIp(new Headers({ 'x-forwarded-for': '6.6.6.6, 2.2.2.2' }))).toBe('2.2.2.2');
    expect(platformIp(new Headers())).toBe('unknown');
  });
});
