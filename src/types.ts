export type Glob = string;
export type DetailedMatcher = {
  url?: string | Glob | RegExp;
  method?: string;
  headers?: Record<string, string>;
};
export type RequestMatcher =
  | string
  | Glob
  | RegExp
  | ((
      input: Parameters<typeof fetch>[0],
      init: Parameters<typeof fetch>[1],
    ) => boolean)
  | DetailedMatcher;

export type MockResponseOptions = {
  data?: unknown;
  status?: number;
  headers?: Record<string, string>;
};
