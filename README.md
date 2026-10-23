# Finodus

A working, high-fidelity prototype of a Human-on-the-Loop month-end reconciliation agent. Built for initial usability research with synthetic bank and ledger records, simulated integrations, and explicit human decisions.

## Run locally

Use Node.js 24 and npm. From this directory:

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite, normally **http://127.0.0.1:5173**. No environment variables, credentials, or external services are required.

For a production build:

```sh
npm run build
npm run preview
```

## Try the complete task

1. Take or skip the first-visit product tour. Replay it from **Help & product tour** in the topbar.
2. Open **Review finding**. Compare the two supplier payments and inspect the bank-cleared check image.
3. Select the supported payment and explicitly **Confirm match**. Watch stays active.
4. Open **Review remaining check** and document the outstanding treatment with a follow-up owner and date.
5. Open the review package, inspect the balance bridge, and **Submit for review**.
6. In the separate bottom **Test controls** bar, view the prototype as **Daniel Rivera, Controller**.
7. Sign off, return the package with a reason, or reopen a signed-off package to prepare a new version. Preserved versions remain inspectable.

Synthetic progress and history persist in this browser. Test controls can reset the scenario. Tour completion is stored separately and survives a scenario reset.

## Included behavior

- Reconciliation workspace, bank-match investigation, outstanding-check treatment, and independent review.
- Bklit animated progress visualization and request-state text; Phosphor icons; supplied Finodus logos.
- Locally served TikTok Sans, Plus Jakarta Sans, and Chivo Mono variable fonts.
- First-visit orientation and a five-stop, skippable, replayable tour with keyboard support and reduced-motion behavior.
- Original synthetic check image, invoice and purchase-order records, extracted fields, provenance, and document zoom.
- Explicit decisions, source revalidation, role restrictions, correction reasons, versioned review snapshots, and activity history.
- Browser-local CSV statement and JSON package exports.
- Test scenarios: standard, missing evidence, incomplete coverage, stale source, failed save, uncertain save result, and an existing mistaken match.

The prototype simulates investigation, source retrieval, saves, and identities. Policy settings are interactive, but the remaining ambiguous payment is held for human review in every agent mode. There is no live AI service, financial-system integration, production authentication, or server persistence. The bottom role switch is a research control, not an authorization mechanism.

## Checks

```sh
npm test
npm run test:e2e
```

The unit suite checks financial-state transitions, evidence gates, independent review, operation deduplication, and preservation of earlier decisions. Playwright checks the full task, first-visit tour, failure recovery, source coverage, persistence, automated accessibility, and mobile overflow.

Playwright uses an existing Chromium installation when available on Windows. Otherwise install its browser:

```sh
npx playwright install chromium
```

An optional `BROWSER_EXECUTABLE_PATH` environment variable selects a different installed Chromium executable. Browser screenshots and failure traces are written to the ignored `test-results/` directory. With a dev server running, `node scripts/audit-preview.mjs` provides a concise workspace/investigation accessibility and mobile-width check.

## Source layout

| Location | Purpose |
|---|---|
| `src/lib/reconciliation.ts` | State transitions, synthetic fixtures, permissions, and submission rules. |
| `src/components/Workspace.tsx` | Account context, work queue, progress, bank activity, and export. |
| `src/components/Investigation.tsx` | Candidate comparison and outstanding-check classification. |
| `src/components/Review.tsx` | Balance bridge, independent review, and preserved packages. |
| `src/components/ProductTour.tsx` | First-visit welcome and guided orientation. |
| `src/components/Evidence.tsx` | Source documents, extracted fields, and provenance. |
| `src/components/charts/` | Bklit chart source installed through its shadcn registry. |
| `public/evidence/` | Synthetic cleared-check asset. |
| `docs/high-fidelity-prep/` | Original brand guidance and supplied logo assets. |

## GitHub and Vercel

The repository is prepared as a standard Vite project with a lockfile, ignore rules, and `vercel.json`. When importing it into Vercel, use the repository root, the Vite framework preset, `npm run build`, and the `dist` output directory. Navigation uses client-side hash routes. Each visitor has an independent browser-local session.

Source repository: [IrfanKurnia33/finodus-reconciliation](https://github.com/IrfanKurnia33/finodus-reconciliation/tree/main). Vercel deployment remains planned.

Original design guidance and logo assets are in [docs/high-fidelity-prep](docs/high-fidelity-prep/mini-brand-guidelines.md). Third-party source and font license texts are retained in [public/licenses](public/licenses/).
