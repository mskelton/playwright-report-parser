import { readFile } from 'fs/promises'
import { dirname, join } from 'node:path'
import AdmZip from 'adm-zip'
import type {
  FailingTest,
  FileInfo,
  HTMLReport,
  LazyTestAttachment,
  TestResult,
  Trace,
} from './types/index.js'

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

    const script = html.match(/<script id="playwrightReportBase64"[^>]*>(.*?)<\/script>/s)

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
      const fileDetails = this.#getZipEntry(`${file.fileId}.json`)
      if (!fileDetails) {
        continue
      }

      const { tests } = JSON.parse(fileDetails.toString('utf-8'))

      for (const test of tests) {
        for (const result of test.results) {
          if (result.status === 'failed' || result.status === 'timedOut') {
            failingTests.push({
              fileId: file.fileId,
              result,
              test,
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

    const traceZipBuffer = await this.#readFile(attachment)
    if (!traceZipBuffer) {
      return null
    }

    const traceZip = new AdmZip(traceZipBuffer)
    const traceEntry = traceZip.getEntry('test.trace')
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

  getScreenshots(result: TestResult): LazyTestAttachment[] {
    return this.#getAttachments(result).filter((attachment) => attachment.name === 'screenshot')
  }

  getErrorContext(result: TestResult): LazyTestAttachment | null {
    const attachment = this.#getAttachments(result).find(
      (attachment) => attachment.name === 'error-context',
    )

    return attachment ?? null
  }

  #getAttachments(result: TestResult): LazyTestAttachment[] {
    return result.attachments.map((attachment) => ({
      contentType: attachment.contentType,
      name: attachment.name,
      read: (): Promise<Buffer | null> => this.#readFile(attachment),
    }))
  }

  #getZipEntry(filename: string): Buffer | null {
    const entry = this.#zip.getEntry(filename)

    if (!entry) {
      return null
    }

    return entry.getData()
  }

  #readFile(fileInfo: FileInfo): Promise<Buffer | null> {
    // Handle base64-encoded body
    if (fileInfo.body) {
      return Promise.resolve(Buffer.from(fileInfo.body, 'base64'))
    }

    // Handle path-based attachments (stored on disk relative to report)
    if (fileInfo.path) {
      return readFile(join(dirname(this.#htmlPath), fileInfo.path))
    }

    return Promise.resolve(null)
  }
}
