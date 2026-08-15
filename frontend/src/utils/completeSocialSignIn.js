// ===================================================================
// Finishes a Google/GitHub sign-in once Firebase has resolved a real user
// credential. Used by AuthContext.jsx after getRedirectResult(auth)
// resolves -- signInWithRedirect (LoginPage/SignupPage) navigates the whole
// page away and back, so this can no longer live inline in either page's
// onSocialSignIn; it now runs exactly once, wherever the credential
// actually becomes available, regardless of which page initiated it.
// ===================================================================
import { toast } from 'sonner';
import { exchangeFirebaseSession } from '../api/authApi';

// Maps Firebase's own OAuth-flow error codes to a message worth showing.
// Distinct from LoginPage/SignupPage's own firebaseErrorMessage, which
// covers password-specific codes that can't happen here.
export function socialErrorMessage(err) {
  switch (err?.code) {
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    default:
      return 'Something went wrong signing you in. Please try again.';
  }
}

// Exchanges a Firebase user credential for the Gateway's own session and
// completes sign-in: the happy-path logic previously duplicated inline in
// LoginPage/SignupPage's onSocialSignIn. There's no page-local error banner
// available at this point (this may run after the page has already
// reloaded), so failures surface via toast only.
export async function completeSocialSignIn(cred, { authLogin, navigate }) {
  const idToken = await cred.user.getIdToken();
  const res = await exchangeFirebaseSession({ idToken });
  if (res.ok) {
    authLogin(res.token, res.user, true);
    toast.success('Signed in.');
    navigate('/home');
  } else {
    toast.error(res.message);
  }
}
