export function sanitizeDatabaseUrl(raw, nodeEnv = process.env.NODE_ENV) {
  if (!raw) return "";
  const value = raw.trim();
  if (!value) return "";

  const url = new URL(value);
  url.searchParams.delete("channel_binding");

  if (nodeEnv === "production" && !url.searchParams.has("sslmode")) {
    url.searchParams.set("sslmode", "require");
  }

  return url.toString();
}
