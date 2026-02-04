import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { mac } = req.query;

    if (!mac) {
        return res.status(400).json({ error: 'MAC address is required' });
    }

    // 1. 查询设备基础配置（MAC 与 机器/通道 的绑定关系）
    const { data: device, error: deviceError } = await supabase
        .from('iot_device_configs')
        .select('*')
        .eq('mac_address', mac)
        .single();

    if (deviceError || !device) {
        // 2. 自动注册
        await supabase.from('iot_device_configs').upsert({
            mac_address: mac,
            notes: 'Auto-registered - Pending Assignment'
        });
        return res.status(200).json({ status: 'new_device' });
    }

    // 3. 查询当前机器正在运行的产品（操作员选择的）
    const { data: activeProduct } = await supabase
        .from('machine_active_products')
        .select('*')
        .eq('machine_id', device.machine_id)
        .eq('lane_id', device.lane_id || 'Single')
        .single();

    // 4. 计算产量逻辑
    const machineWidthMap: Record<string, number> = {
        'N1-M01': 100,
        'N2-M02': 100,
        'T1.3-M02': 100,
        'T1.2-M01': 100, // 2m 机的每个 lane 是 100cm
        'T1.1-M03': 0
    };

    const machineId = device.machine_id;
    const baseWidth = machineWidthMap[machineId] || 100;

    // 优先级：操作员选的产品/尺寸 > 经理设的默认配置
    const cuttingSize = activeProduct?.cutting_size || device.cutting_size || 100;
    const activeSku = activeProduct?.product_sku || device.active_product_sku || 'UNKNOWN';

    // 核心逻辑：优先使用操作员在 ProductionControl 选定的 Yield (已在前端算好，包含 Pack xN 逻辑)
    let yieldCount = activeProduct?.yield || device.count_per_signal || 1;

    // 如果没有任何活跃生产记录，则回退到基础宽度计算逻辑
    if (!activeProduct) {
        if (machineId === 'T1.1-M03') {
            yieldCount = 2;
        } else if (cuttingSize > 0) {
            yieldCount = Math.floor(baseWidth / cuttingSize);
            if (yieldCount < 1) yieldCount = 1;
        }
    }

    // 5. 返回合并后的配置
    return res.status(200).json({
        machine_id: machineId,
        lane_id: device.lane_id,
        sku: activeSku,
        yield: yieldCount,
        debounce: device.debounce_ms,
        version: device.firmware_version,
        cutting_size: cuttingSize,
        base_width: baseWidth
    });
}
