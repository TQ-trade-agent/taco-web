import type { TradingAgentsConfig } from "./config/defaultConfig.js";
import { getDefaultConfig } from "./config/defaultConfig.js";
import { ConditionalLogic } from "./graph/conditionalLogic.js";
import { buildTradingGraph } from "./graph/buildGraph.js";
import { createDeepLlm, createQuickLlm } from "./llm/createLlm.js";
import { Propagator } from "./propagator.js";
import type { AgentState } from "./graph/state.js";

export type SelectedAnalyst = "market" | "social" | "news" | "fundamentals";

/** 编排多智能体分析流水线（节点为 LLM 文本推理；数据源工具需自行扩展）。 */
export class TradingAgentsGraph {
  readonly config: TradingAgentsConfig;
  readonly propagator: Propagator;
  private graph: ReturnType<typeof buildTradingGraph>;

  constructor(
    public selectedAnalysts: SelectedAnalyst[] = ["market", "social", "news", "fundamentals"],
    public debug = false,
    config?: Partial<TradingAgentsConfig>,
  ) {
    this.config = { ...getDefaultConfig(), ...config };
    const conditional = new ConditionalLogic(
      this.config.max_debate_rounds,
      this.config.max_risk_discuss_rounds,
    );
    const quick = createQuickLlm(this.config);
    const deep = createDeepLlm(this.config);
    this.propagator = new Propagator(this.config.max_recur_limit);
    this.graph = buildTradingGraph(this.selectedAnalysts, quick, deep, conditional);
  }

  /** 等价于 Python 版 `propagate` 在无进度回调时的 `invoke` 路径。 */
  async propagate(companyName: string, tradeDate: string): Promise<AgentState> {
    const init = this.propagator.createInitialState(companyName, tradeDate);
    const result = await this.graph.invoke(init, {
      recursionLimit: this.config.max_recur_limit,
    });
    return result;
  }

  /** 流式输出每个节点更新（便于接入 CLI / SSE）。 */
  async *streamPropagate(
    companyName: string,
    tradeDate: string,
    streamMode: "updates" | "values" = "values",
  ): AsyncIterable<unknown> {
    const init = this.propagator.createInitialState(companyName, tradeDate);
    const stream = await this.graph.stream(init, {
      recursionLimit: this.config.max_recur_limit,
      streamMode,
    });
    for await (const chunk of stream) {
      yield chunk;
      if (this.debug && streamMode === "values" && chunk && typeof chunk === "object") {
        const messages = (chunk as AgentState).messages;
        const last = messages?.at(-1);
        if (last) {
          console.debug("[TradingAgentsGraph]", last);
        }
      }
    }
  }
}
