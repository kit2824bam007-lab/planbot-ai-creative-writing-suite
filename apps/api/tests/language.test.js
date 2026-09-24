const { detectLanguage } = require('../src/services/language');

describe('Simplified Language & Translanguaging Detection Service (ta / en)', () => {
  test('detectLanguage("ஒரு கவிதை") -> ta', () => {
    const result = detectLanguage('ஒரு கவிதை');
    expect(result.language).toBe('ta');
    expect(result.script).toBe('Tamil');
    expect(result.romanizedInput).toBe(false);
  });

  test('detectLanguage("kadhal kavithai") -> ta', () => {
    const result = detectLanguage('kadhal kavithai');
    expect(result.language).toBe('ta');
    expect(result.romanizedInput).toBe(true);
    expect(result.hits).toBeGreaterThanOrEqual(1);
  });

  test('detectLanguage("ek kahani likho") -> en (all non-Tamil maps to en)', () => {
    const result = detectLanguage('ek kahani likho');
    expect(result.language).toBe('en');
    expect(result.romanizedInput).toBe(false);
  });

  test('detects native Tamil script sentences correctly', () => {
    const text = 'வானத்து வெண்மதியைக் கண்டுமகிழ் நெஞ்சமே';
    const result = detectLanguage(text);
    expect(result.language).toBe('ta');
    expect(result.script).toBe('Tamil');
  });

  test('falls back to English when given plain ASCII English', () => {
    const text = 'Write an inspirational poem about autumn leaves falling softly';
    const result = detectLanguage(text);
    expect(result.language).toBe('en');
    expect(result.romanizedInput).toBe(false);
  });

  test('detects complex Tanglish input like "nilavidam solli mudithen unnidam solvadharkku mun" as ta', () => {
    const text = 'nilavidam solli mudithen unnidam solvadharkku mun';
    const result = detectLanguage(text);
    expect(result.language).toBe('ta');
    expect(result.romanizedInput).toBe(true);
  });
});
