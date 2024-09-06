# `@aryzing/bun-mock-fetch`

Mock fetch requests in Bun. Great for tests.

```shell
bun add @aryzing/bun-mock-fetch
```

Basic usage:

```typescript
mockFetch(requestMatcher, optionalMockResponseOptions);
```

Request matcher examples:

```typescript
// Simple string matching
mockFetch("https://example.com");

// Using minimatch
mockFetch("https://example.com/foo/**");

// Using regex
mockFetch(/.*example.*/);

// Using a function
mockFetch((input, init) => input.url === "https://example.com");

// Using a detailed matcher object. All properties are optional.
mockFetch({
  // Must match this string, glob, or regex
  url: "https://example.com",
  // Must match this method (case-insensitive).
  method: "POST",
  // Must include these headers (case-insensitive) and match their values.
  headers: {
    "Content-Type": "application/json",
  },
});
```

Response options example:

```typescript
mockFetch(/.*example.*/, {
  // The expected resolved value of Response.json() or Response.text().
  data: "Hello, world!",
  status: 200,
  headers: {
    "Content-Type": "text/plain",
  },
});
```

Test example:

```typescript
afterEach(() => {
  clearFetchMocks();
});

test("first test", async () => {
  mockFetch("https://api.example.com", {
    response: {
      data: "first",
    },
  });
  expect(await makeApiRequest()).toBe("first");
});

test("second test", async () => {
  mockFetch("https://api.example.com", {
    response: {
      data: "second",
    },
  });
  expect(await makeApiRequest()).toBe("second");
});
```

Each call to `mockFetch` defines a new mock. At most one mock is used, with each mock taking precendece over previously defined mocks.

By default, requests that aren't matched against any mock definitions are forwarded to the native built-in fetch. This behavior can be modified with `setIsUsingBuiltInFetchFallback()`.

To clear the mocks and restore original built-in fetch,

```typescript
clearFetchMocks();
```

## Helpers

- `setIsUsingBuiltInFetchFallback(value: boolean)`: Enable or disable using the built-in fetch for requests that haven't been matched against any mocks. Enabled by default.
- `setIsVerbose(value: boolean)`: Enable or disable debugging logs. Disabled by default.
