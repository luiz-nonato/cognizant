# Cognizant — BusinessFlow

Define-phase artifacts for **BusinessFlow**, a mini-ERP for small makers (recipe costing, dual inventory, three-state orders, dashboard, grounded multi-agent copilot).

Built with the [AAMAD](https://github.com/synaptic-ai-consulting/AAMAD) multi-agent development framework.

## Primary documents

| Document | Path |
| --- | --- |
| Market Research (MRD) | [`project-context/1.define/mrd.md`](project-context/1.define/mrd.md) |
| Product Requirements (PRD) | [`project-context/1.define/prd.md`](project-context/1.define/prd.md) |
| System Architecture (SAD) | [`project-context/1.define/sad.md`](project-context/1.define/sad.md) |

## How to read

1. **MRD** — market gap, personas, competition, risks, open questions.
2. **PRD** — locked product decisions (`DEC-*`), functional/NFR requirements, success metrics.
3. **SAD** — hybrid domain engine + CrewAI advisory crew, APIs, evals criteria.

## Local AAMAD setup

If you clone the full workspace (agents, rules, checklist):

- See [`AGENTS.md`](AGENTS.md) and [`CHECKLIST.md`](CHECKLIST.md).
- Runtime target for Build: `AAMAD_TARGET_RUNTIME=crewai` (default).
