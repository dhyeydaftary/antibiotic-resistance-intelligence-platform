// ===================================================================
// Finishes a Google/GitHub sign-in once Firebase has resolved a real user
// credential. Called directly from LoginPage/SignupPage's onSocialSignIn
// once signInWithPopup resolves -- shared here rather than duplicated in
// both pages, since the exchange-and-redirect logic is identical either way.
// ===================================================================
import { toast } from 'sonner';
import { exchangeFirebaseSession } from '../api/authApi';

// Exchanges a Firebase user credential for the Gateway's own session and
// completes sign-in. Gateway-side failures (res.ok false) surface via toast
// rather than the calling page's own error banner, since res.message is a
// generic session-exchange failure, not a Firebase auth/* error the page's
// own firebaseErrorMessage() would know how to render.
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
