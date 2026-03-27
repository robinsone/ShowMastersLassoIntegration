# ShowMasters → Lasso Integration

A Node.js command-line utility that reads job data from a ShowMasters CSV export and upserts it into the [Lasso Workforce](https://www.lasso.io/) API.

## What it does

Given a CSV file (default: `data/SimpleData.csv`), the tool creates or updates the following records in Lasso for each job row:

- **Client** — matched by name; contact info attached
- **Venue** — matched by name; address, airport, and notes applied
- **Event** — named by Job Number; linked to client, venue, division, and dates
- **Event Notes** — booking staff notes, crew notes, onsite contact, logistics, payment details
- **Event Groups** — one per call type/date combination (e.g. LOAD IN, LOAD OUT)
- **Positions** — looked up or created by title (import_name)
- **Event Positions** — one per position per group, with quantity and schedule times
- **Schedule Entries** — one per event position, matching the call date and times

All operations are **idempotent** — running the tool multiple times on the same data will not create duplicates. Records are matched via `external_code` keys derived from the job number, and changes are only written when a value has actually changed.

## Setup

```
npm install
cp .env.example .env
# Fill in LASSO_API_KEY, LASSO_BASE_URL, and DIVISION_ID in .env
```

## Usage

```
node src/index.js                        # uses data/SimpleData.csv
node src/index.js path/to/custom.csv     # use a different CSV file
```

### One-time position seed

To pre-populate Lasso with positions from `data/Positions.csv`:

```
node scripts/seedPositions.js
```

## Output legend

| Symbol | Meaning |
|--------|---------|
| `[+]`  | Record created |
| `[~]`  | Record updated (field changed) |
| `[=]`  | Record unchanged |
| `[WARN]` | Non-fatal warning (e.g. user role not found) |

## CSV format

The input CSV must follow the ShowMasters export format with a `DATA` column. The first data row starts with `VALUE` and contains all job-level fields. Continuation rows contain only the call group columns (Date, Start Time, End Time, Call Type, Position Title, Position Quantity per Title). Blank rows between groups are ignored.
