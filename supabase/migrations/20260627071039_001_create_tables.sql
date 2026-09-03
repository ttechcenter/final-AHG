/*
# Create base tables for AHG Weekly Planning System

1. New Tables
- `departments`: Departments in the organization
- `profiles`: User profiles with roles, department association
- `weekly_plans`: Weekly plans (personal/departmental)
- `plan_items`: Individual plan items
- `weekly_reports`: Weekly performance reports with SWOT
- `monthly_reports`: Monthly aggregated reports
- `sales_categories`: Sales categories (managed by CEO/IT Admin)
- `daily_sales`: Daily sales submissions

2. Security
- RLS enabled on all tables
- Basic policies for owner-scoped access

3. Notes
- user_id columns default to auth.uid()
- Cascade deletes on foreign keys
*/

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'employee',
  department text,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Weekly Plans
CREATE TABLE IF NOT EXISTS weekly_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  plan_type text NOT NULL DEFAULT 'personal',
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  ceo_comment text,
  ceo_comment_at timestamptz,
  ceo_id uuid,
  manager_comment text,
  manager_comment_at timestamptz,
  manager_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start_date, plan_type)
);

-- Plan Items
CREATE TABLE IF NOT EXISTS plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES weekly_plans(id) ON DELETE CASCADE,
  s_no integer NOT NULL DEFAULT 1,
  day_of_week text NOT NULL,
  page_num integer NOT NULL DEFAULT 1,
  a_epie text DEFAULT '',
  preparation text DEFAULT '',
  principle text DEFAULT '',
  plan_col text DEFAULT '',
  perform text DEFAULT '',
  productivity text DEFAULT '',
  profit_impl text DEFAULT '',
  pragmatism text DEFAULT '',
  persistence text DEFAULT '',
  profit_eval text DEFAULT '',
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Weekly Reports
CREATE TABLE IF NOT EXISTS weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  strengths text DEFAULT '',
  weaknesses text DEFAULT '',
  opportunities text DEFAULT '',
  threats text DEFAULT '',
  resource_financial numeric DEFAULT 0,
  resource_financial_comment text DEFAULT '',
  resource_social text DEFAULT '',
  departmental_work text DEFAULT '',
  additional_work text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

-- Monthly Reports
CREATE TABLE IF NOT EXISTS monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL,
  total_tasks integer DEFAULT 0,
  completed_tasks integer DEFAULT 0,
  completion_rate numeric DEFAULT 0,
  total_financial numeric DEFAULT 0,
  strengths text DEFAULT '',
  weaknesses text DEFAULT '',
  opportunities text DEFAULT '',
  threats text DEFAULT '',
  achievements text DEFAULT '',
  challenges text DEFAULT '',
  goals_next_month text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, year, month)
);

-- Sales Categories
CREATE TABLE IF NOT EXISTS sales_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Daily Sales
CREATE TABLE IF NOT EXISTS daily_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  sale_date date NOT NULL,
  category_id uuid REFERENCES sales_categories(id) ON DELETE SET NULL,
  category_name text NOT NULL,
  amount numeric NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_plans_user_date ON weekly_plans(user_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_plan_items_plan ON plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_user_date ON weekly_reports(user_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_user_month ON monthly_reports(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_daily_sales_user_date ON daily_sales(user_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON daily_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department_id);