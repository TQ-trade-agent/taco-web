import type { ChatOpenAI } from "@langchain/openai";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { AgentState } from "../graph/state.js";

function textContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((c) => (typeof c === "object" && c && "text" in c ? String((c as { text: string }).text) : JSON.stringify(c))).join("");
  }
  return JSON.stringify(content);
}

function cumulativeReports(state: AgentState, exclude?: keyof AgentState): string {
  const parts: string[] = [];
  if (exclude !== "market_report" && state.market_report) {
    parts.push(`【市场】\n${state.market_report}`);
  }
  if (exclude !== "sentiment_report" && state.sentiment_report) {
    parts.push(`【情绪/社交】\n${state.sentiment_report}`);
  }
  if (exclude !== "news_report" && state.news_report) {
    parts.push(`【新闻】\n${state.news_report}`);
  }
  if (exclude !== "fundamentals_report" && state.fundamentals_report) {
    parts.push(`【基本面】\n${state.fundamentals_report}`);
  }
  return parts.join("\n\n---\n\n") || "（尚无前置报告）";
}

export function createAnalystNode(
  field: "market_report" | "sentiment_report" | "news_report" | "fundamentals_report",
  roleZh: string,
  llm: ChatOpenAI,
) {
  return async (state: AgentState) => {
    const ticker = state.company_of_interest;
    const date = state.trade_date;
    const context = cumulativeReports(state, field);
    const system = `你是专业的${roleZh}，服务中文投资者。使用 Markdown，列出要点、数据口径说明与不确定性；本节点为教学演示，未自动接入外部行情工具，请基于常识与文本推理并明确假设。不构成投资建议。`;
    const user = `标的：${ticker}，交易日期：${date}。\n\n可参考的其他维度摘要：\n${context}\n\n请输出完整分析段落。`;
    const out = await llm.invoke([new SystemMessage(system), new HumanMessage(user)]);
    const report = textContent(out.content);
    return {
      [field]: report,
      sender: roleZh,
      messages: [new AIMessage({ content: `【${roleZh}】\n${report}` })],
    };
  };
}

export function createBullResearcher(llm: ChatOpenAI) {
  return async (state: AgentState) => {
    const prev = state.investment_debate_state;
    const bundle = cumulativeReports(state);
    const system = `你是看涨研究员，面向 A股/港股/美股中概语境皆可；用中文论证上行空间、催化剂与估值安全边际，承认反面风险。`;
    const user = `标的 ${state.company_of_interest}（${state.trade_date}）。综合材料：\n${bundle}\n请给出看多论据与情景分析。`;
    const out = await llm.invoke([new SystemMessage(system), new HumanMessage(user)]);
    const text = textContent(out.content);
    const bull_history = prev.bull_history ? `${prev.bull_history}\n\n${text}` : text;
    return {
      investment_debate_state: {
        bull_history,
        history: `${prev.history}\n\n[Bull]\n${text}`,
        current_response: "Bull Researcher",
        count: prev.count + 1,
      },
      sender: "Bull Researcher",
      messages: [new AIMessage({ content: `[Bull Researcher]\n${text}` })],
    };
  };
}

export function createBearResearcher(llm: ChatOpenAI) {
  return async (state: AgentState) => {
    const prev = state.investment_debate_state;
    const bundle = cumulativeReports(state);
    const system = `你是看跌研究员，用中文指出主要下行风险、竞争与宏观变量；逻辑克制，避免人身攻击。`;
    const user = `标的 ${state.company_of_interest}（${state.trade_date}）。综合材料：\n${bundle}\n看多论点摘要：\n${prev.bull_history}\n请反驳并给出风险情景。`;
    const out = await llm.invoke([new SystemMessage(system), new HumanMessage(user)]);
    const text = textContent(out.content);
    const bear_history = prev.bear_history ? `${prev.bear_history}\n\n${text}` : text;
    return {
      investment_debate_state: {
        bear_history,
        history: `${prev.history}\n\n[Bear]\n${text}`,
        current_response: "Bear Researcher",
        count: prev.count + 1,
      },
      sender: "Bear Researcher",
      messages: [new AIMessage({ content: `[Bear Researcher]\n${text}` })],
    };
  };
}

