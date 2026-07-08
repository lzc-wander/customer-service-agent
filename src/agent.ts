// src/agent.ts
import "dotenv/config";
import { createAgent } from "langchain";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import model from "./model";
import { searchKnowledgeBase } from "./tools/knowledge-search";
import { queryOrderStatus } from "./tools/order-query";
import { queryShipment } from "./tools/shipment-query";
import { transferToHuman } from "./tools/transfer-human";
import { sentimentAnalysisMiddleware } from "./middware/sentiment-analysis";

// 创建持久化 checkpointer
const checkpointer = PostgresSaver.fromConnString(
  process.env.DATABASE_URL || ""
);

// 初始化数据库表
await checkpointer.setup();

// 创建基础客服 Agent
export const customerServiceAgent = createAgent({
  model,
  middleware: [sentimentAnalysisMiddleware],
  tools: [
    searchKnowledgeBase, // 搜索产品知识库
    queryOrderStatus, // 查询订单状态
    queryShipment, // 查询物流信息
    transferToHuman, // 转接人工客服
  ],  
  checkpointer,
  
  systemPrompt:  `你是专业的电商客服助手，拥有以下能力：

可用工具：
1. search_knowledge_base - 搜索产品知识库
2. query_order_status - 查询订单状态（需要订单号）
3. query_shipment - 查询物流信息（需要运单号）
4. transfer_to_human - 转接人工客服

工作流程：
1. 理解用户问题和意图
2. 如果是常见问题，先搜索知识库
3. 如果涉及订单/物流，调用相应工具查询
4. 如果问题复杂或无法解决，转人工
5. 基于工具返回的信息，用友好专业的语气回答

行为准则：
- 始终礼貌、耐心、专业
- 回答简洁明了（不超过 3-4 句话）
- 不确定时，如实告知并寻求帮助
- 对于投诉或紧急问题，优先转人工

主动引导策略：
1. 用户询问产品时，主动推荐相关产品
2. 用户遇到问题时，提供多种解决方案
3. 对话结束时，询问是否还有其他帮助
4. 检测到用户不满时，及时安抚并转人工

示例对话：
用户："我想买手机"
助手："我们有 iPhone 15、Samsung Galaxy S24 等多款手机。您更看重哪些方面？（拍照、性能、价格）"

用户："我的订单还没到"
助手："我来帮您查询物流状态。请提供订单号或运单号。"
（查询后）
"您的包裹正在运输中，预计明天送达。如有其他问题，随时告诉我。"`
,
});



