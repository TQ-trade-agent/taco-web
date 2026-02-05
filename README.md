<div align="center">

# 交易智能体 · 多智能体股票研究编排

**面向中文用户的 AI 股票研究与策略原型工具链——结构化输出、可编排、易集成，助力研究与教学场景。**

[![许可证](https://img.shields.io/badge/许可证-Apache%202.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/运行环境-Node.js%2018%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/语言-TypeScript%205-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[**快速开始**](#快速开始) · [**接口说明**](#接口说明) · [**风险提示**](#风险提示)

</div>

---

## 项目定位

本项目将「标的代码 + 交易日」转化为一篇**分阶段、可追溯的多智能体研究报告链路**：专业分析师分工产出观点 → 多空研究员辩论砥砺结论 → 研究总监形成纪要式综合判断 → 交易员给出策略草案 → 风控多方合议与情景推演 → 终审输出。**适用于中文语境下的学习、研究与内部原型验证**。

技术栈为 **TypeScript（运行于 Node.js）**，工作流由 **LangGraph** 编排；模型调用采用 **OpenAI 兼容接口**，可对接官方接口、聚合网关或国产兼容底座，降低供应商绑定。

> **边界声明：**本项目用于教育、研究与流程验证，**不是**证券公司服务，**不提供**实盘下单指令，**不承诺**收益。

---

## 核心亮点

| 维度 | 说明 |
|------|------|
| **编排能力** | 状态图驱动：分析师链路 → 多空辩论 → 综合结论 → 交易草案 → 风控循环 → 终审 |
| **运维友好** | 提供 HTTP 接口与命令行示例；支持 Docker Compose 一键拉起接口服务与可选前端镜像 |
| **模型可调** | 通过环境变量或请求体中的 `config` 切换模型与网关地址 |
| **输出透明** | 各阶段均为结构化文本，便于记录、比对或接入自有报表 / 评估流水线 |

---

## 克隆与安装

```bash
git clone https://github.com/TQ-trade-agent/trading-agent.git
cd trading-agent
cp .env.example .env   # 填写 OPENAI_API_KEY，按需填写 OPENAI_BASE_URL
npm install
npm run dev            # 默认监听 http://0.0.0.0:8000
```

**生产形态启动（先编译）：**

```bash
npm run build
npm start
```

**容器编排（后端接口 + 前端镜像）：**

```bash
cp .env.example .env
docker compose up --build
```

---

## 快速开始

| 场景 | 命令 |
|------|------|
| 本地开发（热重载） | `npm run dev` |
| 命令行单次演示 | `npm run example -- 600519 2026-05-06` |
| 静态类型检查 | `npm run typecheck` |

默认 HTTP 端口：**8000**；可通过环境变量 `API_HOST`、`API_PORT` 调整。

---

## 接口说明

### `GET /api/health`

健康检查，返回服务存活状态（JSON）。

### `POST /api/analyze`

对单一标的与日期执行完整智能体流水线。

**请求体（JSON）**

| 字段 | 必填 | 说明 |
|------|:----:|------|
| `ticker` | ✓ | 标的代码或简称（如沪深代码、`AAPL` 等） |
| `trade_date` | ✓ | 交易日字符串（建议 `YYYY-MM-DD`） |
| `analysts` | 否 | 分析师子集：`market`、`social`、`news`、`fundamentals` |
| `config` | 否 | 运行时局部配置（模型名、`backend_url`、辩论轮次等） |

**请求示例**

```json
{
  "ticker": "600519",
  "trade_date": "2026-05-06",
  "analysts": ["market", "news", "fundamentals"],
  "config": {
    "quick_think_llm": "gpt-4o-mini",
    "deep_think_llm": "gpt-4o-mini",
    "backend_url": "https://api.openai.com/v1"
  }
}
```

**响应概要：**包含各分析师报告、综合研究结论、交易员草案与风控终审文本，可直接对接看板、导出文档或大模型评测脚本。

---

## 仓库结构（节选）

```
src/           # 编排核心、节点实现、配置与 HTTP 服务入口 server.ts
examples/      # 命令行示例
frontend/      # 可选 Vue 3 前端（需自行配置后端地址）
docs/          # 历史或补充文档（若与当前栈不一致，请以代码为准）
```

---

## 致谢与渊源

工作流创意受益于开源社区中的多智能体金融研究范式（例如 [TradingAgents](https://github.com/TauricResearch/TradingAgents)）。本仓库侧重 **轻量 TypeScript 运行时**、清晰的 HTTP 契约与部署路径，便于中文开发者二次集成。

---

## 许可证

服务端与核心库默认遵循 **Apache 2.0**，详见仓库根目录 [`LICENSE`](LICENSE)。若 `frontend/` 目录内附有单独许可证文件，则该目录内资源以其声明为准。

---

## 风险提示

模型输出具有生成性与不确定性，可能存在遗漏、过时或错误；证券投资有风险。**请勿**将生成内容等同于投资、法务或税务意见；决策前请咨询具备资质的专业人士。

<div align="center">

若本项目对您的研究与教学有帮助，欢迎在 GitHub 上收藏本仓库以便跟进更新。

</div>
