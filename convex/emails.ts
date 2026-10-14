import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { sendEmail } from "./model/resend";
import { MINUTE_MS } from "./model/zonedTime";

type InviteEmail = {
  inviteId: Id<"invites">;
  role: "host" | "guest";
  email: string;
  token: string;
  timeZone: string;
  otherName: string;
  otherEmail: string;
};

function siteUrl(): string {
  return (process.env.MEET_SITE_URL ?? "http://127.0.0.1:5173").replace(/\/$/, "");
}

function invitationTemplateId(): string {
    return (process.env.MEET_INVITATION_TEMPLATE_ID ?? "meeting-invitation");
}

function formatWhen(startsAt: number, durationMinutes: number, timeZone: string): string {
  const format = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return `${format.format(startsAt)} (${durationMinutes} min)`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function base64Utf8(value: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(value)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function icsStamp(instant: number): string {
  return new Date(instant).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsFile(meetingId: string, title: string, startsAt: number, durationMinutes: number, link: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Private Meet//EN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${meetingId}@private-meet`,
    `DTSTAMP:${icsStamp(Date.now())}`,
    `DTSTART:${icsStamp(startsAt)}`,
    `DTEND:${icsStamp(startsAt + durationMinutes * MINUTE_MS)}`,
    `SUMMARY:Private Meet: ${title.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,")}`,
    `DESCRIPTION:Join the table: ${link}`,
    `URL:${link}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export const inviteData = internalQuery({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return null;
    const host = await ctx.db.get(meeting.hostId);
    if (!host) return null;
    const invites = await ctx.db.query("invites").withIndex("by_meeting", (q) => q.eq("meetingId", meeting._id)).collect();
    const emails: InviteEmail[] = invites
      .filter((invite) => invite.state === "queued")
      .map((invite) => ({
        inviteId: invite._id,
        role: invite.role,
        email: invite.email,
        token: invite.token,
        timeZone: invite.role === "host" ? host.timeZone : meeting.guestTimeZone,
        otherName: invite.role === "host" ? meeting.guestName : host.displayName,
        otherEmail: invites.filter((other) => other.email != invite.email)[0].email,
      }));
    return { meeting, emails };
  },
});

export const markInvite = internalMutation({
  args: { inviteId: v.id("invites"), state: v.union(v.literal("sent"), v.literal("failed")) },
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);
    if (invite?.state === "queued") await ctx.db.patch(args.inviteId, { state: args.state });
  },
});

/** Emails both parties an Accept/Decline invite with the meeting link and an .ics attachment. */
export const sendInvites = internalAction({
  args: { meetingId: v.id("meetings") },

  handler: async (ctx, args) => {
    const data = await ctx.runQuery(
      internal.emails.inviteData,
      { meetingId: args.meetingId }
    );

    if (!data) return;

    const meeting = data.meeting;
    const templateId = invitationTemplateId();

    if (!templateId) {
      throw new Error("Missing RESEND_INVITATION_TEMPLATE_ID");
    }

    for (const invite of data.emails) {
      try {
        if (!invite.email) {
          throw new Error(`No email address for ${invite.role}`);
        }

        const inviteLink = `${siteUrl()}/invite/${invite.token}`;

        const meetLink =
          `${siteUrl()}/meet/${meeting._id}?k=${invite.token}`;

        const when = formatWhen(
          meeting.startsAt,
          meeting.durationMinutes,
          invite.timeZone
        );

        const ics = icsFile(
          meeting._id,
          meeting.title,
          meeting.startsAt,
          meeting.durationMinutes,
          meetLink
        );

        await sendEmail({
          to: invite.email,
          reply_to: invite.otherEmail,

          template: {
            id: templateId ?? "",
            variables: {
              hostName: invite.otherName,
              meetingWhen: when,
              responseUrl: inviteLink,
              meetingUrl: meetLink,
              termsUrl: `${siteUrl()}/terms`,
              privacyUrl: `${siteUrl()}/privacy`,
            },
          },

          attachments: [
            {
              filename: "private-meet.ics",
              content: base64Utf8(ics),
            },
          ],
        });

        await ctx.runMutation(
          internal.emails.markInvite,
          {
            inviteId: invite.inviteId,
            state: "sent",
          }
        );

      } catch (error) {
        console.error(
          `[Private Meet] invite email failed for ${invite.role}`,
          error
        );

        await ctx.runMutation(
          internal.emails.markInvite,
          {
            inviteId: invite.inviteId,
            state: "failed",
          }
        );
      }
    }
  },
});

