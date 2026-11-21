import { forwardRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services';
import { errMsg } from '../services/api';
import SafeImage from '../components/SafeImage';
import { FieldError, Spinner } from '../components/ui';

const EMAIL = { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } };
const NEW_PASSWORD = {
  required: 'Password is required',
  minLength: { value: 8, message: 'At least 8 characters' },
  validate: (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || 'Include at least one letter and one number',
};

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-[75vh] lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <SafeImage src="https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1200&q=80" alt="" width={1200} className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
        <p className="absolute bottom-10 left-10 max-w-sm font-display text-3xl font-semibold text-white">Make every moment special.</p>
      </div>
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-center text-sm text-ink-soft">{footer}</div>
        </div>
      </div>
    </div>
  );
}

// forwardRef is required: react-hook-form's register() hands back a ref that must reach the real <input>.
const PasswordInput = forwardRef(function PasswordInput({ error, ...rest }, ref) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input ref={ref} type={show ? 'text' : 'password'} className={`input pr-12 ${error ? 'input-error' : ''}`} {...rest} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-ink">{show ? <FiEyeOff /> : <FiEye />}</button>
    </div>
  );
});

export function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : from || '/'} replace />;

  const onSubmit = async (d) => {
    try {
      const u = await login(d);
      toast.success(`Welcome back, ${u.full_name.split(' ')[0]}!`);
      navigate(u.role === 'admin' ? '/admin' : from || '/', { replace: true });
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your GiftZone account." footer={<>New here? <Link to="/register" state={{ from }} className="font-semibold text-brand hover:underline">Create an account</Link></>}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div><label className="label" htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" className={`input ${errors.email ? 'input-error' : ''}`} {...register('email', EMAIL)} /><FieldError error={errors.email} /></div>
        <div><label className="label" htmlFor="password">Password</label><PasswordInput id="password" autoComplete="current-password" error={errors.password} {...register('password', { required: 'Password is required' })} /><FieldError error={errors.password} /></div>
        <div className="text-right"><Link to="/forgot-password" className="text-sm font-medium text-brand hover:underline">Forgot password?</Link></div>
        <button className="btn-primary w-full py-3.5" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />} Log in</button>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const { user, register: signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();

  if (user) return <Navigate to={from || '/'} replace />;

  const onSubmit = async (d) => {
    try {
      const { confirm, ...payload } = d;
      const u = await signUp(payload);
      toast.success(`Welcome to GiftZone, ${u.full_name.split(' ')[0]}!`);
      navigate(from || '/', { replace: true });
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <AuthShell title="Create your account" subtitle="Save favourites, track orders and check out faster." footer={<>Already registered? <Link to="/login" state={{ from }} className="font-semibold text-brand hover:underline">Log in</Link></>}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div><label className="label" htmlFor="full_name">Full name</label><input id="full_name" autoComplete="name" className={`input ${errors.full_name ? 'input-error' : ''}`} {...register('full_name', { required: 'Full name is required', minLength: { value: 2, message: 'Too short' } })} /><FieldError error={errors.full_name} /></div>
        <div><label className="label" htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" className={`input ${errors.email ? 'input-error' : ''}`} {...register('email', EMAIL)} /><FieldError error={errors.email} /></div>
        <div><label className="label" htmlFor="phone">Phone <span className="font-normal text-ink-soft">(optional)</span></label><input id="phone" type="tel" autoComplete="tel" className={`input ${errors.phone ? 'input-error' : ''}`} {...register('phone', { pattern: { value: /^[+\d][\d\s-]{6,20}$/, message: 'Enter a valid phone number' } })} /><FieldError error={errors.phone} /></div>
        <div><label className="label" htmlFor="password">Password</label><PasswordInput id="password" autoComplete="new-password" error={errors.password} {...register('password', NEW_PASSWORD)} /><FieldError error={errors.password} /></div>
        <div><label className="label" htmlFor="confirm">Confirm password</label><PasswordInput id="confirm" autoComplete="new-password" error={errors.confirm} {...register('confirm', { validate: (v) => v === watch('password') || 'Passwords do not match' })} /><FieldError error={errors.confirm} /></div>
        <button className="btn-primary w-full py-3.5" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />} Create account</button>
      </form>
    </AuthShell>
  );
}

export function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const onSubmit = async (d) => {
    try { await authService.forgot(d); setSent(true); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <AuthShell title="Forgot your password?" subtitle="Enter your email and we'll send you a reset link." footer={<Link to="/login" className="font-semibold text-brand hover:underline">Back to log in</Link>}>
      {sent
        ? <p className="rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-700">If that email is registered, a reset link is on its way. It expires in 1 hour.</p>
        : <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div><label className="label" htmlFor="email">Email</label><input id="email" type="email" className={`input ${errors.email ? 'input-error' : ''}`} {...register('email', EMAIL)} /><FieldError error={errors.email} /></div>
          <button className="btn-primary w-full py-3.5" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />} Send reset link</button>
        </form>}
    </AuthShell>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const email = params.get('email');
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (d) => {
    try {
      await authService.reset({ email, token, password: d.password });
      toast.success('Password updated. Please log in.');
      navigate('/login', { replace: true });
    } catch (e) { toast.error(errMsg(e)); }
  };

  if (!token || !email) return <AuthShell title="Link not valid" subtitle="This reset link is incomplete." footer={<Link to="/forgot-password" className="font-semibold text-brand hover:underline">Request a new link</Link>} />;
  return (
    <AuthShell title="Choose a new password" subtitle={`For ${email}`} footer={<Link to="/login" className="font-semibold text-brand hover:underline">Back to log in</Link>}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div><label className="label" htmlFor="password">New password</label><PasswordInput id="password" autoComplete="new-password" error={errors.password} {...register('password', NEW_PASSWORD)} /><FieldError error={errors.password} /></div>
        <div><label className="label" htmlFor="confirm">Confirm password</label><PasswordInput id="confirm" autoComplete="new-password" error={errors.confirm} {...register('confirm', { validate: (v) => v === watch('password') || 'Passwords do not match' })} /><FieldError error={errors.confirm} /></div>
        <button className="btn-primary w-full py-3.5" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />} Update password</button>
      </form>
    </AuthShell>
  );
}
