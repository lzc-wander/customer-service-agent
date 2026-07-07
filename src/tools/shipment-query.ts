// src/tools/shipment-query.ts
import { tool } from "@langchain/core/tools";
import pg from "pg";
import { z } from "zod";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const statusMap: Record<string, string> = {
  ordered: "已下单",
  picked_up: "已揽收",
  in_transit: "运输中",
  sorting: "分拣中",
  delivering: "派送中",
  delivered: "已签收",
  failed: "投递失败",
  returned: "已退回",
};

/**
 * 查询物流信息
 */
export const queryShipment = tool(
  async ({ trackingNo }) => {
    console.log(`[Shipment Query] 查询物流: ${trackingNo}`);

    const client = await pool.connect();
    try {
      // 查询物流主表
      const shipRes = await client.query(
        `SELECT * FROM shipments WHERE tracking_no = $1`,
        [trackingNo]
      );

      if (shipRes.rows.length === 0) {
        return `未找到物流单号 ${trackingNo}，请确认单号是否正确。`;
      }

      const s = shipRes.rows[0];

      // 查询节点明细
      const trackRes = await client.query(
        `SELECT * FROM shipment_tracking WHERE tracking_no = $1 ORDER BY created_at ASC`,
        [trackingNo]
      );

      // 格式化节点记录
      const trackLines = trackRes.rows.map((t, i) => {
        const time = new Date(t.created_at).toLocaleString("zh-CN", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
        const icon = i === 0 ? "🟢" : i === trackRes.rows.length - 1 ? "🔵" : "  ";
        return `${icon} ${time}  ${statusMap[t.status] || t.status}\n   ${t.description}${t.location ? ` — ${t.location}` : ""}`;
      }).join("\n\n");

      return `📦 物流详情
━━━━━━━━━━━━━━━━━━━━
📮 单号：${s.tracking_no}
🏢 快递：${s.company}${s.company_phone ? `（${s.company_phone}）` : ""}
📌 状态：${statusMap[s.status] || s.status}
📍 当前位置：${s.current_location || "暂无"}
📅 预计送达：${s.estimated_delivery ? new Date(s.estimated_delivery).toLocaleString("zh-CN") : "暂无"}
👤 收件人：${s.receiver_name}  ${s.receiver_phone}
📍 收件地址：${s.receiver_address}
${s.weight_kg ? `⚖️ 重量：${s.weight_kg}kg` : ""}

━━━━ 物流轨迹 ━━━━
${trackLines}`;
    } catch (error) {
      console.error("[Shipment Query] 查询失败:", error);
      return `抱歉，查询物流 ${trackingNo} 时出现异常，请稍后重试。`;
    } finally {
      client.release();
    }
  },
  {
    name: "query_shipment",
    description: "查询物流信息和物流轨迹。当用户询问快递物流、运单追踪、快递到哪里了时调用此工具，仅需提供物流单号即可。",
    schema: z.object({
      trackingNo: z.string().describe("物流单号/快递单号，例如：SF1234567890"),
    }),
  }
);
