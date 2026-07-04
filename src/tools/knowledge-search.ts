// src/tools/knowledge-search.ts
import { tool } from "@langchain/core/tools";
import { PineconeStore } from "@langchain/pinecone";
import { AlibabaTongyiEmbeddings } from "@langchain/community/embeddings/alibaba_tongyi";
import { Pinecone } from "@pinecone-database/pinecone";
import { z } from "zod";

// 初始化向量存储
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const embeddings = new AlibabaTongyiEmbeddings({
  modelName: "text-embedding-v1",
  apiKey: process.env.ALIBABA_TONGYI_API_KEY,
  batchSize: 10,
});
const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

const vectorStore = new PineconeStore(embeddings, {
  pineconeIndex: index,
  namespace: "customer-service",
});

// 创建检索器
const retriever = vectorStore.asRetriever({
  k: 3,  // 返回最相关的 3 个文档
});

/**
 * 知识库搜索工具
 */
export const searchKnowledgeBase = tool(
  async ({ query }) => {
    console.log(`[Knowledge Search] 搜索: "${query}"`);
    
    // 执行检索
    const docs = await retriever.invoke(query);
    
    if (docs.length === 0) {
      return "未在知识库中找到相关信息。";
    }
    
    // 格式化结果
    const formattedDocs = docs.map((doc, index) => {
      const source = doc.metadata.source || "未知来源";
      return `【文档 ${index + 1}】来源：${source}\n${doc.pageContent}\n`;
    }).join("\n---\n");
    
    return formattedDocs;
  },
  {
    name: "search_knowledge_base",
    description: "搜索产品知识库，包括产品信息、退货政策、物流政策、常见问题等。当用户询问产品相关、政策相关或常见问题时调用此工具。",
    schema: z.object({
      query: z.string().describe("搜索关键词或问题描述"),
    }),
  }
);
