import { ChatOpenAI } from "@langchain/openai";

export const model = new ChatOpenAI({
  modelName: "deepseek-chat",
  temperature: 0.7,
  openAIApiKey: process.env["DEEPSEEK_API_KEY"],
  configuration: {
    baseURL: "https://api.deepseek.com",
  },
});

// Deterministic model for filter extraction — temperature 0 gives consistent JSON
export const filterModel = new ChatOpenAI({
  modelName: "deepseek-chat",
  temperature: 0,
  openAIApiKey: process.env["DEEPSEEK_API_KEY"],
  configuration: {
    baseURL: "https://api.deepseek.com",
  },
});
