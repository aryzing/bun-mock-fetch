import { type MockOptions } from "./types.js";

/**
 * The default value for mock options.
 */
export const defaultMockOptions: MockOptions = {
  response: {
    data: null,
    // @ts-ignore // Not sure why, the Headers type is not recognized.
    headers: new Headers(),
    status: 200,
  },
};
