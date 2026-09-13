#!/usr/bin/env node
// Fails the build if translation namespaces diverge between locales.
// See frontend/docs/i18n.md for the workflow this enforces.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MESSAGES_DIR = join(import.meta.dirname, "..", "messages");
const LOCALES = ["kk", "ru", "en"];

function flattenKeys(obj, prefix = "") {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

let ok = true;

const namespacesByLocale = new Map();
for (const locale of LOCALES) {
  let files;
  try {
    files = readdirSync(join(MESSAGES_DIR, locale)).filter((f) =>
      f.endsWith(".json"),
    );
  } catch {
    console.error(`✗ missing locale directory: messages/${locale}`);
    ok = false;
    continue;
  }
  namespacesByLocale.set(locale, new Set(files));
}

const allNamespaces = new Set(
  [...namespacesByLocale.values()].flatMap((set) => [...set]),
);

for (const namespace of allNamespaces) {
  const localesWithFile = LOCALES.filter((l) =>
    namespacesByLocale.get(l)?.has(namespace),
  );
  if (localesWithFile.length !== LOCALES.length) {
    const missing = LOCALES.filter((l) => !localesWithFile.includes(l));
    console.error(
      `✗ ${namespace}: missing in locale(s): ${missing.join(", ")}`,
    );
    ok = false;
    continue;
  }

  const keySets = LOCALES.map((locale) => {
    const content = JSON.parse(
      readFileSync(join(MESSAGES_DIR, locale, namespace), "utf8"),
    );
    return { locale, keys: new Set(flattenKeys(content)) };
  });

  const [reference, ...rest] = keySets;
  for (const { locale, keys } of rest) {
    const missing = [...reference.keys].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !reference.keys.has(k));
    if (missing.length > 0) {
      console.error(
        `✗ ${namespace} (${locale}): missing key(s): ${missing.join(", ")}`,
      );
      ok = false;
    }
    if (extra.length > 0) {
      console.error(
        `✗ ${namespace} (${locale}): extra key(s) not in ${reference.locale}: ${extra.join(", ")}`,
      );
      ok = false;
    }
  }
}

if (ok) {
  console.log(
    `✓ i18n check passed — ${allNamespaces.size} namespace(s) consistent across ${LOCALES.join(", ")}`,
  );
  process.exit(0);
} else {
  console.error(
    "\ni18n check failed — see AGENTS.md's Internationalization section.",
  );
  process.exit(1);
}
