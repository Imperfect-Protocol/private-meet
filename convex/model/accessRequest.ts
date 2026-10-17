export type AccessRequest = {
  displayName: string;
  email: string;
  message: string;
};

export const ACCESS_REQUEST_LIMITS = { displayName: 100, email: 254, message: 5000 };

/** Validation shared by the request form and the public mutation. */
export function validateAccessRequest(input: AccessRequest): AccessRequest {
  const request = {
    displayName: input.displayName.trim(),
    email: input.email.trim().toLowerCase(),
    message: input.message.trim(),
  };
  if (!request.displayName || request.displayName.length > ACCESS_REQUEST_LIMITS.displayName) {
    throw new Error("Enter a display name of up to 100 characters.");
  }
  if (request.email.length > ACCESS_REQUEST_LIMITS.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email)) {
    throw new Error("Enter a valid email address.");
  }
  if (!request.message || request.message.length > ACCESS_REQUEST_LIMITS.message) {
    throw new Error("Enter a message of up to 5000 characters.");
  }
  return request;
}
