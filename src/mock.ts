import { minimatch } from "minimatch";
import { defaultMockOptions } from "./constants.js";
import { makeSimplifiedResponse, type SimplifiedResponse } from "./utils.js";
import type {
  DetailedMatcher,
  MockResponseOptions,
  RequestMatcher,
} from "./types.js";

let originalFetch: typeof fetch;

let isVerbose = false;
export function setIsVerbose(value: boolean) {
  isVerbose = value;
}

type MockedRequest =
  | {
      type: "regexp";
      regexp: RegExp;
      mockResponseOptions: MockResponseOptions;
    }
  | {
      type: "stringLiteralOrMinimatch";
      value: string;
      mockResponseOptions: MockResponseOptions;
    }
  | {
      type: "function";
      fn: (
        input: Parameters<typeof fetch>[0],
        init: Parameters<typeof fetch>[1],
      ) => boolean;
      mockResponseOptions: MockResponseOptions;
    }
  | {
      type: "detailed";
      matcher: DetailedMatcher;
      mockResponseOptions: MockResponseOptions;
    };

/**
 * The cache for registered mocked requests.
 */
const mockedRequests: Array<MockedRequest> = [];

/**
 * Mock the fetch method. The most recently defined matching mock will be used.
 */
export const mockFetch = (
  requestMatcher: RequestMatcher,
  mockResponseOptions: MockResponseOptions = defaultMockOptions,
): void => {
  if (requestMatcher instanceof RegExp) {
    mockedRequests.unshift({
      type: "regexp",
      regexp: requestMatcher,
      mockResponseOptions,
    });
  } else if (typeof requestMatcher === "string") {
    mockedRequests.unshift({
      type: "stringLiteralOrMinimatch",
      value: requestMatcher,
      mockResponseOptions,
    });
  } else if (typeof requestMatcher === "function") {
    mockedRequests.unshift({
      type: "function",
      fn: requestMatcher,
      mockResponseOptions,
    });
  } else if (typeof requestMatcher === "object") {
    mockedRequests.unshift({
      type: "detailed",
      matcher: requestMatcher,
      mockResponseOptions,
    });
  } else {
    throw new Error("Invalid matcher.");
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
 * The mocked fetch method.
 */
const mockedFetch = async (
  input: Parameters<typeof fetch>[0],
  init?: RequestInit,
): Promise<SimplifiedResponse> => {
  const requestUrl = input instanceof Request ? input.url : input.toString();
  if (isVerbose)
    console.debug("[BMF]: Mocked fetch called with path:", requestUrl);

  for (const mockedRequest of mockedRequests) {
    switch (mockedRequest.type) {
      case "regexp": {
        if (!mockedRequest.regexp.test(requestUrl)) continue;

        return makeSimplifiedResponse(
          requestUrl,
          mockedRequest.mockResponseOptions,
        );
      }

      case "stringLiteralOrMinimatch": {
        if (
          requestUrl !== mockedRequest.value &&
          !minimatch(requestUrl, mockedRequest.value)
        )
          continue;

        return makeSimplifiedResponse(
          requestUrl,
          mockedRequest.mockResponseOptions,
        );
      }
      case "function": {
        if (!mockedRequest.fn(input, init)) continue;

        return makeSimplifiedResponse(
          requestUrl,
          mockedRequest.mockResponseOptions,
        );
      }
      case "detailed": {
        const { matcher, mockResponseOptions } = mockedRequest;
        const { url, method, headers } = matcher;

        if (typeof url === "string") {
          if (url !== requestUrl && !minimatch(requestUrl, url)) continue;
        } else if (url instanceof RegExp) {
          if (!url.test(requestUrl)) continue;
        }

        if (
          method &&
          method.toLowerCase() !== (init?.method || "GET").toLowerCase()
        )
          continue;

        if (headers) {
          const inputHeaders =
            input instanceof Request ? input.headers : new Headers();
          const initHeaders = new Headers(init?.headers);
          const requestHeaders = new Headers([...inputHeaders, ...initHeaders]);
          const headersMatch = [...Object.entries(headers)].every(
            ([optionHeaderName, optionHeaderValue]) => {
              const requestHeaderValue = requestHeaders.get(optionHeaderName);
              return requestHeaderValue === optionHeaderValue;
            },
          );
          if (!headersMatch) continue;
        }

        return makeSimplifiedResponse(requestUrl, mockResponseOptions);
      }
    }
  }

  if (isVerbose)
    console.debug("[BMF]: No matching mock found for request:", requestUrl);

  if (isUsingBuiltInFetchFallback) {
    if (isVerbose)
      console.debug("[BMF]: Using built-in fetch for request:", requestUrl);
    return originalFetch(input, init);
  }

  if (isVerbose) console.debug("[BMF]: Responding with 404:", requestUrl);
  return Promise.resolve(
    makeSimplifiedResponse(requestUrl, {
      status: 404,
      data: `{"bun-mock-fetch":"No matching mocks."}`,
    }),
  );
};
