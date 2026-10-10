/** Unguessable URL-safe secret for invite and meeting links. */
export function newToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

export function meetingStatusFrom(states: string[]): "pending" | "confirmed" | "declined" {
  if (states.includes("declined")) return "declined";
  if (states.length > 0 && states.every((state) => state === "accepted")) return "confirmed";
  return "pending";
}
