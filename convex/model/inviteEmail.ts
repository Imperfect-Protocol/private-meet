/** Return the other attendee's address by role, not by comparing email strings. */
export function otherAttendeeEmail(
  recipientRole: "host" | "guest",
  hostEmail: string,
  guestEmail: string,
): string {
  return recipientRole === "host" ? guestEmail : hostEmail;
}
