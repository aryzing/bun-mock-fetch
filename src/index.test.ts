import { afterEach, describe, expect, test } from "bun:test";
import { clearFetchMocks, mockFetch, setPassthrough } from "./mock.js";

describe("matchers", () => {
  afterEach(() => {
    clearFetchMocks();
  });

  test("string matcher", async () => {
    mockFetch("https://api.example.com", new Response("example response"));
    const resText = await (await fetch("https://api.example.com")).text();
    expect(resText).toBe("example response");
  });

  test("minimatch matcher", async () => {
    mockFetch(
      "https://api.example.com/path/*",
      new Response("example response"),
    );
    const resText = await (
      await fetch("https://api.example.com/path/any-path")
    ).text();
    expect(resText).toBe("example response");
  });

  test("regex matcher", async () => {
    mockFetch(/example/, new Response("example response"));
    const resText = await (
      await fetch("https://api.example.com/path/any-path")
    ).text();
    expect(resText).toBe("example response");
  });

  test("detailed matcher", async () => {
    mockFetch(
      {
        method: "GET",
        url: /example/,
        headers: {
          "x-custom-header": "custom value",
        },
      },
      new Response("example response"),
    );
    const resText = await (
      await fetch("https://api.example.com", {
        headers: {
          "X-Custom-Header": "custom value",
        },
      })
    ).text();
    expect(resText).toBe("example response");
  });

  test("function matcher", async () => {
    mockFetch(
      (input) => input.toString().includes("example"),
      new Response("example response"),
    );
    const resText = await (await fetch("https://api.example.com")).text();
    expect(resText).toBe("example response");
  });
});

describe("glob matching regressions", () => {
  afterEach(() => {
    clearFetchMocks();
    setPassthrough(true);
  });

  const cases = [
    [
      "single wildcard",
      "https://api.example.com/users/*",
      "https://api.example.com/users/alice",
      "https://api.example.com/users/alice/posts",
    ],
    [
      "globstar",
      "https://api.example.com/users/**",
      "https://api.example.com/users/alice/posts/1",
      "https://api.example.com/admin/alice",
    ],
    [
      "brace expansion",
      "https://api.example.com/{users,posts}/*",
      "https://api.example.com/posts/1",
      "https://api.example.com/comments/1",
    ],
    [
      "extglob",
      "https://api.example.com/@(users|posts)/*",
      "https://api.example.com/users/alice",
      "https://api.example.com/comments/1",
    ],
    [
      "character class",
      "https://api.example.com/users/[0-9]",
      "https://api.example.com/users/7",
      "https://api.example.com/users/alice",
    ],
  ] as const;

  for (const detailed of [false, true]) {
    describe(detailed ? "detailed matcher" : "string matcher", () => {
      test.each(cases)("%s", async (_, pattern, matchingUrl, unmatchedUrl) => {
        setPassthrough(false);
        mockFetch(detailed ? { url: pattern } : pattern, () => {
          return new Response("matched");
        });

        for (const input of [
          matchingUrl,
          new URL(matchingUrl),
          new Request(matchingUrl),
        ]) {
          expect(await (await fetch(input)).text()).toBe("matched");
        }
        await expect(fetch(unmatchedUrl)).rejects.toThrow(
          "No mock matched the request",
        );
      });

      test("literal URLs containing glob metacharacters", async () => {
        setPassthrough(false);
        const url = "https://api.example.com/users/[alice]?active=true";
        mockFetch(detailed ? { url } : url, new Response("literal match"));
        expect(await (await fetch(url)).text()).toBe("literal match");
      });
    });
  }
});

describe("responses", () => {
  afterEach(() => {
    clearFetchMocks();
  });

  test("instance of response", async () => {
    mockFetch("https://api.example.com", new Response("example response"));
    const resText = await (await fetch("https://api.example.com")).text();
    expect(resText).toBe("example response");
  });

  test("function response", async () => {
    mockFetch("https://api.example.com", async () => {
      return new Response("example response");
    });
    const resText = await (await fetch("https://api.example.com")).text();
    expect(resText).toBe("example response");
  });
});
