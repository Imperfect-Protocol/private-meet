import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { ZonedClock } from "./model/zonedTime";

const DEFAULT_WINDOWS = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startMinute: 9 * 60, endMinute: 17 * 60 }));

const windowValidator = v.object({ weekday: v.number(), startMinute: v.number(), endMinute: v.number() });

export async function requireHost(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not signed in");
  const host = await ctx.db.query("hosts").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
  if (!host) throw new Error("Host profile missing");
  return host;
}

function slugFrom(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "host";
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const host = await ctx.db.query("hosts").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
    if (!host) return null;
    const windows = await ctx.db.query("availability").withIndex("by_host", (q) => q.eq("hostId", host._id)).collect();
    return {
      slug: host.slug,
      displayName: host.displayName,
      email: host.email,
      timeZone: host.timeZone,
      windows: windows.map((w) => ({ weekday: w.weekday, startMinute: w.startMinute, endMinute: w.endMinute })),
    };
  },
});

/** Creates the host profile on first sign-in. Idempotent. */
export const ensure = mutation({
  args: { timeZone: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const existing = await ctx.db.query("hosts").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
    if (existing) return existing.slug;

    const user = await ctx.db.get(userId);
    const email = user?.email ?? "";
    const displayName = user?.name || email.split("@")[0] || "Host";
    const slug = slugFrom(displayName);
    const hostId = await ctx.db.insert("hosts", {
      userId,
      slug,
      displayName,
      email,
      timeZone: ZonedClock.isValid(args.timeZone) ? args.timeZone : "UTC",
    });
    for (const window of DEFAULT_WINDOWS) {
      await ctx.db.insert("availability", { hostId, ...window });
    }
    return slug;
  },
});

export const updateSettings = mutation({
  args: {
    displayName: v.string(),
    email: v.string(),
    timeZone: v.string(),
    windows: v.array(windowValidator),
  },
  handler: async (ctx, args) => {
    const host = await requireHost(ctx);
    if (!ZonedClock.isValid(args.timeZone)) throw new Error("Unknown time zone");
    for (const window of args.windows) {
      const valid = window.weekday >= 0 && window.weekday <= 6
        && window.startMinute >= 0 && window.endMinute <= 24 * 60 && window.startMinute < window.endMinute;
      if (!valid) throw new Error("Invalid availability window");
    }
    await ctx.db.patch(host._id, {
      displayName: args.displayName.trim() || host.displayName,
      email: args.email.trim().toLowerCase(),
      timeZone: args.timeZone,
    });
    const old = await ctx.db.query("availability").withIndex("by_host", (q) => q.eq("hostId", host._id)).collect();
    for (const window of old) await ctx.db.delete(window._id);
    for (const window of args.windows) await ctx.db.insert("availability", { hostId: host._id, ...window });
  },
});

export const bySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const host = await ctx.db.query("hosts").withIndex("by_slug", (q) => q.eq("slug", args.slug)).unique();
    return host ? { displayName: host.displayName } : null;
  },
});
