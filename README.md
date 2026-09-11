# ShowMasters → Lasso Integration

A web app for importing ShowMasters CSV and Excel exports into the [Lasso Workforce](https://www.lasso.io/) API.

The app guides you through four steps:

1. Upload a ShowMasters CSV or Excel file.
2. Review and edit the parsed jobs.
3. Run the import into Lasso.
4. Confirm completion and review the log.

## What it imports

For each job in the file, the app creates or updates the corresponding Lasso records:

- **Client** - matched by name; contact info attached
- **Venue** - matched by name; address, airport, and notes applied
- **Event** - named by Job Number; linked to client, venue, dates, and an optional division
- **Event Description** - booking staff notes, crew notes, onsite contact, logistics, and payment details
- **Event Groups** - one per call type/date combination, such as LOAD IN or LOAD OUT
- **Event Positions** - one per position per group, with quantity, schedule times, and crew-visible dress-code notes
- **Schedule Entries** - one per event position, matching the source call date and times; dates
  without a source call remain unscheduled

The import is idempotent. Running it again on the same data updates only what changed and avoids creating duplicates.

## Prerequisites

- Node.js 22 or newer
- `pnpm`
- Access to a Lasso sandbox for testing and a Lasso API key and base URL. A division ID is optional.
- Every position named in the CSV or Excel file must already exist in Lasso. The importer matches
  position titles case-insensitively after trimming surrounding whitespace.

The importer maps **Billable Company** to the Lasso client and the **Orderer** fields to its client
contact. If a file does not include Billable Company, enter the client company during review before
importing.

## Set up and run locally

Clone the repository (or your fork), install the locked dependencies, and start the Nuxt development
server:

```bash
git clone https://github.com/YOUR-ACCOUNT/ShowMastersLassoIntegration.git
cd ShowMastersLassoIntegration
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL shown in the terminal, usually `http://localhost:3000`.

### Use Visual Studio Code

1. Install [Visual Studio Code](https://code.visualstudio.com/) and Node.js 22 or newer. Install the
   **Vue - Official** extension in VS Code for Vue and TypeScript language support.
2. Clone the repository, then open its root folder with **File > Open Folder...**. Alternatively, run
   `code .` from the repository root after cloning it.
3. Open the integrated terminal with **Terminal > New Terminal**. If `pnpm` is not available, run
   `corepack enable` once, then restart the terminal.
4. Install dependencies and start the development server:

   ```bash
   pnpm install --frozen-lockfile
   pnpm dev
   ```

5. Open the local URL printed in the integrated terminal, usually `http://localhost:3000`. Keep that
   terminal running while developing; use `Ctrl+C` in the terminal to stop the server.
6. To develop the Windows desktop app instead of the browser version, run `pnpm electron:dev` in the
   integrated terminal. It starts the Nuxt server and opens the Electron desktop window.

Normal operation does not require a `.env` file. On first use, enter the Lasso API key and base URL in
the application's configuration screen. Enter a positive division ID only when the Lasso account uses
divisions. Those settings are stored only in the current browser's local storage, so each browser and
browser profile must be configured separately. Use a Lasso sandbox while developing or validating changes.

Before preparing a production deployment, create a production build:

```bash
pnpm build
```

## Install the app

The hosted app can be installed as a progressive web app in Chrome or Edge on desktop,
and in Chrome on Android. Use the **Install app** button in the header. If the browser
does not show a native install prompt yet, the button provides the browser-specific
installation steps instead.

Installed copies require an internet connection because every import communicates with
Lasso. When offline, the app shows a reconnect screen and automatically becomes
available again once connectivity returns.

### Windows desktop app

Download `ShowMasters-Lasso-Setup.exe` from the latest GitHub Release to install the
Windows desktop app. It contains the local connection service required to proxy Lasso
API requests. The app checks for updates at startup and every four hours, downloads them
in the background, and prompts you to restart when one is ready.

The installer is currently unsigned, so Windows may show a SmartScreen warning. Choose
**More info** and then **Run anyway** only when the installer was downloaded from this
repository's GitHub Release.

For desktop development, run:

```bash
pnpm electron:dev
```

## How to use the app

### 1. Configure Lasso credentials

The first time you open the app, it shows a credentials screen. Enter the Lasso API information there so the app can talk to your sandbox or production instance. Division ID is optional: leave it blank when the Lasso account has no divisions, or enter the positive numeric ID returned by Lasso.

### 2. Upload a CSV or Excel file

Use the upload step to choose a ShowMasters `.csv` or unprotected `.xlsx` export. Excel files must
have the existing SimpleData headers in their first populated row; the app reads the first non-empty
worksheet. If you do not select a file, the app will keep using its default sample data only as a reference
during development.

`data/SimpleData-MultipleJobs.xlsx` is a non-production sample workbook containing two jobs.

### 3. Review and edit parsed jobs

After upload, the app shows a review screen. Use this step to:

- inspect the parsed jobs
- confirm Job Confirmation Status is read-only and fixed to Unconfirmed
- fix any fields before importing, including a missing Billable Company
- review client, venue, event, and onsite notes
- add or remove calls and positions if needed

If you need to go back, use the Back button. That keeps the parsed data in place so you can continue editing.

### 4. Start the import

When the review looks correct, choose Start Import. The progress screen shows:

- which job is currently being processed
- a running log of created, updated, and skipped records
- any import errors that need attention

If an error occurs, you can go back to review the data and try again.

Before creating or updating any records, the importer loads Lasso positions once and
preflights every position in the file. Missing or duplicate position names stop the
import and list each affected job and call so the positions can be corrected in Lasso.

### 5. Finish and repeat

Once the import completes, you can upload another file or reset the workflow to start over.

## Maintain ShowMasters imports

Treat a changed ShowMasters export as an integration change. Start by determining whether it changed
column names, values within existing columns, or the desired Lasso mapping. Keep a representative,
non-production export in `data/` while making the change.

### Import contract

The app treats a row with `DATA` set to `VALUE` as the beginning of a job. It groups position rows by
`Date` and `Call Type`. The Excel parser reads the first non-empty worksheet and requires its first
populated row to contain these exact headers:

| Export field | Why it matters |
| --- | --- |
| `DATA` | Marks the first row of each job with `VALUE`. |
| `Job Number` | Becomes the event's external code and identifies repeat imports. |
| `Date`, `Start Time`, `End Time` | Create event and schedule dates and times. |
| `Call Type` | Groups positions into Lasso event groups. |
| `Position Title`, `Position Quantity per Title` | Resolve the Lasso position and its quantity. |

`Dress Code` is optional but, when supplied, is maintained as an event-position note. Position titles
can include an optional label in angle brackets, such as `Stagehand <A>`.

### Update the code for an export change

1. Save a sanitized sample CSV or unprotected `.xlsx` workbook in `data/` that demonstrates the new
   export format.
2. For changed headers or row structure, update `utils/csvParser.ts`. Update
   `REQUIRED_HEADERS` in `utils/excelParser.ts` at the same time when the Excel contract changes.
3. For changes to how a ShowMasters field populates Lasso records, update `utils/mapper.ts`. This file
   owns mappings for clients, contacts, venues, events, groups, positions, schedules, and managed notes.
4. For role mappings, market-to-airport fallbacks, or the default Lasso rate setting, update
   `utils/mappingConfig.ts`.
5. Avoid changing external-code construction in `utils/importer.ts` unless the import identity model is
   intentionally changing. Those codes make repeated imports update existing events, groups, positions,
   and schedules instead of creating duplicates. The importer also removes source-managed schedule
   entries that are no longer present in the new export.
6. Run `pnpm build`, upload the changed samples to a local instance, and inspect the review screen.
   Then import them into a Lasso sandbox and confirm the resulting records before using production data.

Use `data/SimpleData.csv`, `data/SimpleData-Revised.csv`, and
`data/SimpleData-MultipleJobs.xlsx` as regression samples. The revised CSV is useful for confirming
that importing an existing job updates only changed information.

## Fork and deploy

The application requires a Node-capable host because its Nitro server proxies Lasso API requests. Do
not use a static-only deployment such as GitHub Pages, and do not deploy the output of `pnpm generate`.

### Deploy a fork

1. Fork this repository on GitHub, then clone your fork and push any organization-specific changes to
   it.
2. In your host or cloud provider, configure Node.js 22 or newer and use these commands:

   ```bash
   pnpm install --frozen-lockfile
   pnpm build
   pnpm start
   ```

   The build command may be configured as
   `pnpm install --frozen-lockfile && pnpm build` when the provider requires one build command. The
   provider must run `pnpm start` as a persistent Node process.

3. Deploy the built application. Lasso credentials are normally provided by each user through the
   configuration screen, not as deployment environment variables.
4. Open the deployed app, enter sandbox Lasso credentials, and complete a sample import before
   switching to production credentials.

### Keep a fork current

Add the original repository as `upstream` once, then periodically merge the current upstream default
branch into the branch your provider deploys:

```bash
git remote add upstream https://github.com/robinsone/ShowMastersLassoIntegration.git
git fetch upstream
git checkout master
git merge upstream/master
pnpm install --frozen-lockfile
pnpm build
git push origin master
```

Resolve merge conflicts before building, and perform the same sandbox import validation before
redeploying. If your fork deploys a branch other than `master`, substitute that branch in the commands.

## Troubleshooting

- If a CSV or Excel file does not parse correctly, compare its headers and row layout with the import
  contract above and the representative files in `data/`.
- For Excel files, export an unprotected `.xlsx` copy and ensure the first non-empty worksheet has the
  required headers in its first populated row.
- If position preflight fails, create the missing position in Lasso or remove duplicate
  Lasso positions with the same name, then retry the import.
