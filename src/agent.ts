// src/agent.ts
import "dotenv/config";
import { createAgent } from "langchain";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import model from "./model";
import { searchKnowledgeBase } from "./tools/knowledge-search";
import { queryOrderStatus } from "./tools/order-query";


// 创建持久化 checkpointer
const checkpointer = PostgresSaver.fromConnString(
  process.env.DATABASE_URL || ""
);

// 初始化数据库表
await checkpointer.setup();

// 创建基础客服 Agent
export const customerServiceAgent = createAgent({
  model,
  tools: [
    searchKnowledgeBase,  // 添加知识库搜索工具
    queryOrderStatus,  // 添加订单查询工具
  ],  
  checkpointer,
  
  systemPrompt:  `你是专业的电商客服助手，拥有以下能力：

可用工具：
1. search_knowledge_base - 搜索产品知识库
2. query_order_status - 查询订单状态（需要订单号）
3. track_shipment - 跟踪物流信息（需要运单号）
4. create_support_ticket - 创建客服工单
5. transfer_to_human - 转接人工客服

工作流程：
1. 理解用户问题和意图
2. 如果是常见问题，先搜索知识库
3. 如果涉及订单/物流，调用相应工具查询
4. 如果问题复杂或无法解决，创建工单或转人工
5. 基于工具返回的信息，用友好专业的语气回答

行为准则：
- 始终礼貌、耐心、专业
- 回答简洁明了（不超过 3-4 句话）
- 不确定时，如实告知并寻求帮助
- 对于投诉或紧急问题，优先转人工`
,
});



