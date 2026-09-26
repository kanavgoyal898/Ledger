# Ledger: Personal Finance Manager

Ledger is a simple, self-hosted personal transaction tracker. It was built to give one person (or a small household) a private place to log income and expenses, keep track of things that happen on a schedule (like rent, salary, or subscriptions), and get a quick visual sense of where money is coming from and going to, without needing to hand any of that data over to a third-party finance app. Under the hood it's a fairly ordinary Next.js application backed by Sanity as a headless content store, styled with Tailwind and shadcn-style components, and charted with Recharts.

<div style="text-align: center;">
  <img src="./image.png" alt="currencies" style="width: 100%;">
</div>

## What It Does

At its core, Ledger lets you record a transaction: a type (income or expense), a date, an amount, a category and optional sub-category, an account and optional sub-account, and a free-text heading and description if you want more detail than the structured fields provide. Once you have a handful of transactions logged, the dashboard aggregates them into a cash-flow chart over time and a pair of pie charts breaking down where your income and expenses are concentrated, with the ability to click into a category and see its sub-categories broken out individually. You can restrict any of this to the current month, the current year, last month, last year, all time, or a custom date range you pick yourself.

Beyond one-off transactions, Ledger also understands recurring ones. Rather than a simple "repeat every N days" model, it supports a fairly wide vocabulary of schedules: every day, every week (on the same weekday you started on), every month (on the same date, adjusted sensibly for shorter months), every year, and a set of "first/last (working) day of the week/month/year" variants for things like rent that's always due on the first of the month or a paycheck that lands on the last working day. When a recurring rule is active, the app is responsible for generating the actual transaction records as time passes, and it does this by re-checking every active rule on each request to the recurring-transactions endpoint and backfilling any occurrences between the rule's start date and today that haven't already been created. Rules can be paused and later resumed either by picking up where you left off (backfilling everything that was missed) or by only resuming from the next occurrence going forward, which is useful if you deliberately skipped a period and don't want a pile of retroactive transactions appearing.

Categories and accounts (including their sub-categories and sub-accounts) are configured on the settings page and permanently removed when deleted. Historical transactions retain their stored labels. Category deletion also offers migration of existing transactions to another category.

If you need your data outside of the app, the transactions page includes an export menu that can produce CSV, TSV, old-style Excel (.xls), modern Excel (.xlsx), or a simple landscape PDF table, all generated client-side.

## Technology

The application is written in TypeScript on top of Next.js, using the App Router and Turbopack, with React 19 for the UI layer. Data lives in Sanity, which is used both as the source of truth for transactions, recurring rules, settings, and users, and as an editable content studio (embedded directly in the app at the /studio route) for anyone who wants to poke at the raw documents outside of the app's own UI. Styling is done with Tailwind CSS v4, and the component layer is built on shadcn-style components sitting on top of Base UI primitives, so buttons, dialogs, selects, calendars, and so on all follow a consistent design system rather than being built from scratch per feature. Charts are rendered with Recharts, forms are managed with React Hook Form and validated with Zod schemas that are shared between the client-side forms and the server-side API route handlers, and the test suite is written with Vitest alongside Testing Library for anything that touches rendered components.

## Getting Set Up

Before running the app you'll need Node.js 18 or newer installed, along with a Sanity project. The free tier of Sanity is more than sufficient for personal use, since this app has a tiny document footprint compared to what Sanity is usually used for (large content sites).

