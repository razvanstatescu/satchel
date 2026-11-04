# plan/: how Satchel was planned and built

Internal planning documents. You don't need them to evaluate the product: the product is described in
[`README.md`](../README.md) and specified in [`kb/90-technical-spec.md`](../kb/90-technical-spec.md). Read them for
**why** something is the way it is, or for the project's timeline.

IDs used here (D-xx, H-xx, R-xx, SAT-xxx, G0–G12, P0-xx) are decoded in [`docs/GLOSSARY.md`](../docs/GLOSSARY.md).

## Live documents

| File | What it is |
|---|---|
| [`decisions.md`](decisions.md) | The decisions log (ADR-lite): every design and product decision **D-xx** with its reasons, and the decisions reserved for the human (**H-xx**). The latest entries are at the end |
| [`launch-checklist.md`](launch-checklist.md) | The steps from here to submission (keyless birth Nov 10, README proofs, submission Nov 13) and who does each |
| [`human-actions-ready.md`](human-actions-ready.md) | The steps only a human may take (approvals, funding, publishing), prepared as commands to paste |
| [`progress/feature-sprint.md`](progress/feature-sprint.md) | Status of the Oct 29 feature sprint: what shipped (C1–C7, A1–A3) and how it was verified |
| [`progress/sprint-log.md`](progress/sprint-log.md) | Append-only log, one line per milestone, newest last |

## Proposals (not implemented)

These describe features that **do not exist** in the code. They are research for possible future work.

| File | What it proposes |
|---|---|
| [`feature-ideas.md`](feature-ideas.md) | The Oct 29 list of candidate features. The ones chosen became the sprint (see `progress/feature-sprint.md`) |
| [`1click-convert-fund.md`](1click-convert-fund.md) | Swapping coins inside a Satchel and paying with any coin through NEAR Intents 1Click |
| [`dao-and-heirloom.md`](dao-and-heirloom.md) | DAO ownership of a Satchel, and inheritance with check-ins and an heir |

## Historical documents (Phase 0, Oct 21)

Written before implementation and kept as a record. Some statements in them were later changed by a decision; the
change is in `decisions.md`.

| File | What it is |
|---|---|
| [`implementation-plan.md`](implementation-plan.md) | The original day-by-day plan: gates G0–G12 and tasks SAT-xxx by lane. Implementation started on Oct 21 instead of Nov 1 (D-39) |
| [`phase0-checklist.md`](phase0-checklist.md) | What had to happen before the build: accounts, funding, decisions. Its "no product code before Nov 1" rule was lifted by D-39 |
| [`review.md`](review.md) | An independent adversarial review of the Phase-0 design and plan (findings R-01…R-41), answered in `decisions.md` revision 2 (changelog at its top) |
