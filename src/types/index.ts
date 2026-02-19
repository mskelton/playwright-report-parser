import { TestCase, TestResult } from './report'
import { TraceEvent } from './trace'

export type { HTMLReport, TestAttachment, TestFile, TestResult } from './report'
export type {
  CLIStats,
  ErrorContextOutput,
  FailureOutput,
  FileOutput,
  ScreenshotsOutput,
  StatsOutput,
  TracesOutput,
} from './cli'

export interface Trace {
  events: TraceEvent[]
}

export type FailingTest = {
  fileId: string
  result: TestResult
  test: TestCase
}

export type LazyTestAttachment = {
  contentType: string
  name: string
  read: () => Promise<Buffer | null>
}

export type FileInfo = {
  body?: string
  path?: string
}
