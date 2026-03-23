/**
 * 示例（仓库根目录）：
 *   cp .env.example .env   # 填入 OPENAI_API_KEY
 *   npm install && npm run example -- 600519 2026-05-06
 */
import "dotenv/config";
import { TradingAgentsGraph } from "../src/tradingGraph.js";

async function main() {
  const ticker = process.argv[2] ?? "600519";
  const date = process.argv[3] ?? "2026-05-06";

  if (!process.env.OPENAI_API_KEY) {
    console.error("请设置环境变量 OPENAI_API_KEY（可将 .env.example 复制为 .env 并填写）。");
    process.exit(1);
  }

  const graph = new TradingAgentsGraph(
    ["market", "news", "fundamentals"],
    false,
    {
      quick_think_llm: process.env.QUICK_MODEL ?? "gpt-4o-mini",
      deep_think_llm: process.env.DEEP_MODEL ?? "gpt-4o-mini",
      backend_url: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    },
  );

  console.log(`开始分析 ${ticker} @ ${date} …`);
  const state = await graph.propagate(ticker, date);

  console.log("\n========== 研究结论 ==========\n");
  console.log(state.investment_plan);
  console.log("\n========== 交易草案 ==========\n");
  console.log(state.trader_investment_plan);
  console.log("\n========== 风控终审 ==========\n");
  console.log(state.final_trade_decision);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
