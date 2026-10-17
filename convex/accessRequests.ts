import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { validateAccessRequest } from "./model/accessRequest";

const REQUEST_COOLDOWN_MS = 60_000;

/** Public submissions are stored for review; no account or session is created. */
export const submit = mutation({
  args: { displayName: v.string(), email: v.string(), message: v.string() },
  handler: async (ctx, args) => {
    let request;
    try {
      request = validateAccessRequest(args);
    } catch (error) {
      throw new ConvexError(error instanceof Error ? error.message : "Invalid request.");
    }
    const latest = await ctx.db.query("accessRequests")
      .withIndex("by_email", (q) => q.eq("email", request.email))
      .order("desc")
      .first();
    if (latest && Date.now() - latest._creationTime < REQUEST_COOLDOWN_MS) {
      throw new ConvexError("Your request was already received. Please wait a minute before sending another.");
    }
    await ctx.db.insert("accessRequests", { ...request, status: "pending" });
    return null;
  },
});
