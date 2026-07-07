-- =====================================================
-- 电商客服系统 - 物流信息表创建脚本
-- =====================================================

-- 1. 物流主表 (shipments)
CREATE TABLE IF NOT EXISTS shipments (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_no         VARCHAR(50)     NOT NULL UNIQUE,          -- 物流单号
    order_no            VARCHAR(32)     NOT NULL REFERENCES orders(order_no),
    status              VARCHAR(20)     NOT NULL DEFAULT 'ordered'
                        CHECK (status IN (
                            'ordered',       -- 已下单
                            'picked_up',     -- 已揽收
                            'in_transit',    -- 运输中
                            'sorting',       -- 分拣中
                            'delivering',    -- 派送中
                            'delivered',     -- 已签收
                            'failed',        -- 投递失败
                            'returned'       -- 已退回
                        )),
    company             VARCHAR(50)     NOT NULL,                 -- 物流公司
    company_phone       VARCHAR(20),                              -- 物流公司电话
    current_location    VARCHAR(200),                             -- 当前位置
    estimated_delivery  TIMESTAMP WITH TIME ZONE,                 -- 预计送达
    sender_name         VARCHAR(50),                              -- 寄件人
    sender_phone        VARCHAR(20),                              -- 寄件人电话
    sender_address      TEXT,                                     -- 寄件地址
    receiver_name       VARCHAR(50)     NOT NULL,                 -- 收件人
    receiver_phone      VARCHAR(20)     NOT NULL,                 -- 收件人电话
    receiver_address    TEXT            NOT NULL,                 -- 收件地址
    weight_kg           DECIMAL(8,2),                             -- 重量(kg)
    remark              TEXT,                                     -- 备注
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_shipments_order_no ON shipments(order_no);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON shipments(created_at);


-- 2. 物流节点明细表 (shipment_tracking)
CREATE TABLE IF NOT EXISTS shipment_tracking (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_no     VARCHAR(50)     NOT NULL REFERENCES shipments(tracking_no) ON DELETE CASCADE,
    status          VARCHAR(20)     NOT NULL,                     -- 当前节点状态
    location        VARCHAR(200),                                 -- 节点地点
    description     TEXT            NOT NULL,                     -- 节点描述
    operator        VARCHAR(50),                                  -- 操作人
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tracking_no ON shipment_tracking(tracking_no);
CREATE INDEX IF NOT EXISTS idx_tracking_created_at ON shipment_tracking(tracking_no, created_at);


-- 3. 更新时间触发器
DROP TRIGGER IF EXISTS trg_shipments_updated_at ON shipments;
CREATE TRIGGER trg_shipments_updated_at
    BEFORE UPDATE ON shipments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- 测试数据
-- =====================================================

-- 测试数据1：正常物流（已签收）
INSERT INTO shipments (tracking_no, order_no, status, company, company_phone,
    current_location, estimated_delivery,
    sender_name, sender_phone, sender_address,
    receiver_name, receiver_phone, receiver_address, weight_kg)
VALUES ('SF1234567890', 'ORD202607062021234940', 'delivered', '顺丰速运', '95338',
    '深圳市南山区', '2026-07-08 18:00:00+08',
    '官方旗舰店', '4008000888', '广东省深圳市南山区科技园仓库A区',
    '张三', '13800138000', '广东省深圳市南山区科技园1001号', 0.58);

INSERT INTO shipment_tracking (tracking_no, status, location, description, created_at) VALUES
('SF1234567890', 'ordered', '深圳市', '订单已提交，等待揽收', '2026-07-06 20:21:00+08'),
('SF1234567890', 'picked_up', '深圳市南山区', '快递员已揽收', '2026-07-06 21:30:00+08'),
('SF1234567890', 'in_transit', '深圳市宝安中心', '已到达深圳宝安中心集散中心', '2026-07-06 23:15:00+08'),
('SF1234567890', 'in_transit', '广州市白云区', '已到达广州白云集散中心', '2026-07-07 03:45:00+08'),
('SF1234567890', 'sorting', '深圳市南山区', '正在分拣，准备派送', '2026-07-07 08:30:00+08'),
('SF1234567890', 'delivering', '深圳市南山区', '快递员正在派送中，电话：13800001111', '2026-07-07 10:15:00+08'),
('SF1234567890', 'delivered', '深圳市南山区', '已签收，签收人：本人', '2026-07-07 14:22:00+08');


-- 测试数据2：运输中
INSERT INTO shipments (tracking_no, order_no, status, company, company_phone,
    current_location, estimated_delivery,
    sender_name, sender_phone, sender_address,
    receiver_name, receiver_phone, receiver_address, weight_kg)
VALUES ('YT9876543210', 'ORD202607062044301949', 'in_transit', '圆通速递', '95554',
    '杭州市萧山区', '2026-07-09 20:00:00+08',
    '数码优选旗舰店', '4009996666', '浙江省杭州市滨江区网商路699号',
    '李四', '13900139000', '北京市海淀区中关村大街1号', 2.15);

INSERT INTO shipment_tracking (tracking_no, status, location, description, created_at) VALUES
('YT9876543210', 'ordered', '杭州市', '订单已提交，等待揽收', '2026-07-06 20:44:00+08'),
('YT9876543210', 'picked_up', '杭州市滨江区', '快递员已揽收', '2026-07-06 22:10:00+08'),
('YT9876543210', 'in_transit', '杭州市萧山区', '已到达杭州萧山分拨中心', '2026-07-07 01:30:00+08'),
('YT9876543210', 'in_transit', '上海市浦东新区', '已到达上海浦东中转站', '2026-07-07 06:20:00+08');


-- 测试数据3：派送中
INSERT INTO shipments (tracking_no, order_no, status, company, company_phone,
    current_location, estimated_delivery,
    sender_name, sender_phone, sender_address,
    receiver_name, receiver_phone, receiver_address, weight_kg)
VALUES ('ZTO55557777', 'ORD202607062021234940', 'delivering', '中通快递', '95311',
    '深圳市福田区', '2026-07-07 18:00:00+08',
    '官方旗舰店', '4008000888', '广东省深圳市南山区科技园仓库A区',
    '张三', '13800138000', '广东省深圳市南山区科技园1001号', 0.32);

INSERT INTO shipment_tracking (tracking_no, status, location, description, created_at) VALUES
('ZTO55557777', 'ordered', '深圳市', '订单已提交，等待揽收', '2026-07-07 09:00:00+08'),
('ZTO55557777', 'picked_up', '深圳市南山区', '快递员已揽收', '2026-07-07 10:30:00+08'),
('ZTO55557777', 'in_transit', '深圳市南山区', '已到达南山集散中心', '2026-07-07 12:00:00+08'),
('ZTO55557777', 'delivering', '深圳市福田区', '快递员正在派送中，预计今日送达', '2026-07-07 14:30:00+08');
