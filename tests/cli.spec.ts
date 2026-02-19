import * as fs from 'fs/promises'
import assert from 'node:assert'
import { fileURLToPath } from 'node:url'
import * as path from 'path'
import { execa } from 'execa'
import type {
  FailureOutput,
  FileOutput,
  ScreenshotsOutput,
  TracesOutput,
} from '../src/types/index.js'
import { expect, test } from './fixtures.js'

const CLI_PATH = fileURLToPath(new URL('./../dist/cli.js', import.meta.url))

test.describe('help and errors', () => {
  test('shows help with --help', async () => {
    const result = await run('--help')
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Usage: playwright-report-parser')
    expect(result.stdout).toContain('get-stats')
    expect(result.stdout).toContain('get-failures')
  })

  test('shows help with no arguments', async () => {
    const result = await run()
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Usage: playwright-report-parser')
  })

  test('errors on unknown command', async () => {
    const result = await run('bad-command', '--report', './foo')
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Unknown command: \\"bad-command\\"')
  })

  test('errors when --report is missing', async () => {
    const result = await run('get-stats')
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Missing required option: --report')
  })
})

test.describe('get-stats', () => {
  test('returns report statistics', async ({ runInlineTest }) => {
    const { exitCode, reportPath } = await runInlineTest({
      'a.test.ts': `
        import { test, expect } from '@playwright/test';
        test('passing test', async () => { expect(1).toBe(1); });
        test('another passing test', async () => { expect(2).toBe(2); });
      `,
    })
    expect(exitCode).toBe(0)

    const result = await run('get-stats', '--report', reportPath)
    expect(result.exitCode).toBe(0)
    expect(result.json).toStrictEqual({
      duration: expect.any(Number),
      errors: [],
      projectNames: [''],
      startTime: expect.any(Number),
      stats: {
        failed: 0,
        flaky: 0,
        ok: true,
        passed: 2,
        skipped: 0,
        total: 2,
      },
    })
  })

  test('resolves directory path', async ({ runInlineTest }) => {
    const { exitCode, reportPath } = await runInlineTest({
      'a.test.ts': `
        import { test, expect } from '@playwright/test';
        test('passing test', async () => { expect(1).toBe(1); });
      `,
    })
    expect(exitCode).toBe(0)

    const reportDir = path.dirname(reportPath)
    const result = await run('get-stats', '--report', reportDir)
    expect(result.exitCode).toBe(0)
    expect(result.json).toStrictEqual({
      duration: expect.any(Number),
      errors: [],
      projectNames: [''],
      startTime: expect.any(Number),
      stats: {
        failed: 0,
        flaky: 0,
        ok: true,
        passed: 1,
        skipped: 0,
        total: 1,
      },
    })
  })
})

test.describe('get-files', () => {
  test('lists test files with stats', async ({ runInlineTest }) => {
    const { exitCode, reportPath } = await runInlineTest({
      'a.test.ts': `
        import { test, expect } from '@playwright/test';
        test('test 1', async () => { expect(1).toBe(1); });
      `,
      'b.test.ts': `
        import { test, expect } from '@playwright/test';
        test('test 2', async () => { expect(2).toBe(2); });
      `,
    })
    expect(exitCode).toBe(0)

    const result = await run<FileOutput[]>('get-files', '--report', reportPath)
    expect(result.exitCode).toBe(0)
    assert.ok(result.json)

    const sorted = [...result.json].sort((a, b) => a.fileName.localeCompare(b.fileName))
    expect(sorted).toStrictEqual([
      {
        fileId: expect.any(String),
        fileName: 'a.test.ts',
        stats: {
          failed: 0,
          flaky: 0,
          ok: true,
          passed: 1,
          skipped: 0,
          total: 1,
        },
        testCount: 1,
      },
      {
        fileId: expect.any(String),
        fileName: 'b.test.ts',
        stats: {
          failed: 0,
          flaky: 0,
          ok: true,
          passed: 1,
          skipped: 0,
          total: 1,
        },
        testCount: 1,
      },
    ])
  })
})

test.describe('get-failures', () => {
  test('returns failing tests with resultId', async ({ runInlineTest }) => {
    const { exitCode, reportPath } = await runInlineTest({
      'a.test.ts': `
        import { test, expect } from '@playwright/test';
        test('passing test', async () => { expect(1).toBe(1); });
        test('failing test', async () => { expect(1).toBe(2); });
      `,
    })
    expect(exitCode).toBe(1)

    const result = await run('get-failures', '--report', reportPath)
    expect(result.exitCode).toBe(0)
    expect(result.json).toStrictEqual([
      {
        duration: expect.any(Number),
        errors: [
          expect.objectContaining({
            message: expect.stringContaining('Expected'),
          }),
        ],
        location: {
          column: expect.any(Number),
          file: expect.any(String),
          line: expect.any(Number),
        },
        path: expect.any(Array),
        projectName: expect.any(String),
        resultId: expect.stringMatching(/.+_0$/),
        retry: 0,
        status: 'failed',
        tags: [],
        testId: expect.any(String),
        title: 'failing test',
      },
    ])
  })

  test('returns empty array when no failures', async ({ runInlineTest }) => {
    const { exitCode, reportPath } = await runInlineTest({
      'a.test.ts': `
        import { test, expect } from '@playwright/test';
        test('passing test', async () => { expect(1).toBe(1); });
      `,
    })
    expect(exitCode).toBe(0)

    const result = await run('get-failures', '--report', reportPath)
    expect(result.exitCode).toBe(0)
    expect(result.json).toStrictEqual([])
  })
})

