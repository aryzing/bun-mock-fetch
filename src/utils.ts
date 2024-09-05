import { defaultMockOptions as defaultMockOptions } from "./constants.js";
import { type MockResponseOptions } from "./types.js";

export type SimplifiedResponse = Omit<
  Response,
  "type" | "body" | "arrayBuffer" | "blob" | "formData" | "clone"
>;

export function makeSimplifiedResponse(
  url: string,
  options: MockResponseOptions = defaultMockOptions,
): SimplifiedResponse {
  const responseHeaders = new Headers(options.headers);
  const status = options.status ?? 200;
  const ok = status >= 200 && status < 300;
  const body = options.data;

  return {
    ok,
    status,
    statusText: `${status}`,
    url,
    headers: responseHeaders,
    text: () => Promise.resolve(`${body}`),
    json: () => Promise.resolve(body),
    redirected: false,
    bodyUsed: !!body,
  };
}
