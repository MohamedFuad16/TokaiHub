import { Amplify } from 'aws-amplify';

/**
 * Call once at app startup (in main.tsx or App.tsx) to configure AWS Amplify.
 * Centralizes the Cognito config so it's not embedded in a component file.
 */
export function configureAmplify(): void {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID ?? 'ap-northeast-1_G22UBNCKK',
        userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID ?? '4ej101oqii0dopq22duiodvah7',
        loginWith: { 
          email: true,
          oauth: {
            domain: import.meta.env.VITE_COGNITO_DOMAIN ?? 'ap-northeast-1g22ubnckk.auth.ap-northeast-1.amazoncognito.com',
            scopes: ['email', 'profile', 'openid', 'aws.cognito.signin.user.admin'],
            redirectSignIn: [import.meta.env.VITE_OAUTH_REDIRECT_SIGN_IN ?? window.location.origin + '/'],
            redirectSignOut: [import.meta.env.VITE_OAUTH_REDIRECT_SIGN_OUT ?? window.location.origin + '/'],
            responseType: 'code',
          }
        },
      },
    },
  });
}
