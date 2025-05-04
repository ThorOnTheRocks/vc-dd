import { openai } from "@ai-sdk/openai";
import { generateObject, generateText, Output, tool } from "ai";
import { z } from "zod";
import { exa } from "../shared";


export const companyInfoPrompt = (company: string) => `For the following company provide:
- a brief company description
- what do they sell / what products do they offer
 
<company>${company}</company>`

const fetchCompanyInfoWithOpenAI = async (company: string) => {
  const { text: description, sources } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: companyInfoPrompt(company),
  });
  return { description, sources };
};

const fetchCompanyInfoFromWeb = async (company: string) => {
  const { experimental_output: object } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: companyInfoPrompt(company),
    tools: {
      searchWeb: tool({
        description: "Search the web for information about a company",
        parameters: z.object({
          query: z.string().min(1).max(100).describe("The search query"),
        }),
        execute: async ({ query }) => {
          const { results } = await exa.searchAndContents(query, {
            livecrawl: "always",
            numResults: 5,
          });
          return { results };
        },
      }),
    },
    maxSteps: 3,
    experimental_output: Output.object({
      schema: z.object({
        description: z.string(),
        products: z.array(z.string()).describe("The products offered by the company"),
      }),
    }),
  });
  return object;
};

export const getCompanyInfo = async (company: string) => {
  const results = await Promise.all([
    await fetchCompanyInfoWithOpenAI(company),
    await fetchCompanyInfoFromWeb(company),
  ]);
  const { object } = await generateObject({
    model: openai("gpt-4o"),
    prompt: `The user has asked for a detailed overview of ${company}.
    Synthesize from the following sources:\n${JSON.stringify(results)}`,
    schema: z.object({
      description: z.string(),
      products: z.array(z.string()).describe("The products offered by the company"),
      sources: z.array(z.string()).describe("The sources used"),
    }),
  });
  return object;
};