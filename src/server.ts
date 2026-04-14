import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { TradingAgentsGraph, type SelectedAnalyst } from "./tradingGraph.js";
import type { TradingAgentsConfig } from "./config/defaultConfig.js";

const ALLOWED_ANALYSTS = new Set<string>(["market", "social", "news", "fundamentals"]);

function parseAnalysts(raw: unknown): SelectedAnalyst[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) return undefined;
  const out: SelectedAnalyst[] = [];
  for (const x of raw) {
    if (typeof x !== "string" || !ALLOWED_ANALYSTS.has(x)) {
      return undefined;
    }
    out.push(x as SelectedAnalyst);
  }
  return out.length ? out : undefined;
}

async function main() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  app.get("/api/health", async () => ({
    status: "ok",
    runtime: "node-typescript",
  }));

  app.post<{
    Body: {
      ticker?: string;
      trade_date?: string;
      analysts?: string[];
      config?: Partial<TradingAgentsConfig>;
    };
  }>("/api/analyze", async (request, reply) => {
    if (!process.env.OPENAI_API_KEY) {
      return reply.code(503).send({ error: "服务器未配置 OPENAI_API_KEY" });
    }

    const ticker = request.body.ticker?.trim();
    const tradeDate = request.body.trade_date?.trim();
    if (!ticker || !tradeDate) {
      return reply.code(400).send({ error: "请求体需包含 ticker 与 trade_date" });
    }

    const analysts = parseAnalysts(request.body.analysts);
    const graph = new TradingAgentsGraph(
      analysts ?? ["market", "social", "news", "fundamentals"],
      false,
      request.body.config,
    );

    try {
      const state = await graph.propagate(ticker, tradeDate);
      return {
        company_of_interest: state.company_of_interest,
        trade_date: state.trade_date,
        market_report: state.market_report,
        sentiment_report: state.sentiment_report,
        news_report: state.news_report,
        fundamentals_report: state.fundamentals_report,
        investment_plan: state.investment_plan,
        trader_investment_plan: state.trader_investment_plan,
        final_trade_decision: state.final_trade_decision,
      };
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({
        error: err instanceof Error ? err.message : "分析执行失败",
      });
    }
  });

  const host = process.env.API_HOST ?? "0.0.0.0";
  const port = Number(process.env.API_PORT ?? 8000);
  await app.listen({ host, port });
  app.log.info(`TradingAgents-CN API 监听 http://${host}:${port}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
