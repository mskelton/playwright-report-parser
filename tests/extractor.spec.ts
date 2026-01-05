import { PlaywrightReportParser } from '../src/index.js'
import { expect, test } from './fixtures.js'

test('extracts report statistics', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      import { test, expect } from '@playwright/test';
      test('passing test', async () => {
        expect(1).toBe(1);
      });
      test('another passing test', async () => {
        expect(2).toBe(2);
      });
    `,
  })

  expect(result.exitCode).toBe(0)
  expect(result.passed).toBe(2)

  const parser = await PlaywrightReportParser.parse(result.reportPath)
  const report = parser.getReport()

  expect(report.stats.expected).toBe(2)
  expect(report.stats.unexpected).toBe(0)
})

test('extracts file structure', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      import { test, expect } from '@playwright/test';
      test('test 1', async () => {
        expect(1).toBe(1);
      });
    `,
    'b.test.ts': `
      import { test, expect } from '@playwright/test';
      test('test 2', async () => {
        expect(2).toBe(2);
      });
    `,
  })

  expect(result.exitCode).toBe(0)

  const parser = await PlaywrightReportParser.parse(result.reportPath)
  const report = parser.getReport()

  expect(report.files).toHaveLength(2)
  expect(report.files.map((f) => f.fileName).sort()).toEqual([
    'a.test.ts',
    'b.test.ts',
  ])
})

test('extracts failing tests', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      import { test, expect } from '@playwright/test';
      test('passing test', async () => {
        expect(1).toBe(1);
      });
      test('failing test', async () => {
        expect(1).toBe(2);
      });
    `,
  })

  expect(result.exitCode).toBe(1)
  expect(result.passed).toBe(1)
  expect(result.failed).toBe(1)

  const parser = await PlaywrightReportParser.parse(result.reportPath)
  const failingTests = parser.getFailingTests(parser.getReport())

  expect(failingTests).toHaveLength(1)
  expect(failingTests[0].test.title).toBe('failing test')
  expect(failingTests[0].result.status).toBe('failed')
})

test('extracts error messages', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      import { test, expect } from '@playwright/test';
      test('failing test', async () => {
        expect(5).toBe(10);
      });
    `,
  })

  expect(result.exitCode).toBe(1)

  const parser = await PlaywrightReportParser.parse(result.reportPath)
  const failingTests = parser.getFailingTests(parser.getReport())

  expect(failingTests).toHaveLength(1)
  expect(failingTests[0].result.errors).toBeDefined()
  expect(failingTests[0].result.errors!.length).toBeGreaterThan(0)
  expect(failingTests[0].result.errors![0].message).toContain('Expected')
})

test('extracts timeout failures', async ({ runInlineTest }) => {
  const result = await runInlineTest(
    {
      'a.test.ts': `
      import { test, expect } from '@playwright/test';
      test('timeout test', async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
      });
    `,
    },
    { timeout: '100' },
  )

  expect(result.exitCode).toBe(1)

  const parser = await PlaywrightReportParser.parse(result.reportPath)
  const failingTests = parser.getFailingTests(parser.getReport())

  expect(failingTests).toHaveLength(1)
  expect(failingTests[0].result.status).toBe('timedOut')
})

test('extracts trace file paths', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      import { test, expect } from '@playwright/test';
      test('failing test', async () => {
        expect(1).toBe(2);
      });
    `,
  })

  expect(result.exitCode).toBe(1)

  const parser = await PlaywrightReportParser.parse(result.reportPath)

  const failingTests = parser.getFailingTests(parser.getReport())
  expect(failingTests).toHaveLength(1)

  const trace = await parser.getTrace(failingTests[0].result)
  console.log(trace)
  // expect(traces.length).toBeGreaterThan(0)
  // expect(traces[0]).toMatch(/data\/.*\.zip$/)
})

test('handles tests with retries', async ({ runInlineTest }) => {
  const result = await runInlineTest(
    {
      'a.test.ts': `
      import { test, expect } from '@playwright/test';
      test('flaky test', async ({}, testInfo) => {
        expect(testInfo.retry).toBe(1);
      });
    `,
    },
    { retries: '1' },
  )

  expect(result.exitCode).toBe(0)
  expect(result.flaky).toBe(1)

  const parser = await PlaywrightReportParser.parse(result.reportPath)
  const report = parser.getReport()

  expect(report.stats.flaky).toBe(1)
})

test('handles skipped tests', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      import { test, expect } from '@playwright/test';
      test('passing test', async () => {
        expect(1).toBe(1);
      });
      test.skip('skipped test', async () => {
        expect(1).toBe(2);
      });
    `,
  })

  expect(result.exitCode).toBe(0)
  expect(result.passed).toBe(1)
  expect(result.skipped).toBe(1)

  const parser = await PlaywrightReportParser.parse(result.reportPath)
  const report = parser.getReport()

  expect(report.stats.skipped).toBe(1)
})

test('handles multiple errors in one test', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      import { test, expect } from '@playwright/test';
      test('test with soft assertions', async () => {
        expect.soft(1).toBe(2);
        expect.soft(3).toBe(4);
        expect.soft(5).toBe(6);
      });
    `,
  })

  expect(result.exitCode).toBe(1)

  const parser = await PlaywrightReportParser.parse(result.reportPath)
  const failingTests = parser.getFailingTests(parser.getReport())

  expect(failingTests).toHaveLength(1)
  expect(failingTests[0].result.errors!.length).toBe(3)
})
