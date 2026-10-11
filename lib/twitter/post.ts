import { composeCaseTweets, tweetIntentUrl, type CaseTweetInput } from "./compose";
import { oauth1Header, twitterConfigured } from "./oauth";

const CREATE_TWEET = "https://api.twitter.com/2/tweets";

export type TwitterPostResult = {
  posted: boolean;
  url: string | null;
  id: string | null;
  intentUrl: string;
  transport: "twitter" | "console" | "skipped";
};

export async function createTweet(text: string, replyTo?: string): Promise<string> {
  const payload: { text: string; reply?: { in_reply_to_tweet_id: string } } = { text };
  if (replyTo) payload.reply = { in_reply_to_tweet_id: replyTo };
  const res = await fetch(CREATE_TWEET, {
    method: "POST",
    headers: {
      Authorization: oauth1Header("POST", CREATE_TWEET),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Twitter ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { data?: { id?: string } };
  const id = data.data?.id;
  if (!id) throw new Error("Twitter did not return a post id.");
  return id;
}

export async function postCaseToTwitter(input: CaseTweetInput): Promise<TwitterPostResult> {
  const composed = composeCaseTweets(input);
  if (!twitterConfigured()) {
    console.info(`[twitter:draft]\n${composed.tweets.join("\n---\n")}`);
    return {
      posted: false,
      url: null,
      id: null,
      intentUrl: composed.intentUrl,
      transport: "console",
    };
  }

  try {
    let previous: string | undefined;
    let firstId = "";
    for (const text of composed.tweets) {
      const id = await createTweet(text, previous);
      if (!firstId) firstId = id;
      previous = id;
    }
    return {
      posted: true,
      url: `https://x.com/i/status/${firstId}`,
      id: firstId,
      intentUrl: composed.intentUrl,
      transport: "twitter",
    };
  } catch (error) {
    console.error(error);
    return {
      posted: false,
      url: null,
      id: null,
      intentUrl: composed.intentUrl,
      transport: "skipped",
    };
  }
}

export async function postTweetThread(
  tweets: string[],
  replyTo?: string,
): Promise<TwitterPostResult> {
  const intentUrl = tweetIntentUrl(tweets.join("\n\n"));
  if (!tweets[0]) {
    return { posted: false, url: null, id: null, intentUrl, transport: "skipped" };
  }
  if (!twitterConfigured()) {
    console.info(`[twitter:draft]\n${tweets.join("\n---\n")}`);
    return { posted: false, url: null, id: null, intentUrl, transport: "console" };
  }
  try {
    let previous = replyTo;
    let firstId = "";
    for (const text of tweets) {
      const id = await createTweet(text, previous);
      if (!firstId) firstId = id;
      previous = id;
    }
    return {
      posted: true,
      url: `https://x.com/i/status/${firstId}`,
      id: firstId,
      intentUrl,
      transport: "twitter",
    };
  } catch (error) {
    console.error(error);
    return { posted: false, url: null, id: null, intentUrl, transport: "skipped" };
  }
}
