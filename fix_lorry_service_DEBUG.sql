-- 再次尝试修复权限，这次放宽到 PUBLIC (anon) 以排除 Auth 问题
-- 警告：这是调试策略，生产环境建议稍后收紧

DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."lorry_service_requests";
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON "public"."lorry_service_requests";
DROP POLICY IF EXISTS "Enable update access for all users" ON "public"."lorry_service_requests";

-- 允许任何人(包括未登录/Demo)读取
CREATE POLICY "Debug: Allow Read All"
ON "public"."lorry_service_requests"
FOR SELECT
TO public
USING (true);

-- 允许任何人插入 (暂不验证 ID)
CREATE POLICY "Debug: Allow Insert All"
ON "public"."lorry_service_requests"
FOR INSERT
TO public
WITH CHECK (true);

-- 允许任何人更新
CREATE POLICY "Debug: Allow Update All"
ON "public"."lorry_service_requests"
FOR UPDATE
TO public
USING (true);
