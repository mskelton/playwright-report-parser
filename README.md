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

const parser = await PlaywrightReportParser.parse(
  'playwright-report/index.html',
)

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
}
```

## How It Works

Playwright's HTML reports are self-contained React apps that embed all test data
in a base64-encoded ZIP archive within the HTML:

1. Locate the `<script id="playwrightReportBase64">` tag and extract the
   base64-encoded ZIP archive
2. Parse the report JSON file to extract test statistics and file IDs
3. Read JSON files for detailed results
4. Read trace/screenshot files
