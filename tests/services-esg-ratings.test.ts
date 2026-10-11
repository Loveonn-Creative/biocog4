import { describe, expect, test } from 'bun:test';
import { ALL_QUESTIONS, THEMES, headline, isThemeAnswered, readiness, summary, themeScore, type Answers } from '../src/components/services/esg-ratings/logic';

const all = (a: 'yes' | 'partly' | 'no'): Answers => Object.fromEntries(ALL_QUESTIONS.map(q => [q.id, a]));

describe('EcoVadis readiness self-check', () => {
  test('four themes, 2 to 3 questions each', () => {
    expect(THEMES.map(t => t.key)).toEqual(['environment', 'labour', 'ethics', 'procurement']);
    for (const t of THEMES) { expect(t.questions.length).toBeGreaterThanOrEqual(2); expect(t.questions.length).toBeLessThanOrEqual(3); }
  });
  test('yes 1, partly 0.5, no 0 per theme', () => {
    const env = THEMES[0];
    expect(themeScore(env, { env_policy: 'yes', env_s12: 'partly', env_actions: 'no' })).toBeCloseTo(0.5);
    expect(themeScore(env, {})).toBe(0);
    expect(isThemeAnswered(env, { env_policy: 'yes', env_s12: 'no' })).toBe(false);
  });
  test('overall is the equal-weight mean of themes; weakest theme named', () => {
    const a: Answers = { ...all('yes'), eth_abc: 'no', eth_data: 'partly' };
    const r = readiness(a);
    expect(r.themes.find(t => t.key === 'ethics')!.score).toBeCloseTo(0.25);
    expect(r.overall).toBeCloseTo((1 + 1 + 0.25 + 1) / 4);
    expect(r.weakest.key).toBe('ethics');
    expect(r.missing).toEqual(['Anti-bribery and corruption policy', 'Information security or data protection policy']);
    expect(headline(r)).toBe('Readiness 81%. Weakest theme: ethics. Our self-check, not an EcoVadis score.');
  });
  test('extremes and disclaimer only in headline', () => {
    expect(readiness(all('yes')).overall).toBe(1);
    expect(readiness(all('yes')).missing).toEqual([]);
    expect(readiness(all('no')).overall).toBe(0);
    expect(readiness(all('partly')).overall).toBeCloseTo(0.5);
    const s = summary(readiness(all('no')));
    expect(s).not.toContain('EcoVadis score');
    expect(s).toContain('Top documents to prepare');
  });
});
