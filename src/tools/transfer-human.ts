// src/tools/transfer-human.ts
import { tool } from "@langchain/core/tools";
import pg from "pg";
import { z } from "zod";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * 转接人工客服
 */
export const transferToHuman = tool(
  async ({ userId, reason }) => {
    console.log(`[Transfer] 转接人工: userId=${userId || "未提供"}, reason=${reason}`);

    const client = await pool.connect();
    try {
      // 创建工单记录（用于人工客服队列）
      await client.query(
        `INSERT INTO support_tickets (user_id, reason, status, source)
         VALUES ($1, $2, 'pending', 'auto_transfer')`,
        [userId || "anonymous", reason]
      );

      console.log(`[Transfer] 工单已创建，等待人工客服接听`);
      return `已为您转接人工客服，工单已提交。人工客服将尽快为您服务，请保持在线耐心等待。`;
    } catch (error) {
      console.error("[Transfer] 转接失败:", error);
      return `已为您转接人工客服，请稍候。如长时间未响应，请拨打客服热线 400-800-1234。`;
    } finally {
      client.release();
    }
  },
  {
    name: "transfer_to_human",
    description: "转接人工客服。当用户遇到复杂问题、投诉、紧急情况，或AI无法解决用户问题时调用此工具。",
    schema: z.object({
      userId: z.string().optional().describe("用户ID（可选）"),
      reason: z.string().describe("转接原因，描述用户遇到的问题"),
    }),
  }
);
