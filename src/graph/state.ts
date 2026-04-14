import type { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

export type InvestDebateState = {
  bull_history: string;
  bear_history: string;
  history: string;
  current_response: string;
  judge_decision: string;
  count: number;
};

export type RiskDebateState = {
  risky_history: string;
  safe_history: string;
  neutral_history: string;
  history: string;
  latest_speaker: string;
  current_risky_response: string;
  current_safe_response: string;
  current_neutral_response: string;
  judge_decision: string;
  count: number;
};

function mergeInvest(a: InvestDebateState, b: Partial<InvestDebateState>): InvestDebateState {
  return { ...a, ...b };
}

function mergeRisk(a: RiskDebateState, b: Partial<RiskDebateState>): RiskDebateState {
  return { ...a, ...b };
}

export function emptyInvestDebate(): InvestDebateState {
  return {
    bull_history: "",
    bear_history: "",
    history: "",
    current_response: "",
    judge_decision: "",
    count: 0,
  };
}

export function emptyRiskDebate(): RiskDebateState {
  return {
    risky_history: "",
    safe_history: "",
    neutral_history: "",
    history: "",
    latest_speaker: "",
    current_risky_response: "",
    current_safe_response: "",
    current_neutral_response: "",
    judge_decision: "",
    count: 0,
  };
}

/** LangGraph 状态注解：在 Python 版 `AgentState` 基础上改为显式 reducer */
export const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  company_of_interest: Annotation<string>,
  trade_date: Annotation<string>,
  sender: Annotation<string>,
  market_report: Annotation<string>,
  sentiment_report: Annotation<string>,
  news_report: Annotation<string>,
  fundamentals_report: Annotation<string>,
  market_tool_call_count: Annotation<number>,
  sentiment_tool_call_count: Annotation<number>,
  news_tool_call_count: Annotation<number>,
  fundamentals_tool_call_count: Annotation<number>,
  investment_debate_state: Annotation<InvestDebateState>({
    reducer: mergeInvest,
    default: () => emptyInvestDebate(),
  }),
  investment_plan: Annotation<string>,
  trader_investment_plan: Annotation<string>,
  risk_debate_state: Annotation<RiskDebateState>({
    reducer: mergeRisk,
    default: () => emptyRiskDebate(),
  }),
  final_trade_decision: Annotation<string>,
});

export type AgentState = typeof AgentStateAnnotation.State;
