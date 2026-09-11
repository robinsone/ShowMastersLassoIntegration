# ShowMasters to Lasso Integration

Import ShowMasters CSV and Excel exports into the
[Lasso Workforce](https://www.lasso.io/) API. This guide is for developers
forking the project to adapt, test, and publish their own version.

## What the importer manages

Each job creates or updates a Lasso client, client contact, venue, event,
event groups, event positions, and schedule entries. Re-importing a job updates
managed records instead of creating duplicates.

Events are identified by ShowMasters `Job Number`. Calls are grouped by `Date`
and `Call Type`. Source-managed schedule entries missing from a later import
are removed.

## Prerequisites

- Git and a GitHub account
- Node.js 22 or newer
- `pnpm`
- Visual Studio Code with the **Vue - Official** extension
- A Lasso sandbox, API key, and base URL; division ID is optional

Every position named in an import must already exist in Lasso. The importer
matches position titles case-insensitively after trimming surrounding spaces.

`Billable Company` identifies the Lasso client. The `Orderer` fields identify
its contact. Add a missing billable company during the review step before
importing.

## Fork and synchronize upstream

Fork this repository on GitHub, clone your fork, and configure the original
repository as `upstream`. Work on a branch in your fork rather than committing
directly to its default branch.

```bash
git clone https://github.com/YOUR-ACCOUNT/ShowMastersLassoIntegration.git
cd ShowMastersLassoIntegration
git remote add upstream https://github.com/robinsone/ShowMastersLassoIntegration.git
git checkout -b my-change
```

Before starting a new change, fetch upstream and merge its default branch into
your branch. Resolve conflicts, validate the result, and push the updated
branch to your fork.

```bash
git fetch upstream
git merge upstream/master
git push origin my-change
```

## Develop in Visual Studio Code

Open the cloned repository with **File > Open Folder...**, or run `code .`
from the repository root. Open an integrated terminal with
**Terminal > New Terminal**.

If `pnpm` is unavailable, run `corepack enable` once and restart the terminal.
Install the lockfile-pinned dependencies, then start the Nuxt development
server.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by the terminal, usually `http://localhost:3000`. Keep the
terminal running while you work, then use `Ctrl+C` in that terminal to stop it.

Run `pnpm electron:dev` instead to launch the Windows desktop app during
development. It starts the local Nuxt server and opens an Electron window.

## Configure Lasso and sample data

The app does not require a `.env` file for normal use. Enter the Lasso API key
and base URL in the app's configuration screen. Enter a positive division ID
only when the Lasso account uses divisions.

Settings are stored in the current browser's local storage. Configure each
browser or browser profile separately, and use sandbox credentials while
developing or validating a change.

Keep representative, sanitized exports in `data/`. Use
`SimpleData.csv`, `SimpleData-Revised.csv`, and
`SimpleData-MultipleJobs.xlsx` as regression samples.

## Update CSV and Excel mappings

Treat a changed ShowMasters export as an integration change. First determine
whether its headers, row structure, source values, or desired Lasso mapping
changed.

### Import contract

A row with `DATA` set to `VALUE` begins a job. Excel imports use the first
non-empty worksheet, whose first populated row must contain the required
headers.

| Export field | Purpose |
| --- | --- |
| `DATA` | Marks the first row of a job with `VALUE`. |
| `Job Number` | Identifies an event and repeat imports. |
| `Date`, `Start Time`, `End Time` | Set event and schedule dates and times. |
| `Call Type` | Groups positions into Lasso event groups. |
| `Position Title`, `Position Quantity per Title` | Resolve a Lasso position and its quantity. |

`Dress Code` is optional and becomes an event-position note. A position title
may include an optional label, such as `Stagehand <A>`.

### Code ownership

| Change | Update |
| --- | --- |
| CSV header or row parsing | `utils/csvParser.ts` |
| Required Excel headers or worksheet parsing | `utils/excelParser.ts` |
| ShowMasters-to-Lasso field mapping | `utils/mapper.ts` |
| Roles, airport fallbacks, or rate defaults | `utils/mappingConfig.ts` |
| Import identity or schedule reconciliation | `utils/importer.ts` |

Add a sanitized sample that demonstrates the changed export. Update CSV and
Excel parsing together when their shared contract changes.

Do not change external-code construction without intentionally changing import
identity. Those codes allow repeated imports to update existing events, groups,
positions, and schedule entries.

## Validate changes

Run a production build after every code or dependency change.

```bash
pnpm build
```

Upload the affected samples to the local app and inspect the review screen.
Then import them into a Lasso sandbox and verify the resulting records before
using production data.

## Submit changes

Create one feature branch per focused change. Do not commit Lasso credentials,
production exports, or customer data. Use sanitized fixtures in `data/` when
the change affects import behavior.

Before sharing a branch, complete the validation steps above and review the
resulting import in a sandbox. Commit the source, fixture, and README changes
needed to explain the new behavior.

Push the branch to your fork and open a pull request against the repository
that should receive the change. Use the pull request to describe the export
change, the expected Lasso result, and the sandbox validation performed.

## Publish your fork

Deploy the app to a Node-capable host. The Nitro server proxies Lasso API
requests, so static-only hosts, including GitHub Pages, are not supported.

Configure your host to install dependencies, build the app, and run its
persistent Node process with these commands.

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Push the validated branch that your host deploys. After deployment, complete a
sample sandbox import before entering production Lasso credentials.

### GitHub release automation

In the original repository, a push to `master` starts
`.github/workflows/release-and-deploy.yml`.

The workflow builds the Windows installer, increments the patch version,
creates a version tag and GitHub Release, and starts the web deployment workflow.

The deployment workflow publishes the web app and desktop-update files to the
original Vercel project. It uses the original Vercel scope and requires its
`VERCEL_TOKEN` secret.

Before pushing to `master` in a fork, configure those workflows for your own
hosting project and credentials, or disable them and use your own release
process. Do not assume an unmodified fork can publish a release.

## Windows desktop app

Download `ShowMasters-Lasso-Setup.exe` from the latest GitHub Release to
install the Windows desktop app. It includes the local connection service used
to proxy Lasso API requests.

The app checks for updates at startup and every four hours. It downloads
updates in the background and prompts the user to restart when an update is
ready.

The installer is unsigned. Use **More info** and **Run anyway** only when the
installer was downloaded from this repository's GitHub Release.

Build a local Windows installer with `pnpm electron:build`. The installer is
written to the `release/` directory.

## Use the importer

1. Enter Lasso credentials in the app.
2. Upload a ShowMasters `.csv` or unprotected `.xlsx` export.
3. Review the parsed jobs, contacts, notes, calls, positions, quantities, and times.
4. Start the import and review the created, updated, unchanged, or deleted records.

Job Confirmation Status is read-only and fixed to Unconfirmed. If a position
preflight fails, create the missing Lasso position or remove duplicate Lasso
positions, then retry the import.

## Troubleshooting

If a file does not parse, compare its headers and row layout with the import
contract and sample files in `data/`. Excel files must be unprotected and use
the required headers in the first populated row.

If Lasso cannot be reached, confirm the API key and base URL. For import
errors, return to the review step, correct the reported data, and start the
import again.
