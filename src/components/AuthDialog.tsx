import React, { FormEvent, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { KeyRound, LogIn, RefreshCw, UserPlus, X } from 'lucide-react';
import { AuthUser, CloudDataStore } from '../cloudDataStore';

export type AuthDialogMode = 'login' | 'register' | 'password';

interface AuthDialogProps {
  isOpen: boolean;
  mode: AuthDialogMode;
  cloudStore: CloudDataStore;
  currentUser: AuthUser | null;
  onModeChange: (mode: AuthDialogMode) => void;
  onAuthenticated: (user: AuthUser) => void;
  onPasswordChanged: () => void;
  onClose: () => void;
}

export const AuthDialog: React.FC<AuthDialogProps> = ({
  isOpen,
  mode,
  cloudStore,
  currentUser,
  onModeChange,
  onAuthenticated,
  onPasswordChanged,
  onClose,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaText, setCaptchaText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === 'register';
  const isPasswordMode = mode === 'password';
  const title = isPasswordMode ? '修改密码' : isRegister ? '注册账号' : '登录账号';

  const loadCaptcha = async () => {
    try {
      const captcha = await cloudStore.getCaptcha();
      setCaptchaId(captcha.captchaId);
      setCaptchaSvg(captcha.svg);
      setCaptchaText('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '验证码加载失败。');
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setMessage(null);
    setPassword('');
    setCurrentPassword('');
    setNewPassword('');
    setCaptchaText('');
    if (currentUser?.email && mode !== 'register') {
      setEmail(currentUser.email);
    }
    if (mode === 'register') {
      void loadCaptcha();
    }
  }, [isOpen, mode, currentUser?.email]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        onAuthenticated(await cloudStore.login(email, password));
      } else if (mode === 'register') {
        onAuthenticated(await cloudStore.register({ email, password, captchaId, captchaText }));
      } else {
        await cloudStore.changePassword(currentPassword, newPassword);
        onPasswordChanged();
      }
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败，请稍后再试。');
      if (mode === 'register') {
        void loadCaptcha();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 backdrop-blur-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <motion.div
            className="bg-white w-full max-w-md rounded-t-[32px] max-h-[92vh] overflow-y-auto shadow-2xl p-6 pb-8 flex flex-col gap-5 border-t border-gray-100"
            initial={{ y: '100%', opacity: 0.96 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320, mass: 0.9 }}
            role="dialog"
            aria-modal="true"
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto -mt-2 mb-1"></div>

            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-[#4A4540] flex items-center gap-2">
                {isPasswordMode ? <KeyRound size={20} className="text-[#8FA88B]" /> : <LogIn size={20} className="text-[#8FA88B]" />}
                <span>{title}</span>
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="关闭账号弹窗"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {!isPasswordMode && (
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500">
                  邮箱
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-11 rounded-2xl bg-gray-50 border border-gray-100 px-3 text-sm text-[#4A4540] outline-none focus:border-[#8FA88B] focus:bg-white"
                    required
                  />
                </label>
              )}

              {isPasswordMode ? (
                <>
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500">
                    当前密码
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      className="h-11 rounded-2xl bg-gray-50 border border-gray-100 px-3 text-sm text-[#4A4540] outline-none focus:border-[#8FA88B] focus:bg-white"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500">
                    新密码
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="h-11 rounded-2xl bg-gray-50 border border-gray-100 px-3 text-sm text-[#4A4540] outline-none focus:border-[#8FA88B] focus:bg-white"
                      minLength={8}
                      required
                    />
                  </label>
                </>
              ) : (
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500">
                  密码
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-11 rounded-2xl bg-gray-50 border border-gray-100 px-3 text-sm text-[#4A4540] outline-none focus:border-[#8FA88B] focus:bg-white"
                    minLength={isRegister ? 8 : undefined}
                    required
                  />
                </label>
              )}

              {isRegister && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">图形验证码</span>
                    <button
                      type="button"
                      onClick={loadCaptcha}
                      className="text-[11px] font-bold text-[#8FA88B] flex items-center gap-1"
                    >
                      <RefreshCw size={12} />
                      换一张
                    </button>
                  </div>
                  <div className="grid grid-cols-[1fr_104px] gap-2">
                    <div
                      className="h-16 rounded-2xl bg-[#F9F8F6] border border-[#F2EDE9] flex items-center justify-center overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: captchaSvg }}
                    />
                    <input
                      value={captchaText}
                      onChange={(event) => setCaptchaText(event.target.value)}
                      placeholder="输入"
                      className="h-16 rounded-2xl bg-gray-50 border border-gray-100 px-3 text-sm text-[#4A4540] outline-none focus:border-[#8FA88B] focus:bg-white"
                      required
                    />
                  </div>
                </div>
              )}

              {message && (
                <div className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="h-12 rounded-full bg-[#8FA88B] hover:bg-[#7D9779] disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all mt-1"
              >
                {isRegister ? <UserPlus size={16} /> : isPasswordMode ? <KeyRound size={16} /> : <LogIn size={16} />}
                <span>{isSubmitting ? '处理中...' : title}</span>
              </button>

              {!isPasswordMode && (
                <button
                  type="button"
                  onClick={() => onModeChange(isRegister ? 'login' : 'register')}
                  className="h-10 rounded-full bg-gray-50 text-xs font-bold text-gray-500 hover:bg-[#E6F0E6]/50 transition-colors"
                >
                  {isRegister ? '已有账号，去登录' : '没有账号，去注册'}
                </button>
              )}
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
