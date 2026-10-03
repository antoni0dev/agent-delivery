# PRD: <product or feature>

- Owner and approvers:
- Status: draft, approved or superseded
- Approved version or date:
- Design source:
- Master ticket:
- Technical spec:

One paragraph: the problem, the target user and the core value.

## Files

| File | Contents | Load when |
|---|---|---|
| `00-index.md` | Scope, status and links | Always, first |
| `01-context.md` | Problem, goals, non-goals and narrative | Judging scope or priority |
| `02-requirements.md` | User stories, functional requirements, constraints and open questions | Planning or implementing behavior |
| `03-ux-and-states.md` | Flows, copy and loading, empty, error and success states | Building or reviewing UI |
| `04-data-fields.md` | Each field's type, units, source or formula, freshness and owner | Modeling data, mapping APIs or reviewing numbers |
| `05-dependencies-and-risks.md` | Services, contracts, third parties and risks | Integration, sequencing or risk review |
| `06-acceptance.md` | Acceptance criteria, journeys, metrics and release conditions | Writing tests, QA or release decisions |

Load only the files the task needs. A behavior, state, label or limit absent from these files is undecided: add it to the open questions register in `02-requirements.md` instead of inventing it.
