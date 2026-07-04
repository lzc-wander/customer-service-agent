// src/knowledge-base/indexer.ts
import "dotenv/config";
import { fileURLToPath } from "node:url";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { loadKnowledgeBase, splitDocuments } from "./loader";
import { AlibabaTongyiEmbeddings } from "@langchain/community/embeddings/alibaba_tongyi";

/**
 * 构建知识库索引
 */
export async function buildKnowledgeIndex() {
  console.log("🚀 开始构建知识库索引...");
  
  // 1. 加载文档
  const docs = await loadKnowledgeBase();
  
  // 2. 切割文档
  const chunks = await splitDocuments(docs);
  
  // 3. 初始化 Embedding 模型
  console.log("🔤 初始化 Embedding 模型...");
const embeddings = new AlibabaTongyiEmbeddings({
  modelName: "text-embedding-v1",
  apiKey: process.env.ALIBABA_TONGYI_API_KEY,
  batchSize: 10,
});
  
  // 4. 连接 Pinecone
  console.log("🔗 连接 Pinecone...");
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
  
  const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);
  
  // 5. 批量写入向量数据库
  console.log("💾 写入向量数据库...");
  const vectorStore = await PineconeStore.fromDocuments(
    chunks,
    embeddings,
    {
      pineconeIndex: index,
      namespace: "customer-service",
    }
  );
  
  console.log(`✅ 知识库索引构建完成，共 ${chunks.length} 个向量`);
  
  return vectorStore;
}

// 执行索引构建（ESM 兼容写法）
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildKnowledgeIndex().catch(console.error);
}
