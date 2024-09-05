import { minimatch } from "minimatch";
import { defaultMockOptions } from "./constants.js";
import { type MockOptions } from "./types.js";
import { makeSimplifiedResponse, type SimplifiedResponse } from "./utils.js";

let originalFetch: typeof fetch;

let isVerbose = false;
export function setIsVerbose(value: boolean) {
  isVerbose = value;
}

type MockedRequest =
  | { type: "regexp"; regexp: RegExp; options: MockOptions }
  | { type: "minimatch"; minimatch: string; options: MockOptions };
// | {
//     type: "function";
//     fn: (
//       input: Parameters<typeof fetch>[0],
//       init: Parameters<typeof fetch>[1],
//     ) => boolean;
//     options: MockOptions;
//   };

/**
 * The cache for registered mocked requests.
 */
const mockedRequests: Array<MockedRequest> = [];

type Minimatch = string;
export type URLMatch = Minimatch | RegExp;
// | ((
//     input: Parameters<typeof fetch>[0],
//     init: Parameters<typeof fetch>[1],
//   ) => boolean);

/**
 * Mock the fetch method. The most recently defined matching mock will be used.
 */
export const mockFetch = (
  urlMatch: URLMatch,
  options: MockOptions = defaultMockOptions,
): void => {
  if (urlMatch instanceof RegExp) {
    mockedRequests.unshift({ type: "regexp", regexp: urlMatch, options });
  } else if (typeof urlMatch === "string") {
    mockedRequests.unshift({ type: "minimatch", minimatch: urlMatch, options });
  }
  // else if (typeof urlMatch === "function") {
  //   mockedRequests.unshift({ type: "function", fn: urlMatch, options });
  // }
  else {
    throw new Error("Invalid URL match type");
  }

  if (!originalFetch) {
    originalFetch = globalThis.fetch;

    // @ts-ignore
    globalThis.fetch = mockedFetch;
  }
};

/**
 * Clear the fetch mock.
 */
export const clearFetchMocks = () => {
  mockedRequests.length = 0;

  // Restore the original fetch method, if it was mocked.
  if (!!originalFetch) {
    // @ts-ignore
    globalThis.fetch = originalFetch.bind({});
    // @ts-ignore
    originalFetch = undefined;
  }
};

let isUsingBuiltInFetchFallback = true;
/**
 * Enable or disable using the built-in fetch as fallback when a request doesn't
 * match any mock. Enabled by default.
 */
export function setIsUsingBuiltInFetchFallback(value: boolean) {
  isUsingBuiltInFetchFallback = value;
}

/**
 * A mocked fetch method.
 */
const mockedFetch = async (
  input: Parameters<typeof fetch>[0],
  init?: RequestInit,
): Promise<SimplifiedResponse> => {
  const path = input instanceof Request ? input.url : input.toString();
  if (isVerbose) console.debug("[BMF]: Mocked fetch called with path:", path);

  for (const mockedRequest of mockedRequests) {
    switch (mockedRequest.type) {
      case "regexp": {
        // Match path
        if (!mockedRequest.regexp.test(path)) continue;

        // Match method
        const optionsMethod = mockedRequest.options.method;
        const requestMethod = (init && init.method) || "GET";
        if (
          optionsMethod &&
          optionsMethod.toLowerCase() !== requestMethod.toLowerCase()
        )
          continue;

        // Match headers
        const optionsHeaders = mockedRequest.options.headers;
        if (optionsHeaders) {
          const inputHeaders =
            input instanceof Request ? input.headers : new Headers();
          const initHeaders = new Headers(init?.headers);
          const requestHeaders = new Headers([...inputHeaders, ...initHeaders]);
          const headersMatch = [...Object.entries(optionsHeaders)].every(
            ([optionHeaderName, optionHeaderValue]) => {
              const requestHeaderValue = requestHeaders.get(optionHeaderName);
              return requestHeaderValue === optionHeaderValue;
            },
          );
          if (!headersMatch) continue;
        }

        return makeSimplifiedResponse(path, mockedRequest.options);
      }

      case "minimatch": {
        // Match path
        if (!minimatch(path, mockedRequest.minimatch)) continue;

        // Match method
        const optionsMethod = mockedRequest.options.method;
        const requestMethod = (init && init.method) || "GET";
        if (
          optionsMethod &&
          optionsMethod.toLowerCase() !== requestMethod.toLowerCase()
        )
          continue;

        // Match headers
        const optionsHeaders = mockedRequest.options.headers;
        if (optionsHeaders) {
          const inputHeaders =
            input instanceof Request ? input.headers : new Headers();
          const initHeaders = new Headers(init?.headers);
          const requestHeaders = new Headers([...inputHeaders, ...initHeaders]);
          const headersMatch = [...Object.entries(optionsHeaders)].every(
            ([optionHeaderName, optionHeaderValue]) => {
              const requestHeaderValue = requestHeaders.get(optionHeaderName);
              return requestHeaderValue === optionHeaderValue;
            },
          );
          if (!headersMatch) continue;
        }

        return makeSimplifiedResponse(path, mockedRequest.options);
      }
    }
  }

  if (isVerbose) console.debug("[BMF]: No matching mock found for path:", path);

  if (isUsingBuiltInFetchFallback) {
    if (isVerbose) console.debug("[BMF]: Using built-in fetch for path:", path);
    return originalFetch(input, init);
  }

  if (isVerbose) console.debug("[BMF]: Rejecting with 404 for path:", path);
  return Promise.reject(
    makeSimplifiedResponse(path, { response: { status: 404 } }),
  );
};
