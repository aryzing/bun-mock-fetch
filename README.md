# Bun Mock Fetch

Mock fetch requests in Bun. Great for tests and debugging.

## Table of Contents

- [Installation](#installation)
- [API](#api)
  - [mockFetch](#mockfetch)
  - [clearFetchMocks](#clearfetchmocks)
  - [json](#json)
  - [setPassthrough](#setpassthrough)
  - [setLogging](#setlogging)
- [Configuration](#configuration)
  - [Request Matcher](#request-matcher)
  - [Response](#response)
- [Examples](#examples)
  - [Tests with own mocks](#tests-with-own-mocks)
  - [Tests with shared mocks](#tests-with-shared-mocks)
  - [Mocking network calls during development](#mocking-network-calls-during-development)
  - [Debugging API calls during development](#debugging-api-calls-during-development)
  - [Proxying real responses](#proxying-real-responses)

## Installation

```shell
bun add @aryzing/bun-mock-fetch
```

## API

### `mockFetch`

```typescript
mockFetch(requestMatcher: RequestMatcher, response: Response | ResponseFn): void
```

Registers a mock. When `fetch` is called and the request matches `requestMatcher`, the provided `response` is returned instead of making a real network request. Each call adds a new mock. If multiple mocks match a request, the most recently registered mock takes precedence.

### `clearFetchMocks`

```typescript
clearFetchMocks(): void
```

Removes all registered mocks and restores the original built-in `fetch`. Clearing mocks does not alter [passthrough](#setpassthrough) or [logging](#setlogging) settings.

### `json`

```typescript
json(data: unknown, init?: ResponseInit): Response
```

Creates a `Response` with the given data serialized as JSON and `Content-Type: application/json` set. Optional `init` is forwarded to the `Response` constructor and can be used to set a custom status code or additional headers.

```typescript
import { json, mockFetch } from "@aryzing/bun-mock-fetch";

// 200 JSON response.
mockFetch(/example/, json({ message: "Hello, world!" }));

// 201 JSON response.
mockFetch(/example/, json({ id: 1 }, { status: 201 }));

// 422 JSON error response.
mockFetch(/example/, json({ error: "Invalid input" }, { status: 422 }));
```

### `setPassthrough`

```typescript
setPassthrough(value: boolean): void
```

Controls whether requests that don't match any mock are forwarded to the native built-in `fetch`. Enabled by default. Set to `false` to throw on unmatched requests instead.

### `setLogging`

```typescript
setLogging(value: boolean): void
```

Enables or disables debug logging. Disabled by default.

## Configuration

### Request Matcher

```typescript
import { mockFetch } from "@aryzing/bun-mock-fetch";

// Simple string matching.
mockFetch("https://example.com", new Response());

// Using minimatch.
mockFetch("https://example.com/foo/**", new Response());

// Using regex.
mockFetch(/example/, new Response());

// Using a matcher function.
mockFetch((input, init) => {
  // Check input examples.
  if (typeof input === "string") return input.includes("example");
  if (input instanceof URL) return input.host.includes("example");
  if (input instanceof Request) return input.url.includes("example");

  // Check init example.
  return init?.method === "POST";
}, new Response());

// Using a detailed matcher object. All properties are optional.
mockFetch(
  {
    // Must match this string, glob, or regex.
    url: "https://example.com",
    // Must match this method (case-insensitive).
    method: "POST",
    // Must include these headers (case-insensitive) and match their values.
    headers: {
      "Content-Type": "application/json",
    },
  },
  new Response(),
);
```

### Response

```typescript
import { json, mockFetch } from "@aryzing/bun-mock-fetch";

// Text response.
mockFetch(/example/, new Response("Hello, world!"));

// JSON response.
mockFetch(/example/, json({ message: "Hello, world!" }));

// Response function.
mockFetch(/example/, async ({ mockedRequest, input, init, nativeFetch }) => {
  console.log(mockedRequest); // The matched mock request config.
  console.log(input); // The 1st arg. to `fetch`.
  console.log(init); // The 2nd arg. to `fetch`.

  // Delayed response example, useful for spinners and timeouts.
  await Bun.sleep(1000);

  // Proxy the request or otherwise fetch data using the native built-in fetch.
  const quote = await nativeFetch("https://example.com/quote-of-the-day").then(
    (r) => r.text(),
  );

  // Configure response based on request.
  const name =
    (await (input instanceof Request ? input : new Request("", init)).text()) ||
    "guest";

  return new Response(`Hello ${name}! ${quote}`);
});
```

## Examples

### Tests with own mocks

```typescript
import { clearFetchMocks, mockFetch } from "@aryzing/bun-mock-fetch";

afterEach(() => {
  clearFetchMocks();
});

test("first test", async () => {
  mockFetch("https://api.example.com/data", new Response("first"));
  expect(await exampleApiClient.getData()).toBe("first");
});

test("second test", async () => {
  mockFetch("https://api.example.com/data", new Response("second"));
  expect(await exampleApiClient.getData()).toBe("second");
});
```

### Tests with shared mocks

```typescript
import { clearFetchMocks, mockFetch } from "@aryzing/bun-mock-fetch";

beforeAll(() => {
  mockFetch("https://foo.example.com/data", new Response("foo"));
  mockFetch("https://bar.example.com/data", new Response("bar"));
});

afterAll(() => {
  clearFetchMocks();
});

test("first test", async () => {
  expect(await exampleFooClient()).toBe("foo");
});

test("second test", async () => {
  expect(await exampleFooClient()).toBe("foo");
  expect(await exampleBarClient()).toBe("bar");
});

test("third test", async () => {
  expect(await exampleBarClient()).toBe("bar");
});
```

### Mocking network calls during development

```typescript
import { sdk } from "@example/sdk";
import { json, mockFetch } from "@aryzing/bun-mock-fetch";

mockFetch("https://sdk.example.com/auth", json({ token: "abc...def" }));
mockFetch("https://sdk.example.com/shopping-cart", json({ items: mockItems }));

await sdk.init(); // E.g., internally calls `/auth`
const items = await sdk.getShoppingCart();
render(items); // E.g., a UI framework
```

### Debugging API calls during development

Enable logging to print every intercepted request to the console. Passthrough remains on so all unmatched requests still go through to the real network normally.

```typescript
import { setLogging } from "@aryzing/bun-mock-fetch";

setLogging(true);

// All fetch calls will now be logged to the console, e.g.:
// [@aryzing/bun-mock-fetch]: Mocked fetch called with path: https://api.example.com/data
// [@aryzing/bun-mock-fetch]: No matching mock found for request: https://api.example.com/data
// [@aryzing/bun-mock-fetch]: Using built-in fetch for request: https://api.example.com/data
```

To intercept a specific endpoint and inspect its request without affecting others:

```typescript
import { json, mockFetch, setLogging } from "@aryzing/bun-mock-fetch";

setLogging(true);

mockFetch("https://api.example.com/flaky-endpoint", async ({ input, init }) => {
  console.log("request headers:", init?.headers);
  return json({ debug: true });
});
```

### Proxying real responses

Use `nativeFetch` to forward the request to the real network and modify the response before returning it.

```typescript
import { mockFetch } from "@aryzing/bun-mock-fetch";

// Inject a field into every response from an endpoint.
mockFetch(
  "https://api.example.com/users",
  async ({ input, init, nativeFetch }) => {
    const response = await nativeFetch(input, init);
    const data = await response.json();
    return Response.json({ ...data, injected: true });
  },
);

// Add an auth header to outgoing requests before forwarding.
mockFetch(
  "https://api.example.com/**",
  async ({ input, init, nativeFetch }) => {
    return nativeFetch(input, {
      ...init,
      headers: { ...init?.headers, Authorization: "Bearer token123" },
    });
  },
);
```
