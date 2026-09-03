export type UserRole =
  | 'ceo'
  | 'it_admin'
  | 'manager'
  | 'hr'
  | 'ceo_office_head'
  | 'strategic_advisor'
  | 'employee';

export const ROLE_LABELS: Record<UserRole, string> = {
  ceo: 'CEO (Founder)',
  it_admin: 'IT Admin',
  manager: 'Department Manager',
  hr: 'HR',
  ceo_office_head: 'CEO Office Head',
  strategic_advisor: 'Strategic Advisor',
  employee: 'Employee',
};

export interface Department {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department: string | null;
  department_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyPlan {
  id: string;
  user_id: string;
  week_start_date: string;
  plan_type: 'personal' | 'departmental';
  department_id: string | null;
  ceo_comment: string | null;
  ceo_comment_at: string | null;
  ceo_id: string | null;
  manager_comment: string | null;
  manager_comment_at: string | null;
  manager_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanItem {
  id: string;
  plan_id: string;
  s_no: number;
  day_of_week: string;
  page_num: number;
  a_epie: string;
  preparation: string;
  principle: string;
  plan_col: string;
  perform: string;
  productivity: string;
  profit_impl: string;
  pragmatism: string;
  persistence: string;
  profit_eval: string;
  is_completed: boolean;
  created_at: string;
}

export interface WeeklyReport {
  id: string;
  user_id: string;
  week_start_date: string;
  strengths: string;
  weaknesses: string;
  opportunities: string;
  threats: string;
  resource_financial: number;
  resource_financial_comment: string;
  resource_social: string;
  departmental_work: string;
  additional_work: string;
  created_at: string;
  updated_at: string;
}

export interface MonthlyReport {
  id: string;
  user_id: string;
  year: number;
  month: number;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  total_financial: number;
  strengths: string;
  weaknesses: string;
  opportunities: string;
  threats: string;
  achievements: string;
  challenges: string;
  goals_next_month: string;
  created_at: string;
  updated_at: string;
}

export interface SalesCategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface DailySale {
  id: string;
  user_id: string;
  sale_date: string;
  category_id: string | null;
  category_name: string;
  amount: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface DailySaleWithProfile extends DailySale {
  profiles?: {
    full_name: string;
    department: string | null;
  };
}
