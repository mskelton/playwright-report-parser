import { test as base } from '@playwright/test'
import type { JSONReport } from '@playwright/test/reporter'
import { execa } from 'execa'
import * as fs from 'fs/promises'
import * as path from 'path'

type Files = {
  [key: string]: string
}

type Params = {
  [key: string]: string | number | boolean | string[]
}

type RunResult = {
  exitCode: number
  output: string
  stdout: string
  stderr: string
  rawOutput: string
  passed: number
  failed: number
  flaky: number
  skipped: number
  interrupted: number
  didNotRun: number
  reportPath: string
  report: JSONReport
}

const asciiRegex = new RegExp(
  '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))',
  'g',
)

function stripAnsi(str: string): string {
  return str.replace(asciiRegex, '')
}

async function writeFiles(baseDir: string, files: Files): Promise<void> {
  let filesToWrite = { ...files }

  if (
    !Object.keys(filesToWrite).some((name) => name.includes('package.json'))
  ) {
    filesToWrite = {
      ...filesToWrite,
      'package.json': JSON.stringify({ name: 'test-project', type: 'module' }),
    }
  }

  if (
    !Object.keys(filesToWrite).some((name) =>
      name.includes('playwright.config'),
    )
  ) {
    filesToWrite = {
      ...filesToWrite,
      'playwright.config.ts': `
        import { defineConfig } from '@playwright/test';
        export default defineConfig({
          reporter: [
            ['html', { open: 'never' }],
            ['json', { outputFile: 'report.json' }]
          ],
          use: {
            trace: 'on',
            screenshot: 'on',
          },
        });
      `,
    }
  }

  await Promise.all(
    Object.entries(filesToWrite).map(async ([name, content]) => {
      const fullPath = path.join(baseDir, name)
      await fs.mkdir(path.dirname(fullPath), { recursive: true })
      await fs.writeFile(fullPath, content)
    }),
  )
}

function toParamList(params: Params): string[] {
  const paramList: string[] = []
  for (const key of Object.keys(params)) {
    const values = Array.isArray(params[key]) ? params[key] : [params[key]]
    for (const value of values) {
      const k = key.startsWith('-') ? key : '--' + key
      paramList.push(params[key] === true ? k : `${k}=${value}`)
    }
  }
  return paramList
}

function parseTestRunnerOutput(output: string) {
  const summary = (re: RegExp) => {
    let result = 0
    let match = re.exec(output)
    while (match) {
      result += +match[1]
      match = re.exec(output)
    }
    return result
  }

  const strippedOutput = stripAnsi(output)

  return {
    output: strippedOutput,
    rawOutput: output,
    passed: summary(/(\d+) passed/g),
    failed: summary(/(\d+) failed/g),
    flaky: summary(/(\d+) flaky/g),
    skipped: summary(/(\d+) skipped/g),
    interrupted: summary(/(\d+) interrupted/g),
    didNotRun: summary(/(\d+) did not run/g),
  }
}

async function runPlaywrightTest(
  baseDir: string,
  params: Params,
): Promise<RunResult> {
  const paramList = toParamList(params)
  const args = ['test', '--workers=2', ...paramList]

  const reportFile = path.join(baseDir, 'report.json')

  const result = await execa('npx', ['playwright', ...args], {
    cwd: baseDir,
    reject: false,
  })

  const output = result.stdout + result.stderr
  const stats = parseTestRunnerOutput(output)

  let report: JSONReport | undefined
  try {
    const reportContent = await fs.readFile(reportFile, 'utf-8')
    report = JSON.parse(reportContent)
  } catch (e) {
    throw new Error(`Failed to read JSON report: ${e}`)
  }

  return {
    exitCode: result.exitCode ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
    ...stats,
    reportPath: path.join(baseDir, 'playwright-report', 'index.html'),
    report: report!,
  }
}

export const test = base.extend<{
  runInlineTest: (files: Files, params?: Params) => Promise<RunResult>
}>({
  runInlineTest: async ({}, use, testInfo) => {
    await use(async (files: Files, params: Params = {}) => {
      const baseDir = testInfo.outputPath()
      await writeFiles(baseDir, files)
      return await runPlaywrightTest(baseDir, params)
    })
  },
})

export { expect } from '@playwright/test'
