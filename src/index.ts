import AdmZip from 'adm-zip'
import { readFile } from 'fs/promises'
import type {
  FailingTest,
  HTMLReport,
  TestFile,
  TestResult,
  Trace,
} from './types/index.js'
import { dirname, join } from 'node:path'

export class PlaywrightReportParser {
  #htmlPath: string
  #zip: AdmZip = null!

  constructor(htmlPath: string) {
    this.#htmlPath = htmlPath
  }

  static async parse(htmlPath: string): Promise<PlaywrightReportParser> {
    const parser = new PlaywrightReportParser(htmlPath)
    await parser.#extractZipData()

    return parser
  }

  async #extractZipData(): Promise<void> {
    const html = await readFile(this.#htmlPath, 'utf-8')

    const script = html.match(
      /<script id="playwrightReportBase64"[^>]*>(.*?)<\/script>/s,
    )

    const scriptContent = script ? script[1].trim() : null
    if (!scriptContent) {
      throw new Error('Could not find playwrightReportBase64 element in HTML')
    }

    const data = scriptContent.replace(/^data:application\/zip;base64,/, '')
    const buffer = Buffer.from(data, 'base64')

    this.#zip = new AdmZip(buffer)
  }

  getReport(): HTMLReport {
    const entry = this.#getZipEntry('report.json')
    if (!entry) {
      throw new Error('Could not find report.json in ZIP')
    }

    return JSON.parse(entry.toString('utf-8'))
  }

  getFailingTests(report: HTMLReport): FailingTest[] {
    const failingTests: FailingTest[] = []

    for (const file of report.files) {
      const fileDetails = this.#getTestFileDetails(file.fileId)

      if (!fileDetails) {
        continue
      }

      for (const test of fileDetails.tests) {
        for (const result of test.results) {
          if (result.status === 'failed' || result.status === 'timedOut') {
            failingTests.push({
              test,
              result,
              fileId: file.fileId,
            })
          }
        }
      }
    }

    return failingTests
  }

  async getTrace(result: TestResult): Promise<Trace | null> {
    const attachment = result.attachments.find((a) => a.name === 'trace')
    if (!attachment) {
      return null
    }

    const zipBuffer = await readFile(
      join(dirname(this.#htmlPath), attachment.path ?? ''),
    )

    const zip = new AdmZip(zipBuffer)
    const traceEntry = zip.getEntry('test.trace')
    if (!traceEntry) {
      return null
    }

    const traceBuffer = traceEntry.getData()
    const trace = traceBuffer
      .toString('utf-8')
      .split('\n')
      .map((line) => JSON.parse(line))

    return {
      events: trace,
    }
  }

  #getZipEntry(filename: string): Buffer | null {
    const entry = this.#zip.getEntry(filename)

    if (!entry) {
      return null
    }

    return entry.getData()
  }

  #getTestFileDetails(fileId: string): TestFile | null {
    const entry = this.#getZipEntry(`${fileId}.json`)
    if (!entry) {
      return null
    }

    return JSON.parse(entry.toString('utf-8'))
  }
}
