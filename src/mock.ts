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

let nativeFetch: typeof fetch | null = null;

let isLogging = false;
export function setLogging(value: boolean) {
  isLogging = value;
}

/**
 * @deprecated Use `setLogging` instead.
 */
export function setIsVerbose(value: boolean) {
  console.warn(
    "[@aryzing/bun-mock-fetch]: `setIsVerbose` is deprecated. Use `setLogging` instead.",
  );
  setLogging(value);
}

/**
 * Creates a JSON `Response` with `Content-Type: application/json`.
 */
export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
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

  if (!nativeFetch) {
    nativeFetch = globalThis.fetch.bind(globalThis);
  }

  globalThis.fetch = mockedFetch;
};

/**
 * Clear the fetch mock.
 */
export const clearFetchMocks = () => {
  mockedRequests.length = 0;

  // Restore the original fetch method, if it was mocked.
  if (nativeFetch) {
    globalThis.fetch = nativeFetch;
    nativeFetch = null;
  }
};

let passthrough = true;
/**
 * Enable or disable passing unmatched requests through to the native built-in
 * fetch. Enabled by default.
 */
export function setPassthrough(value: boolean) {
  passthrough = value;
}

/**
 * @deprecated Use `setPassthrough` instead.
 */
export function setFetchPassthrough(value: boolean) {
  console.warn(
    "[@aryzing/bun-mock-fetch]: `setFetchPassthrough` is deprecated. Use `setPassthrough` instead.",
  );
  setPassthrough(value);
}

/**
 * @deprecated Use `setPassthrough` instead.
 */
export function setIsUsingBuiltInFetchFallback(value: boolean) {
  console.warn(
    "[@aryzing/bun-mock-fetch]: `setIsUsingBuiltInFetchFallback` is deprecated. Use `setPassthrough` instead.",
  );
  setPassthrough(value);
}

async function makeResponse(args: {
  mockedRequest: MockedRequest;
  input: Parameters<typeof fetch>[0];
  init?: Parameters<typeof fetch>[1];
  nativeFetch: typeof fetch;
}): Promise<Response> {
  const { mockedRequest, input, init, nativeFetch } = args;
  if (mockedRequest.response instanceof Response) return mockedRequest.response;

  return await mockedRequest.response({
    mockedRequest,
    input,
    init,
    nativeFetch,
  });
}

/**
 * The mocked fetch method.
 */
const mockedFetch = async (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
): Promise<Response> => {
  const requestUrl = input instanceof Request ? input.url : input.toString();
  if (isLogging)
    console.debug(
      "[@aryzing/bun-mock-fetch]: Mocked fetch called with path:",
      requestUrl,
    );

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
      nativeFetch: nativeFetch ?? globalThis.fetch,
    });
  }

  if (isLogging)
    console.debug(
      "[@aryzing/bun-mock-fetch]: No matching mock found for request:",
      requestUrl,
    );

  if (passthrough) {
    if (isLogging)
      console.debug(
        "[@aryzing/bun-mock-fetch]: Using built-in fetch for request:",
        requestUrl,
      );

    if (!nativeFetch)
      throw new BunMockFetchError("Expected `nativeFetch` to be defined.");

    return nativeFetch(input, init);
  }

  throw new BunMockFetchError(
    `No mock matched the request to "${requestUrl}". Register a mock with \`mockFetch\` or enable passthrough with \`setPassthrough(true)\`.`,
  );
};

type Preconnect = typeof fetch.preconnect;
const mockedPreconnect: Preconnect = () => {};
mockedFetch.preconnect = mockedPreconnect;
