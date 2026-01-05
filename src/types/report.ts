import type { TestAnnotation, Metadata } from '@playwright/test'

export type Stats = {
  total: number
  expected: number
  unexpected: number
  flaky: number
  skipped: number
  ok: boolean
}

export type FilteredStats = {
  total: number
  duration: number
}

export type Location = {
  file: string
  line: number
  column: number
}

export type HTMLReportOptions = {
  title?: string
  noCopyPrompt?: boolean
  noSnippets?: boolean
}

export type HTMLReport = {
  metadata: Metadata
  files: TestFileSummary[]
  stats: Stats
  projectNames: string[]
  startTime: number
  duration: number
  errors: string[] // Top-level errors that are not attributed to any test.
  options: HTMLReportOptions
}

export type TestFile = {
  fileId: string
  fileName: string
  tests: TestCase[]
}

export type TestFileSummary = {
  fileId: string
  fileName: string
  tests: TestCaseSummary[]
  stats: Stats
}

export type TestCaseSummary = {
  testId: string
  title: string
  path: string[]
  projectName: string
  location: Location
  annotations: TestAnnotation[]
  tags: string[]
  outcome: 'skipped' | 'expected' | 'unexpected' | 'flaky'
  duration: number
  ok: boolean
  results: TestResultSummary[]
}

export type TestResultSummary = {
  attachments: { name: string; contentType: string; path?: string }[]
}

export type TestCase = Omit<TestCaseSummary, 'results'> & {
  results: TestResult[]
}

export type TestAttachment = {
  name: string
  body?: string
  path?: string
  contentType: string
}

export type TestResult = {
  retry: number
  startTime: string
  duration: number
  steps: TestStep[]
  errors: { message: string; codeframe?: string }[]
  attachments: TestAttachment[]
  status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted'
  annotations: TestAnnotation[]
}

export type TestStep = {
  title: string
  startTime: string
  duration: number
  location?: Location
  snippet?: string
  error?: string
  steps: TestStep[]
  attachments: number[]
  count: number
  skipped?: boolean
}
