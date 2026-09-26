const { extractContentAnchors, buildStructuredUserPrompt, buildActionPrompt, buildSystemPrompt } = require('../src/config/prompts');
const { validateTopicRelevance, validateGuards } = require('../src/services/guards');

describe('Strict Input Grounding & Context Preservation Engine', () => {
  describe('Anchor Extraction', () => {
    test('extracts location, setting, characters, and events from Pallathur example', () => {
      const prompt = 'pallathur temple boy girl rock competition feel';
      const anchors = extractContentAnchors(prompt);

      expect(anchors.place.toLowerCase()).toBe('pallathur');
      expect(anchors.characters).toEqual(expect.arrayContaining(['boy', 'girl']));
      expect(anchors.event.toLowerCase()).toContain('rock competition');
      expect(anchors.setting.toLowerCase()).toContain('temple');
    });

    test('extracts college farewell friendship anchors', () => {
      const prompt = 'college farewell friendship';
      const anchors = extractContentAnchors(prompt);

      expect(anchors.setting.toLowerCase()).toBe('college');
      expect(anchors.event.toLowerCase()).toBe('farewell');
      expect(anchors.keywords).toEqual(expect.arrayContaining(['college', 'farewell', 'friendship']));
    });

    test('extracts Tamil keywords naturally', () => {
      const prompt = 'பள்ளத்தூர் கோயில் பையன் பெண் பாறை போட்டி';
      const anchors = extractContentAnchors(prompt);

      expect(anchors.keywords.length).toBeGreaterThanOrEqual(4);
      expect(anchors.setting).toContain('கோயில்');
      expect(anchors.characters).toContain('பையன்');
      expect(anchors.event).toContain('போட்டி');
    });
  });

  describe('Structured User Prompt Builder', () => {
    test('includes full JSON context and strict grounding directives', () => {
      const structuredPrompt = buildStructuredUserPrompt({
        prompt: 'pallathur temple boy girl rock competition feel',
        mode: 'story',
        genre: 'Village Life',
        tone: 'emotional',
        language: 'ta',
        length: 'medium'
      });

      expect(structuredPrompt).toContain('[STRUCTURED GENERATION REQUEST]');
      expect(structuredPrompt).toContain('"userInput": "pallathur temple boy girl rock competition feel"');
      expect(structuredPrompt).toContain('"genre": "Village Life"');
      expect(structuredPrompt).toContain('"tone": "emotional"');
      expect(structuredPrompt).toContain('Place/Location: pallathur');
      expect(structuredPrompt).toContain('Characters: boy, girl');
      expect(structuredPrompt).toContain('Main Event/Plot: rock competition');
      expect(structuredPrompt).toContain('WHAT TO WRITE ABOUT: The user\'s actual input is the primary source of the content');
      expect(structuredPrompt).toContain('GENRE ROLE: The selected genre ("Village Life") provides the stylistic framework/backdrop only. It must NEVER override the user\'s specific topic.');
    });
  });

  describe('Topic Relevance Validation (Guard Engine)', () => {
    test('passes when output meaningfully incorporates user anchors', () => {
      const prompt = 'pallathur temple boy girl rock competition feel';
      const output = 'பள்ளத்தூர் கிராமத்து பழமையான கோயில் திடலில் நடைபெற்ற பாறை போட்டியில் அந்த இளைஞனும் பெண்ணும் கலந்து கொண்டனர்.';
      const res = validateTopicRelevance(output, prompt, 'ta');

      expect(res.valid).toBe(true);
    });

    test('flags TOPIC_RELEVANCE_FAILED when output is generic and ignores prompt anchors', () => {
      const prompt = 'pallathur temple boy girl rock competition feel';
      // Old generic village story about Karthik in Palani
      const genericOutput = 'அந்தி மாலையின் செவ்வானம் மெல்லக் கனிந்து கொண்டிருந்தது. பழனி மலையடிவாரத்துத் தென்றல் சில்லென்று வீச, கார்த்திக் மரத்தடியில் அமைதியாக நின்றிருந்தான்.';
      const res = validateTopicRelevance(genericOutput, prompt, 'ta');

      expect(res.valid).toBe(false);
      expect(res.code).toBe('TOPIC_RELEVANCE_FAILED');
      expect(res.retryPrompt).toContain('[RETRY RULE - STRICT INPUT GROUNDING REQUIRED]');
    });

    test('passes English prompt with English grounded story', () => {
      const prompt = 'pallathur temple boy girl rock competition';
      const output = 'At the ancient temple grounds in Pallathur, the boy and girl stood watching the intense rock competition.';
      const res = validateTopicRelevance(output, prompt, 'en');

      expect(res.valid).toBe(true);
    });

    test('flags English generic output that ignores prompt anchors', () => {
      const prompt = 'pallathur temple boy girl rock competition';
      const genericOutput = 'Julian ordered an espresso at the crowded cafe while watching the morning commuters.';
      const res = validateTopicRelevance(genericOutput, prompt, 'en');

      expect(res.valid).toBe(false);
      expect(res.code).toBe('TOPIC_RELEVANCE_FAILED');
    });
  });

  describe('Follow-up Actions Grounding Preservation', () => {
    test('buildActionPrompt preserves original anchors and prevents topic drift', () => {
      const actions = ['more-emotional', 'more-humorous', 'more-creative', 'continue', 'regenerate'];

      for (const act of actions) {
        const prompt = buildActionPrompt(act, {
          originalPrompt: 'pallathur temple boy girl rock competition',
          previousContent: 'Previous scene text...',
          metadata: { language: 'ta', mode: 'story', genre: 'Village Life' }
        });

        expect(prompt).toContain('CONTEXT — DO NOT CHANGE:');
        expect(prompt).toContain('pallathur temple boy girl rock competition');
        expect(prompt).toContain('CRITICAL GROUNDING DIRECTIVE:');
        expect(prompt).toContain('You MUST maintain the EXACT same subject matter, characters, setting, and plot elements');
      }
    });
  });
});
