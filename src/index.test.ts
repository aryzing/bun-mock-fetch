import { afterEach, describe, expect, test } from "bun:test";
import { clearFetchMocks, mockFetch } from "./mock.js";

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
