import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, UserPlus, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import toast from 'react-hot-toast';

// Password requirements
const pwdRules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'At least one uppercase letter (A–Z)', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'At least one number (0–9)', test: (p: string) => /\d/.test(p) },
];

// Only entrepreneur & investor can register (admin is seeded)
type RegisterRole = 'entrepreneur' | 'investor';

const roleData: Record<RegisterRole, { label: string; desc: string; icon: string }> = {
  entrepreneur: { label: 'Entrepreneur', desc: 'Share your startup and find investors', icon: '🚀' },
  investor: { label: 'Investor', desc: 'Discover startups and invest smart', icon: '💼' },
};

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<RegisterRole>('entrepreneur');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pwdTouched, setPwdTouched] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Live rule checking
  const ruleResults = useMemo(() => pwdRules.map(r => r.test(password)), [password]);
  const allRulesPassed = ruleResults.every(Boolean);

  // Strength score (0-3)
  const strength = ruleResults.filter(Boolean).length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Strong'][strength];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#22c55e'][strength];

  const passwordsMatch = confirmPassword === password;
  const canSubmit = allRulesPassed && passwordsMatch && name.trim() && email && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRulesPassed) {
      toast.error('Please fix the password requirements before continuing');
      return;
    }
    if (!passwordsMatch) {
      toast.error('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      await register(name.trim(), email.toLowerCase(), password, role as UserRole);
      navigate(role === 'investor' ? '/dashboard/investor' : '/dashboard/entrepreneur');
    } catch {
      // Errors handled in AuthContext via toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl mb-4 shadow-lg shadow-purple-500/30">
            <span className="text-white font-bold text-2xl">N</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Join Nexus</h1>
          <p className="text-white/60 mt-2">Create your account and start collaborating</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
          {/* Role Selection */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {(Object.entries(roleData) as [RegisterRole, typeof roleData.entrepreneur][]).map(([r, data]) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                  role === r
                    ? 'border-purple-500 bg-purple-500/20 shadow-md shadow-purple-500/20'
                    : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                }`}
              >
                <div className="text-2xl mb-1">{data.icon}</div>
                <div className="text-white font-semibold text-sm">{data.label}</div>
                <div className="text-white/50 text-xs mt-0.5">{data.desc}</div>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <input
                  id="register-name"
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <input
                  id="register-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-400 focus:bg-white/15 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPwdTouched(true); }}
                  placeholder="Min 8 characters"
                  className={`w-full bg-white/10 border rounded-xl pl-10 pr-12 py-3 text-white placeholder-white/30 focus:outline-none focus:bg-white/15 transition-all ${
                    pwdTouched && !allRulesPassed
                      ? 'border-red-400/60 focus:border-red-400'
                      : pwdTouched && allRulesPassed
                      ? 'border-green-400/60 focus:border-green-400'
                      : 'border-white/20 focus:border-purple-400'
                  }`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Strength bar */}
              {pwdTouched && password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3].map(i => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{ backgroundColor: strength >= i ? strengthColor : 'rgba(255,255,255,0.15)' }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium" style={{ color: strengthColor }}>
                    {strengthLabel}
                  </span>
                </div>
              )}

              {/* Live requirements checklist */}
              {pwdTouched && (
                <div className="mt-3 space-y-1.5 bg-white/5 rounded-xl p-3 border border-white/10">
                  <p className="text-white/50 text-xs font-medium mb-2">Password must include:</p>
                  {pwdRules.map((rule, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {ruleResults[i] ? (
                        <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
                      ) : (
                        <XCircle size={14} className="text-red-400/70 flex-shrink-0" />
                      )}
                      <span className={`text-xs transition-colors ${ruleResults[i] ? 'text-green-400' : 'text-white/40'}`}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <input
                  id="register-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className={`w-full bg-white/10 border rounded-xl pl-10 pr-12 py-3 text-white placeholder-white/30 focus:outline-none focus:bg-white/15 transition-all ${
                    confirmPassword && !passwordsMatch
                      ? 'border-red-400 focus:border-red-400'
                      : confirmPassword && passwordsMatch
                      ? 'border-green-400/60 focus:border-green-400'
                      : 'border-white/20 focus:border-purple-400'
                  }`}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80">
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <XCircle size={12} /> Passwords do not match
                </p>
              )}
              {confirmPassword && passwordsMatch && (
                <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Passwords match
                </p>
              )}
            </div>

            <button
              id="register-submit"
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus size={18} />
                  Create {roleData[role].label} Account
                </>
              )}
            </button>
          </form>

          <p className="text-center text-white/50 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};