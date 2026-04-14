import type { AgentState } from "./state.js";

/** 与 Python `tradingagents/graph/conditional_logic.py` 中辩论/风控路由逻辑一致 */
export class ConditionalLogic {
  constructor(
    public maxDebateRounds = 1,
    public maxRiskDiscussRounds = 1,
  ) {}

  shouldContinueDebate(
    state: AgentState,
  ): "Bear Researcher" | "Bull Researcher" | "Research Manager" {
    const debate = state.investment_debate_state;
    const maxCount = 2 * this.maxDebateRounds;

    if (debate.count >= maxCount) {
      return "Research Manager";
    }

    return debate.current_response.startsWith("Bull") ? "Bear Researcher" : "Bull Researcher";
  }

  shouldContinueRiskAnalysis(
    state: AgentState,
  ): "Safe Analyst" | "Neutral Analyst" | "Risky Analyst" | "Risk Judge" {
    const risk = state.risk_debate_state;
    const maxCount = 3 * this.maxRiskDiscussRounds;

    if (risk.count >= maxCount) {
      return "Risk Judge";
    }

    if (risk.latest_speaker.startsWith("Risky")) {
      return "Safe Analyst";
    }
    if (risk.latest_speaker.startsWith("Safe")) {
      return "Neutral Analyst";
    }
    return "Risky Analyst";
  }
}
