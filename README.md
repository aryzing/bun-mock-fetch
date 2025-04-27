# `@aryzing/bun-mock-fetch`

Mock fetch requests in Bun. Great for tests.

```shell
bun add @aryzing/bun-mock-fetch
```

Basic usage:

```typescript
mockFetch(requestMatcher, response);
```

Request matcher examples:

```typescript
// Simple string matching.
mockFetch("https://example.com", new Response());

// Using minimatch.
mockFetch("https://example.com/foo/**", new Response());

// Using regex.
mockFetch(/.*example.*/, new Response());

// Using a matcher function.
mockFetch((input, init) => input.url === "https://example.com", new Response());

// Using a detailed matcher object. All properties are optional.
mockFetch({
  // Must match this string, glob, or regex.
  url: "https://example.com",
  // Must match this method (case-insensitive).
  method: "POST",
  // Must include these headers (case-insensitive) and match their values.
  headers: {
    "Content-Type": "application/json",
  },
});
```

Response examples:

```typescript
// Text response.
mockFetch(/example/, new Response("Hello, world!"));

// JSON response.
mockFetch(
  /example/,
  new Response('{"message": "Hello, world!"}', {
    headers: {
      "Content-Type": "application/json",
    },
  }),
);

// Response function.
mockFetch(/example/, async ({ mockedRequest, input, init }) => {
  console.log(mockedRequest); // The matched mock request config.
  console.log(input); // The 1st arg. to `fetch`.
  console.log(init); // The 2nd arg. to `fetch`.

  // Delayed response example, useful for spinners and timeouts.
  await delay(1000);

  // Configure response based on request.
  const name =
    (input instanceof Request ? input : init)?.body?.toString() || "guest";
  return new Response(`Hello ${name}!`);
});
```

Test example:

```typescript
afterEach(() => {
  clearFetchMocks();
});

test("first test", async () => {
  mockFetch("https://api.example.com", new Response("first"));
  expect(await makeApiRequest()).toBe("first");
});

test("second test", async () => {
  mockFetch("https://api.example.com", new Response("second"));
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
