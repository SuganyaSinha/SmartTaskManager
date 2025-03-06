import { Auth0Provider } from "@auth0/auth0-react";
import React from "react";

interface Props {
  children: React.ReactNode;
}

const AuthProvider = ({ children }: Props) => {
  return (
    <Auth0Provider
      domain=""  // Replace with Auth0 domain
      clientId=""   // Replace with Auth0 client ID
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: "YOUR_API_IDENTIFIER", // Set in Auth0 API settings
        scope: "openid profile email"
      }}
    >
      {children}
    </Auth0Provider>
  );
};

export default AuthProvider;
