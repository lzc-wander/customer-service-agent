// src/agent.ts
import "dotenv/config";
import { createAgent } from "langchain";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import model from "./model";



// 创建持久化 checkpointer
const checkpointer = PostgresSaver.fromConnString(
  process.env.DATABASE_URL || ""
);

// 初始化数据库表
await checkpointer.setup();

// 创建基础客服 Agent
export const customerServiceAgent = createAgent({
  model,
  tools: [],  // 暂时不添加工具
  checkpointer,
  
  systemPrompt: `你是专业的电商客服助手。

行为准则：
1. 用友好、专业的语气回答用户问题
2. 如果不知道答案，诚实告知，不要编造
3. 保持回答简洁，每次不超过 3 句话
4. 对于复杂问题，主动提出转接人工客服

当前时间：${new Date().toLocaleString("zh-CN")}`,
});



