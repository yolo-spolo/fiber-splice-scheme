# Трекер задач: GitHub

Задачи и спеки этого репозитория живут в GitHub Issues. Все операции — через
CLI `gh`.

## Соглашения

- **Создать задачу**: `gh issue create --title "..." --body "..."`. Многострочное
  тело — через heredoc.
- **Прочитать задачу**: `gh issue view <номер> --json number,title,body,labels,comments`.
- **Список задач**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`
  с нужными `--label` и `--state`.
- **Сделать задачу подзадачей**: `gh issue create --parent <parent> ...` или позже
  `gh issue edit <parent> --add-sub-issue <child>` (`gh` 2.94+). На старом `gh`:
  `gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>`
  (числовой database id, как в разделе «Блокировки»). Без подзадач — строкой
  `Part of #<parent>` в начале тела дочерней задачи.
- **Блокировки**: штатные зависимости GitHub — то, что видно в интерфейсе.
  Ребро добавляется через `gh issue create --blocked-by <n>,<n> ...` или
  `gh issue edit <child> --add-blocked-by <blocker>` (`gh` 2.94+). На старом `gh`:
  `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`,
  где `<blocker-db-id>` — числовой **database id** блокера
  (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, не `#number` и не `node_id`).
  Где зависимостей нет — строка `Blocked by: #<n>, #<n>` в начале тела. Задача
  разблокирована, когда закрыты все блокеры.
- **Сколько открытых блокеров**: `gh api repos/<owner>/<repo>/issues/<n> --jq .issue_dependencies_summary.blocked_by`
  (только открытые; 0 — можно начинать). `gh issue view <n> --json blockedBy`
  показывает и закрытые, поэтому фильтруйте:
  `--jq '[.blockedBy.nodes[] | select(.state == "OPEN")] | length'`.
- **Комментарий**: `gh issue comment <номер> --body "..."`.
- **Метки**: `gh issue edit <номер> --add-label "..."` / `--remove-label "..."`.
- **Закрыть**: сначала объяснение комментарием
  (`gh issue comment <номер> --body "..."`), затем `gh issue close <номер>`.
  На уже закрытой задаче `gh issue close --comment` молча теряет комментарий
  и всё равно выходит с кодом 0.

Репозиторий `gh` определяет по `git remote -v` сам, когда запущен внутри клона.

Заводить задачи только в репозиторий владельца. Не заводить в `mattpocock/skills`
(репозиторий, откуда пришли скиллы), если он не принадлежит пользователю.
В форке `gh` может по умолчанию выбрать upstream-родителя, поэтому перед первым
`gh issue create` за сессию проверьте цель через `gh repo view --json nameWithOwner`
и подтвердите её у пользователя, если это не его репозиторий.

## Pull requests как источник запросов

**PR как источник запросов: нет.** _(Поставьте `да`, если репозиторий считает
внешние PR заявками на функциональность; `/triage` читает этот флаг.)_

Если поставить `да`, PR проходят те же метки и состояния, что и задачи, через
аналоги `gh pr`:

- **Прочитать PR**: `gh pr view <номер>`, затем `gh pr view <номер> --comments`
  (вне TTY `--comments` печатает только комментарии, без тела), и
  `gh pr diff <номер>` для диффа.
- **Внешние PR для triage**: `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`.
- **Комментарий / метка / закрытие**: `gh pr comment`, `gh pr edit --add-label` /
  `--remove-label`, `gh pr close`.

Номера задач и PR в GitHub общие, поэтому `#42` может быть и тем, и другим:
проверяйте `gh pr view 42`, при неудаче — `gh issue view 42`.

## Когда скилл говорит «опубликуй в трекере»

Создавайте задачу GitHub.

## Когда скилл говорит «возьми нужную задачу»

Читайте её способом из раздела «Прочитать задачу».

## Wayfinding

Используется `/wayfinder`. **Карта** — одна задача с дочерними задачами-тикетами.

- **Карта**: одна задача с меткой `wayfinder:map`, в теле — Notes / Decisions-so-far / Fog.
  `gh issue create --label wayfinder:map`.
- **Дочерний тикет**: задача, привязанная к карте как подзадача GitHub (см. выше).
  Где подзадачи не включены, добавьте её в task list в теле карты и поставьте
  `Part of #<map>` в начале тела. Метки: `wayfinder:<type>`
  (`research`/`prototype`/`grilling`/`task`). После взятия тикет назначается
  на ведущего разработчика.
- **Блокировки**: см. «Блокировки» в «Соглашениях».
- **Поиск фронта**: открытые дочерние задачи карты (`gh issue list --state open`
  по подзадачам / task list), отбросить те, у кого есть открытый блокер (см.
  «Сколько открытых блокеров» или открытая задача в строке `Blocked by`), или
  есть исполнитель; побеждает первая в порядке карты.
- **Взять**: `gh issue edit <n> --add-assignee @me`, первая запись сессии.
- **Решить**: `gh issue comment <n> --body "<ответ>"`, затем `gh issue close <n>`,
  затем дописать указатель на контекст (суть + ссылка) в Decisions-so-far карты.
