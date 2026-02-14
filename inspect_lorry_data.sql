    -- 查看所有服务请求 (检查是否有数据进入数据库)
    SELECT 
        id, 
        created_at, 
        driver_id, 
        plate_number, 
        status,
        scheduled_date
    FROM lorry_service_requests
    ORDER BY created_at DESC;

    -- 查看 users_public 表结构 (不查 notes，防止报错)
    SELECT * FROM users_public LIMIT 5;
