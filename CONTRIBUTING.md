# Contributing

## Running Tests

The project includes a comprehensive test suite that uses Playwright to test
Playwright (meta-testing):

```bash
yarn install
yarn test
```

Tests spawn child Playwright processes, generate real HTML reports, and verify
the parser extracts data correctly.

## Releasing

To release a new version with semantic-release, run the following command.

```bash
gh workflow run release.yml
```
