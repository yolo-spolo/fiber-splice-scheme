import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Конфиг ESLint в новом формате (flat config).
 *
 * `eslint-config-next` 15.1 выходит только в старом формате, поэтому
 * подключается через `FlatCompat`. Правила — те же, что предлагает Next:
 * `core-web-vitals` (лишние картинки и ссылки без alt/next/link) плюс
 * типовые правила TypeScript.
 *
 * Запуск: `npm run lint`. Без конфига `next lint` открывал интерактивный
 * мастер и вешал любую автоматизацию — поэтому скрипт вызывает `eslint`
 * напрямую, а не `next lint`.
 */
const baseDirectory = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory });

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      // Сгенерированное Prisma: не наш код и тысячи строк.
      "src/generated/**",
      // Снимки страниц и временные файлы прогонов.
      "e2e/screenshots/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;