test.describe('get-traces', () => {
  test('returns trace events for a failing test', async ({ runInlineTest }) => {
    const { exitCode, reportPath } = await runInlineTest({
      'a.test.ts': `
        import { test, expect } from '@playwright/test';
        test('failing test', async ({ page }) => {
          await page.setContent('<h1>Hello</h1>');
          expect(1).toBe(2);
        });
      `,
    })
    expect(exitCode).toBe(1)

    const failures = await run<FailureOutput[]>('get-failures', '--report', reportPath)
    const resultId = failures.json?.[0].resultId
    assert.ok(resultId)

    const result = await run<TracesOutput>(
      'get-traces',
      '--report',
      reportPath,
      '--result-id',
      resultId,
    )
    expect(result.exitCode).toBe(0)
    expect(result.json).toStrictEqual({
      eventCount: expect.any(Number),
      events: expect.any(Array),
      resultId,
    })
    assert.ok(result.json)
    expect(result.json.eventCount).toBeGreaterThan(0)
    expect(result.json.events).toHaveLength(result.json.eventCount)
  })

  test('errors when --result-id is missing', async ({ runInlineTest }) => {
    const { exitCode, reportPath } = await runInlineTest({
      'a.test.ts': `
        import { test, expect } from '@playwright/test';
        test('failing test', async () => { expect(1).toBe(2); });
      `,
    })
    expect(exitCode).toBe(1)

    const result = await run('get-traces', '--report', reportPath)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Missing required option: --result-id')
  })
})

test.describe('get-screenshots', () => {
  test('saves screenshots to disk', async ({ runInlineTest }) => {
    const { exitCode, reportPath } = await runInlineTest({
      'a.test.ts': `
        import { test, expect } from '@playwright/test';
        test('screenshot test', async ({ page }) => {
          await page.setContent('<h1>Screenshot Test</h1>');
          expect(1).toBe(2);
        });
      `,
    })
    expect(exitCode).toBe(1)

    const failures = await run('get-failures', '--report', reportPath)
    const resultId = failures.json?.[0].resultId
    assert.ok(resultId)

    const outputDir = path.join(path.dirname(reportPath), '..', 'cli-screenshots')

    const result = await run<ScreenshotsOutput>(
      'get-screenshots',
      '--report',
      reportPath,
      '--result-id',
      resultId,
      '--output',
      outputDir,
    )
    expect(result.exitCode).toBe(0)
    expect(result.json).toStrictEqual({
      files: [
        {
          contentType: 'image/png',
          path: expect.stringContaining(`${resultId}-0.png`),
        },
      ],
      resultId,
      screenshotCount: 1,
    })

    assert.ok(result.json)
    const stat = await fs.stat(result.json.files[0].path)
    expect(stat.size).toBeGreaterThan(0)
  })
})

test.describe('get-error-context', () => {
  test('returns error context', async ({ runInlineTest }) => {
    const { exitCode, reportPath } = await runInlineTest({
      'a.test.ts': `
        import { test, expect } from '@playwright/test';
        test('error context test', async ({ page }) => {
          await page.setContent('<h1>Error Context Test</h1>');
          expect(1).toBe(2);
        });
      `,
    })
    expect(exitCode).toBe(1)

    const failures = await run<FailureOutput[]>('get-failures', '--report', reportPath)
    const resultId = failures.json?.[0].resultId
    assert.ok(resultId)

    const result = await run('get-error-context', '--report', reportPath, '--result-id', resultId)
    expect(result.exitCode).toBe(0)
    expect(result.json).toStrictEqual({
      content: expect.stringContaining('Error Context Test'),
      contentType: expect.any(String),
      encoding: 'utf-8',
      resultId,
    })
  })
})

async function run<T = unknown>(...args: string[]) {
  const result = await execa('node', [CLI_PATH, ...args], {
    reject: false,
  })

  const json = safeParseJson<T>(result.stdout)
  const errorJson = safeParseJson<{ error: string }>(result.stderr)

  return {
    errorJson,
    exitCode: result.exitCode ?? 1,
    json,
    stderr: result.stderr,
    stdout: result.stdout,
  }
}

function safeParseJson<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T
  } catch {
    return null
  }
}
