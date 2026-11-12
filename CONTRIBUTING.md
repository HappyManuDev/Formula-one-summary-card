# Contributing to Formula One Summary Card

Thanks for your interest! Bug reports, translations and features are all welcome.

## Reporting a bug or suggesting a feature

Use the [issue templates](https://github.com/HappyManuDev/Formula-one-summary-card/issues/new/choose). For bugs, the card version (shown in the browser console), your Home Assistant version, your browser and your card YAML help a lot.

## Development setup

Requirements: [Node.js](https://nodejs.org/) 20 or newer (24 LTS recommended, see `.nvmrc`).

```bash
git clone https://github.com/HappyManuDev/Formula-one-summary-card.git
cd Formula-one-summary-card
npm install
npm test
npm run build
```

To try your build in Home Assistant, copy `dist/formula-one-summary-card.js` to `<config>/www/`, add `/local/formula-one-summary-card.js?v=dev` as a JavaScript module resource, and reload the browser after each build.

## Code guidelines

- TypeScript in strict mode; keep the F1 logic (`src/f1/`) free of DOM and Lit, as pure functions.
- Add or update tests in `test/` for every behavior change. `test/fixtures/` holds real API answers.
- New user-facing texts go through `localize()`, with a translation in every language file.
- New options must be validated in `src/config.ts` and documented in the README options table.
- Keep the bundle small: the build fails above 60 kB.
- Run `npm run format`, `npm run lint`, `npm test` and `npm run build` before pushing. CI runs the same checks.

## Commit messages

The project uses [Conventional Commits](https://www.conventionalcommits.org/). Releases, version numbers and the changelog are generated from them by [release-please](https://github.com/googleapis/release-please):

| Prefix                                          | Effect                                        |
| ----------------------------------------------- | --------------------------------------------- |
| `feat:`                                         | New feature → minor version                   |
| `fix:`                                          | Bug fix → patch version                       |
| `feat!:` or `BREAKING CHANGE:`                  | Breaking change → major version (minor < 1.0) |
| `i18n:`                                         | Translations, listed in the changelog         |
| `docs:`                                         | Documentation, listed in the changelog        |
| `refactor:`, `test:`, `build:`, `ci:`, `chore:` | Not listed in the changelog                   |

## Adding a language

1. Copy `src/localize/languages/en.json` to `src/localize/languages/<code>.json` (for example `de.json`).
2. Translate the values. Keep the keys and the `{placeholders}` unchanged.
3. Import it and add it to `LANGUAGES` in `src/localize/localize.ts`.
4. Add the language to the table in the README.
5. Open a pull request titled `i18n: add <language>`.

## Release process (maintainers)

1. Merge pull requests into `main`.
2. release-please opens or updates a `chore: release x.y.z` pull request with the version bump and the changelog.
3. Merging that pull request creates the tag and the GitHub release; the `Release` workflow builds the card and attaches `formula-one-summary-card.js`, which HACS installs.
