import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Department } from '../../types';
import { Eye, EyeOff, UserPlus, LogIn, AlertCircle, ShieldCheck, ChevronDown, Check, X } from 'lucide-react';

const ALLOWED_EMAIL_DOMAIN = '@africanholdinggroups.com';
const CEO_EMAIL = 'ceo@africanholdinggroups.com';
const COMPANY_EMAIL_PATTERN = /^[^\s@]+@africanholdinggroups\.com$/i;

type Mode = 'login' | 'register';

interface AuthPageProps {
  onAuthenticated: () => void;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

function checkPasswordStrength(password: string): PasswordStrength {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  let label: string;
  let color: string;

  if (score <= 2) {
    label = 'Weak';
    color = 'bg-red-500';
  } else if (score <= 3) {
    label = 'Fair';
    color = 'bg-orange-500';
  } else if (score <= 4) {
    label = 'Good';
    color = 'bg-yellow-500';
  } else {
    label = 'Strong';
    color = 'bg-green-500';
  }

  return { score, label, color, checks };
}

export default function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);

  const isCEOEmail = email.trim().toLowerCase() === CEO_EMAIL;
  const emailDomain = email.trim().toLowerCase();
  const isValidEmailDomain = COMPANY_EMAIL_PATTERN.test(emailDomain) || emailDomain.endsWith(ALLOWED_EMAIL_DOMAIN);

  useEffect(() => {
    supabase.from('departments').select('*').order('name').then(({ data }) => {
      if (data) setDepartments(data);
    });
  }, []);

  useEffect(() => {
    if (mode === 'register' && password) {
      setPasswordStrength(checkPasswordStrength(password));
    } else {
      setPasswordStrength(null);
    }
  }, [password, mode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const trimmedEmail = email.trim().toLowerCase();

    if (!COMPANY_EMAIL_PATTERN.test(trimmedEmail)) {
      setError(`Only @africanholdinggroups.com company email addresses are allowed.`);
      setLoading(false);
      return;
    }

    const { error: err } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (err) {
      if (err.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(err.message);
      }
    } else {
      onAuthenticated();
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();

    if (!COMPANY_EMAIL_PATTERN.test(trimmedEmail)) {
      setError(`Only @africanholdinggroups.com company email addresses are allowed.`);
      return;
    }

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const strength = checkPasswordStrength(password);
    if (strength.score < 4) {
      setError('Please use a stronger password. It needs at least 8 characters, uppercase, lowercase, number, and special character.');
      return;
    }

    setLoading(true);

    const role = trimmedEmail === CEO_EMAIL ? 'ceo' : 'employee';

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
    });

    if (signUpErr || !data.user) {
      setError(signUpErr?.message ?? 'Registration failed.');
      setLoading(false);
      return;
    }

    const selectedDept = departments.find((d) => d.id === departmentId);

    const { error: profileErr } = await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: isCEOEmail ? 'CEO' : fullName.trim(),
      email: trimmedEmail,
      role,
      department: isCEOEmail ? 'Executive' : (selectedDept?.name ?? ''),
      department_id: isCEOEmail ? null : (departmentId || null),
    });

    if (profileErr) {
      setError(profileErr.message);
      setLoading(false);
      return;
    }

    onAuthenticated();
    setLoading(false);
  };

  const StrengthIndicator = () => {
    if (!passwordStrength) return null;

    return (
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${passwordStrength.color}`}
              style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
            />
          </div>
          <span className={`text-xs font-semibold ${passwordStrength.score >= 4 ? 'text-green-600' : 'text-gray-500'}`}>
            {passwordStrength.label}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          {[
            { key: 'length', label: '8+ characters' },
            { key: 'uppercase', label: 'Uppercase' },
            { key: 'lowercase', label: 'Lowercase' },
            { key: 'number', label: 'Number' },
            { key: 'special', label: 'Special char' },
          ].map((c) => (
            <div key={c.key} className="flex items-center gap-1">
              {passwordStrength.checks[c.key as keyof typeof passwordStrength.checks] ? (
                <Check size={12} className="text-green-600" />
              ) : (
                <X size={12} className="text-gray-300" />
              )}
              <span className={passwordStrength.checks[c.key as keyof typeof passwordStrength.checks] ? 'text-gray-700' : 'text-gray-400'}>
                {c.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '20px 20px' }}
      />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-wide">AFRICAN HOLDING GROUPS</h1>
          <div className="flex justify-center items-center my-4">
            <img src="/logo.png" alt="AHG" className="w-20 h-20 object-contain" />
          </div>
          <p className="text-green-200 text-sm">Weekly Planning System</p>
          <p className="text-xl font-semibold text-orange-300 tracking-wide mt-1">Think Big, Start Small, Act Now!</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  mode === m ? 'bg-green-700 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
                onClick={() => {
                  setMode(m);
                  setError('');
                  setPassword('');
                  setConfirmPassword('');
                }}
              >
                {m === 'login' ? (
                  <>
                    <LogIn size={16} /> Sign In
                  </>
                ) : (
                  <>
                    <UserPlus size={16} /> Register
                  </>
                )}
              </button>
            ))}
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="p-8 space-y-5">
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Your full name"
                  />
                </div>
                {!isCEOEmail && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                      Department
                    </label>
                    <div className="relative">
                      <select
                        value={departmentId}
                        onChange={(e) => setDepartmentId(e.target.value)}
                        className="w-full appearance-none border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white pr-10"
                      >
                        <option value="">Select department...</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full border rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
                    isCEOEmail
                      ? 'border-orange-400 focus:ring-orange-400 bg-orange-50'
                      : email && !isValidEmailDomain
                      ? 'border-red-400 focus:ring-red-400 bg-red-50'
                      : 'border-gray-200 focus:ring-green-500'
                  }`}
                  placeholder="yourname@africanholdinggroups.com"
                />
                {isCEOEmail && <ShieldCheck size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500" />}
              </div>
              {email && !isValidEmailDomain && !isCEOEmail && (
                <p className="text-xs text-red-600 font-medium mt-1">
                  Only @africanholdinggroups.com company email addresses are allowed
                </p>
              )}
              {isCEOEmail && (
                <p className="text-xs text-orange-600 font-medium mt-1 flex items-center gap-1">
                  <ShieldCheck size={12} /> CEO administrator account
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === 'register' && <StrengthIndicator />}
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                    confirmPassword && password !== confirmPassword
                      ? 'border-red-400 focus:ring-red-400'
                      : 'border-gray-200 focus:ring-green-500'
                  }`}
                  placeholder="Confirm password"
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold py-3 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 shadow-md"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <>
                  <LogIn size={16} /> Sign In
                </>
              ) : (
                <>
                  <UserPlus size={16} /> Create Account
                </>
              )}
            </button>
          </form>
        </div>
        <p className="text-center text-green-300 text-xs mt-6">African Holding Groups - Internal Use Only</p>
      </div>
    </div>
  );
}
