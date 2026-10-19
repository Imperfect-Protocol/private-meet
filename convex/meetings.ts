import { v } from "convex/values";
import { requireHost } from "./hosts";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { MAX_RANGE_MS } from "./model/slots";

async function inviteByToken(ctx: QueryCtx, token: string) {
  const invite = await ctx.db.query("invites").withIndex("by_token", (q) => q.eq("token", token)).unique();
  if (!invite) throw new Error("Invalid meeting link");
  return invite;
}

/** The signed-in host's calendar for [from, to). */
export const listRange = query({
  args: { from: v.number(), to: v.number() },
  handler: async (ctx, args) => {
    const host = await requireHost(ctx);
    const to = Math.min(args.to, args.from + MAX_RANGE_MS);
    const meetings = await ctx.db
      .query("meetings")
      .withIndex("by_host_time", (q) => q.eq("hostId", host._id).gte("startsAt", args.from).lt("startsAt", to))
      .collect();
    return Promise.all(meetings.filter((m) => m.status !== "cancelled").map(async (meeting) => {
      const invites = await ctx.db.query("invites").withIndex("by_meeting", (q) => q.eq("meetingId", meeting._id)).collect();
      const hostInvite = invites.find((invite) => invite.role === "host");
      const guestInvite = invites.find((invite) => invite.role === "guest");
      return {
        id: meeting._id,
        title: meeting.title,
        guestName: meeting.guestName,
        guestEmail: meeting.guestEmail,
        startsAt: meeting.startsAt,
        durationMinutes: meeting.durationMinutes,
        game: meeting.game ?? "poker",
        status: meeting.status,
        hostInvite: hostInvite?.state ?? "queued",
        guestInvite: guestInvite?.state ?? "queued",
        hostToken: hostInvite?.token ?? "",
      };
    }));
  },
});

/** Everything the meeting table needs: header, game, own seat, and the other seat's peer. */
export const forTable = query({
  args: { meetingId: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    const invite = await inviteByToken(ctx, args.token);
    if (invite.meetingId !== args.meetingId) throw new Error("Invalid meeting link");
    const meeting = await ctx.db.get(invite.meetingId);
    if (!meeting) throw new Error("Meeting not found");
    const host = await ctx.db.get(meeting.hostId);
    const seat = invite.role === "host" ? 0 : 1;
    const peer = await ctx.db
      .query("meetingPeers")
      .withIndex("by_meeting_seat", (q) => q.eq("meetingId", meeting._id).eq("seat", 1 - seat))
      .unique();
    return {
      title: meeting.title,
      startsAt: meeting.startsAt,
      durationMinutes: meeting.durationMinutes,
      game: meeting.game ?? "poker",
      status: meeting.status,
      seat,
      names: [host?.displayName ?? "Host", meeting.guestName],
      peer: peer ? { peerAddress: peer.peerAddress, publicKey: peer.publicKey } : null,
    };
  },
});

/** Publishes this tab's session identity so the other seat can connect (replaces on-chain announce key). */
export const announcePeer = mutation({
  args: { token: v.string(), peerAddress: v.string(), publicKey: v.string() },
  handler: async (ctx, args) => {
    const invite = await inviteByToken(ctx, args.token);
    const meeting = await ctx.db.get(invite.meetingId);
    if (!meeting || meeting.status === "cancelled" || meeting.status === "declined") throw new Error("Meeting is no longer active");
    if (!/^0x[0-9a-f]{40}$/i.test(args.peerAddress) || !/^[0-9a-f]{192}$/i.test(args.publicKey)) throw new Error("Invalid peer identity");
    const seat = invite.role === "host" ? 0 : 1;
    const existing = await ctx.db
      .query("meetingPeers")
      .withIndex("by_meeting_seat", (q) => q.eq("meetingId", invite.meetingId).eq("seat", seat))
      .unique();
    const fields = { peerAddress: args.peerAddress, publicKey: args.publicKey };
    if (existing) await ctx.db.patch(existing._id, fields);
    else await ctx.db.insert("meetingPeers", { meetingId: invite.meetingId, seat, ...fields });
  },
});
