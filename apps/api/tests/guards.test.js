const { validateGuards } = require('../src/services/guards');

describe('Output Validation Guards & Quality Enforcement', () => {
  test('Flags MODE_MISMATCH when story output is formatted like short rhyming poem lines', () => {
    const poemLines = `Roses are red,\nViolets are blue,\nSugar is sweet,\nAnd so are you.`;
    const result = validateGuards(poemLines, { mode: 'story', language: 'en' });
    expect(result.valid).toBe(false);
    expect(result.code).toBe('MODE_MISMATCH');
    expect(result.retryPrompt).toContain('[RETRY RULE - MODE MISMATCH]');
  });

  test('Flags LANGUAGE_MISMATCH when Tamil output lacks Tamil Unicode characters', () => {
    const englishOutput = `This is supposed to be Tamil, but it is written in English only.`;
    const result = validateGuards(englishOutput, { mode: 'poem', language: 'ta' });
    expect(result.valid).toBe(false);
    expect(result.code).toBe('LANGUAGE_MISMATCH');
  });

  test('Flags ROMANIZED_LEAK when romanized input results in leaked Latin words in native text', () => {
    const leakedOutput = `வானத்தில் நிலவு beautiful shining sparkles நட்சத்திரம்`;
    const result = validateGuards(leakedOutput, {
      mode: 'poem',
      language: 'ta',
      romanizedInput: true
    });
    expect(result.valid).toBe(false);
    expect(result.code).toBe('ROMANIZED_LEAK');
    expect(result.retryPrompt).toContain('[RETRY RULE - ROMANIZED LEAK]');
  });

  test('Flags FORM_RETRY when Venpa has fewer than 4 lines', () => {
    const shortVenpa = `வானத்து வெண்மதியைக் கண்டுமகிழ் நெஞ்சமே\nகானத்து வேய்ங்குழலின் இன்னிசையும்`;
    const result = validateGuards(shortVenpa, {
      mode: 'poem',
      language: 'ta',
      poemType: 'வெண்பா'
    });
    expect(result.valid).toBe(false);
    expect(result.code).toBe('FORM_RETRY');
  });

  test('Passes valid authentic Tamil poem', () => {
    const authenticTamil = `வானத்து வெண்மதியைக் கண்டுமகிழ் நெஞ்சமே\nகானத்து வேய்ங்குழலின் இன்னிசையும் - தானுணர்ந்து\nபாடலின்பம் பொங்கப் பரவசமாய் நின்றாட\nநாளுமெழும் தூயநல் லன்பு!`;
    const result = validateGuards(authenticTamil, {
      mode: 'poem',
      language: 'ta',
      poemType: 'வெண்பா'
    });
    expect(result.valid).toBe(true);
  });
});
