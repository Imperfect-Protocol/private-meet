/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accessRequests from "../accessRequests.js";
import type * as auth from "../auth.js";
import type * as booking from "../booking.js";
import type * as emails from "../emails.js";
import type * as hosts from "../hosts.js";
import type * as http from "../http.js";
import type * as invites from "../invites.js";
import type * as meetings from "../meetings.js";
import type * as model_accessRequest from "../model/accessRequest.js";
import type * as model_accountAccess from "../model/accountAccess.js";
import type * as model_inviteEmail from "../model/inviteEmail.js";
import type * as model_resend from "../model/resend.js";
import type * as model_slots from "../model/slots.js";
import type * as model_tokens from "../model/tokens.js";
import type * as model_zonedTime from "../model/zonedTime.js";
import type * as usernames from "../usernames.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accessRequests: typeof accessRequests;
  auth: typeof auth;
  booking: typeof booking;
  emails: typeof emails;
  hosts: typeof hosts;
  http: typeof http;
  invites: typeof invites;
  meetings: typeof meetings;
  "model/accessRequest": typeof model_accessRequest;
  "model/accountAccess": typeof model_accountAccess;
  "model/inviteEmail": typeof model_inviteEmail;
  "model/resend": typeof model_resend;
  "model/slots": typeof model_slots;
  "model/tokens": typeof model_tokens;
  "model/zonedTime": typeof model_zonedTime;
  usernames: typeof usernames;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
};
