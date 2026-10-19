import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { isMeetingDuration, MAX_RANGE_MS, SlotGrid } from "./model/slots";
import { MINUTE_MS, ZonedClock } from "./model/zonedTime";
import { newToken } from "./model/tokens";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function hostBySlug(ctx: QueryCtx, slug: string) {
  const host = await ctx.db.query("hosts").withIndex("by_slug", (q) => q.eq("slug", slug)).unique();
  if (!host) throw new Error("Booking link not found");
  return host;
}

/** Meetings that block a slot, i.e. not declined or cancelled. */
export async function busyMeetings(ctx: QueryCtx, hostId: Id<"hosts">, from: number, to: number) {
  const meetings = await ctx.db
    .query("meetings")
    .withIndex("by_host_time", (q) => q.eq("hostId", hostId).gte("startsAt", from - 60 * MINUTE_MS).lt("startsAt", to + 60 * MINUTE_MS))
    .collect();
  return meetings.filter((meeting) => meeting.status === "pending" || meeting.status === "confirmed");
}

async function slotGrid(ctx: QueryCtx, host: Doc<"hosts">, from: number, to: number) {
  const windows = await ctx.db.query("availability").withIndex("by_host", (q) => q.eq("hostId", host._id)).collect();
  return new SlotGrid(new ZonedClock(host.timeZone), windows, await busyMeetings(ctx, host._id, from, to));
}

export const openSlots = query({
  args: { slug: v.string(), from: v.number(), to: v.number(), durationMinutes: v.number() },
  handler: async (ctx, args) => {
    if (!isMeetingDuration(args.durationMinutes)) throw new Error("Unsupported meeting length");
    const to = Math.min(args.to, args.from + MAX_RANGE_MS);
    const host = await hostBySlug(ctx, args.slug);
    const grid = await slotGrid(ctx, host, args.from, to);
    return grid.open(args.from, to, args.durationMinutes, Date.now());
  },
});

export const book = mutation({
  args: {
    slug: v.string(),
    startsAt: v.number(),
    durationMinutes: v.number(),
    guestName: v.string(),
    guestEmail: v.string(),
    guestTimeZone: v.string(),
    game: v.union(v.literal("poker"), v.literal("chess")),
  },
  handler: async (ctx, args) => {
    const guestName = args.guestName.trim();
    const guestEmail = args.guestEmail.trim().toLowerCase();
    if (!guestName) throw new Error("Name is required");
    if (!EMAIL_PATTERN.test(guestEmail)) throw new Error("A valid email is required");
    if (!isMeetingDuration(args.durationMinutes)) throw new Error("Unsupported meeting length");

    const host = await hostBySlug(ctx, args.slug);
    const grid = await slotGrid(ctx, host, args.startsAt, args.startsAt + MINUTE_MS);
    const open = grid.open(args.startsAt, args.startsAt + MINUTE_MS, args.durationMinutes, Date.now());
    if (!open.includes(args.startsAt)) throw new Error("That time is no longer available");

    const meetingId = await ctx.db.insert("meetings", {
      hostId: host._id,
      title: `${guestName} & ${host.displayName}`,
      guestName,
      guestEmail,
      guestTimeZone: ZonedClock.isValid(args.guestTimeZone) ? args.guestTimeZone : "UTC",
      startsAt: args.startsAt,
      durationMinutes: args.durationMinutes,
      game: args.game,
      status: "pending",
    });
    await ctx.db.insert("invites", { meetingId, role: "host", email: host.email, token: newToken(), state: "queued" });
    await ctx.db.insert("invites", { meetingId, role: "guest", email: guestEmail, token: newToken(), state: "queued" });
    await ctx.scheduler.runAfter(0, internal.emails.sendInvites, { meetingId });
    return meetingId;
  },
});
