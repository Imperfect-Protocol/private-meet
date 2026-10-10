import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

/** Used only by the password provider, never exposed as a public account lookup. */
export const emailForUsername = internalQuery({
  args: { username: v.string() },
  handler: async (ctx, args): Promise<string | null> => {
    const claim = await ctx.db.query("usernames").withIndex("by_username", (q) => q.eq("username", args.username)).unique();
    return claim?.email ?? null;
  },
});
