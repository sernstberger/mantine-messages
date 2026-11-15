import * as assistant from './assistant';

describe('mantine-messages/assistant', () => {
  it('exports AssistantThread and getAssistantText', () => {
    expect(Object.keys(assistant).sort()).toEqual(['AssistantThread', 'getAssistantText']);
    expect(Object.values(assistant).every((value) => value !== undefined)).toBe(true);
  });
});
