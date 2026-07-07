-- =====================================================
-- 电商客服系统 - 订单相关表创建脚本
-- =====================================================

-- =====================================================
-- 1. 订单主表 (orders)
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no        VARCHAR(32)     NOT NULL,
    user_id         UUID            NOT NULL,
    status          VARCHAR(20)     NOT NULL DEFAULT 'pending_payment'
                                    CHECK (status IN (
                                        'pending_payment',
                                        'paid',
                                        'shipped',
                                        'delivered',
                                        'completed',
                                        'cancelled',
                                        'refunding',
                                        'refunded'
                                    )),

    -- 金额字段
    total_amount        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_amount     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    shipping_fee        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    actual_amount       DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    -- 支付信息
    payment_method      VARCHAR(20),
    payment_time        TIMESTAMP WITH TIME ZONE,
    transaction_id      VARCHAR(64),

    -- 收货信息
    consignee_name      VARCHAR(50)     NOT NULL,
    consignee_phone     VARCHAR(20)     NOT NULL,
    consignee_address   TEXT            NOT NULL,

    -- 物流信息
    express_company     VARCHAR(50),
    express_no          VARCHAR(50),
    shipping_time       TIMESTAMP WITH TIME ZONE,
    delivery_time       TIMESTAMP WITH TIME ZONE,

    -- 其他
    buyer_remark        TEXT,
    seller_remark       TEXT,
    cancel_reason       VARCHAR(200),

    -- 预留扩展字段
    extra_info          JSONB           DEFAULT '{}',

    -- 时间戳
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- 软删除
    deleted_at          TIMESTAMP WITH TIME ZONE
);

-- 索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_payment_time ON orders(payment_time);
CREATE INDEX IF NOT EXISTS idx_orders_consignee_phone ON orders(consignee_phone);


-- =====================================================
-- 2. 更新时间触发器函数
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- 3. 订单明细表 (order_items)
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id      UUID            NOT NULL,
    product_name    VARCHAR(200)    NOT NULL,
    product_image   VARCHAR(500),
    product_spec    VARCHAR(100),
    unit_price      DECIMAL(12,2)   NOT NULL,
    quantity        INTEGER         NOT NULL CHECK (quantity > 0),
    subtotal        DECIMAL(12,2)   NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    UNIQUE(order_id, product_id, product_spec)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);


-- =====================================================
-- 4. 订单操作日志表 (order_logs)
-- =====================================================
CREATE TABLE IF NOT EXISTS order_logs (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status     VARCHAR(20),
    to_status       VARCHAR(20)     NOT NULL,
    operator_type   VARCHAR(20)     NOT NULL DEFAULT 'system'
                                    CHECK (operator_type IN ('user', 'admin', 'system')),
    operator_id     UUID,
    operator_name   VARCHAR(50),
    remark          TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_logs_order_id ON order_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_created_at ON order_logs(created_at);
