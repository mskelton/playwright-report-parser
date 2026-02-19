import { stripVTControlCharacters } from 'node:util'
import dedent from 'dedent'
import { PlaywrightReportParser } from '../src/index.js'
import { StdioTraceEvent } from '../src/types/trace.js'
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
  expect(report.files.map((f) => f.fileName).sort()).toEqual(['a.test.ts', 'b.test.ts'])
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
  expect(trace).toBeDefined()

  const error = trace?.events.find((e) => e.type === 'error')
  expect(error).toBeDefined()
  expect(stripVTControlCharacters(error!.message)).toBe(dedent`
    Error: expect(received).toBe(expected) // Object.is equality

    Expected: 2
    Received: 1
  `)
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
  expect(failingTests[0].result.errors!).toHaveLength(3)
})

test('extracts error context', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      import { test, expect } from '@playwright/test';
      test('error context test', async ({ page }) => {
        await page.setContent('<h1>Error Context Test</h1>');
        expect(1).toBe(2);
      });
    `,
  })

  expect(result.exitCode).toBe(1)

  const parser = await PlaywrightReportParser.parse(result.reportPath)
  const failingTests = parser.getFailingTests(parser.getReport())
  expect(failingTests).toHaveLength(1)

  const errorContext = parser.getErrorContext(failingTests[0].result)
  expect(errorContext).toBeDefined()

  const buffer = await errorContext!.read()
  expect(buffer).not.toBeNull()
  expect(buffer!.length).toBeGreaterThan(0)

  const content = buffer!.toString('utf-8')
  expect(content).toContain('# Page snapshot')
  expect(content).toContain('Error Context Test')
})

test('extracts screenshots', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      import { test, expect } from '@playwright/test';
      test('screenshot test', async ({ page }) => {
        await page.setContent('<h1>Screenshot Test</h1>');
        expect(1).toBe(2);
      });
    `,
  })

  expect(result.exitCode).toBe(1)

  const parser = await PlaywrightReportParser.parse(result.reportPath)
  const failingTests = parser.getFailingTests(parser.getReport())
  expect(failingTests).toHaveLength(1)

  const attachments = parser.getScreenshots(failingTests[0].result)
  expect(attachments).toHaveLength(1)

  // Read and verify PNG binary data
  const buffer = await attachments[0].read()
  expect(buffer).not.toBeNull()
  expect(buffer!.length).toBeGreaterThan(0)

  // PNG magic bytes: 0x89 0x50 0x4E 0x47 (‰PNG)
  expect(buffer![0]).toBe(0x89)
  expect(buffer![1]).toBe(0x50) // P
  expect(buffer![2]).toBe(0x4e) // N
  expect(buffer![3]).toBe(0x47) // G
})

test('extracts trace actions', async ({ runInlineTest }) => {
  const result = await runInlineTest({
    'a.test.ts': `
      import { test, expect } from '@playwright/test';
      test('trace test', async ({ page }) => {
        console.log('test output message');
        await page.setContent('<button id="btn">Click me</button>');
        await page.locator('#btn').click();
        await expect(page.locator('button')).toHaveText('Wrong Text');
      });
    `,
  })

  expect(result.exitCode).toBe(1)

  const parser = await PlaywrightReportParser.parse(result.reportPath)
  const failingTests = parser.getFailingTests(parser.getReport())
  expect(failingTests).toHaveLength(1)

  const trace = await parser.getTrace(failingTests[0].result)
  expect(trace).toBeDefined()

  const beforeEvents = trace!.events.filter((e) => e.type === 'before')
  expect(beforeEvents.length).toBeGreaterThan(0)

  await test.step('extracts click action', async () => {
    const clickAction = beforeEvents.find((e) => e.title?.toLowerCase().includes('locator'))
    expect(clickAction).toBeDefined()
  })

  await test.step('extracts toHaveText action', async () => {
    const expectAction = beforeEvents.find((e) => e.title?.includes('toHaveText'))
    expect(expectAction).toBeDefined()
  })

  await test.step('extracts stdout', async () => {
    const stdoutEvents = trace!.events.filter(
      (event): event is StdioTraceEvent => event.type === 'stdout',
    )
    expect(stdoutEvents.length).toBeGreaterThan(0)
    const outputMessage = stdoutEvents.find((e) => e.text?.includes('test output message'))
    expect(outputMessage).toBeDefined()
  })
})
