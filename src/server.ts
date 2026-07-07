// src/server.ts
import express from "express";
import cors from "cors";
import pg from "pg";
import { customerServiceAgent } from "./agent";

const { Pool } = pg;

// 数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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

// 创建订单接口
app.post("/api/orders", async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      userId,
      items,           // [{ productId, productName, productImage, productSpec, unitPrice, quantity }]
      consigneeName,
      consigneePhone,
      consigneeAddress,
      paymentMethod,
      buyerRemark,
    } = req.body;

    // 验证必填字段
    if (!userId || !items?.length || !consigneeName || !consigneePhone || !consigneeAddress) {
      return res.status(400).json({ error: "缺少必要参数" });
    }

    // 计算金额
    let totalAmount = 0;
    for (const item of items) {
      if (!item.productId || !item.productName || !item.unitPrice || !item.quantity) {
        return res.status(400).json({ error: "商品信息不完整" });
      }
      item.subtotal = Number((item.unitPrice * item.quantity).toFixed(2));
      totalAmount += item.subtotal;
    }
    totalAmount = Number(totalAmount.toFixed(2));
    const shippingFee = totalAmount >= 99 ? 0 : 15;  // 满 99 包邮
    const actualAmount = Number((totalAmount + shippingFee).toFixed(2));

    // 生成订单号：ORD + yyyyMMddHHmmss + 4位随机数
    const now = new Date();
    const dateStr = now.getFullYear().toString()
      + String(now.getMonth() + 1).padStart(2, "0")
      + String(now.getDate()).padStart(2, "0")
      + String(now.getHours()).padStart(2, "0")
      + String(now.getMinutes()).padStart(2, "0")
      + String(now.getSeconds()).padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    const orderNo = `ORD${dateStr}${random}`;

    // 事务：创建订单 + 明细 + 日志
    await client.query("BEGIN");

    const orderResult = await client.query(
      `INSERT INTO orders (
        order_no, user_id, status,
        total_amount, discount_amount, shipping_fee, actual_amount,
        payment_method, consignee_name, consignee_phone, consignee_address,
        buyer_remark
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
      [
        orderNo, userId, "pending_payment",
        totalAmount, 0, shippingFee, actualAmount,
        paymentMethod || null, consigneeName, consigneePhone, consigneeAddress,
        buyerRemark || null,
      ]
    );
    const order = orderResult.rows[0];

    // 插入订单明细
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_image, product_spec, unit_price, quantity, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          order.id, item.productId, item.productName,
          item.productImage || null, item.productSpec || null,
          item.unitPrice, item.quantity, item.subtotal,
        ]
      );
    }

    // 写入操作日志
    await client.query(
      `INSERT INTO order_logs (order_id, from_status, to_status, operator_type, operator_id, remark)
       VALUES ($1,NULL,$2,$3,$4,$5)`,
      [order.id, "pending_payment", "user", userId, "用户创建订单"]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("创建订单失败:", error);
    res.status(500).json({
      success: false,
      error: "创建订单失败",
      detail: error instanceof Error ? error.message : String(error),
    });
  } finally {
    client.release();
  }
});

// 物流查询接口
app.get("/api/shipments/:trackingNo", async (req, res) => {
  const client = await pool.connect();
  try {
    const { trackingNo } = req.params;

    // 查询物流主表
    const shipRes = await client.query(
      `SELECT * FROM shipments WHERE tracking_no = $1`,
      [trackingNo]
    );

    if (shipRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: "未找到该物流单号" });
    }

    const shipment = shipRes.rows[0];

    // 查询物流节点明细（按时间正序）
    const trackRes = await client.query(
      `SELECT * FROM shipment_tracking WHERE tracking_no = $1 ORDER BY created_at ASC`,
      [trackingNo]
    );

    res.json({
      success: true,
      data: {
        ...shipment,
        tracking: trackRes.rows,
      },
    });
  } catch (error) {
    console.error("物流查询失败:", error);
    res.status(500).json({ success: false, error: "物流查询失败" });
  } finally {
    client.release();
  }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 客服服务器运行在 http://localhost:${PORT}`);
});
