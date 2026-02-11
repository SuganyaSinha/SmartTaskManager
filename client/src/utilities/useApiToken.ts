import { useAuth0 } from "@auth0/auth0-react";

export function useApiToken() {
  const { getAccessTokenSilently, loginWithRedirect } = useAuth0();

  const getToken = async (): Promise<string> => {
    try {
      return await getAccessTokenSilently();
    } catch (e: any) {
      if (
        e.error === "missing_refresh_token" ||
        e.error === "login_required"
      ) {
        await loginWithRedirect({
          appState: { returnTo: window.location.pathname }
        });
      }
      throw e;
    }
  };

  return { getToken };
}
