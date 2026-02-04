-- 创建 IoT 设备配置表
CREATE TABLE IF NOT EXISTS public.iot_device_configs (
    mac_address TEXT PRIMARY KEY,               -- ESP32 的唯一物理地址
    machine_id TEXT REFERENCES sys_machines_v2(machine_id), -- 绑定的机器 ID
    active_product_sku TEXT,                   -- 当前正在生产的产品 SKU
    count_per_signal INTEGER DEFAULT 1,        -- 单次信号产量 (1 或 2)
    debounce_ms INTEGER DEFAULT 240000,        -- 防抖冷却时间 (毫秒)
    firmware_version TEXT DEFAULT '1.0.0',     -- 固件版本
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 最后心跳时间
    notes TEXT,                                -- 备注
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用实物通知 (可选，用于前端实时更新)
ALTER PUBLICATION supabase_realtime ADD TABLE iot_device_configs;

-- 插入示例数据 (以 T1.3-M03 为例)
-- 您需要替换为您真实 ESP32 的 MAC 地址
INSERT INTO public.iot_device_configs (mac_address, machine_id, active_product_sku, count_per_signal, debounce_ms)
VALUES ('AA:BB:CC:DD:EE:FF', 'T1.3-M02', 'PROD-ROLL-01', 1, 240000)
ON CONFLICT (mac_address) DO NOTHING;