Once you have a Sanity project, create a `.env` file in the root of the repository with the following four variables:

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01
SANITY_API_TOKEN=your-write-token
```

The first two values come directly from your Sanity project's dashboard — the project ID and the name of the dataset you want to use (production is the default dataset name Sanity creates for you, but you can use any dataset you like). The API version can generally be left as a recent date string and doesn't need to change often. The token is the one that matters most to get right: it needs to be a token with write access (Editor or Administrator permissions), because the app uses it server-side to create, update, and delete documents on your behalf. Without a valid write token, you'll be able to view the dashboard once there's data in it, but every create, edit, and delete action from the app itself will fail.

With the environment file in place, install dependencies and start the dev server:

```bash
npm install
npm run dev
```

The app will be available at http://localhost:3000, where signed-out visitors see a public introduction to Ledger with feature highlights and links to sign in and explore the repository. Signed-in users see their dashboard at the same URL. There is no built-in sign-up flow. To create your first user, go to the embedded Studio at http://localhost:3000/studio (or your Sanity project's own hosted studio, if you'd rather use that), navigate to Users, and create a new user document. You'll need to give it a first name, a username, and a six-digit numeric passcode — these are the two things the login form asks for. There's also a "Token Reset" field, which controls how long your login session lasts before you're asked to sign in again; the options range from one day up to a year, or "never" if you'd rather stay logged in indefinitely on that device. Once the user document is published, you can log in normally through the app's login page.

## Available Scripts

The following npm scripts are defined in package.json and cover the day-to-day development workflow:

- `npm run dev` starts the local development server with hot reloading.
- `npm run build` produces an optimized production build.
- `npm run start` runs that production build locally, useful for sanity-checking a build before deploying it.
- `npm run lint` runs ESLint across the project using the Next.js recommended configuration.
- `npm run test` runs the full Vitest test suite a single time and exits, which is what you'd typically use in CI.
- `npm run test:watch` runs the same suite but stays open and re-runs affected tests as you edit files, which is more useful during active development.
- `npm run test:coverage` runs the suite once more but also produces a coverage report across the library code and API route handlers.

## How the Project Is Organized

The repository follows a fairly conventional Next.js App Router layout, with a few extra top-level folders for the Sanity schema definitions and the test suite. Broadly:

The `app` directory contains all of the routes. Inside it, the `(app)` route group holds every authenticated page — the dashboard at the root, the transactions page, the recurring-transactions redirect, the settings page, and the account page — all sharing a common layout that renders the floating navigation deck at the bottom of the screen. Alongside that, the `api` directory holds the route handlers that back the app: authentication endpoints for logging in, logging out, checking the current session, and resetting a passcode; and CRUD-style endpoints for transactions, recurring transactions, and settings. There's also a standalone `login` route outside the authenticated group, and a `studio` route that mounts the embedded Sanity Studio.

The `components` directory mirrors the feature areas of the app: authentication-related components (the login form, the six-digit passcode input, and the account page itself), dashboard components (the overall dashboard view and its charts), a layout folder holding the floating navigation deck, settings components for managing categories and accounts, and transaction-related components covering the main table, the create/edit sheet, and the recurring-transactions section with its calendar view. A separate `ui` folder holds the lower-level, mostly generic shadcn-style components (buttons, dialogs, selects, and so on) that the feature components are built out of.

The `lib` directory is where the shared, non-visual logic lives: `types.ts` defines the TypeScript interfaces for every document type, the Zod schemas used to validate both form input and API request bodies, and the GROQ queries used to fetch data from Sanity; `recurrence.ts` contains the pure recurrence-calculation logic (given a start date, a frequency, and an optional end date, work out which calendar dates the rule falls on); `recurring-server.ts` builds on top of that to actually create missing transaction documents in Sanity for any recurring rule that's fallen behind; and `sanity.ts` sets up the two Sanity client instances the app uses, one read-only and CDN-backed for general fetching, and one read-write and uncached for anything that needs to reflect changes immediately.

The `sanity` directory holds the schema definitions themselves — the document types for transactions, recurring transactions, settings (a singleton document holding the category and account lists), and users — which is also what powers the embedded Studio's editing experience. Finally, the `tests` directory holds the Vitest test suites, split roughly along the same lines as the library code: one file for the recurrence engine, one for the API route handlers, and one for the shared types and validation schemas.

## A Note on Authentication

The authentication model here is deliberately lightweight, and it's worth understanding its limits before relying on it for anything sensitive. Logging in requires a username and a six-digit numeric passcode, which are checked directly against the corresponding user document stored in Sanity. On a successful login, the app sets a cookie that a piece of Next.js middleware (defined in proxy.ts) checks on every request; if the cookie isn't present, the middleware redirects to the login page, with the login page itself, the Studio, and the authentication API routes explicitly excluded from that check so you're never locked out of the one place you'd need to fix things. How long that cookie stays valid before you're asked to log in again is controlled per-user, through the token reset setting mentioned earlier. There's no rate limiting, no hashing of the stored passcode, and no concept of multiple accounts interacting with each other — it's built for a single trusted user (or a small number of trusted people who all know the same login flow), not as a general-purpose multi-tenant authentication system.

## Recurring Transactions in More Detail

Because the recurring transaction feature is one of the more involved parts of the app, it's worth spelling out how it actually behaves. A recurring rule stores a start date, an optional end date, and a frequency drawn from a fairly long list: daily; every week (recurring on whichever weekday the start date falls on); every month (recurring on the same day of the month, adjusted down for months that are too short to have that day); every year; and then a family of "boundary" frequencies covering the first or last day of the week, month, or year, plus working-day variants of each of those that skip weekends. Whenever the recurring-transactions endpoint is hit, every active rule in the system is re-evaluated: the app works out every date between the rule's start date and today (respecting the rule's end date, if it has one) that matches its frequency, checks which of those dates already have a corresponding transaction (transactions created by a rule are tagged with the rule's ID and the specific occurrence date so this check is reliable), and creates transactions for anything that's missing. This means the underlying transaction records are always a faithful, literal history of what should have happened on each occurrence date, rather than a single ongoing "recurring" line item that only exists conceptually.

Pausing a rule simply stops it from generating new transactions without deleting anything that already exists. Reactivating a paused rule gives you two choices: resuming and backfilling, which catches up on every occurrence that was missed while the rule was inactive, or resuming from the next occurrence only, which deliberately skips the gap and starts fresh from tomorrow onward. The right choice depends on why the rule was paused in the first place — if you paused a subscription because you genuinely weren't being charged, you'd want to skip the gap; if you paused a rule for an unrelated reason and still owe those transactions, you'd want to backfill.

## Running the Tests

The test suite is written with Vitest and Testing Library, and it exercises three broad areas: the recurrence calculation logic in isolation, since it's the part of the codebase most likely to have subtle date-arithmetic bugs; the API route handlers, using a mocked Sanity client so the tests don't depend on network access or a real project; and the shared Zod validation schemas and small utility functions like currency formatting. To run everything once:

```bash
npm run test
```

## Deploying

Because this is a standard Next.js application with no server-side dependencies beyond Sanity itself, it can be deployed to more or less any hosting provider that supports Next.js out of the box. Wherever you deploy it, make sure the same four environment variables described earlier are configured in that environment, and make sure your Sanity dataset's CORS settings include the production domain you're deploying to — without that, the app will build and serve pages fine, but every request to Sanity from the browser or from the server will be rejected.
