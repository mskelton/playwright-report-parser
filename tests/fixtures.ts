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
  didNotRun: number
  exitCode: number
  failed: number
  flaky: number
  interrupted: number
  output: string
  passed: number
  rawOutput: string
  report: JSONReport
  reportPath: string
  skipped: number
  stderr: string
  stdout: string
}

const asciiRegex = new RegExp(
  // eslint-disable-next-line no-control-regex
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
      const k = key.startsWith('-') ? key : `--${  key}`
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
    didNotRun: summary(/(\d+) did not run/g),
    failed: summary(/(\d+) failed/g),
    flaky: summary(/(\d+) flaky/g),
    interrupted: summary(/(\d+) interrupted/g),
    output: strippedOutput,
    passed: summary(/(\d+) passed/g),
    rawOutput: output,
    skipped: summary(/(\d+) skipped/g),
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
    stderr: result.stderr,
    stdout: result.stdout,
    ...stats,
    report: report!,
    reportPath: path.join(baseDir, 'playwright-report', 'index.html'),
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
