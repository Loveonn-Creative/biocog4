import { describe, expect, test } from 'bun:test';
import { matchVoiceCommand, voiceCommands } from '../src/lib/voiceCommands';

describe('voice navigation commands', () => {
  test.each([
    ['sign out', 'signout'], ['Sign out.', 'signout'], ['logout', 'signout'], ['log out please', 'signout'],
    ['go to dashboard', '/dashboard'], ['Open settings', '/settings'], ['show my emissions', '/dashboard'],
    ['upload invoice', '/'], ['log in', '/auth'], ['check plans', '/pricing'], ['generate report', '/reports'],
  ])('"%s" is a command', (said, want) => {
    const c = matchVoiceCommand(said);
    expect(c).not.toBeNull();
    expect(c!.action === 'signout' ? 'signout' : c!.route).toBe(want);
  });
  test.each([
    'How do I sign out of my account?',
    'what happens to my data when I log out',
    'should I upgrade to Pro',
    'how do carbon credits work',
    'can I log in with my phone number',
    'what is the support for solar in India',
    'show my emissions for March by supplier and explain the change',
    'is mrv the same as verification',
  ])('"%s" is a question, not a command', (said) => {
    expect(matchVoiceCommand(said)).toBeNull();
  });
  test('every pattern is anchored to the whole utterance', () => {
    for (const c of voiceCommands) for (const p of c.patterns) {
      expect(p.source.startsWith('^')).toBe(true);
      expect(p.source.endsWith('$')).toBe(true);
    }
  });
});
