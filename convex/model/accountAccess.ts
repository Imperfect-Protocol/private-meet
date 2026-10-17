export const ACCOUNT_CREATION_DISABLED = "Account creation is by request only. Please use the Create account link to request access.";

/** Password reset and existing-account sign-in remain available. */
export function assertPasswordFlowAllowed(flow: unknown): void {
  if (flow === "signUp") throw new Error(ACCOUNT_CREATION_DISABLED);
}

/** Only GitHub OAuth may create a user; all providers may sign in existing users. */
export function assertAccountCreationAllowed(
  existingUserId: string | null,
  providerId: string,
  providerType: string,
): void {
  if (existingUserId !== null) return;
  if (providerId === "github" && providerType === "oauth") return;
  throw new Error(ACCOUNT_CREATION_DISABLED);
}
