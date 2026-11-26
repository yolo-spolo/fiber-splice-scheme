# Схема сварок — инструкции для агентов

Проект: учёт оптических сварок в муфтах. Next.js 15 + TypeScript +
Prisma/PostgreSQL. Подробности — `README.md`, правила проекта и история
релизов — `CHANGELOG.md` и `/root/handoffs/`.

## Agent skills

### Issue tracker

Задачи и спеки живут в GitHub Issues репозитория `yolo-spolo/fiber-splice-scheme`, через CLI `gh`. См. `docs/agents/issue-tracker.md`.

### Triage labels

Стандартные пять ролей: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. См. `docs/agents/triage-labels.md`.

### Domain docs

Одна доменная область (single-context): `GLOSSARY.md` и `docs/adr/` в корне. См. `docs/agents/domain.md`.
