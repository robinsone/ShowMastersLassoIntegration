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
- Lasso API access
- Every position named in the CSV or Excel file must already exist in Lasso. The importer matches
  position titles case-insensitively after trimming surrounding whitespace.

  The importer maps **Billable Company** to the Lasso client and the **Orderer** fields to its client
  contact. If a file does not include Billable Company, enter the client company during review before
  importing.

## First-time setup

Create a local `.env` file from the example file and fill in your Lasso settings:

```bash
cp .env.example .env
```

Set the following values in `.env`:

- `LASSO_API_KEY`
- `LASSO_BASE_URL`
- `DIVISION_ID` (optional; leave blank when the Lasso account has no divisions)

## Run the app locally

Install dependencies and start the dev server:

```bash
pnpm install
pnpm dev
```

Open the local URL shown in the terminal, usually `http://localhost:3000`.

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

## Troubleshooting

- If a CSV or Excel file does not parse correctly, make sure it matches the ShowMasters export structure.
- For Excel files, export an unprotected `.xlsx` copy and ensure the first non-empty worksheet has
  SimpleData headers in its first populated row.
- If position preflight fails, create the missing position in Lasso or remove duplicate
  Lasso positions with the same name, then retry the import.
