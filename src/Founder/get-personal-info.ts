import { generateObject, generateText } from "ai";
import { exa } from "../shared";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const getFounderTweets = async (founder: string) => {
  const { results: twitterProfiles } = await exa.searchAndContents(
    `${founder} Twitter (X) profile:`,
    {
      type: "keyword",
      text: true,
      numResults: 3,
      livecrawl: "always",
      includeDomains: ["x.com", "twitter.com"],
    }
  );
 
  const { object: { username } } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: z.object({
      username: z.string().min(1).describe(`${founder} Twitter username`).nullable(),
    }),
    prompt: `Please extract the Twitter username for ${founder} from the following text: ${JSON.stringify(twitterProfiles)}`,
  });
 
  if (!username) {
    return `Could not find Twitter username for ${founder}`;
  }
 
  const result = await exa.searchAndContents(
    `tweets from:${username} -filter:replies`,
    {
      type: "keyword",
      livecrawl: "always",
      includeDomains: ["twitter.com", "x.com"],
      includeText: [username],
    }
  );
  return result.results;
};

const getFounderBackground = async (founder: string) => {
  const exaSearch = exa.searchAndContents(`${founder} Linkedin profile`, {
    type: "keyword",
    numResults: 2,
    livecrawl: "always",
    includeDomains: ["linkedin.com"],
  });
 
  const openaiSearch = generateText({
    model: openai("gpt-4o-mini"),
    prompt: `Please provide a brief summary of the following person's background. <person_name>${founder}</person_name>.`,
  });
 
  const [{ text }, { results }] = await Promise.all([
    openaiSearch,
    exaSearch,
  ]);
 
  return { text, results };
};

const getFounderWebsiteAndPosts = async (founder: string) => {
  const result = await exa.searchAndContents(`${founder} website`, {
    type: "keyword",
    text: true,
    numResults: 4,
    livecrawl: "always",
  });
 
  const { object: { url } } = await generateObject({
    model: openai("gpt-4o"),
    prompt: `From the following search results, extract the website URL of the following person <person_name>${founder}</person_name>.\n\n<search_results>${JSON.stringify(result.results)}</search_results>`,
    schema: z.object({
      url: z.string().nullable().describe(
        `The personal website for ${founder}. If no website is found, return null. This should be only the domain name e.g. www.example.com`
      ),
    }),
  });
 
  if (url) {
    const result = await exa.searchAndContents(url, {
      category: "personal site",
      type: "neural",
      text: true,
      numResults: 1,
      livecrawl: "always",
      subpages: 2,
      subpageTarget: ["blog", "posts", "writing"],
      includeDomains: [url],
    });
    return result.results[0];
  } else {
    return [];
  }
};

export const assessFounderMarketFit = async ({
  founderName,
  companyInfo,
}: {
  founderName: string;
  companyInfo: string;
}) => {
  const { text } = await generateText({
    model: openai("o3-mini"),
    system: "You are a partner at a VC fund looking to invest in a startup...",
    prompt: `<founder_name>${founderName}</founder_name>\n\n<search_results>${JSON.stringify({ companyInfo })}</search_results>`,
  });
  return text;
};
 
export const getFounderInfo = async (founderName: string) => {
  const founderInfo = await Promise.all([
    getFounderTweets(founderName),
    getFounderBackground(founderName),
    getFounderWebsiteAndPosts(founderName),
  ]);
  return founderInfo;
};