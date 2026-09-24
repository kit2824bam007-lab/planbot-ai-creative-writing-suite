const { buildSystemPrompt, buildActionPrompt } = require('../src/config/prompts');

describe('Prompt Engine & Action Rebuilder', () => {
  test('Classical Tamil form (வெண்பா) enforces Tamil script and Venpa rules', () => {
    const prompt = buildSystemPrompt({
      mode: 'poem',
      language: 'ta',
      poemType: 'வெண்பா'
    });
    expect(prompt).toContain('வெண்பா (Venpa)');
    expect(prompt).toContain('4 அடிகள்');
    expect(prompt).toContain('தளை');
    expect(prompt).toContain('ZERO PREAMBLE');
  });

  test('Story mode includes narrative prose rules and forbidden verse negative constraint', () => {
    const prompt = buildSystemPrompt({
      mode: 'story',
      genre: 'Drama',
      language: 'ta'
    });
    expect(prompt).toContain('FORBIDDEN: verse, rhyming lines, stanzas');
    expect(prompt).toContain('dialogue');
  });

  test('Content creator mode short quote enforces <= 20 words rule', () => {
    const prompt = buildSystemPrompt({
      mode: 'creator',
      format: 'Short Quote',
      language: 'en'
    });
    expect(prompt).toContain('Maximum 20 words total');
  });

  test('buildActionPrompt for "longer" preserves language, context keywords and requests ~double length', () => {
    const actionPrompt = buildActionPrompt('longer', {
      originalPrompt: 'sunset by the ocean',
      previousContent: 'The sun dips low\nThe waters glow',
      metadata: { language: 'ta', mode: 'poem', poemType: 'Free Verse' }
    });

    expect(actionPrompt).toContain('CONTEXT — DO NOT CHANGE:');
    expect(actionPrompt).toContain('sunset by the ocean');
    expect(actionPrompt).toContain('ACTION: LONGER & EXPANDED');
    expect(actionPrompt).toContain('DOUBLE (~200%)');
  });

  test('buildActionPrompt for "simpler" preserves context and requests simpler vocabulary', () => {
    const actionPrompt = buildActionPrompt('simpler', {
      originalPrompt: 'motherly love',
      previousContent: 'A matriarch of boundless grace',
      metadata: { language: 'en', mode: 'poem' }
    });

    expect(actionPrompt).toContain('ACTION: SIMPLER WORDS & DICTION');
    expect(actionPrompt).toContain('motherly love');
  });
});
