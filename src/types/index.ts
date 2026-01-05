import { TraceEvent } from './trace'
import { TestCase, TestResult } from './report'

export type { HTMLReport, TestAttachment, TestFile, TestResult } from './report'

export interface Trace {
  events: TraceEvent[]
}

export type FailingTest = {
  test: TestCase
  result: TestResult
  fileId: string
}

export type LazyTestAttachment = {
  name: string
  contentType: string
  read: () => Promise<Buffer | null>
}

export type FileInfo = {
  body?: string
  path?: string
}
