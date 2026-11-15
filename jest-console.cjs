/* oxlint-disable no-console */
// Mantine lib harness: any console.error / console.warn during a test fails it, as in Mantine's own
// jsdom.mocks.ts. Fix the cause (state updates outside act(), invalid props, React warnings) instead
// of mocking the console. Shared verbatim by every Mantine lib: add it to jest setupFilesAfterEnv
// after the repo's own jsdom mocks, and add ignored fragments here only for third-party noise.
const { format } = require('node:util');

const unexpectedConsoleCalls = [];

function recordConsoleCall(level, data) {
  let testName = '';
  try {
    testName = expect.getState().currentTestName || '';
  } catch {
    testName = '';
  }
  const origin = testName ? ` (emitted while running "${testName}")` : '';
  unexpectedConsoleCalls.push(`console.${level}${origin}: ${format(...data)}`);
}

function failOnUnexpectedConsoleCalls() {
  if (unexpectedConsoleCalls.length === 0) {
    return;
  }

  const calls = unexpectedConsoleCalls.splice(0);
  throw new Error(
    `Test emitted ${calls.length} unexpected console call(s):\n\n${calls.join('\n\n')}`
  );
}

function isIgnoredConsoleCall(data, fragment) {
  return typeof data[0]?.toString === 'function' && data[0].toString().includes(fragment);
}

const originalConsoleError = console.error;
console.error = (...data) => {
  if (isIgnoredConsoleCall(data, 'Error: Could not parse CSS stylesheet')) {
    return;
  }
  recordConsoleCall('error', data);
  originalConsoleError(...data);
};

const originalConsoleWarn = console.warn;
console.warn = (...data) => {
  recordConsoleCall('warn', data);
  originalConsoleWarn(...data);
};

// Any console.error/console.warn emitted during a test fails it. Fix the cause (state updates
// outside act(), invalid props, React warnings) instead of mocking the console. A warning that
// fires between tests is reported on the next test or, after the last test, on the suite.
afterEach(failOnUnexpectedConsoleCalls);
afterAll(failOnUnexpectedConsoleCalls);
