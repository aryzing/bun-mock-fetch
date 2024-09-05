# `@aryzing/bun-mock-fetch`

Mock fetch requests in Bun. Particularly useful when running tests.

```shell
bun add @aryzing/bun-mock-fetch
```

Example usage:

```typescript
// Returns 200 OK by default
mockFetch("https://example.com");

// Using minimatch
mockFetch("https://example.com/foo/**");

// Using regex
mockFetch(/.*example.*/);

mockFetch("https://example.com/foo/**", {
  // Must have these headers.
  headers: { "x-example-header": "example-value" },
  // Must use this method.
  method: "GET",
  response: {
    data: JSON.stringify({ foo: "bar" }),
    headers: { "Content-Type": "application/json" },
    status: 200,
  },
});
```

Example in tests,

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

The `mockFetch` method may be called several times to define multiple mocks. Requests will at be matched at most against one mock, with later mocks take precendece over earlier mocks.

By default, requests that aren't matched against any mock definitions are forwarded to the native built-in fetch. This behavior can be modified using `setIsUsingBuiltInFetchFallback()`.

To clear the mocks and restore original built-in fetch,

```typescript
clearFetchMocks();
```

## Helpers

- `setIsUsingBuiltInFetchFallback(value: boolean)`: Enable or disable using the built-in fetch for requests that haven't been matched against any mocks. Enabled by default.
- `setIsVerbose(value: boolean)`: Enable or disable debugging logs. Disabled by default.
