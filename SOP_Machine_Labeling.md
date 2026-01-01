# PackSecure 生产设备标签 SOP (Standard Operating Procedure)

本文档旨在指导工厂管理人员如何正确打印、安装和使用机器 QR 识别码系统。

## 1. 标签准备清单

以下是系统中定义的 5 台核心设备。每台机器必须张贴唯一的 QR 码：

| 设备名称 | 位置 (Line) | QR 内容 | 打印链接 |
| :--- | :--- | :--- | :--- |
| **Stretch Film (T1.1)** | Taiping T1 | `T1.1-M03` | [查看图片](file:///C:/Users/User/.gemini/antigravity/brain/6fc8537d-b5ff-4712-9b6f-dbb89dc255f2/qr_t1_1_m03_a4_1766525693206.png) |
| **2M Double Layer (T1.2)** | Taiping T1 | `T1.2-M01` | [查看图片](file:///C:/Users/User/.gemini/antigravity/brain/6fc8537d-b5ff-4712-9b6f-dbb89dc255f2/qr_t1_2_m01_a4_1766525708265.png) |
| **1M Single Layer (T1.3)** | Taiping T1 | `T1.3-M02` | [查看图片](file:///C:/Users/User/.gemini/antigravity/brain/6fc8537d-b5ff-4712-9b6f-dbb89dc255f2/qr_t1_3_m02_a4_1766525721141.png) |
| **1M Double Layer (N1)** | Nilai N1 | `N1-M01` | [查看图片](file:///C:/Users/User/.gemini/antigravity/brain/6fc8537d-b5ff-4712-9b6f-dbb89dc255f2/qr_n1_m01_a4_1766525733877.png) |
| **1M Single Layer (N2)** | Nilai N2 | `N2-M02` | [查看图片](file:///C:/Users/User/.gemini/antigravity/brain/6fc8537d-b5ff-4712-9b6f-dbb89dc255f2/qr_n2_m02_a4_final_1766525765497.png) |

---

## 2. 打印与制作规范

*   **尺寸设定**：每个 QR 码独立使用一张 **A4 纸**。
*   **打印选项**：
    *   选择“**适应页面**” (Fit to Page)。
    *   建议使用 **彩色打印**（虽然黑白也可识别，但彩色更加醒目）。
*   **表面保护**：为了防止生产现场油墨或灰尘遮挡，打印后务必：
    *   使用 **过塑 (Laminate)** 保护，或
    *   贴在透明塑料袋/保护层内。

## 3. 张贴位置说明

*   **高度**：离地约 **1.2 米至 1.5 米**（成人视线高度，方便手机平视扫描）。
*   **位置**：
    1. 机器主控制台旁（Operator 操作最频繁的地方）。
    2. 或机器侧面平整处，避开移动部件或过热区域。
*   **光照**：确保光线充足，不要贴在过暗或强烈反光的死角。

## 4. 操作人员流程 (SOP)

1.  **打开应用**：手机访问 [https://packsecure.vercel.app](https://packsecure.vercel.app)。
2.  **进入扫码**：在 Dashboard 选择 `Production Control`。
3.  **对焦识别**：将摄像头对准机器上的 A4 标签。
    *   *识别成功*：系统会自动跳转到生产控制界面，顶部显示“Connected to: [对应机器名]”。
    *   *识别失败*：请擦拭摄像头，或检查标签是否有遮挡。
4.  **开始作业**：选择层数 -> 材质 -> 尺寸 -> 输入产量，确认提交。

---

> [!IMPORTANT]
> **严禁跨站扫码**：严禁将 A 机器的标签贴在 B 机器上，这会导致库存系统数据错乱。
