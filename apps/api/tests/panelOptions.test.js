const {
  LANGUAGES,
  GENRES,
  TONES,
  POEM_TYPES,
  LENGTHS,
  STORY_LENGTHS,
  PLATFORMS,
  STYLES,
  FORMATS,
  TAMIL_CLASSICAL_FORMS
} = require('../../web/lib/panelOptions.js');

describe('Panel Options Central Configuration (lib/panelOptions.js)', () => {
  test('LANGUAGES has exactly 2 options (English and Tamil)', () => {
    expect(LANGUAGES).toHaveLength(2);
    expect(LANGUAGES.map((l) => l.value)).toEqual(['en', 'ta']);
    expect(LANGUAGES.find((l) => l.value === 'en')?.label).toBe('English');
    expect(LANGUAGES.find((l) => l.value === 'ta')?.label).toContain('தமிழ்');
  });

  test('All option groups have valid non-empty value and label for every entry', () => {
    const allGroups = [
      { name: 'GENRES', list: GENRES },
      { name: 'TONES', list: TONES },
      { name: 'POEM_TYPES', list: POEM_TYPES },
      { name: 'LENGTHS', list: LENGTHS },
      { name: 'STORY_LENGTHS', list: STORY_LENGTHS },
      { name: 'PLATFORMS', list: PLATFORMS },
      { name: 'STYLES', list: STYLES },
      { name: 'FORMATS', list: FORMATS },
    ];

    allGroups.forEach(({ name, list }) => {
      expect(list.length).toBeGreaterThan(0);
      list.forEach((entry) => {
        expect(entry.value).toBeDefined();
        expect(typeof entry.value).toBe('string');
        expect(entry.value.trim().length).toBeGreaterThan(0);

        expect(entry.label).toBeDefined();
        expect(typeof entry.label).toBe('string');
        expect(entry.label.trim().length).toBeGreaterThan(0);
      });
    });
  });

  test('Every bilingual options array entry has label containing " / " (except native Tamil classical forms)', () => {
    // Check GENRES
    GENRES.forEach((opt) => {
      expect(opt.label).toContain(' / ');
    });

    // Check TONES
    TONES.forEach((opt) => {
      expect(opt.label).toContain(' / ');
    });

    // Check Western POEM_TYPES
    POEM_TYPES.filter((opt) => opt.group === 'Western Poetry').forEach((opt) => {
      expect(opt.label).toContain(' / ');
    });

    // Check Tamil Classical POEM_TYPES display in Tamil script only
    POEM_TYPES.filter((opt) => opt.group === 'Tamil Classical').forEach((opt) => {
      expect(TAMIL_CLASSICAL_FORMS).toContain(opt.value);
    });

    // Check LENGTHS & STORY_LENGTHS
    LENGTHS.forEach((opt) => {
      expect(opt.label).toContain(' / ');
    });
    STORY_LENGTHS.forEach((opt) => {
      expect(opt.label).toContain(' / ');
    });

    // Check PLATFORMS
    PLATFORMS.forEach((opt) => {
      expect(opt.label).toContain(' / ');
    });

    // Check STYLES
    STYLES.forEach((opt) => {
      expect(opt.label).toContain(' / ');
    });

    // Check FORMATS
    FORMATS.forEach((opt) => {
      expect(opt.label).toContain(' / ');
    });
  });
});
