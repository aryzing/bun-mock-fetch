import { minimatch } from "minimatch";
import type {
  MockedRequest,
  RequestMatcher,
  ResponseOrResponseFn,
} from "./types.js";

class BunMockFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BunMockFetchError";
  }
}

let originalFetch: typeof fetch | null = null;

let isVerbose = false;
export function setIsVerbose(value: boolean) {
  isVerbose = value;
}

/**
 * The cache for registered mocked requests.
 */
const mockedRequests: Array<MockedRequest> = [];

/**
 * Mock the fetch method. The most recently defined matching mock will be used.
 */
export const mockFetch = (
  requestMatcher: RequestMatcher,
  response: ResponseOrResponseFn,
): void => {
  if (requestMatcher instanceof RegExp) {
    mockedRequests.unshift({
      type: "regexp",
      regexp: requestMatcher,
      response,
    });
  } else if (typeof requestMatcher === "string") {
    mockedRequests.unshift({
      type: "stringLiteralOrMinimatch",
      value: requestMatcher,
      response,
    });
  } else if (typeof requestMatcher === "function") {
    mockedRequests.unshift({
      type: "function",
      fn: requestMatcher,
      response,
    });
  } else if (typeof requestMatcher === "object") {
    mockedRequests.unshift({
      type: "detailed",
      matcher: requestMatcher,
      response,
    });
  } else {
    throw new BunMockFetchError("Invalid matcher.");
  }

  if (!originalFetch) {
    originalFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = mockedFetch;
  }
};

/**
 * Clear the fetch mock.
 */
export const clearFetchMocks = () => {
  mockedRequests.length = 0;

  // Restore the original fetch method, if it was mocked.
  if (originalFetch) {
    globalThis.fetch = originalFetch;
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

async function makeResponse(args: {
  mockedRequest: MockedRequest;
  input: Parameters<typeof fetch>[0];
  init?: Parameters<typeof fetch>[1];
}): Promise<Response> {
  const { mockedRequest, input, init } = args;
  if (mockedRequest.response instanceof Response) return mockedRequest.response;

  return await mockedRequest.response({ mockedRequest, input, init });
}

/**
 * The mocked fetch method.
 */
const mockedFetch = async (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
): Promise<Response> => {
  const requestUrl = input instanceof Request ? input.url : input.toString();
  if (isVerbose)
    console.debug("[BMF]: Mocked fetch called with path:", requestUrl);

  for (const mockedRequest of mockedRequests) {
    switch (mockedRequest.type) {
      case "regexp": {
        if (!mockedRequest.regexp.test(requestUrl)) continue;
        break;
      }

      case "stringLiteralOrMinimatch": {
        if (
          requestUrl !== mockedRequest.value &&
          !minimatch(requestUrl, mockedRequest.value)
        )
          continue;
        break;
      }
      case "function": {
        if (!mockedRequest.fn(input, init)) continue;
        break;
      }
      case "detailed": {
        const { matcher } = mockedRequest;
        const { url, method, headers } = matcher;

        // Compare URL.
        if (typeof url === "string") {
          if (url !== requestUrl && !minimatch(requestUrl, url)) continue;
        } else if (url instanceof RegExp) {
          if (!url.test(requestUrl)) continue;
        }

        // Compare method.
        const requestMethod = (() => {
          if (input instanceof Request) return input.method;
          if (init?.method) return init.method;
          return "GET";
        })();
        if (method && method.toLowerCase() !== requestMethod.toLowerCase())
          continue;

        // Compare headers.
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
      }
    }

    return await makeResponse({
      mockedRequest,
      input,
      init,
    });
  }

  if (isVerbose)
    console.debug("[BMF]: No matching mock found for request:", requestUrl);

  if (isUsingBuiltInFetchFallback) {
    if (isVerbose)
      console.debug("[BMF]: Using built-in fetch for request:", requestUrl);

    if (!originalFetch)
      throw new BunMockFetchError("Expected `originalFetch` to be defined.");

    return originalFetch(input, init);
  }

  if (isVerbose) console.debug("[BMF]: Responding with 404:", requestUrl);

  return new Response("Bun Mock Fetch: no matching mocks.", { status: 404 });
};

type Preconnect = typeof fetch.preconnect;
const mockedPreconnect: Preconnect = () => {};
mockedFetch.preconnect = mockedPreconnect;
