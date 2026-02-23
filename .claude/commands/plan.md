Read .claude/specs/$ARGUMENTS.md first.

If the Status field is not "Approved", stop immediately and say:
"Spec must be approved before planning. Run /spec $ARGUMENTS and get approval first."

If the spec is Approved, create .claude/plans/$ARGUMENTS.md with:

# Plan: [Feature Name]

## Spec
.claude/specs/$ARGUMENTS.md

## Tasks

A numbered checkbox task list. For each task include:
- [ ] **Task N:** Description — scope: `python` | `typescript` | `both`, complexity: `small` | `medium` | `large`

Order:
1. Python tasks first
2. TypeScript mirror tasks after
3. Shared test vector tasks last

Call out dependencies between tasks (e.g., "depends on task 1").

---

Rules:
- Do NOT write any implementation code
- Each task should be one commit's worth of work
- Python tasks before TypeScript tasks
- End with: "Plan ready for review. Approve or provide changes."
