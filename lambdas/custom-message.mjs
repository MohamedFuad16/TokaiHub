/**
 * Cognito Custom Message Lambda Trigger
 *
 * Fires for every Cognito message event (signup verification, forgot password,
 * MFA, etc.). Must handle ALL trigger sources safely, or Cognito will surface
 * a 400 InvalidLambdaResponseException back to the caller.
 *
 * Trigger sources that send a code:
 *   CustomMessage_SignUp
 *   CustomMessage_ResendCode
 *   CustomMessage_ForgotPassword
 *   CustomMessage_UpdateUserAttribute
 *   CustomMessage_VerifyUserAttribute
 *   CustomMessage_AdminCreateUser
 *
 * Trigger sources with NO code (must still return event untouched):
 *   CustomMessage_Authentication
 */

const TRANSLATIONS = {
  en: {
    signupSubject: "TokaiHub — Verify your email",
    signupMessage: "Almost there! Use the verification code below to confirm your student email and complete registration.",
    forgotSubject: "TokaiHub — Password reset",
    forgotMessage: "We received a request to reset your password. Use the code below.",
    resendMessage: "Here is your new verification code.",
    ignore: "If you did not request this, you can safely ignore this email.",
  },
  ja: {
    signupSubject: "TokaiHub — メールアドレスの確認",
    signupMessage: "あと少しです！以下の認証コードで学生メールアドレスを確認し、登録を完了してください。",
    forgotSubject: "TokaiHub — パスワードリセット",
    forgotMessage: "パスワードリセットのリクエストを受け付けました。以下のコードをご利用ください。",
    resendMessage: "新しい認証コードをお送りします。",
    ignore: "このメールに心当たりがない場合は、無視してください。",
  },
  zh: {
    signupSubject: "TokaiHub — 验证您的邮箱",
    signupMessage: "即将完成！请使用下面的验证码确认您的学生邮箱并完成注册。",
    forgotSubject: "TokaiHub — 重置密码",
    forgotMessage: "我们收到了重置密码的请求，请使用以下验证码。",
    resendMessage: "这是您的新验证码。",
    ignore: "如果您未请求此邮件，请忽略。",
  },
};

function buildEmail(locale, subject, message, code) {
  const t = TRANSLATIONS[locale] || TRANSLATIONS.en;
  return {
    subject,
    html: `<!DOCTYPE html>
<html lang="${locale}">
<body style="margin:0;padding:0;background-color:#EBF2D9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table style="background-color:#ffffff;border-radius:28px;padding:40px;max-width:600px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="https://MohamedFuad16.github.io/TokaiHub/icons/icon-192x192.png" width="64" style="border-radius:16px;" alt="TokaiHub" />
              <h1 style="margin:10px 0 0;font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#0B1F3A;">TOKAI<span style="color:#3B82F6;">HUB</span></h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <p style="color:#4B5563;font-size:15px;line-height:1.6;margin:0;">${message}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <div style="background-color:#FACC15;padding:20px 40px;border-radius:16px;display:inline-block;">
                <span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#0B1F3A;">${code}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center">
              <p style="color:#9CA3AF;font-size:12px;margin:0;">${t.ignore}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };
}

export const handler = async (event) => {
  try {
    const triggerSource = event.triggerSource || "";
    const code = event.request?.codeParameter ?? "";

    // Safe locale fallback — userAttributes may be absent on some trigger sources
    const attrs = event.request?.userAttributes ?? {};
    const locale = (attrs.locale || "en").slice(0, 2).toLowerCase();
    const t = TRANSLATIONS[locale] || TRANSLATIONS.en;

    // Only customise the message for trigger sources that send a code
    switch (triggerSource) {
      case "CustomMessage_SignUp":
      case "CustomMessage_ResendCode": {
        const email = buildEmail(locale, t.signupSubject, t.signupMessage, code);
        event.response.emailSubject = email.subject;
        event.response.emailMessage = email.html;
        break;
      }

      case "CustomMessage_ForgotPassword": {
        const email = buildEmail(locale, t.forgotSubject, t.forgotMessage, code);
        event.response.emailSubject = email.subject;
        event.response.emailMessage = email.html;
        break;
      }

      case "CustomMessage_UpdateUserAttribute":
      case "CustomMessage_VerifyUserAttribute":
      case "CustomMessage_AdminCreateUser": {
        const email = buildEmail(locale, t.signupSubject, t.resendMessage, code);
        event.response.emailSubject = email.subject;
        event.response.emailMessage = email.html;
        break;
      }

      // CustomMessage_Authentication and any future sources: return event untouched
      default:
        break;
    }
  } catch (err) {
    // Never let an exception propagate — Cognito would return 400 to the user.
    console.error("CustomMessage Lambda error:", err);
  }

  return event;
};
