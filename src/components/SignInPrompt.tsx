import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Smartphone, Loader2, KeyRound } from 'lucide-react';
import type { Language } from '../App';
import type { MfaPrompt } from '../lib/types';
import { sendMfaCode } from '../lib/api';
import { EASE } from './ScreenHeader';

const t = {
  en: {
    title: 'Approve the TIPS sign-in', number: 'Open Microsoft Authenticator and enter this number',
    approve: 'Approve the request in Microsoft Authenticator', code: 'Enter the code from Microsoft Authenticator or the SMS',
    send: 'Send', busy: 'Signing in to TIPS on your Mac…', why: 'Your Mac is signing back in to TIPS with your university account.',
  },
  jp: {
    title: 'TIPSへのサインインを承認', number: 'Microsoft Authenticatorを開き、この番号を入力してください',
    approve: 'Microsoft Authenticatorで要求を承認してください', code: 'Microsoft AuthenticatorまたはSMSのコードを入力',
    send: '送信', busy: 'MacでTIPSにサインインしています…', why: 'MacがあなたのアカウントでTIPSに再サインインしています。',
  },
};

/**
 * Full-screen prompt while the Mac signs in to TIPS on its own and Microsoft waits on the owner:
 * the number to type in Authenticator, a push to approve, or a code to type here.
 */
export default function SignInPrompt({ mfa, lang, isDark }: { mfa: MfaPrompt | null; lang: Language; isDark: boolean }) {
  const tx = t[lang];
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  return (
    <AnimatePresence>
      {mfa && (
        <motion.div key="mfa" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          <motion.div initial={{ y: 20, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ duration: 0.3, ease: EASE }}
            role="dialog" aria-modal="true" aria-live="polite"
            className={`w-full max-w-sm rounded-[32px] p-6 text-center shadow-2xl ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-brand-black'}`}>
            <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-yellow flex items-center justify-center mb-4">
              {mfa.kind === 'code' ? <KeyRound className="w-6 h-6 text-brand-black" /> : <ShieldCheck className="w-6 h-6 text-brand-black" />}
            </div>
            <h2 className="text-lg font-bold">{tx.title}</h2>
            <p className={`mt-1 text-xs font-medium ${muted}`}>{tx.why}</p>

            {mfa.kind === 'number' && (
              <>
                <p className="mt-6 text-sm font-semibold flex items-center justify-center gap-1.5"><Smartphone className="w-4 h-4" />{tx.number}</p>
                <motion.div key={mfa.number} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  className="mt-3 text-7xl font-black tracking-wider tabular-nums">{mfa.number}</motion.div>
              </>
            )}
            {mfa.kind === 'approve' && <p className="mt-6 text-sm font-semibold flex items-center justify-center gap-1.5"><Smartphone className="w-4 h-4" />{tx.approve}</p>}
            {mfa.kind === 'code' && (
              <form className="mt-6" onSubmit={async e => {
                e.preventDefault();
                setSending(true);
                await sendMfaCode(code.trim()).catch(() => {});
                setSending(false);
                setCode('');
              }}>
                <p className="text-sm font-semibold mb-3">{tx.code}</p>
                <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))} inputMode="numeric" autoComplete="one-time-code" autoFocus
                  className={`w-full h-14 rounded-2xl text-center text-2xl font-black tracking-[0.4em] outline-none ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} />
                <button disabled={code.length < 6 || sending} className="mt-3 w-full h-12 rounded-2xl bg-brand-black text-white font-bold disabled:opacity-40 flex items-center justify-center gap-2">
                  {sending && <Loader2 className="w-4 h-4 animate-spin" />}{tx.send}
                </button>
              </form>
            )}
            <p className={`mt-6 text-[11px] font-medium flex items-center justify-center gap-1.5 ${muted}`}><Loader2 className="w-3.5 h-3.5 animate-spin" />{tx.busy}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
