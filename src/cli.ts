#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { PlaywrightReportParser } from './index.js'
import type {
  ErrorContextOutput,
  FailingTest,
  FailureOutput,
  FileOutput,
  ScreenshotsOutput,
  StatsOutput,
  TracesOutput,
} from './types/index.js'

const COMMANDS = [
  'get-stats',
  'get-files',
  'get-failures',
  'get-traces',
  'get-screenshots',
  'get-error-context',
] as const

type Command = (typeof COMMANDS)[number]

const HELP = `Usage: playwright-report-parser <command> [options]

Commands:
  get-stats          Get report statistics (total, passed, failed, flaky, skipped)
  get-files          List all test files with per-file statistics
  get-failures       Get all failing tests with error messages and result IDs
  get-traces         Get trace events for a specific test result
  get-screenshots    Save screenshots for a specific test result to disk
  get-error-context  Get error context attachment for a specific test result

Options:
  --report <path>      Path to Playwright HTML report (file or directory)
  --result-id <id>     Result ID from get-failures (for per-result commands)
  --output <dir>       Output directory for screenshots (default: ./screenshots)
  --help               Show this help message

All output is JSON to stdout. Errors are JSON to stderr with exit code 1.

Example workflow:
  playwright-report-parser get-stats --report ./report
  playwright-report-parser get-failures --report ./report
  playwright-report-parser get-traces --report ./report --result-id abc123x0
  playwright-report-parser get-screenshots --report ./report --result-id abc123x0 --output ./debug
  playwright-report-parser get-error-context --report ./report --result-id abc123x0
`

function fail(message: string): never {
  console.error(JSON.stringify({ error: message }))
  process.exit(1)
}

function output(data: unknown): void {
  console.log(JSON.stringify(data, null, 2))
}

function resolveReportPath(reportPath: string): string {
  if (reportPath.endsWith('.html')) return reportPath
  return join(reportPath, 'index.html')
}

function parseResultId(resultId: string): { retry: number; testId: string } {
  const i = resultId.lastIndexOf('x')
  if (i === -1) {
    fail(`Invalid result ID format: "${resultId}". Expected format: {testId}x{retry}`)
  }

  const testId = resultId.slice(0, i)
  const retry = parseInt(resultId.slice(i + 1), 10)
  if (isNaN(retry)) {
    fail(`Invalid retry number in result ID: "${resultId}"`)
  }

  return { retry, testId }
}

function findResult(failingTests: FailingTest[], resultId: string): FailingTest {
  const { retry, testId } = parseResultId(resultId)
  const match = failingTests.find((ft) => ft.test.testId === testId && ft.result.retry === retry)
  if (!match) {
    fail(`No failing test result found for result ID: "${resultId}"`)
  }
  return match
}

function requireResultId(resultId: string | undefined): string {
  if (!resultId) fail('Missing required option: --result-id <id>')
  return resultId
}

async function getStats(parser: PlaywrightReportParser) {
  const report = parser.getReport()
  const data: StatsOutput = {
    duration: report.duration,
    errors: report.errors,
    projectNames: report.projectNames,
    startTime: report.startTime,
    stats: {
      failed: report.stats.unexpected,
      flaky: report.stats.flaky,
      ok: report.stats.ok,
      passed: report.stats.expected,
      skipped: report.stats.skipped,
      total: report.stats.total,
    },
  }
  output(data)
}

async function getFiles(parser: PlaywrightReportParser) {
  const report = parser.getReport()
  const data: FileOutput[] = report.files.map((file) => ({
    fileId: file.fileId,
    fileName: file.fileName,
    stats: {
      failed: file.stats.unexpected,
      flaky: file.stats.flaky,
      ok: file.stats.ok,
      passed: file.stats.expected,
      skipped: file.stats.skipped,
      total: file.stats.total,
    },
    testCount: file.tests.length,
  }))
  output(data)
}

