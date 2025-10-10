# Playwright Report Parser

## Project Overview

A lightweight TypeScript library (~100 LOC) to programmatically parse Playwright
HTML test reports. Extracts test results, statistics, failing tests, traces, and
screenshots without requiring the browser-based HTML viewer.

**Key Stats:**

- 578 lines of code total (src + tests)
- 9 comprehensive test suites, all passing
- Zero dependencies (except `adm-zip`)
- Fully type-safe with TypeScript

## How Playwright Reports Work

### HTML Report Structure

Playwright generates self-contained HTML reports (~10-11MB) that are React apps
with all test data embedded as a base64-encoded ZIP archive:

```html
<script id="playwrightReportBase64" type="application/zip">
  data:application/zip;base64,UEsDBBQAAA...
</script>
```

### Embedded ZIP Contents

- `report.json` - Main report with stats, file list, and metadata
- `{fileId}.json` - Detailed test results for each spec file
- References to external `data/` directory for binary assets

### External Assets (data/ directory)

Located alongside `index.html`:

- `*.zip` - Trace files (viewable in Playwright trace viewer)
- `*.png` - Screenshots captured during tests
- `*.md` - Page snapshots in YAML format

### Data Extraction Flow

1. Read HTML file → Extract base64 from `<script>` tag using regex
2. Decode base64 → Convert to Buffer → Parse with AdmZip
3. Read `report.json` → Get test statistics and file IDs
4. Read `{fileId}.json` files → Get detailed test results per file
5. Extract attachment paths → Reference external files in `data/` directory

## Architecture

### Core Class: `PlaywrightReportParser`

Located in `src/index.ts`, uses modern JavaScript private fields (`#`):

```typescript
class PlaywrightReportParser {
  #htmlPath: string // Path to HTML report
  #zip: AdmZip // Parsed ZIP archive

  static async parse(htmlPath: string): Promise<PlaywrightReportParser>
  getReport(): PlaywrightReport
  getFailingTests(report: PlaywrightReport): FailingTest[]
  getTraceAttachments(result: TestResult): string[]

  // Private methods
  #extractZipData(): Promise<void>
  #getZipEntry(filename: string): string | null
  #getTestFileDetails(fileId: string): TestFile | null
}
```

**Design Decisions:**

- **Instance-based API**: `parse()` returns parser instance, not data object
- **Private fields**: `#zip` and `#htmlPath` are encapsulated
- **Synchronous ZIP ops**: AdmZip provides sync methods for fast reads
- **No cleanup needed**: No `close()` method required with AdmZip
- **Type-safe**: Full TypeScript interfaces in `src/types.ts`

### API Usage Pattern

```typescript
const parser = await PlaywrightReportParser.parse('report/index.html')
const report = parser.getReport()
const failingTests = parser.getFailingTests(report)

for (const { test, result } of failingTests) {
  const traces = parser.getTraceAttachments(result)
  console.log(test.title, traces)
}
```

## Type Definitions (`src/types.ts`)

Complete TypeScript interfaces for all Playwright data structures:

- **`PlaywrightReport`** - Top-level report (stats, files, metadata)
- **`Test`** - Test metadata (title, location, tags, path)
- **`TestResult`** - Execution result (status, errors, attachments, steps)
- **`TestFile`** - File-level test grouping
- **`FailingTest`** - Combined test + result + fileId
- **`Attachment`**, **`TestStep`**, **`ErrorDetails`**, etc.

## Testing Strategy

### Meta-Testing with Playwright

The test suite (`tests/extractor.spec.ts`) uses Playwright to test Playwright:

1. **`runInlineTest` fixture** - Spawns child Playwright process
2. **Generate real reports** - Creates actual HTML reports with traces
3. **Parse with parser** - Runs PlaywrightReportParser on generated reports
4. **Verify extraction** - Asserts correct data extraction

### Test Fixtures (`tests/fixtures.ts`)

Custom Playwright fixture that:

- Writes test files to temp directory
- Runs `npx playwright test` with HTML + JSON reporters
- Returns `RunResult` with exitCode, stdout, stderr, report, etc.
- Includes enhanced `cleanEnv()` and `stripAnsi()` utilities

### Test Coverage (9 suites, all passing)

**Basic Extraction:**

- Extract report statistics
- Extract file structure

**Failing Tests:**

