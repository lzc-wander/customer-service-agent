// src/middleware/sentiment-analysis.ts
import { createMiddleware } from "langchain";
import { SystemMessage } from "@langchain/core/messages";

/**
 * 简单的情感分析
 */
function detectSentiment(text: string): "positive" | "neutral" | "negative" {
  const negativeWords = ["生气", "投诉", "差评", "失望", "愤怒", "垃圾", "骗子"];
  const positiveWords = ["谢谢", "满意", "好评", "感谢", "棒", "好"];
  
  const hasNegative = negativeWords.some(word => text.includes(word));
  const hasPositive = positiveWords.some(word => text.includes(word));
  
  if (hasNegative) return "negative";
  if (hasPositive) return "positive";
  return "neutral";
}

/**
 * 情感分析中间件
 */
export const sentimentAnalysisMiddleware = createMiddleware({
  name: "SentimentAnalysis",
  
  beforeModel: async (state) => {
    const messages = state.messages ?? [];
    const userMessage = messages.findLast(m => m._getType() === "human");
    
    if (userMessage && typeof userMessage.content === "string") {
        const sentiment = detectSentiment(userMessage.content);


      // 如果检测到负面情绪，添加特殊指令
      if (sentiment === "negative") {
        return {
          messages: [
            ...messages,
            new SystemMessage("⚠️ 用户情绪负面，请特别注意：\n1. 保持冷静和专业\n2. 表达理解和歉意\n3. 提供明确的解决方案\n4. 必要时主动转人工"),
          ],
        };
      }
    }

    // 返回 undefined 表示不修改 state
  },
});
