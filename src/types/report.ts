import type { Metadata, TestAnnotation } from '@playwright/test'

export type Stats = {
  expected: number
  flaky: number
  ok: boolean
  skipped: number
  total: number
  unexpected: number
}

export type FilteredStats = {
  duration: number
  total: number
}

export type Location = {
  column: number
  file: string
  line: number
}

export type HTMLReportOptions = {
  noCopyPrompt?: boolean
  noSnippets?: boolean
  title?: string
}

export type HTMLReport = {
  duration: number
  errors: string[]
  files: TestFileSummary[]
  metadata: Metadata
  options: HTMLReportOptions
  projectNames: string[]
  startTime: number
  stats: Stats
}

export type TestFile = {
  fileId: string
  fileName: string
  tests: TestCase[]
}

export type TestFileSummary = {
  fileId: string
  fileName: string
  stats: Stats
  tests: TestCaseSummary[]
}

export type TestCaseSummary = {
  annotations: TestAnnotation[]
  duration: number
  location: Location
  ok: boolean
  outcome: 'expected' | 'flaky' | 'skipped' | 'unexpected'
  path: string[]
  projectName: string
  results: TestResultSummary[]
  tags: string[]
  testId: string
  title: string
}

export type TestResultSummary = {
  attachments: { contentType: string; name: string; path?: string }[]
}

export type TestCase = Omit<TestCaseSummary, 'results'> & {
  results: TestResult[]
}

export type TestAttachment = {
  body?: string
  contentType: string
  name: string
  path?: string
}

export type TestResult = {
  annotations: TestAnnotation[]
  attachments: TestAttachment[]
  duration: number
  errors: { codeframe?: string; message: string }[]
  retry: number
  startTime: string
  status: 'failed' | 'interrupted' | 'passed' | 'skipped' | 'timedOut'
  steps: TestStep[]
}

export type TestStep = {
  attachments: number[]
  count: number
  duration: number
  error?: string
  location?: Location
  skipped?: boolean
  snippet?: string
  startTime: string
  steps: TestStep[]
  title: string
}