- Extract failing tests
- Extract error messages
- Extract timeout failures
- Extract trace file paths

**Edge Cases:**

- Handle tests with retries (flaky tests)
- Handle skipped tests
- Handle multiple errors in one test (soft assertions)

## Dependencies

**Runtime:**

- `adm-zip` (^0.5.16) - Fast, synchronous ZIP parsing

**DevDependencies:**

- `@playwright/test` (^1.48.2) - Test runner AND testing target
- `typescript` (^5.6.3) - Type checking and compilation
- `tsx` (^4.19.1) - TypeScript execution
- `execa` (^9.5.2) - Spawn child processes in tests
- `prettier` (^3.6.2) - Code formatting

**Why no `cheerio`?** - Replaced with regex for HTML parsing (simpler, faster)

## Project Structure

```
playwright-report-parser/
├── src/
│   ├── index.ts           # PlaywrightReportParser class (~100 LOC)
│   └── types.ts           # TypeScript interfaces
├── tests/
│   ├── extractor.spec.ts  # 9 test suites
│   └── fixtures.ts        # runInlineTest fixture + utilities
├── examples/
│   └── report/            # Sample report (1059 tests, 196 failures)
│       ├── index.html     # 11.6MB HTML report
│       ├── data/          # 345 trace/screenshot files
│       └── trace/         # Trace viewer UI
├── playwright.config.ts   # Test runner config (4 workers)
├── tsconfig.json          # TypeScript config (ES2022, bundler)
├── package.json           # playwright-report-parser
└── README.md              # User documentation
```

## Scripts

```bash
npm test         # Run Playwright test suite (9 tests, ~5s)
npm run build    # Compile TypeScript to dist/
npm run format   # Format with Prettier
```

## Current Capabilities

✅ Extract report metadata (title, start time, duration) ✅ Parse test
statistics (total, passed, failed, flaky, skipped) ✅ Identify failing tests
with error messages and stack traces ✅ Locate trace file paths for debugging
(`data/{hash}.zip`) ✅ Extract screenshots and attachments ✅ Show test location
(file:line) ✅ Display test duration and status ✅ Handle retries and flaky
tests ✅ Support timeout failures vs assertion failures

## Implementation Notes

### Key Learnings

1. **Playwright reports are ZIPs in HTML** - All data is base64-encoded
2. **Synchronous > Async for ZIP** - AdmZip's sync API is simpler and faster
3. **Regex > HTML parser** - No need for cheerio to extract one script tag
4. **Private fields (`#`) > closures** - Modern, clean encapsulation
5. **Instance API > static data object** - More flexible, lazy evaluation
6. **Meta-testing works great** - Playwright can test itself reliably

### Why Instance-Based API?

Initial design returned data object from static `parse()`. Changed to return
instance because:

- More flexible (can add methods without breaking changes)
- Better encapsulation (ZIP stays private)
- Lazy evaluation possible (don't parse all files upfront)
- Familiar OOP pattern

### Regex Pattern for Script Tag

```javascript
;/<script id="playwrightReportBase64"[^>]*>(.*?)<\/script>/s
```

The `s` flag enables dot-all mode (`.` matches newlines).

## Example Report

Sample in `examples/report/` from real test run:

- **1059 total tests**
- **829 passed** (78%)
- **47 unique failures** (196 total with retries)
- **42 flaky tests**
- **141 skipped**
- **Report size**: 11.6MB
- **Data files**: 345 traces, screenshots, snapshots

## Future Enhancements

### Potential Features

- Extract and parse trace ZIP files (they're nested ZIPs)
- Group retries (show 47 unique failures, not 196 attempts)
- Export to JSON/CSV
- Filter/query tests by pattern
- Extract network HAR data from traces
- Compare multiple report runs
- CLI tool with pretty output
- Web UI for browsing results

### Non-Goals

- ❌ Running tests (use Playwright directly)
- ❌ Modifying reports (read-only parser)
- ❌ Trace viewer UI (use Playwright's built-in viewer)

## Compatibility

- **Node.js**: ES2022+ (uses private fields, optional chaining)
- **TypeScript**: 5.6+
- **Playwright**: Any version that generates HTML reports with embedded ZIP

## Related Files

- Test report: `examples/report/index.html`
- Type definitions: `src/types.ts`
- Test fixtures: `tests/fixtures.ts`
- User docs: `README.md`
