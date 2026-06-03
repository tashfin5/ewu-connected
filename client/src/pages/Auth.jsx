import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GraduationCap, ArrowLeft, Mail, KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle2, Sun, Moon, MessageSquare, Bookmark } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// 🚨 Define the dynamic URL at the top
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// 🚨 ULTIMATE DEEP SCAN: Searches every nested layer of the backend response for a false verification flag
const isUnverifiedDeepCheck = (obj) => {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.isVerified === false || obj.isVerified === 'false') return true;
  if (obj.is_verified === false || obj.is_verified === 'false') return true;
  
  // Recursively search nested objects (like data.data.user.isVerified)
  return Object.values(obj).some(val => isUnverifiedDeepCheck(val));
};

// Reusable Floating Input Component
const FloatingInput = ({ label, icon: Icon, type, value, onChange, required, name, rightElement, disabled }) => {
  return (
    <div className="relative mb-5 w-full">
      {Icon && (
        <div className="absolute left-3 top-3.5 text-slate-400 dark:text-zinc-500 z-10 pointer-events-none">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <input
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={(e) => {
          e.target.setCustomValidity('');
          onChange(e);
        }}
        disabled={disabled}
        placeholder=" "
        className={`peer w-full bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 outline-none text-slate-900 dark:text-white transition-all focus:border-blue-500 dark:focus:border-blue-500 focus:shadow-sm focus:shadow-blue-500/20 ${Icon ? 'pl-11' : ''} ${rightElement ? 'pr-12' : ''}`}
      />
      <label 
        className={`absolute transition-all duration-200 pointer-events-none z-10 
          top-3.5 text-sm text-slate-500 dark:text-zinc-400 font-medium bg-transparent px-0 ${Icon ? 'left-11' : 'left-4'}
          
          peer-focus:-top-2.5 peer-focus:left-3 peer-focus:bg-white dark:peer-focus:bg-zinc-800 peer-focus:px-2 peer-focus:text-xs peer-focus:text-blue-600 dark:peer-focus:text-blue-400 peer-focus:font-bold peer-focus:rounded
          
          peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:bg-white dark:peer-[:not(:placeholder-shown)]:bg-zinc-800 peer-[:not(:placeholder-shown)]:px-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:rounded
          
          peer-autofill:-top-2.5 peer-autofill:left-3 peer-autofill:bg-white dark:peer-autofill:bg-zinc-800 peer-autofill:px-2 peer-autofill:text-xs peer-autofill:font-bold peer-autofill:rounded`}
      >
        {label}
      </label>
      {rightElement && (
        <div className="absolute right-3 top-3 z-10">
          {rightElement}
        </div>
      )}
    </div>
  );
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); 

  // New States for Forgot Password Flow
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // New States for Signup Verification
  const [isVerifying, setIsVerifying] = useState(false);
  const [regOTP, setRegOTP] = useState('');

  // Visibility States
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Timer State
  const [timer, setTimer] = useState(0);
  
  const { login } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const startTimer = () => setTimer(60); 

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // 🚨 THE FIX: Function to force the backend to send a new OTP automatically
  const triggerVerificationOTP = async (targetEmail) => {
    try {
      await axios.post(`${API_URL}/api/auth/resend-otp`, { email: targetEmail });
    } catch (err) {
      console.log("Auto OTP trigger attempted.", err);
    }
  };

  // --- STANDARD LOGIN / REGISTER HANDLER ---
  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setError(''); 
    setIsLoading(true);
    const form = e.target;

    if (!isLogin && password.length < 6) {
      form.password.setCustomValidity("Password must be at least 6 characters long.");
      form.password.reportValidity();
      setIsLoading(false);
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      form.confirmPassword.setCustomValidity("Passwords do not match.");
      form.confirmPassword.reportValidity();
      setIsLoading(false);
      return;
    }

    if (!isLogin && !email.endsWith('@std.ewubd.edu') && !email.endsWith('@ewubd.edu')) {
      form.email.setCustomValidity("Please use a valid EWU student email.");
      form.email.reportValidity();
      setIsLoading(false);
      return;
    }

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const derivedStudentId = !isLogin ? email.split('@')[0] : studentId;
      const payload = isLogin 
        ? { student_id: studentId, password } 
        : { name, email, student_id: derivedStudentId, password };

      const { data } = await axios.post(`${API_URL}${endpoint}`, payload, {
        withCredentials: true 
      });
      
      if (isLogin) {
        if (isUnverifiedDeepCheck(data)) {
           const userEmail = data?.email || data?.user?.email || data?.data?.user?.email || `${studentId}@std.ewubd.edu`;
           setEmail(userEmail);
           triggerVerificationOTP(userEmail); // 🚨 AUTOMATICALLY TRIGGERS NEW OTP
           setIsVerifying(true);
           startTimer();
           setIsLoading(false);
           return; 
        }

        login(data);
        toast.success("Successfully logged in!");
        navigate('/dashboard', { replace: true });
      } else {
        toast.success("Registration initiated! Please verify your email.");
        setIsVerifying(true);
        startTimer();
      }

    } catch (err) {
      console.error(err);
      const errorData = err.response?.data;
      
      if (isLogin && (isUnverifiedDeepCheck(errorData) || errorData?.message?.toLowerCase().includes('verify'))) {
         const userEmail = errorData?.email || errorData?.user?.email || `${studentId}@std.ewubd.edu`;
         setEmail(userEmail);
         triggerVerificationOTP(userEmail); // 🚨 AUTOMATICALLY TRIGGERS NEW OTP
         setIsVerifying(true);
         startTimer();
         toast.error(errorData?.message || 'Please verify your email to continue.');
         setIsLoading(false);
         return; 
      }

      if (!err.response || err.response.status >= 500) {
        toast.error("Waking up the server... Please wait a few seconds and try again!");
        setError("Waking up the server... Please wait a few seconds and try again!");
        setIsLoading(false);
        return;
      }

      toast.error(errorData?.message || 'Something went wrong. Try again.');
      setError(errorData?.message || 'Something went wrong. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- FORGOT PASSWORD HANDLERS ---
  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/api/users/forgot-password`, { email });
      toast.success("OTP sent to your email!");
      setOtpSent(true);
      startTimer();
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error(err.response?.data?.message || "User not found.");
        setError(err.response?.data?.message || "User not found.");
      } else {
        toast.success("OTP sent (or check spam folder)!");
        setOtpSent(true);
        startTimer();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const form = e.target;
    
    if (newPassword.length < 6) {
      form.newPassword.setCustomValidity("New password must be at least 6 characters long.");
      form.newPassword.reportValidity();
      setIsLoading(false);
      return;
    }

    try {
      await axios.post(`${API_URL}/api/users/reset-password`, { email, otp, newPassword });
      toast.success("Password reset successfully! Please log in.");
      setIsForgotPassword(false);
      setOtpSent(false);
      setIsLogin(true);
      setPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid or expired OTP.");
      setError(err.response?.data?.message || "Invalid or expired OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- SIGNUP VERIFICATION HANDLER ---
  const handleVerifySignup = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/verify-otp`, { email, otp: regOTP });
      toast.success("Email verified successfully! You can now login.");
      setIsVerifying(false);
      setIsLogin(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid or expired code.");
      setError(err.response?.data?.message || "Invalid or expired code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/resend-otp`, { email });
      toast.success("Verification code resent!");
      startTimer();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend code.");
      setError(err.response?.data?.message || "Failed to resend code.");
    }
  };

  // --- Premium Error Popup ---
  const ErrorPopup = ({ message }) => (
    <AnimatePresence>
      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm mb-6 flex items-center gap-3 shadow-sm"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-semibold">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen flex bg-slate-100/70 dark:bg-[#0a0a0a] transition-colors duration-300 relative">
      
      {/* Global Dark Mode Toggle for Auth Page */}
      <div className="absolute top-4 right-4 z-50 lg:top-6 lg:right-6">
        <button onClick={toggleTheme} className="p-3 rounded-full bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 shadow-lg border border-slate-200 dark:border-zinc-700 hover:scale-110 transition-transform">
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Left Panel: Animated Gradient / Branding */}
      <div className="hidden lg:flex w-1/2 bg-blue-600 relative overflow-hidden flex-col justify-between p-12 text-white">
        {/* Animated Background Shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Dot Grid overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff40_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>
          
          <motion.div 
            animate={{ 
              y: [0, -50, 0],
              x: [0, 30, 0],
              rotate: [0, 45, 0]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50"
          />
          <motion.div 
            animate={{ 
              y: [0, 50, 0],
              x: [0, -40, 0],
              rotate: [0, -30, 0]
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-40"
          />

          {/* Floating Glass Widget 1: Task Completed */}
          <motion.div 
            animate={{ y: ["-15px", "15px"] }}
            transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0 }}
            className="absolute top-[20%] right-[10%] lg:right-[15%] bg-white/95 backdrop-blur-md border border-white/40 p-4 rounded-2xl hidden lg:flex items-center gap-4 shadow-[0_20px_40px_rgba(0,0,0,0.15)] w-64"
          >
            <div className="w-12 h-12 bg-emerald-400 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"><CheckCircle2 className="w-6 h-6 text-emerald-900" /></div>
            <div>
              <p className="text-sm font-black text-slate-900">Task Completed</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Database Assignment</p>
            </div>
          </motion.div>

          {/* Floating Glass Widget 2: Urgent Deadline */}
          <motion.div 
            animate={{ y: ["-15px", "15px"] }}
            transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 1 }}
            className="absolute top-[44%] left-[10%] lg:left-[15%] bg-white/95 backdrop-blur-md border border-white/40 p-4 rounded-2xl hidden lg:flex items-center gap-4 shadow-[0_20px_40px_rgba(0,0,0,0.15)] w-64 scale-95"
          >
            <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"><AlertCircle className="w-6 h-6 text-yellow-900" /></div>
            <div>
              <p className="text-sm font-black text-slate-900">Urgent Deadline</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Tomorrow at 11:59 PM</p>
            </div>
          </motion.div>

          {/* Floating Glass Widget 3: New Notes */}
          <motion.div 
            animate={{ y: ["-15px", "15px"] }}
            transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 2 }}
            className="absolute top-[28%] left-[20%] lg:left-[25%] bg-white/95 backdrop-blur-md border border-white/40 p-4 rounded-2xl hidden lg:flex items-center gap-4 shadow-[0_20px_40px_rgba(0,0,0,0.15)] w-64 scale-90"
          >
            <div className="w-12 h-12 bg-blue-400 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"><GraduationCap className="w-6 h-6 text-blue-900" /></div>
            <div>
              <p className="text-sm font-black text-slate-900">New Notes Added</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">CSE301 Chapter 4 PDF</p>
            </div>
          </motion.div>

          {/* Floating Glass Widget 4: CGPA Update */}
          <motion.div 
            animate={{ y: ["-15px", "15px"] }}
            transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 3 }}
            className="absolute top-[52%] right-[10%] lg:right-[15%] bg-white/95 backdrop-blur-md border border-white/40 p-4 rounded-2xl hidden lg:flex items-center gap-4 shadow-[0_20px_40px_rgba(0,0,0,0.15)] w-64 scale-90"
          >
            <div className="w-12 h-12 bg-purple-400 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"><ShieldCheck className="w-6 h-6 text-purple-900" /></div>
            <div>
              <p className="text-sm font-black text-slate-900">CGPA Goal Reached</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">You hit 3.85 this semester!</p>
            </div>
          </motion.div>

          {/* Floating Glass Widget 5: New Thread */}
          <motion.div 
            animate={{ y: ["-15px", "15px"] }}
            transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 4 }}
            className="absolute top-[36%] right-[20%] lg:right-[25%] bg-white/95 backdrop-blur-md border border-white/40 p-4 rounded-2xl hidden lg:flex items-center gap-4 shadow-[0_20px_40px_rgba(0,0,0,0.15)] w-64 scale-90"
          >
            <div className="w-12 h-12 bg-pink-400 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"><MessageSquare className="w-6 h-6 text-pink-900" /></div>
            <div>
              <p className="text-sm font-black text-slate-900">New Thread Started</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Discussion: Final Project</p>
            </div>
          </motion.div>

          {/* Floating Glass Widget 6: Notes Saved */}
          <motion.div 
            animate={{ y: ["-15px", "15px"] }}
            transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 1.5 }}
            className="absolute top-[12%] left-[10%] lg:left-[15%] bg-white/95 backdrop-blur-md border border-white/40 p-4 rounded-2xl hidden lg:flex items-center gap-4 shadow-[0_20px_40px_rgba(0,0,0,0.15)] w-64 scale-75"
          >
            <div className="w-12 h-12 bg-cyan-400 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"><Bookmark className="w-6 h-6 text-cyan-900" /></div>
            <div>
              <p className="text-sm font-black text-slate-900">Notes Saved</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Algorithms Cheatsheet</p>
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="p-2 rounded-2xl backdrop-blur-md bg-white/20 border border-white/20">
            <img src="/logo2.png" alt="EWU ConnectED Logo" className="w-12 h-12 object-contain drop-shadow-md dark:invert" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">EWU ConnectED</h1>
        </div>

        <div className="relative z-10 mt-auto mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl font-bold leading-tight mb-6 drop-shadow-xl"
          >
            Your Ultimate <br/> Academic Ecosystem
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-blue-100 text-lg max-w-md leading-relaxed font-medium drop-shadow-lg"
          >
            Join the centralized hub for notes, tasks, threads, and CGPA tracking tailored exclusively for EWU students.
          </motion.p>
        </div>

        <div className="relative z-10">
          <p className="text-white/70 text-sm font-semibold tracking-wide">
            Developed with <span className="text-red-400 animate-pulse">❤️</span> by Miftahul Islam Tashfin
          </p>
        </div>
      </div>

      {/* Right Panel: Glassmorphic Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto">
        <div className="w-full max-w-md">
          
          {/* Mobile Branding (Only visible on small screens) */}
          <div className="flex lg:hidden flex-col items-center mb-10 text-center">
            <div className="p-3 rounded-2xl mb-4 bg-white dark:bg-zinc-800 shadow-xl border border-slate-200 dark:border-zinc-700">
              <img src="/logo2.png" alt="EWU ConnectED Logo" className="w-10 h-10 object-contain drop-shadow-sm dark:invert" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">EWU ConnectED</h1>
            <p className="text-slate-500 dark:text-zinc-400 mt-2 font-medium">Academic Collaboration Ecosystem</p>
          </div>

          <div className="bg-white dark:bg-[#121212] rounded-3xl p-8 sm:p-10 shadow-[0_10px_40px_rgb(0,0,0,0.08)] dark:shadow-none border border-slate-200 dark:border-zinc-800/50 relative overflow-hidden backdrop-blur-xl">
            
            <AnimatePresence mode="wait">
              {/* --- FORGOT PASSWORD UI --- */}
              {isForgotPassword && (
                <motion.div 
                  key="forgot"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <button 
                    onClick={() => { setIsForgotPassword(false); setOtpSent(false); setError(''); }}
                    className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white mb-8 transition group"
                    disabled={isLoading}
                  >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Login
                  </button>

                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Reset Password</h2>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 mb-8 font-medium">
                    {!otpSent ? "Enter your EWU email to receive a secure reset code." : "Check your email for the 6-digit code."}
                  </p>

                  <ErrorPopup message={error} />

                  {!otpSent ? (
                    <form onSubmit={handleSendOTP}>
                      <FloatingInput 
                        label="Email Address" icon={Mail} type="email" name="email"
                        value={email} onChange={(e) => setEmail(e.target.value)} required
                      />
                      <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0">
                        {isLoading ? 'Sending...' : 'Send Reset Code'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleResetPassword}>
                      <FloatingInput 
                        label="6-Digit Code" type="text" value={otp} 
                        onChange={(e) => setOtp(e.target.value)} required 
                      />
                      <FloatingInput 
                        label="New Password" icon={KeyRound} type={showNewPassword ? "text" : "password"} name="newPassword"
                        value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required
                        rightElement={
                          <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="text-slate-400 hover:text-blue-600 transition p-1">
                            {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        }
                      />
                      <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/30 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 mt-2">
                        {isLoading ? 'Updating...' : 'Update Password'}
                      </button>
                      <div className="text-center mt-6">
                        <button 
                          type="button" disabled={timer > 0 || isLoading} onClick={handleSendOTP} 
                          className={`text-sm font-bold transition-colors ${timer > 0 || isLoading ? 'text-slate-300 dark:text-zinc-600' : 'text-blue-600 dark:text-blue-400 hover:underline'}`}
                        >
                          {timer > 0 ? `Resend code in ${formatTime(timer)}` : "Resend Code"}
                        </button>
                      </div>
                    </form>
                  )}
                </motion.div>
              )}

              {/* --- SIGNUP VERIFICATION UI --- */}
              {isVerifying && !isForgotPassword && (
                <motion.div 
                  key="verify"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <ShieldCheck className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Verify Your Email</h2>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 mb-8 font-medium">A code was sent to <b className="text-slate-700 dark:text-zinc-200">{email}</b></p>
                  
                  <ErrorPopup message={error} />
                  
                  <form onSubmit={handleVerifySignup}>
                    <input 
                      type="text" required placeholder="000000" maxLength="6" 
                      value={regOTP} onChange={(e) => setRegOTP(e.target.value)} 
                      className="w-full px-4 py-4 mb-6 text-center tracking-[0.5em] font-mono text-3xl font-bold bg-slate-50 dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-800 rounded-xl focus:border-blue-500 dark:focus:border-blue-500 outline-none text-slate-900 dark:text-white transition-all shadow-inner" 
                    />
                    <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/30 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 text-lg">
                      {isLoading ? 'Verifying...' : 'Verify & Register'}
                    </button>
                    <div className="mt-8">
                      <button 
                        type="button" disabled={timer > 0 || isLoading} onClick={handleResendVerification} 
                        className={`text-sm font-bold transition-colors ${timer > 0 || isLoading ? 'text-slate-300 dark:text-zinc-600' : 'text-emerald-600 dark:text-emerald-400 hover:underline'}`}
                      >
                        {timer > 0 ? `Resend code in ${formatTime(timer)}` : "Resend Code"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* --- MAIN LOGIN/REGISTER UI --- */}
              {!isForgotPassword && !isVerifying && (
                <motion.div 
                  key="main"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                    {isLogin ? 'Welcome back' : 'Create account'}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 mb-8 font-medium">
                    {isLogin ? 'Please enter your details to sign in.' : 'Join the academic ecosystem today.'}
                  </p>

                  <ErrorPopup message={error} />

                  <form onSubmit={handleSubmit}>
                    {!isLogin && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                        <FloatingInput 
                          label="Full Name" type="text" value={name} 
                          onChange={(e) => setName(e.target.value)} required 
                        />
                        <FloatingInput 
                          label="Email Address" icon={Mail} type="email" name="email"
                          value={email} onChange={(e) => setEmail(e.target.value)} required 
                        />
                      </motion.div>
                    )}

                    {isLogin && (
                      <FloatingInput 
                        label="Student ID or Email" type="text" value={studentId} 
                        onChange={(e) => setStudentId(e.target.value)} required 
                      />
                    )}

                    <div className="relative">
                      <FloatingInput 
                        label="Password" icon={KeyRound} type={showPassword ? "text" : "password"} name="password"
                        value={password} onChange={(e) => setPassword(e.target.value)} required
                        rightElement={
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-blue-600 transition p-1">
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        }
                      />
                      {isLogin && (
                        <div className="absolute -top-6 right-0">
                          <button 
                            type="button" onClick={() => setIsForgotPassword(true)} 
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Forgot Password?
                          </button>
                        </div>
                      )}
                    </div>

                    {!isLogin && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                        <FloatingInput 
                          label="Confirm Password" icon={KeyRound} type={showPassword ? "text" : "password"} name="confirmPassword"
                          value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                        />
                      </motion.div>
                    )}

                    <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:-translate-y-0.5 transition-all duration-200 mt-4 disabled:opacity-50 disabled:hover:translate-y-0 text-lg">
                      {isLoading ? (isLogin ? 'Signing in...' : 'Registering...') : (isLogin ? 'Sign In' : 'Sign Up')}
                    </button>
                  </form>

                  <div className="mt-8 text-center text-sm font-medium text-slate-600 dark:text-zinc-400 border-t border-slate-100 dark:border-zinc-800 pt-6">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
                      {isLogin ? 'Create one' : 'Sign in instead'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
          </div>
          
          <div className="lg:hidden mt-8 text-center">
            <p className="text-slate-500 dark:text-zinc-500 text-xs font-semibold tracking-wide">
              Developed with <span className="text-red-400">❤️</span> by Miftahul Islam Tashfin
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Auth;