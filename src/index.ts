import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";
import { getCompanyInfo } from "./Company/company-info";
import { getCompetitors } from "./Competitor/get-competitors";
import { getFounderInfo, assessFounderMarketFit } from "./Founder/get-personal-info";
import { getCompanyFinancials } from "./Financials/get-financials";
import { generateMemo } from "./Memo/generate-memo";

const main = async (prompt: string) => {
  const { fullStream } = streamText({
    model: openai("gpt-4o-mini"),
    prompt,
    maxSteps: 10,
    tools: {
      getCompanyInfo: tool({
        description: "Get information about a company",
        parameters: z.object({
          companyName: z.string(),
        }),
        execute: async ({ companyName }) => {
          return await getCompanyInfo(companyName);
        },
      }),
      getCompetitors: tool({
        description: "Get competitors of a company",
        parameters: z.object({
          companyName: z.string(),
        }),
        execute: async ({ companyName }) => {
          return await getCompetitors(companyName);
        },
      }),
      getPersonInfo: tool({
        description: "Get information (tweets, blog posts, linkedin profile) about a person",
        parameters: z.object({
          name: z.string(),
        }),
        execute: async ({ name: founderName }) => {
          return await getFounderInfo(founderName);
        },
      }),
      assessFounderMarketFit: tool({
        description: "Assess the market fit of a founder",
        parameters: z.object({
          founderName: z.string(),
          companyInfo: z.string(),
        }),
        execute: async ({ founderName, companyInfo }) => {
          return await assessFounderMarketFit({ founderName, companyInfo });
        },
      }),
      getFinancialInformation: tool({
        description: "Get financial information about a company",
        parameters: z.object({
          companyName: z.string(),
        }),
        execute: async ({ companyName }) => {
          return await getCompanyFinancials(companyName);
        },
      }),
      generateInvestmentPitch: tool({
        description: "Generate an investment pitch for a company",
        parameters: z.object({
          companyName: z.string(),
          companyInfo: z.string(),
          competitors: z.array(z.string()),
          founderInfo: z.string(),
          financialInfo: z.string(),
        }),
        execute: async ({
          companyName,
          companyInfo,
          competitors,
          founderInfo,
          financialInfo,
        }) => {
          return await generateMemo(
            companyName,
            JSON.stringify({
              companyInfo,
              competitors,
              founderInfo,
              financialInfo,
            }),
          );
        },
      })
    }
  });

  for await (const delta of fullStream) {
    if (delta.type === "tool-call") {
      console.log(delta);
    }
    if (delta.type === "tool-result") {
      if (delta.toolName === "generateInvestmentPitch") {
        console.log(delta.result);
      } else {
        console.log(delta.result);
      }
    }
    if (delta.type === "text-delta") {
      process.stdout.write(delta.textDelta);
    }
  }
};

main("Please write an investment pitch for investing in the Tesla pin.");
