// 文档加载和切割
// src/knowledge-base/loader.ts
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { DirectoryLoader } from "@langchain/classic/document_loaders/fs/directory";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";

/**
 * 加载知识库文档
 */
export async function loadKnowledgeBase(): Promise<Document[]> {
  console.log("📚 开始加载知识库文档...");
  
  // 加载所有 Markdown 文件（基于当前文件路径定位，递归子目录）
  const loader = new DirectoryLoader(
    resolve(dirname(fileURLToPath(import.meta.url)), "."),
    {
      ".md": (path: string) => new TextLoader(path),
    },
    true
  );
  
  const docs = await loader.load();
  console.log(`✅ 加载了 ${docs.length} 个文档`);
  
  return docs;
}

/**
 * 切割文档为 chunks
 */
export async function splitDocuments(
  docs: Document[]
): Promise<Document[]> {
  console.log("✂️ 开始切割文档...");
  
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,      // 每个 chunk 800 字符
    chunkOverlap: 150,   // 重叠 150 字符
    separators: [
      "\n\n",   // 段落
      "\n",     // 换行
      "。",      // 中文句号
      "，",      // 中文逗号
      " ",       // 空格
    ],
  });
  
  const chunks = await splitter.splitDocuments(docs);
  console.log(`✅ 切割为 ${chunks.length} 个 chunks`);
  
  return chunks;
}