async function getFailures(parser: PlaywrightReportParser) {
  const report = parser.getReport()
  const failingTests = parser.getFailingTests(report)
  const data: FailureOutput[] = failingTests.map((ft) => ({
    duration: ft.result.duration,
    errors: ft.result.errors,
    location: ft.test.location,
    path: ft.test.path,
    projectName: ft.test.projectName,
    resultId: `${ft.test.testId}x${ft.result.retry}`,
    retry: ft.result.retry,
    status: ft.result.status,
    tags: ft.test.tags,
    testId: ft.test.testId,
    title: ft.test.title,
  }))
  output(data)
}

async function getTraces(parser: PlaywrightReportParser, resultId: string) {
  const report = parser.getReport()
  const { result } = findResult(parser.getFailingTests(report), resultId)
  const trace = await parser.getTrace(result)
  if (!trace) {
    fail(`No trace found for result ID: "${resultId}"`)
  }
  const data: TracesOutput = {
    eventCount: trace.events.length,
    events: trace.events,
    resultId,
  }
  output(data)
}

async function getScreenshots(parser: PlaywrightReportParser, resultId: string, outputDir: string) {
  const report = parser.getReport()
  const { result } = findResult(parser.getFailingTests(report), resultId)
  const screenshots = parser.getScreenshots(result)
  if (screenshots.length === 0) {
    fail(`No screenshots found for result ID: "${resultId}"`)
  }

  await mkdir(outputDir, { recursive: true })
  const written: { contentType: string; path: string }[] = []

  for (let i = 0; i < screenshots.length; i++) {
    const buffer = await screenshots[i].read()
    if (!buffer) continue
    const filepath = join(outputDir, `${resultId}-${i}.png`)
    await writeFile(filepath, buffer)
    written.push({ contentType: screenshots[i].contentType, path: filepath })
  }

  const data: ScreenshotsOutput = {
    files: written,
    resultId,
    screenshotCount: written.length,
  }
  output(data)
}

async function getErrorContext(parser: PlaywrightReportParser, resultId: string) {
  const report = parser.getReport()
  const { result } = findResult(parser.getFailingTests(report), resultId)
  const errorContext = parser.getErrorContext(result)
  if (!errorContext) {
    fail(`No error context found for result ID: "${resultId}"`)
  }

  const buffer = await errorContext.read()
  if (!buffer) {
    fail(`Failed to read error context for result ID: "${resultId}"`)
  }

  const isText =
    errorContext.contentType.startsWith('text/') || errorContext.contentType.includes('markdown')

  const data: ErrorContextOutput = {
    content: isText ? buffer.toString('utf-8') : buffer.toString('base64'),
    contentType: errorContext.contentType,
    encoding: isText ? 'utf-8' : 'base64',
    resultId,
  }
  output(data)
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      'help': { default: false, type: 'boolean' },
      'output': { default: './screenshots', type: 'string' },
      'report': { type: 'string' },
      'result-id': { type: 'string' },
    },
    strict: true,
  })

  if (values.help || positionals.length === 0) {
    console.log(HELP)
    process.exit(0)
  }

  const command = positionals[0] as string
  if (!COMMANDS.includes(command as Command)) {
    fail(`Unknown command: "${command}". Valid commands: ${COMMANDS.join(', ')}`)
  }

  if (!values.report) {
    fail('Missing required option: --report <path>')
  }

  const parser = await PlaywrightReportParser.parse(resolveReportPath(values.report))

  switch (command as Command) {
    case 'get-stats':
      return getStats(parser)
    case 'get-files':
      return getFiles(parser)
    case 'get-failures':
      return getFailures(parser)
    case 'get-traces':
      return getTraces(parser, requireResultId(values['result-id']))
    case 'get-screenshots':
      return getScreenshots(parser, requireResultId(values['result-id']), values.output!)
    case 'get-error-context':
      return getErrorContext(parser, requireResultId(values['result-id']))
  }
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err))
})
