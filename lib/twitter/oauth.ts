import { createHmac, randomBytes } from "node:crypto";

function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function twitterConfigured(): boolean {
  return Boolean(
    process.env.TWITTER_API_KEY &&
      process.env.TWITTER_API_SECRET &&
      process.env.TWITTER_ACCESS_TOKEN &&
      process.env.TWITTER_ACCESS_TOKEN_SECRET,
  );
}

export function oauth1Header(method: string, url: string): string {
  const consumerKey = process.env.TWITTER_API_KEY || "";
  const consumerSecret = process.env.TWITTER_API_SECRET || "";
  const token = process.env.TWITTER_ACCESS_TOKEN || "";
  const tokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET || "";
  const params: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: token,
    oauth_version: "1.0",
  };
  const base = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join("&");
  const signatureBase = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(base)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  params.oauth_signature = createHmac("sha1", signingKey).update(signatureBase).digest("base64");
  return `OAuth ${Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(params[key])}"`)
    .join(", ")}`;
}
