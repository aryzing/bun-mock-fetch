import { defaultMockOptions as defaultMockOptions } from "./constants.js";
import { type MockOptions } from "./types.js";

export type SimplifiedResponse = Omit<
  Response,
  "type" | "body" | "arrayBuffer" | "blob" | "formData" | "clone"
>;

/**
 * Returns an object similar to Response class.
 * @param status - The HTTP status code of the response.
 * @param url - The URL of the request.
 * @param options - The options for the mocked request.
 * @returns An object similar to Response class.
 */
export function makeSimplifiedResponse(
  url: string,
  options: MockOptions = defaultMockOptions,
): SimplifiedResponse {
  const responseHeaders = new Headers(options.response?.headers);
  const status = options.response?.status ?? 200;
  const ok = status >= 200 && status < 300;
  const body = options.response?.data;

  return {
    ok,
    status,
    statusText: `${status}`,
    url,
    headers: responseHeaders,
    text: () => Promise.resolve(body),
    json: () => Promise.resolve(body),
    redirected: false,
    bodyUsed: !!body,
  };
}
