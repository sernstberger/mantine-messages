import { formatJson, getAssistantText } from './assistant-text';

describe('assistant text', () => {
  it('joins text parts with blank lines and leaves out reasoning and tools', () => {
    expect(
      getAssistantText({
        parts: [
          { type: 'reasoning', text: 'hidden', state: 'done' },
          { type: 'text', text: 'One' },
          { type: 'tool', name: 'search', input: {}, state: 'done' },
          { type: 'text', text: 'Two' },
        ],
      })
    ).toBe('One\n\nTwo');
  });

  it('shows strings as they are and anything else as indented JSON', () => {
    expect(formatJson('plain')).toBe('plain');
    expect(formatJson({ a: [1] })).toBe('{\n  "a": [\n    1\n  ]\n}');
  });
});
