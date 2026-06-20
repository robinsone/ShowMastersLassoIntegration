# ShowMasters → Lasso Integration

A web app for importing ShowMasters CSV exports into the [Lasso Workforce](https://www.lasso.io/) API.

The app guides you through four steps:

1. Upload a ShowMasters CSV file.
2. Review and edit the parsed jobs.
3. Run the import into Lasso.
4. Confirm completion and review the log.

## What it imports

For each job in the CSV, the app creates or updates the corresponding Lasso records:

- **Client** - matched by name; contact info attached
- **Venue** - matched by name; address, airport, and notes applied
- **Event** - named by Job Number; linked to client, venue, division, and dates
- **Event Notes** - booking staff notes, crew notes, onsite contact, logistics, payment details
- **Event Groups** - one per call type/date combination, such as LOAD IN or LOAD OUT
- **Event Positions** - one per position per group, with quantity and schedule times
- **Schedule Entries** - one per event position, matching the call date and times

The import is idempotent. Running it again on the same data updates only what changed and avoids creating duplicates.

## Prerequisites

- Node.js 22 or newer
- `pnpm`
- Lasso API access

## First-time setup

Create a local `.env` file from the example file and fill in your Lasso settings:

```bash
cp .env.example .env
```

Set the following values in `.env`:

- `LASSO_API_KEY`
- `LASSO_BASE_URL`
- `DIVISION_ID`

## Run the app locally

Install dependencies and start the dev server:

```bash
pnpm install
pnpm dev
```

Open the local URL shown in the terminal, usually `http://localhost:3000`.

## How to use the app

### 1. Configure Lasso credentials

The first time you open the app, it shows a credentials screen. Enter the Lasso API information there so the app can talk to your sandbox or production instance.

### 2. Upload a CSV file

Use the upload step to choose a ShowMasters export. If you do not select a file, the app will keep using its default sample data only as a reference during development.

### 3. Review and edit parsed jobs

After upload, the app shows a review screen. Use this step to:

- inspect the parsed jobs
- fix any fields before importing
- add or remove calls and positions if needed

If you need to go back, use the Back button. That keeps the parsed data in place so you can continue editing.

### 4. Start the import

When the review looks correct, choose Start Import. The progress screen shows:

- which job is currently being processed
- a running log of created, updated, and skipped records
- any import errors that need attention

If an error occurs, you can go back to review the data and try again.

### 5. Finish and repeat

Once the import completes, you can upload another CSV or reset the workflow to start over.

## Troubleshooting

- If a CSV does not parse correctly, make sure it matches the ShowMasters export structure.
