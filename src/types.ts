/**
 * The options for a mocked request. Partial implementation of RequestInit with
 * the addition of "data" property which value will be returned from the mock.
 */
export type MockOptions = {
  headers?: Record<string, string>;
  method?: Request["method"];
  response?: MockResponse;
};

/**
 * The response for a mocked request. Partial implementation of Response with
 * the addition of "data" property which value will be returned from the mock.
 */
export interface MockResponse {
  data?: any;
  status?: number;
  headers?: Headers;
}