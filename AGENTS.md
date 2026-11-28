# Схема сварок — инструкции для агентов

Проект: учёт оптических сварок в муфтах. Next.js 15 + TypeScript +
Prisma/PostgreSQL. Подробности — `README.md`, правила проекта и история
релизов — `CHANGELOG.md` и `/root/handoffs/`.

## Agent skills

### Ветки и проверки

Долгая ветка одна — `main`, и она защищена: без зелёного `check` в неё ничего
не вливается, force-push и удаление запрещены. Админ (владелец) пушит напрямую —
это нужно `scripts/release.mjs`, который коммитит версию и тег.

| Что | Как |
|---|---|
| Рабочая ветка | `feat/<тема>` или `fix/<тема>` — на одну задачу, живёт до мержа |
| Мерж | squash; ветка удаляется автоматически (`delete_branch_on_merge`) |
| Влитие | PR, required check — job `check` |
| Постоянная `dev` | не нужна: стенда она не даёт, деплой идёт из рабочего дерева |

**Сборку и e2e локально не гоняем** — это делает CI. Локально: `npx tsc --noEmit`,
`npx vitest run <файл>` по изменённому. Лог упавшего прогона читать только как
`gh run view --log-failed`, а не целиком. Подробности — `docs/agents/ci.md`.

### Issue tracker

Задачи и спеки живут в GitHub Issues репозитория `yolo-spolo/fiber-splice-scheme`, через CLI `gh`. См. `docs/agents/issue-tracker.md`.

### Triage labels

Стандартные пять ролей: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. См. `docs/agents/triage-labels.md`.

### Domain docs

Одна доменная область (single-context): `GLOSSARY.md` и `docs/adr/` в корне. См. `docs/agents/domain.md`.
