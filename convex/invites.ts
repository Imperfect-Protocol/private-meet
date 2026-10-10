import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { meetingStatusFrom } from "./model/tokens";

export const byToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db.query("invites").withIndex("by_token", (q) => q.eq("token", args.token)).unique();
    if (!invite) return null;
    const meeting = await ctx.db.get(invite.meetingId);
    if (!meeting) return null;
    const host = await ctx.db.get(meeting.hostId);
    return {
      role: invite.role,
      state: invite.state,
      meetingId: meeting._id,
      title: meeting.title,
      startsAt: meeting.startsAt,
      durationMinutes: meeting.durationMinutes,
      status: meeting.status,
      hostName: host?.displayName ?? "Host",
      guestName: meeting.guestName,
    };
  },
});

export const respond = mutation({
  args: { token: v.string(), accept: v.boolean() },
  handler: async (ctx, args) => {
    const invite = await ctx.db.query("invites").withIndex("by_token", (q) => q.eq("token", args.token)).unique();
    if (!invite) throw new Error("Invite not found");
    const meeting = await ctx.db.get(invite.meetingId);
    if (!meeting || meeting.status === "cancelled") throw new Error("Meeting is no longer active");

    const nextState = args.accept ? "accepted" : "declined";
    if (invite.state === nextState) return;
    if (invite.state === "accepted" || invite.state === "declined") throw new Error("This invitation has already been answered");
    await ctx.db.patch(invite._id, { state: nextState, respondedAt: Date.now() });
    const invites = await ctx.db.query("invites").withIndex("by_meeting", (q) => q.eq("meetingId", meeting._id)).collect();
    await ctx.db.patch(meeting._id, { status: meetingStatusFrom(invites.map((each) => each.state)) });
  },
});
