# Playwright Report Parser

A lightweight TypeScript library to programmatically parse and analyze
Playwright HTML test reports. Extract failing tests, traces, screenshots, and
detailed test results without opening the browser-based report viewer.

## Features

- 📊 Extract test statistics and metadata
- ❌ Identify failing and flaky tests with error details
- 📹 Locate trace files for debugging
- 📸 Access screenshots and attachments
- 🔍 Query specific test files and results
- ✨ Type-safe with full TypeScript support

## Installation

```bash
npm install playwright-report-parser
```

## Usage

### Programmatic Usage

```typescript
import { PlaywrightReportParser } from 'playwright-report-parser'

const parser = await PlaywrightReportParser.parse('playwright-report/index.html')

const report = parser.getReport()
console.log(`Total: ${report.stats.total}`)
console.log(`Passed: ${report.stats.expected}`)
console.log(`Failed: ${report.stats.unexpected}`)
console.log(`Flaky: ${report.stats.flaky}`)

const failingTests = parser.getFailingTests(report)
for (const { test, result } of failingTests) {
  console.log(`❌ ${test.title}`)
  console.log(`   File: ${test.location.file}:${test.location.line}`)
  console.log(`   Duration: ${result.duration}ms`)

  const trace = await parser.getTrace(result)
  for (const event of trace?.events ?? []) {
    console.log(`   📹 ${event.type}: ${event.message}`)
  }

  const screenshots = parser.getScreenshots(result)
  for (const screenshot of screenshots) {
    console.log(`   📸 ${screenshot.name}`)
  }

  const errorContext = parser.getErrorContext(result)
  console.log(`   🔍 ${errorContext.name}`)
}
```

### CLI Usage

All commands output JSON to stdout. Errors are JSON to stderr with exit code 1.

```bash
# Get report statistics
npx playwright-report-parser get-stats --report ./playwright-report

# List all test files with per-file statistics
npx playwright-report-parser get-files --report ./playwright-report

# Get all failing tests with error messages and result IDs
npx playwright-report-parser get-failures --report ./playwright-report

# Get trace events for a specific test result
npx playwright-report-parser get-traces --report ./playwright-report --result-id abc123x0

# Save screenshots for a specific test result
npx playwright-report-parser get-screenshots --report ./playwright-report --result-id abc123x0 --output ./debug

# Get error context attachment for a specific test result
npx playwright-report-parser get-error-context --report ./playwright-report --result-id abc123x0
```

The `--report` flag accepts either a directory (resolves to `index.html` inside
it) or a direct path to the HTML file. The `--result-id` flag uses the format
`{testId}x{retry}` as returned by `get-failures`.

## How It Works

Playwright's HTML reports are self-contained React apps that embed all test data
in a base64-encoded ZIP archive within the HTML:

1. Locate the `<script id="playwrightReportBase64">` tag and extract the
   base64-encoded ZIP archive
2. Parse the report JSON file to extract test statistics and file IDs
3. Read JSON files for detailed results
4. Read trace/screenshot files
