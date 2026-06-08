/**
 * Strips script tags, HTML elements, and database injection sequences from properties.
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // strip script tags and content
    .replace(/<[^>]*>/g, "") // strip all other HTML tags
    .replace(/[\$\{\}\[\]\"\'\`\;]/g, "") // strip query syntax/syntax injection
    .trim();
}

/**
 * Validates usernames against alphanumeric, underscore, hyphen format (3 to 20 chars).
 */
export function validateUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return usernameRegex.test(username);
}

/**
 * Validates format and length of email addresses.
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 100;
}
