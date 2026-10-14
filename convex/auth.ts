import GitHub from "@auth/core/providers/github";
import type { ConvexCredentialsUserConfig } from "@convex-dev/auth/providers/ConvexCredentials";
import { Email } from "@convex-dev/auth/providers/Email";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { makeFunctionReference } from "convex/server";
import { sendEmail } from "./model/resend";
import type { MutationCtx } from "./_generated/server";

function siteUrl(): string {
  return (process.env.MEET_SITE_URL ?? "http://127.0.0.1:5173").replace(/\/$/, "");
}

function passwordResetTemplateId(): string {
    return (process.env.MEET_PASSWORD_RESET_TEMPLATE_ID  ?? "password-reset");
}

const PasswordReset = Email({
  id: "password-reset",
  name: "Password Reset",
  maxAge: 30 * 60,
  async sendVerificationRequest({ identifier, url }) {
    await sendEmail({
      to: identifier,

      template: {
        id: passwordResetTemplateId(),
        variables: {
          url,
          privacyUrl: `${siteUrl()}/privacy`,
          termsUrl: `${siteUrl()}/terms`,
        },
      },
    });
  },
});

const password = Password({
  reset: PasswordReset,
  profile(params) {
    return {
      email: String(params.email ?? "").trim().toLowerCase(),
      name: String(params.name ?? "").trim().toLowerCase(),
    };
  },
});

// Convex Auth 0.0.95 materializes credentials from `options`. Delegate all password
// flows to its implementation after resolving a username to the canonical email.
const passwordOptions = (password as unknown as { options: ConvexCredentialsUserConfig }).options;
const usernamePassword = {
  ...password,
  options: {
    ...passwordOptions,
    authorize: async (params: Parameters<ConvexCredentialsUserConfig["authorize"]>[0], ctx: Parameters<ConvexCredentialsUserConfig["authorize"]>[1]) => {
      let email = String(params.email ?? "").trim().toLowerCase();
      if (params.flow === "signUp") {
        if (!/^[a-z0-9_]{3,30}$/.test(String(params.name ?? "").trim().toLowerCase())) {
          throw new Error("Username must be 3–30 letters, numbers or underscores");
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A valid email is required");
      } else if (!email.includes("@")) {
        const resolved: string | null = await ctx.runQuery(makeFunctionReference<"query">("usernames:emailForUsername"), { username: email });
        if (!resolved) throw new Error("Invalid credentials");
        email = resolved;
      }
      return passwordOptions.authorize({ ...params, email }, ctx);
    },
  },
};

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    GitHub({ clientId: process.env.AUTH_GITHUB_ID, clientSecret: process.env.AUTH_GITHUB_SECRET }),
    usernamePassword,
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, args) {
      if (args.type !== "credentials") return;
      const username = String(args.profile.name ?? "").trim().toLowerCase();
      const email = String(args.profile.email ?? "").trim().toLowerCase();
      const db = (ctx as MutationCtx).db;
      const existing = await db.query("usernames").withIndex("by_username", (q) => q.eq("username", username)).unique();
      if (existing && existing.userId !== args.userId) throw new Error("Username is already taken");
      if (!existing) await ctx.db.insert("usernames", { username, email, userId: args.userId });
    },
  },
});
