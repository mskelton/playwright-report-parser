import { TraceEvent } from './trace'
import { TestCase, TestResult } from './report'

export type { HTMLReport, TestFile, TestResult } from './report'

export interface Trace {
  events: TraceEvent[]
}

export type FailingTest = {
  test: TestCase
  result: TestResult
  fileId: string
}
