-- Create 3 Test Drivers
-- Run this script in the Supabase SQL Editor (Table Editor > SQL Query)

-- 1. Enable pgcrypto for password hashing (if not enabled)
create extension if not exists pgcrypto;

DO $$
DECLARE
  v_uid uuid;
  v_email text;
  v_name text;
  i integer;
BEGIN
  -- Loop to create driver1, driver2, driver3
  FOR i IN 1..3 LOOP
    v_email := 'driver' || i || '@test.com';
    v_name := 'Test Driver ' || i;
    
    -- Check if user exists in auth.users
    SELECT id INTO v_uid FROM auth.users WHERE email = v_email;
    
    IF v_uid IS NULL THEN
      -- Create new user in auth.users
      v_uid := gen_random_uuid();
      
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, 
        email_confirmed_at, recovery_sent_at, last_sign_in_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) VALUES (
        v_uid, 
        '00000000-0000-0000-0000-000000000000', 
        'authenticated', 
        'authenticated', 
        v_email, 
        crypt('driver123', gen_salt('bf')), -- Password: driver123
        now(), -- Set email_confirmed_at to SKIP confirmation email
        NULL, NULL,
        '{"provider":"email","providers":["email"]}',
        '{}',
        now(), now(),
        '', '', '', ''
      );
      
      -- Insert into public.users_public
      -- Note: If you have a trigger that auto-creates this, use ON CONFLICT to update the role
      INSERT INTO public.users_public (id, email, name, role, status)
      VALUES (v_uid, v_email, v_name, 'Driver', 'Active')
      ON CONFLICT (id) DO UPDATE
      SET role = 'Driver', status = 'Active', name = EXCLUDED.name;
      
    ELSE
      -- User exists, ensure they have the Driver role
      UPDATE public.users_public 
      SET role = 'Driver', status = 'Active', name = v_name
      WHERE id = v_uid;
      
      -- Optional: Reset password if you want (requires update to auth.users, complicates things, skipping)
    END IF;
    
  END LOOP;
  
  RAISE NOTICE 'Drivers created/updated successfully.';
END $$;
