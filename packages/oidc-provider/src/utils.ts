const CODE_RE = /[?&]code=[^&]+/;
const STATE_RE = /[?&]state=[^&]+/;
const ERROR_RE = /[?&]error=[^&]+/;

export const hasAuthParams = (searchParams = window.location.search): boolean =>
  (CODE_RE.test(searchParams) || ERROR_RE.test(searchParams)) && STATE_RE.test(searchParams);

const dedupe = (arr: string[]) => Array.from(new Set(arr));

export const getUniqueScopes = (...scopes: string[]): string => {
  return dedupe(scopes.join(" ").trim().split(/\s+/)).join(" ");
};
