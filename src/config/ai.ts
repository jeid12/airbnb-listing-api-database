import { ChatGroq } from "@langchain/groq";

export const model = new ChatGroq({
  model: "llama3-8b-8192",
  temperature: 0.7,
  apiKey: process.env["GROQ_API_KEY"],
});

// Deterministic model for filter extraction — temperature 0 gives consistent JSON
export const filterModel = new ChatGroq({
  model: "llama3-8b-8192",
  temperature: 0,
  apiKey: process.env["GROQ_API_KEY"],
});
