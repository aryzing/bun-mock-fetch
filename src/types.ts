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

export type ResponseFn = (arg: {
  mockedRequest: MockedRequest;
  input: Parameters<typeof fetch>[0];
  init?: Parameters<typeof fetch>[1];
  nativeFetch: typeof fetch;
}) => Promise<Response> | Response;

export type ResponseOrResponseFn = Response | ResponseFn;

export type MockedRequest =
  | {
      type: "regexp";
      regexp: RegExp;
      response: ResponseOrResponseFn;
    }
  | {
      type: "stringLiteralOrMinimatch";
      value: string;
      response: ResponseOrResponseFn;
    }
  | {
      type: "function";
      fn: (
        input: Parameters<typeof fetch>[0],
        init: Parameters<typeof fetch>[1],
      ) => boolean;
      response: ResponseOrResponseFn;
    }
  | {
      type: "detailed";
      matcher: DetailedMatcher;
      response: ResponseOrResponseFn;
    };
