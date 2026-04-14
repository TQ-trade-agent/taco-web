import { ChatOpenAI } from "@langchain/openai";
import type { TradingAgentsConfig } from "../config/defaultConfig.js";

export function createQuickLlm(config: TradingAgentsConfig): ChatOpenAI {
  const mc = config.quick_model_config;
  return new ChatOpenAI({
    model: config.quick_think_llm,
    apiKey: process.env.OPENAI_API_KEY,
    temperature: mc.temperature,
    maxTokens: mc.max_tokens,
    timeout: mc.timeout,
    configuration: { baseURL: config.backend_url },
  });
}

export function createDeepLlm(config: TradingAgentsConfig): ChatOpenAI {
  const mc = config.deep_model_config;
  return new ChatOpenAI({
    model: config.deep_think_llm,
    apiKey: process.env.OPENAI_API_KEY,
    temperature: mc.temperature,
    maxTokens: mc.max_tokens,
    timeout: mc.timeout,
    configuration: { baseURL: config.backend_url },
  });
}
