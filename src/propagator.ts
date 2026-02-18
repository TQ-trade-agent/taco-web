import { HumanMessage } from "@langchain/core/messages";
import type { AgentState } from "./graph/state.js";
import { emptyInvestDebate, emptyRiskDebate } from "./graph/state.js";

export class Propagator {
  constructor(public maxRecurLimit = 100) {}

  createInitialState(companyName: string, tradeDate: string): Partial<AgentState> {
    const analysisRequest = `请对股票 ${companyName} 进行全面分析，交易日期为 ${tradeDate}。`;

    return {
      messages: [new HumanMessage(analysisRequest)],
      company_of_interest: companyName,
      trade_date: String(tradeDate),
      sender: "",
      investment_debate_state: emptyInvestDebate(),
      risk_debate_state: emptyRiskDebate(),
      market_report: "",
      fundamentals_report: "",
      sentiment_report: "",
      news_report: "",
      investment_plan: "",
      trader_investment_plan: "",
      final_trade_decision: "",
      market_tool_call_count: 0,
      sentiment_tool_call_count: 0,
      news_tool_call_count: 0,
      fundamentals_tool_call_count: 0,
    };
  }
}
