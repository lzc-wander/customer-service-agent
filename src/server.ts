// src/server.ts
import express from "express";
import cors from "cors";
import { customerServiceAgent } from "./agent";

const app = express();
app.use(cors());
app.use(express.json());

// 聊天接口
app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message || !sessionId) {
      return res.status(400).json({ 
        error: "缺少必要参数：message 和 sessionId" 
      });
    }
    
    // 配置 thread_id
    const config = {
      configurable: {
        thread_id: `session-${sessionId}`,
      },
    };
    
    // 调用 Agent
    const result = await customerServiceAgent.invoke(
      {
        messages: [{ role: "user", content: message }],
      },
      config
    );
    
    // 返回回复
    const response = result.messages.at(-1)?.content;
    
    res.json({
      success: true,
      response,
      sessionId,
    });
  } catch (error) {
    console.error("聊天接口错误:", error);
    res.status(500).json({
      success: false,
      error: "服务器内部错误"
    });
  }
});

// 健康检查
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 客服服务器运行在 http://localhost:${PORT}`);
});
