-- 修复 PostgREST 无法通过 join 查询的问题
-- 错误提示: Could not find a relationship between 'lorry_service_requests' and 'users_public'

-- 1. 尝试添加外键约束 (Foreign Key)
-- 这会告诉 Supabase 这两个表是关联的，从而允许 select(..., users_public(...))
ALTER TABLE "public"."lorry_service_requests"
ADD CONSTRAINT "fk_lorry_driver"
FOREIGN KEY ("driver_id")
REFERENCES "public"."users_public"("id");

-- 2. 也是为了保险，重新做一次 comment 提示 (有时候 PostgREST 需要刷新 schema cache)
COMMENT ON CONSTRAINT "fk_lorry_driver" ON "public"."lorry_service_requests" IS 'Links service request to driver profile';

-- 3. 如果 driver_id 是 uuid 类型但 users_public.id 是 text (或者反过来)，可能会失败。
-- 通常它们应该都是 uuid。如果执行报错类型不匹配，请告诉我。
