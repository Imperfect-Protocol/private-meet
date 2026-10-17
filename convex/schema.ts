import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const inviteRole = v.union(v.literal("host"), v.literal("guest"));

export const inviteState = v.union(
  v.literal("queued"),
  v.literal("sent"),
  v.literal("failed"),
  v.literal("accepted"),
  v.literal("declined"),
);

export const meetingStatus = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("declined"),
  v.literal("cancelled"),
);

export default defineSchema({
  ...authTables,

  accessRequests: defineTable({
    displayName: v.string(),
    email: v.string(),
    message: v.string(),
    status: v.literal("pending"),
  }).index("by_email", ["email"]),

  usernames: defineTable({
    username: v.string(),
    email: v.string(),
    userId: v.id("users"),
  }).index("by_username", ["username"]),

  hosts: defineTable({
    userId: v.id("users"),
    slug: v.string(),
    displayName: v.string(),
    email: v.string(),
    timeZone: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_slug", ["slug"]),

  availability: defineTable({
    hostId: v.id("hosts"),
    weekday: v.number(),
    startMinute: v.number(),
    endMinute: v.number(),
  }).index("by_host", ["hostId"]),

  meetings: defineTable({
    hostId: v.id("hosts"),
    title: v.string(),
    guestName: v.string(),
    guestEmail: v.string(),
    guestTimeZone: v.string(),
    startsAt: v.number(),
    durationMinutes: v.number(),
    status: meetingStatus,
  }).index("by_host_time", ["hostId", "startsAt"]),

  invites: defineTable({
    meetingId: v.id("meetings"),
    role: inviteRole,
    email: v.string(),
    token: v.string(),
    state: inviteState,
    respondedAt: v.optional(v.number()),
  })
    .index("by_meeting", ["meetingId"])
    .index("by_token", ["token"]),

  meetingPeers: defineTable({
    meetingId: v.id("meetings"),
    seat: v.number(),
    peerAddress: v.string(),
    publicKey: v.string(),
  }).index("by_meeting_seat", ["meetingId", "seat"]),
});
