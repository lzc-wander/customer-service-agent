// src/tools/order-query.ts
import { tool } from "@langchain/core/tools";
import pg from "pg";
import { z } from "zod";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 状态映射
const statusMap: Record<string, string> = {
  pending_payment: "待支付",
  paid: "已支付",
  shipped: "已发货",
  delivered: "已签收",
  completed: "已完成",
  cancelled: "已取消",
  refunding: "退款中",
  refunded: "已退款",
};

/**
 * 查询订单状态（实际数据库）
 */
export const queryOrderStatus = tool(
  async ({ orderId }) => {
    console.log(`[Order Query] 查询订单: ${orderId}`);

    const client = await pool.connect();
    try {
      // 查询主表
      const orderRes = await client.query(
        `SELECT * FROM orders WHERE order_no = $1 AND deleted_at IS NULL`,
        [orderId]
      );

      if (orderRes.rows.length === 0) {
        return `未找到订单 ${orderId}，请确认订单号是否正确。`;
      }

      const order = orderRes.rows[0];

      // 查询明细
      const itemsRes = await client.query(
        `SELECT product_name, product_spec, unit_price, quantity, subtotal FROM order_items WHERE order_id = $1`,
        [order.id]
      );

      // 查询最近的操作日志
      const logsRes = await client.query(
        `SELECT to_status, remark, created_at FROM order_logs WHERE order_id = $1 ORDER BY created_at DESC LIMIT 3`,
        [order.id]
      );

      // 格式化商品列表
      const productLines = itemsRes.rows.map(
        (item) => `${item.product_name}${item.product_spec ? `（${item.product_spec}）` : ""} x${item.quantity}  ¥${item.subtotal}`
      );

      // 格式化状态流转
      const logLines = logsRes.rows
        .map((log) => `  ${statusMap[log.to_status] || log.to_status} — ${log.remark}（${new Date(log.created_at).toLocaleString("zh-CN")}）`)
        .join("\n");

      return `订单信息：
━━━━━━━━━━━━━━━━━━━━
📋 订单号：${order.order_no}
👤 用户ID：${order.user_id}
📌 状态：${statusMap[order.status] || order.status}
💰 商品金额：¥${order.total_amount}
🚚 运费：¥${order.shipping_fee}
💵 实付金额：¥${order.actual_amount}
💳 支付方式：${order.payment_method || "未支付"}
📅 下单时间：${new Date(order.created_at).toLocaleString("zh-CN")}${order.payment_time ? `\n💲 付款时间：${new Date(order.payment_time).toLocaleString("zh-CN")}` : ""}

📦 商品清单：
${productLines.join("\n")}${order.consignee_name ? `

📍 收货信息：
  姓名：${order.consignee_name}
  电话：${order.consignee_phone}
  地址：${order.consignee_address}` : ""}${order.express_no ? `

📮 物流信息：
  快递：${order.express_company || ""}  单号：${order.express_no}` : ""}${order.buyer_remark ? `

💬 买家备注：${order.buyer_remark}` : ""}

📜 最近状态记录：
${logLines || "  （暂无记录）"}`;
    } catch (error) {
      console.error("[Order Query] 查询失败:", error);
      return `抱歉，查询订单 ${orderId} 时出现异常，请稍后重试或联系人工客服。`;
    } finally {
      client.release();
    }
  },
  {
    name: "query_order_status",
    description: "查询订单状态和详细信息。当用户询问订单状态、订单详情时调用此工具，仅需提供订单号即可。",
    schema: z.object({
      orderId: z.string().describe("订单号，例如：ORD202607062021234940"),
    }),
  }
);
