-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create user status enum
CREATE TYPE public.user_status AS ENUM ('pending', 'active', 'rejected');

-- Add admin_utama to app_role enum (will be available after commit)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_utama';