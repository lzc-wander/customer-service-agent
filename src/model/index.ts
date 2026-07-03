

// 第一步：加载环境变量（必须在最顶部）
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";


// 创建模型实例
const model = new ChatOpenAI({
  model: "deepseek-v4-flash",
  apiKey: process.env.DEEPSEEK_API_KEY, 
  configuration: {
    baseURL: process.env.DEEPSEEK_API_URL,
  }
});

export default model;
