import { getEdit } from "./dictEdits";

const cache = { en: {}, es: {} };

export async function lookupWord(rawWord, lang = "en") {
  const dir = lang === "es" ? "dict-es" : "dict";
  const wordRe = lang === "es" ? /^[a-záéíóúüñ][a-záéíóúüñ'-]*$/i : /^[a-z][a-z\-']*$/;
  const trimRe = lang === "es" ? /^[^a-záéíóúüñ]+|[^a-záéíóúüñ]+$/gi : /^[^a-z]+|[^a-z]+$/g;

  const word = (rawWord || "").toLowerCase().replace(trimRe, "");
  if (!wordRe.test(word)) return null;

  const letter = word[0];
  const langCache = cache[lang];
  if (!langCache[letter]) {
    langCache[letter] = fetch(`/${dir}/${letter}.json`)
      .then(r => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  const shard = await langCache[letter];
  const base = shard[word] || null;
  const edit = getEdit(lang, word);
  return edit ? { ...(base || {}), ...edit } : base;
}
