import React, { useState } from 'react';
import { 
  auth, db, googleProvider, microsoftProvider,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  doc, getDoc, setDoc 
} from '../firebase';
import { sanitizeInstagramUsername, validateInstagramUsername } from '../utils/username';

interface AuthProps {
  initialMode: 'login' | 'register';
  onLoginSuccess: (userData?: { username: string, uid: string }) => void;
  t: any;
}

export const Auth: React.FC<AuthProps> = ({ initialMode, onLoginSuccess, t }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (mode === 'register') {
        if (password !== confirmPassword) {
            setError(t.passwordsNoMatch || "Passwords do not match");
            return;
        }
        const validation = validateInstagramUsername(username);
        if (!validation.isValid) {
            setError(validation.error || "Please choose a valid username.");
            return;
        }
    }

    setIsLoading(true);
    
    try {
      if (mode === 'register') {
        const cleanUsername = sanitizeInstagramUsername(username);
        const usernameRef = doc(db, 'usernames', cleanUsername);
        const usernameDoc = await getDoc(usernameRef);
        
        if (usernameDoc.exists()) {
           setError("Username @" + cleanUsername + " is already taken.");
           setIsLoading(false);
           return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Reserve username
        await setDoc(usernameRef, { uid: userCredential.user.uid });
        onLoginSuccess({ username: cleanUsername, uid: userCredential.user.uid });
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const fallbackUsername = sanitizeInstagramUsername(userCredential.user.email?.split('@')[0] || 'user');
        onLoginSuccess({ username: fallbackUsername, uid: userCredential.user.uid });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const cleanUsername = sanitizeInstagramUsername(result.user.displayName || result.user.email?.split('@')[0] || 'user');
      onLoginSuccess({ username: cleanUsername, uid: result.user.uid });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, microsoftProvider);
      onLoginSuccess({ username: result.user.displayName || result.user.email?.split('@')[0] || 'User', uid: result.user.uid });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh] py-12 px-4">
      <div className="glass-panel p-8 sm:p-10 rounded-[2.5rem] w-full max-w-md relative overflow-hidden shadow-2xl shadow-red-900/5">
        
        {/* Decorative ambient blobs inside the card */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-400/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
            <h2 className="text-4xl font-bold text-gray-900 mb-3 text-center tracking-tight">
            {mode === 'login' ? t.welcomeBack : t.joinAutoBid}
            </h2>
            <p className="text-gray-500 text-center mb-8 font-medium">
            {mode === 'login' 
                ? t.enterCredentials 
                : t.startJourney}
            </p>

            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium text-center">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                {mode === 'register' && (
                  <div className="animate-fade-in-down">
                      <div className="flex justify-between items-center mb-2 ml-2">
                        <label className="block text-sm font-bold text-gray-700">{t.username}</label>
                        <span className="text-[11px] text-gray-400 font-medium">No spaces • a-z, 0-9, _, .</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">@</span>
                        <input 
                            type="text" 
                            required
                            value={username}
                            onChange={(e) => {
                              const sanitized = sanitizeInstagramUsername(e.target.value);
                              setUsername(sanitized);
                            }}
                            className="w-full pl-10 pr-6 py-4 bg-white/50 border border-white/60 rounded-2xl focus:ring-4 focus:ring-red-100 focus:bg-white focus:border-red-200 outline-none transition-all shadow-inner text-gray-800 placeholder-gray-400 font-medium"
                            placeholder="racer_x"
                        />
                      </div>
                      {username && (
                        <p className="text-[11px] text-emerald-600 font-medium mt-1 ml-2">
                          Your profile handle: <strong>@{username}</strong>
                        </p>
                      )}
                  </div>
                )}

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 ml-2">{t.email}</label>
                    <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-6 py-4 bg-white/50 border border-white/60 rounded-2xl focus:ring-4 focus:ring-red-100 focus:bg-white focus:border-red-200 outline-none transition-all shadow-inner text-gray-800 placeholder-gray-400"
                        placeholder="you@example.com"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 ml-2">{t.password}</label>
                    <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-6 py-4 bg-white/50 border border-white/60 rounded-2xl focus:ring-4 focus:ring-red-100 focus:bg-white focus:border-red-200 outline-none transition-all shadow-inner text-gray-800 placeholder-gray-400"
                        placeholder="••••••••"
                    />
                </div>

                {mode === 'register' && (
                  <div className="animate-fade-in-down">
                      <label className="block text-sm font-bold text-gray-700 mb-2 ml-2">{t.confirmPassword}</label>
                      <input 
                          type="password" 
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={`w-full px-6 py-4 bg-white/50 border rounded-2xl focus:ring-4 focus:ring-red-100 focus:bg-white focus:border-red-200 outline-none transition-all shadow-inner text-gray-800 placeholder-gray-400 ${
                            confirmPassword && password !== confirmPassword ? 'border-red-400 focus:border-red-400' : 'border-white/60'
                          }`}
                          placeholder="••••••••"
                      />
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-red-500 text-xs mt-2 ml-2 font-medium">{t.passwordsNoMatch}</p>
                      )}
                  </div>
                )}

                {mode === 'login' && (
                    <div className="flex justify-end">
                        <button type="button" className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors">
                            {t.forgotPassword}
                        </button>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold py-4 rounded-2xl hover:shadow-xl hover:shadow-red-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all text-lg shadow-lg mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                        </span>
                    ) : (
                        mode === 'login' ? t.signIn : t.createAccount
                    )}
                </button>
            </form>

            <div className="mt-8 flex items-center justify-center gap-4">
              <div className="h-px bg-gray-300 w-full opacity-50"></div>
              <span className="text-gray-400 text-sm font-medium whitespace-nowrap">{t.orContinue}</span>
              <div className="h-px bg-gray-300 w-full opacity-50"></div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="flex-1 bg-white border border-gray-200 text-gray-700 font-bold py-3.5 rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm flex items-center justify-center gap-2 group text-sm"
              >
                <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </button>

              <button
                type="button"
                onClick={handleMicrosoftLogin}
                disabled={isLoading}
                className="flex-1 bg-white border border-gray-200 text-gray-700 font-bold py-3.5 rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm flex items-center justify-center gap-2 group text-sm"
              >
                <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 21 21">
                  <path d="M0 0h10v10H0z" fill="#f25022"/>
                  <path d="M11 0h10v10H11z" fill="#7fba00"/>
                  <path d="M0 11h10v10H0z" fill="#00a4ef"/>
                  <path d="M11 11h10v10H11z" fill="#ffb900"/>
                </svg>
                Microsoft
              </button>
            </div>

            <div className="mt-8 text-center">
                <p className="text-gray-600 font-medium">
                    {mode === 'login' ? `${t.dontHaveAccount} ` : `${t.alreadyHaveAccount} `}
                    <button 
                        onClick={() => {
                          setMode(mode === 'login' ? 'register' : 'login');
                          setConfirmPassword('');
                          setPassword('');
                          setUsername('');
                        }}
                        className="font-bold text-red-600 hover:text-red-700 hover:underline transition-all ml-1"
                    >
                        {mode === 'login' ? t.createAccount : t.signIn}
                    </button>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};