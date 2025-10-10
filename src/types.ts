export interface PlaywrightReport {
  title: string
  startTime: number
  duration: number
  projectNames: string[]
  stats: ReportStats
  files: TestFile[]
  errors: string[]
  metadata: Record<string, unknown>
}

export interface ReportStats {
  total: number
  expected: number
  unexpected: number
  flaky: number
  skipped: number
  ok: boolean
  duration: number
}

export interface TestFile {
  fileId: string
  fileName: string
  tests: Test[]
}

export interface Test {
  testId: string
  title: string
  path: string[]
  projectName: string
  location: TestLocation
  duration: number
  outcome: 'expected' | 'unexpected' | 'flaky' | 'skipped'
  tags: string[]
  annotations: Annotation[]
  results: TestResult[]
}

export interface TestLocation {
  file: string
  line: number
  column: number
}

export interface TestResult {
  status: 'passed' | 'failed' | 'timedOut' | 'skipped'
  duration: number
  errors: ErrorDetails[]
  attachments: Attachment[]
  steps: TestStep[]
  annotations: Annotation[]
}

export interface ErrorDetails {
  message: string
  codeframe?: string
  stack?: string
}

export interface Attachment {
  name: string
  path: string
  contentType: string
  body?: string
}

export interface TestStep {
  title: string
  duration: number
  error?: string
  skipped?: boolean
  location?: TestLocation
  steps: TestStep[]
  attachments: Attachment[]
  count?: number
  snippet?: string
}

export interface Annotation {
  type: string
  description?: string
}

export interface FailingTest {
  test: Test
  result: TestResult
  fileId: string
}