export function createResearchManager(llm: ChatOpenAI) {
  return async (state: AgentState) => {
    const debate = state.investment_debate_state;
    const bundle = cumulativeReports(state);
    const system = `你是研究总监（中文），需要在多空辩论后给出审慎的综合结论：倾向、核心假设、关键验证指标与信息缺口。`;
    const user = `材料：\n${bundle}\n\n多空辩论记录：\n${debate.history}\n请输出「投资委员会纪要」风格的结论段落。`;
    const out = await llm.invoke([new SystemMessage(system), new HumanMessage(user)]);
    const plan = textContent(out.content);
    return {
      investment_plan: plan,
      investment_debate_state: { judge_decision: plan },
      sender: "Research Manager",
      messages: [new AIMessage({ content: `[Research Manager]\n${plan}` })],
    };
  };
}

export function createTrader(llm: ChatOpenAI) {
  return async (state: AgentState) => {
    const system = `你是交易员（中文），把研究结论压缩为可验证的策略草案：观察价位/事件催化、仓位与风控原则（教学用途，非下单指令）。`;
    const user = `研究结论：\n${state.investment_plan}`;
    const out = await llm.invoke([new SystemMessage(system), new HumanMessage(user)]);
    const plan = textContent(out.content);
    return {
      trader_investment_plan: plan,
      sender: "Trader",
      messages: [new AIMessage({ content: `[Trader]\n${plan}` })],
    };
  };
}

export function createRiskyDebator(llm: ChatOpenAI) {
  return async (state: AgentState) => {
    const prev = state.risk_debate_state;
    const system = `你是激进风控视角（中文）：强调尾部风险、流动性与杠杆后果。`;
    const user = `交易草案：\n${state.trader_investment_plan}`;
    const out = await llm.invoke([new SystemMessage(system), new HumanMessage(user)]);
    const text = textContent(out.content);
    return {
      risk_debate_state: {
        risky_history: prev.risky_history ? `${prev.risky_history}\n\n${text}` : text,
        history: `${prev.history}\n[Risky]\n${text}`,
        latest_speaker: "Risky Analyst",
        current_risky_response: text,
        count: prev.count + 1,
      },
      sender: "Risky Analyst",
      messages: [new AIMessage({ content: `[Risky Analyst]\n${text}` })],
    };
  };
}

export function createSafeDebator(llm: ChatOpenAI) {
  return async (state: AgentState) => {
    const prev = state.risk_debate_state;
    const system = `你是保守风控视角（中文）：强调资本保全、合规与极端情景应对。`;
    const user = `交易草案：\n${state.trader_investment_plan}\n激进观点：\n${prev.current_risky_response}`;
    const out = await llm.invoke([new SystemMessage(system), new HumanMessage(user)]);
    const text = textContent(out.content);
    return {
      risk_debate_state: {
        safe_history: prev.safe_history ? `${prev.safe_history}\n\n${text}` : text,
        history: `${prev.history}\n[Safe]\n${text}`,
        latest_speaker: "Safe Analyst",
        current_safe_response: text,
        count: prev.count + 1,
      },
      sender: "Safe Analyst",
      messages: [new AIMessage({ content: `[Safe Analyst]\n${text}` })],
    };
  };
}

export function createNeutralDebator(llm: ChatOpenAI) {
  return async (state: AgentState) => {
    const prev = state.risk_debate_state;
    const system = `你是中性风控视角（中文）：在激进与保守之间寻找可执行的平衡与监控清单。`;
    const user = `交易草案：\n${state.trader_investment_plan}\n激进：\n${prev.current_risky_response}\n保守：\n${prev.current_safe_response}`;
    const out = await llm.invoke([new SystemMessage(system), new HumanMessage(user)]);
    const text = textContent(out.content);
    return {
      risk_debate_state: {
        neutral_history: prev.neutral_history ? `${prev.neutral_history}\n\n${text}` : text,
        history: `${prev.history}\n[Neutral]\n${text}`,
        latest_speaker: "Neutral Analyst",
        current_neutral_response: text,
        count: prev.count + 1,
      },
      sender: "Neutral Analyst",
      messages: [new AIMessage({ content: `[Neutral Analyst]\n${text}` })],
    };
  };
}

export function createRiskManager(llm: ChatOpenAI) {
  return async (state: AgentState) => {
    const risk = state.risk_debate_state;
    const system = `你是首席风险官（中文）：综合三方讨论，给出最终「是否可接受」的风控结论与约束条件。`;
    const user = `交易草案：\n${state.trader_investment_plan}\n风险讨论：\n${risk.history}`;
    const out = await llm.invoke([new SystemMessage(system), new HumanMessage(user)]);
    const decision = textContent(out.content);
    return {
      final_trade_decision: decision,
      risk_debate_state: { judge_decision: decision },
      sender: "Risk Judge",
      messages: [new AIMessage({ content: `[Risk Judge]\n${decision}` })],
    };
  };
}
