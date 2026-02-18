import type { ChatOpenAI } from "@langchain/openai";
import { END, START, StateGraph } from "@langchain/langgraph";
import { AgentStateAnnotation } from "./state.js";
import { ConditionalLogic } from "./conditionalLogic.js";
import {
  createAnalystNode,
  createBearResearcher,
  createBullResearcher,
  createNeutralDebator,
  createResearchManager,
  createRiskManager,
  createRiskyDebator,
  createSafeDebator,
  createTrader,
} from "../nodes/agentNodes.js";

const ANALYST_SPECS = {
  market: { field: "market_report" as const, roleZh: "市场分析师（技术与量价）" },
  social: { field: "sentiment_report" as const, roleZh: "社交媒体与情绪分析师" },
  news: { field: "news_report" as const, roleZh: "新闻分析师" },
  fundamentals: { field: "fundamentals_report" as const, roleZh: "基本面分析师" },
};

function analystDisplayName(type: string): string {
  return `${type.charAt(0).toUpperCase() + type.slice(1)} Analyst`;
}

export function buildTradingGraph(
  selectedAnalysts: string[],
  quickLlm: ChatOpenAI,
  deepLlm: ChatOpenAI,
  conditional: ConditionalLogic,
) {
  if (selectedAnalysts.length === 0) {
    throw new Error("TradingAgentsGraph: 至少选择一名分析师");
  }

  for (const a of selectedAnalysts) {
    if (!(a in ANALYST_SPECS)) {
      throw new Error(`未知分析师类型: ${a}，可选: ${Object.keys(ANALYST_SPECS).join(", ")}`);
    }
  }

  /** LangGraph 对「运行时注册的节点名」推断较严，此处放宽以便按选股动态挂载分析师节点 */
  const graph = new StateGraph(AgentStateAnnotation) as unknown as {
    addNode: (name: string, fn: any) => unknown;
    addEdge: (a: typeof START | typeof END | string, b: typeof START | typeof END | string) => unknown;
    addConditionalEdges: (
      src: string,
      fn: (s: typeof AgentStateAnnotation.State) => string,
      map: Record<string, string>,
    ) => unknown;
    compile: () => ReturnType<StateGraph<typeof AgentStateAnnotation.spec>["compile"]>;
  };

  for (const type of selectedAnalysts) {
    const spec = ANALYST_SPECS[type as keyof typeof ANALYST_SPECS];
    const nodeName = analystDisplayName(type);
    graph.addNode(nodeName, createAnalystNode(spec.field, spec.roleZh, quickLlm));
  }

  graph.addNode("Bull Researcher", createBullResearcher(quickLlm));
  graph.addNode("Bear Researcher", createBearResearcher(quickLlm));
  graph.addNode("Research Manager", createResearchManager(deepLlm));
  graph.addNode("Trader", createTrader(quickLlm));
  graph.addNode("Risky Analyst", createRiskyDebator(quickLlm));
  graph.addNode("Safe Analyst", createSafeDebator(quickLlm));
  graph.addNode("Neutral Analyst", createNeutralDebator(quickLlm));
  graph.addNode("Risk Judge", createRiskManager(deepLlm));

  const first = analystDisplayName(selectedAnalysts[0]);
  graph.addEdge(START, first);

  for (let i = 0; i < selectedAnalysts.length; i++) {
    const cur = analystDisplayName(selectedAnalysts[i]);
    const nxt =
      i < selectedAnalysts.length - 1
        ? analystDisplayName(selectedAnalysts[i + 1])
        : "Bull Researcher";
    graph.addEdge(cur, nxt);
  }

  graph.addConditionalEdges("Bull Researcher", (s) => conditional.shouldContinueDebate(s), {
    "Bear Researcher": "Bear Researcher",
    "Research Manager": "Research Manager",
  });

  graph.addConditionalEdges("Bear Researcher", (s) => conditional.shouldContinueDebate(s), {
    "Bull Researcher": "Bull Researcher",
    "Research Manager": "Research Manager",
  });

  graph.addEdge("Research Manager", "Trader");
  graph.addEdge("Trader", "Risky Analyst");

  const riskRouter = (s: typeof AgentStateAnnotation.State) => conditional.shouldContinueRiskAnalysis(s);

  graph.addConditionalEdges("Risky Analyst", riskRouter, {
    "Safe Analyst": "Safe Analyst",
    "Neutral Analyst": "Neutral Analyst",
    "Risky Analyst": "Risky Analyst",
    "Risk Judge": "Risk Judge",
  });

  graph.addConditionalEdges("Safe Analyst", riskRouter, {
    "Safe Analyst": "Safe Analyst",
    "Neutral Analyst": "Neutral Analyst",
    "Risky Analyst": "Risky Analyst",
    "Risk Judge": "Risk Judge",
  });

  graph.addConditionalEdges("Neutral Analyst", riskRouter, {
    "Safe Analyst": "Safe Analyst",
    "Neutral Analyst": "Neutral Analyst",
    "Risky Analyst": "Risky Analyst",
    "Risk Judge": "Risk Judge",
  });

  graph.addEdge("Risk Judge", END);

  return graph.compile();
}
