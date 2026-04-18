import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GraduationCap, ArrowLeft, Mail, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

// 🚨 Define the dynamic URL at the top
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

  // Timer State
  const [timer, setTimer] = useState(0);
  
  const { login } = useContext(AuthContext);
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

  const startTimer = () => setTimer(180);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // --- STANDARD LOGIN / REGISTER HANDLER ---
  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setError(''); 
    const form = e.target;

    if (!isLogin && password.length < 8) {
      form.password.setCustomValidity("Password must be at least 8 characters long.");
      form.password.reportValidity();
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      form.confirmPassword.setCustomValidity("Passwords do not match.");
      form.confirmPassword.reportValidity();
      return;
    }

    if (!isLogin && !email.endsWith('@std.ewubd.edu') && !email.endsWith('@ewubd.edu')) {
      form.email.setCustomValidity("Please use a valid EWU student email.");
      form.email.reportValidity();
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
        // 🚨 NUCLEAR CHECK: Aggressively look for isVerified: false anywhere in the payload
        const userIsVerified = data.user !== undefined ? data.user.isVerified : data.isVerified;
        
        if (userIsVerified === false) {
           // Grab the email from the response, or fallback to whatever they typed if it's somehow missing
           const userEmail = data.email || data.user?.email || email;
           setEmail(userEmail);
           setIsVerifying(true);
           startTimer();
           return; // 🚨 THIS RETURN KILLS THE LOGIN PROCESS COMPLETELY
        }

        // If we reach this line, they are 100% verified. Let them in.
        login(data);
        navigate('/dashboard', { replace: true });
      } else {
        setIsVerifying(true);
        startTimer();
      }

    } catch (err) {
      console.error(err);
      
      const errorData = err.response?.data;
      
      // 🚨 CATCH BLOCK CHECK: If backend sends a 401/403 Error for being unverified
      if (isLogin && (errorData?.isVerified === false || errorData?.message?.toLowerCase().includes('verify'))) {
         const userEmail = errorData?.email || email;
         setEmail(userEmail);
         setIsVerifying(true);
         startTimer();
         setError(errorData?.message || 'Please verify your email to continue.');
         return; // Kill process
      }

      setError(errorData?.message || 'Something went wrong. Try again.');
    }
  };

  // --- FORGOT PASSWORD HANDLERS ---
  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    setError('');
    try {
      await axios.post(`${API_URL}/api/users/forgot-password`, { email });
      setOtpSent(true);
      startTimer();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP.");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    const form = e.target;
    
    if (newPassword.length < 8) {
      form.newPassword.setCustomValidity("New password must be at least 8 characters long.");
      form.newPassword.reportValidity();
      return;
    }

    try {
      await axios.post(`${API_URL}/api/users/reset-password`, { email, otp, newPassword });
      alert("Password reset successfully! Please log in.");
      setIsForgotPassword(false);
      setOtpSent(false);
      setIsLogin(true);
      setPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired OTP.");
    }
  };

  // --- SIGNUP VERIFICATION HANDLER ---
  const handleVerifySignup = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await axios.post(`${API_URL}/api/auth/verify-otp`, { email, otp: regOTP });
      alert("Email verified successfully! You can now login.");
      setIsVerifying(false);
      setIsLogin(true);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired code.");
    }
  };

  // --- Reusable Footer Component ---
  const FooterSignature = () => (
    <div className="absolute bottom-6 w-full text-center pointer-events-none">
      <p className="text-white/90 text-sm font-medium tracking-wide drop-shadow-sm">
        Developed with <span className="text-red-400">❤️</span> by Miftahul Islam Tashfin
      </p>
    </div>
  );

  // --- RENDER FORGOT PASSWORD UI ---
  if (isForgotPassword) {
    return (
      <div className="min-h-screen bg-blue-600 flex flex-col items-center justify-center p-4 relative">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 z-10">
          <button 
            onClick={() => { setIsForgotPassword(false); setOtpSent(false); setError(''); }}
            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 mb-6 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </button>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h2>
          <p className="text-sm text-gray-500 mb-6">
            {!otpSent ? "Enter your EWU email to receive a secure reset code." : "Check your email for the 6-digit code."}
          </p>

          {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm mb-4 text-center font-medium">{error}</div>}

          {!otpSent ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-gray-400"/></div>
                  <input 
                    name="email" type="email" required placeholder="20XX-X-XX-XXX@std.ewubd.edu"
                    value={email} 
                    onChange={(e) => { e.target.setCustomValidity(''); setEmail(e.target.value); }} 
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition duration-200">
                Send Reset Code
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">6-Digit Code</label>
                <input 
                  type="text" required placeholder="123456" maxLength="6"
                  value={otp} onChange={(e) => setOtp(e.target.value)} 
                  className="w-full px-4 py-2 text-center tracking-widest font-mono text-lg border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><KeyRound className="h-5 w-5 text-gray-400"/></div>
                  <input 
                    name="newPassword" type={showNewPassword ? "text" : "password"} required placeholder="••••••••"
                    value={newPassword} 
                    onChange={(e) => { e.target.setCustomValidity(''); setNewPassword(e.target.value); }} 
                    className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-600 transition"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition duration-200">
                Update Password
              </button>
              <div className="text-center mt-4">
                <button 
                  type="button" 
                  disabled={timer > 0} 
                  onClick={handleSendOTP} 
                  className={`text-sm font-bold ${timer > 0 ? 'text-gray-300' : 'text-blue-600 hover:underline'}`}
                >
                  {timer > 0 ? `Resend code in ${formatTime(timer)}` : "Resend Code"}
                </button>
              </div>
            </form>
          )}
        </div>
        <FooterSignature />
      </div>
    );
  }

  // --- RENDER SIGNUP VERIFICATION UI ---
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-blue-600 flex flex-col items-center justify-center p-4 relative">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center animate-in fade-in zoom-in-95 z-10">
          <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h2>
          <p className="text-sm text-gray-500 mb-6">A code was sent to <b>{email}</b></p>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>}
          <form onSubmit={handleVerifySignup} className="space-y-4">
            <input 
              type="text" required placeholder="000000" maxLength="6" 
              value={regOTP} onChange={(e) => setRegOTP(e.target.value)} 
              className="w-full px-4 py-3 text-center tracking-widest font-mono text-2xl border-2 border-gray-100 rounded-xl focus:border-blue-500 outline-none" 
            />
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition">
              Verify & Register
            </button>
            <div className="mt-4">
              <button 
                type="button" 
                disabled={timer > 0} 
                onClick={(e) => handleSubmit(e)} 
                className={`text-sm font-bold ${timer > 0 ? 'text-gray-300' : 'text-blue-600 hover:underline'}`}
              >
                {timer > 0 ? `Resend code in ${formatTime(timer)}` : "Resend Code"}
              </button>
            </div>
          </form>
        </div>
        <FooterSignature />
      </div>
    );
  }

  // --- RENDER MAIN LOGIN/REGISTER UI ---
  return (
    <div className="min-h-screen bg-blue-600 flex flex-col items-center justify-center p-4 relative">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 z-10">
        
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-100 p-3 rounded-full mb-3">
            <GraduationCap className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">EWU ConnectED</h1>
          <p className="text-gray-500 text-sm">Academic Collaboration Ecosystem</p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm mb-4 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input 
                  type="text" required value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  name="email" type="email" required placeholder="20XX-X-XX-XXX@std.ewubd.edu"
                  value={email} 
                  onChange={(e) => { e.target.setCustomValidity(''); setEmail(e.target.value); }} 
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
            </>
          )}

          {isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
              <input 
                type="text" required placeholder="20XX-X-XX-XXX"
                value={studentId} onChange={(e) => setStudentId(e.target.value)} 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              {isLogin && (
                <button 
                  type="button" 
                  onClick={() => setIsForgotPassword(true)} 
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <input 
                name="password" type={showPassword ? "text" : "password"} required placeholder="••••••••"
                value={password} 
                onChange={(e) => { e.target.setCustomValidity(''); setPassword(e.target.value); }} 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-10" 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-600 transition"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <input 
                  name="confirmPassword" type={showPassword ? "text" : "password"} required placeholder="••••••••"
                  value={confirmPassword} 
                  onChange={(e) => { e.target.setCustomValidity(''); setConfirmPassword(e.target.value); }} 
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-10" 
                />
              </div>
            </div>
          )}

          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition duration-200 mt-2">
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-blue-600 font-bold hover:underline">
            {isLogin ? 'Create one' : 'Login here'}
          </button>
        </div>

      </div>

      <FooterSignature />
    </div>
  );
};

export default Auth; 