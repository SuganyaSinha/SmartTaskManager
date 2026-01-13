import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { Auth0Provider } from "@auth0/auth0-react";

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
    <Auth0Provider
        domain={process.env.REACT_APP_DOMAIN!}
        clientId={process.env.REACT_APP_CLIENT_ID!}
        authorizationParams={{
        redirect_uri: window.location.origin,
        audience : process.env.REACT_APP_AUDIENCE,
        scope: "openid profile email"
        }}
         cacheLocation="localstorage"
        useRefreshTokens={true}
    > 
      <BrowserRouter>
        <App/>
      </BrowserRouter>
    </Auth0Provider>

);

