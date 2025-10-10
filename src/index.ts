import AdmZip from 'adm-zip'
import { readFile } from 'fs/promises'
import type { FailingTest, PlaywrightReport, TestFile } from './types.js'

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

  getReport(): PlaywrightReport {
    const reportJson = this.#getZipEntry('report.json')

    if (!reportJson) {
      throw new Error('Could not find report.json in ZIP')
    }

    return JSON.parse(reportJson)
  }

  getFailingTests(report: PlaywrightReport): FailingTest[] {
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

  getTraceAttachments(result: {
    attachments: Array<{ name: string; path: string }>
  }): string[] {
    return result.attachments
      .filter((a) => a.name === 'trace')
      .map((a) => a.path)
  }

  #getZipEntry(filename: string): string | null {
    const entry = this.#zip.getEntry(filename)

    if (!entry) {
      return null
    }

    return entry.getData().toString('utf-8')
  }

  #getTestFileDetails(fileId: string): TestFile | null {
    const content = this.#getZipEntry(`${fileId}.json`)

    if (!content) {
      return null
    }

    return JSON.parse(content)
  }
}
