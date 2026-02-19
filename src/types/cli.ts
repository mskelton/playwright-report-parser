import type { Location } from './report'

export type CLIStats = {
  failed: number
  flaky: number
  ok: boolean
  passed: number
  skipped: number
  total: number
}

export type StatsOutput = {
  duration: number
  errors: string[]
  projectNames: string[]
  startTime: number
  stats: CLIStats
}

export type FileOutput = {
  fileId: string
  fileName: string
  stats: CLIStats
  testCount: number
}

export type FailureOutput = {
  duration: number
  errors: { codeframe?: string; message: string }[]
  location: Location
  path: string[]
  projectName: string
  resultId: string
  retry: number
  status: string
  tags: string[]
  testId: string
  title: string
}

export type TracesOutput = {
  eventCount: number
  events: unknown[]
  resultId: string
}

export type ScreenshotsOutput = {
  files: { contentType: string; path: string }[]
  resultId: string
  screenshotCount: number
}

export type ErrorContextOutput = {
  content: string
  contentType: string
  encoding: string
  resultId: string
}
