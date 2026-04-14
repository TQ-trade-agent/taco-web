import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** 运行时默认配置（路径按 Node 解析） */
export type TradingAgentsConfig = {
  project_dir: string;
  results_dir: string;
  data_dir: string;
  data_cache_dir: string;
  llm_provider: string;
  deep_think_llm: string;
  quick_think_llm: string;
  backend_url: string;
  max_debate_rounds: number;
  max_risk_discuss_rounds: number;
  max_recur_limit: number;
  online_tools: boolean;
  online_news: boolean;
  realtime_data: boolean;
  quick_model_config: { max_tokens: number; temperature: number; timeout: number };
  deep_model_config: { max_tokens: number; temperature: number; timeout: number };
};

function envBool(key: string, defaultVal: boolean): boolean {
  const v = process.env[key];
  if (v === undefined) return defaultVal;
  return v.toLowerCase() === "true";
}

export function getDefaultConfig(): TradingAgentsConfig {
  const projectDir = path.resolve(__dirname, "..", "..");
  const dataCacheDir = path.join(projectDir, "data", "cache");

  return {
    project_dir: projectDir,
    results_dir: process.env.TRADINGAGENTS_RESULTS_DIR ?? path.join(projectDir, "results"),
    data_dir: path.join(process.env.HOME ?? process.env.USERPROFILE ?? ".", "Documents", "TradingAgents", "data"),
    data_cache_dir: dataCacheDir,
    llm_provider: "openai",
    deep_think_llm: "gpt-4o-mini",
    quick_think_llm: "gpt-4o-mini",
    backend_url: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    max_debate_rounds: 1,
    max_risk_discuss_rounds: 1,
    max_recur_limit: 100,
    online_tools: envBool("ONLINE_TOOLS_ENABLED", false),
    online_news: envBool("ONLINE_NEWS_ENABLED", true),
    realtime_data: envBool("REALTIME_DATA_ENABLED", false),
    quick_model_config: {
      max_tokens: 4000,
      temperature: 0.7,
      timeout: 180_000,
    },
    deep_model_config: {
      max_tokens: 4000,
      temperature: 0.7,
      timeout: 180_000,
    },
  };
}
