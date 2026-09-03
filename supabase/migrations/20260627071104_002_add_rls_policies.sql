/*
# Add RLS policies for all tables

1. Security
- Departments: Read all, write by CEO/IT Admin
- Profiles: Read all, write own or by admins
- Weekly Plans: Read all, write own, comments by managers/CEO
- Plan Items: Read all, write by plan owner
- Weekly Reports: Read all, write own
- Monthly Reports: Read all, write own
- Sales Categories: Read all, write by CEO/IT Admin
- Daily Sales: Read all, write own
*/

-- Department policies
DROP POLICY IF EXISTS "departments_select_all" ON departments;
CREATE POLICY "departments_select_all" ON departments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "departments_insert_admin" ON departments;
CREATE POLICY "departments_insert_admin" ON departments FOR INSERT TO authenticated 
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('ceo', 'it_admin'));

DROP POLICY IF EXISTS "departments_update_admin" ON departments;
CREATE POLICY "departments_update_admin" ON departments FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('ceo', 'it_admin'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('ceo', 'it_admin'));

DROP POLICY IF EXISTS "departments_delete_admin" ON departments;
CREATE POLICY "departments_delete_admin" ON departments FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('ceo', 'it_admin'));

-- Profile policies
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_all" ON profiles;
CREATE POLICY "profiles_update_all" ON profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('ceo', 'it_admin'));

-- Weekly Plans policies
DROP POLICY IF EXISTS "weekly_plans_select_all" ON weekly_plans;
CREATE POLICY "weekly_plans_select_all" ON weekly_plans FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "weekly_plans_insert_own" ON weekly_plans;
CREATE POLICY "weekly_plans_insert_own" ON weekly_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "weekly_plans_update_all" ON weekly_plans;
CREATE POLICY "weekly_plans_update_all" ON weekly_plans FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "weekly_plans_delete_own" ON weekly_plans;
CREATE POLICY "weekly_plans_delete_own" ON weekly_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Plan Items policies
DROP POLICY IF EXISTS "plan_items_select_all" ON plan_items;
CREATE POLICY "plan_items_select_all" ON plan_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "plan_items_insert_own" ON plan_items;
CREATE POLICY "plan_items_insert_own" ON plan_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM weekly_plans WHERE id = plan_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "plan_items_update_own" ON plan_items;
CREATE POLICY "plan_items_update_own" ON plan_items FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM weekly_plans WHERE id = plan_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "plan_items_delete_own" ON plan_items;
CREATE POLICY "plan_items_delete_own" ON plan_items FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM weekly_plans WHERE id = plan_id AND user_id = auth.uid())
);

-- Weekly Reports policies
DROP POLICY IF EXISTS "weekly_reports_select_all" ON weekly_reports;
CREATE POLICY "weekly_reports_select_all" ON weekly_reports FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "weekly_reports_insert_own" ON weekly_reports;
CREATE POLICY "weekly_reports_insert_own" ON weekly_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "weekly_reports_update_own" ON weekly_reports;
CREATE POLICY "weekly_reports_update_own" ON weekly_reports FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Monthly Reports policies
DROP POLICY IF EXISTS "monthly_reports_select_all" ON monthly_reports;
CREATE POLICY "monthly_reports_select_all" ON monthly_reports FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "monthly_reports_insert_own" ON monthly_reports;
CREATE POLICY "monthly_reports_insert_own" ON monthly_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "monthly_reports_update_own" ON monthly_reports;
CREATE POLICY "monthly_reports_update_own" ON monthly_reports FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Sales Categories policies
DROP POLICY IF EXISTS "sales_categories_select_all" ON sales_categories;
CREATE POLICY "sales_categories_select_all" ON sales_categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "sales_categories_insert_admin" ON sales_categories;
CREATE POLICY "sales_categories_insert_admin" ON sales_categories FOR INSERT TO authenticated 
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('ceo', 'it_admin'));

DROP POLICY IF EXISTS "sales_categories_update_admin" ON sales_categories;
CREATE POLICY "sales_categories_update_admin" ON sales_categories FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('ceo', 'it_admin'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('ceo', 'it_admin'));

DROP POLICY IF EXISTS "sales_categories_delete_admin" ON sales_categories;
CREATE POLICY "sales_categories_delete_admin" ON sales_categories FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('ceo', 'it_admin'));

-- Daily Sales policies
DROP POLICY IF EXISTS "daily_sales_select_all" ON daily_sales;
CREATE POLICY "daily_sales_select_all" ON daily_sales FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "daily_sales_insert_own" ON daily_sales;
CREATE POLICY "daily_sales_insert_own" ON daily_sales FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "daily_sales_update_own" ON daily_sales;
CREATE POLICY "daily_sales_update_own" ON daily_sales FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "daily_sales_delete_own" ON daily_sales;
CREATE POLICY "daily_sales_delete_own" ON daily_sales FOR DELETE TO authenticated USING (auth.uid() = user_id);