import React from "react";
import logo from "./logo.svg";
import "./App.css";
import {
  AuthenticationProvider,
  useAccessToken,
  useAuth,
} from "./authentication-provider";

const App = () => {
  const { user, loginWithRedirect, logout, isAuthenticated } = useAuth();
  const token = useAccessToken();
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        {isAuthenticated ? (
          <>
            <button onClick={() => logout()}>{`Log out ${user?.name}?`}</button>
            <code className="App-token">{JSON.stringify(token, null, 2)}</code>
          </>
        ) : (
          <button onClick={() => loginWithRedirect()}>Log In</button>
        )}
      </header>
    </div>
  );
};

const AuthenticatedApp = () => {
  return (
    <AuthenticationProvider
      // domain={process.env.REACT_APP_COGNITO_DOMAIN!}
      // issuer={process.env.REACT_APP_COGNITO_ISSUER!}
      // clientId={process.env.REACT_APP_COGNITO_CLIENT_ID!}
      //
      domain={process.env.REACT_APP_AUTH0_DOMAIN!}
      audience={process.env.REACT_APP_AUTH0_AUDIENCE!}
      clientId={process.env.REACT_APP_AUTH0_CLIENT_ID!}
      //
      // domain={process.env.REACT_APP_AZURE_DOMAIN!}
      // policy={process.env.REACT_APP_AZURE_POLICY!}
      // issuer={process.env.REACT_APP_AZURE_ISSUER!}
      // clientId={process.env.REACT_APP_AZURE_CLIENT_ID!}
      // clientSecret={process.env.REACT_APP_AZURE_CLIENT_SECRET!}
      //
      useRefreshTokens
      redirectUri={window.location.origin}
      onAccessTokenExpiring={() => console.warn("user session expiring")}
      onAccessTokenChanged={(token: any) =>
        console.info("user session token", token)
      }
      onAccessTokenRefreshError={(error: any) =>
        console.error("failed to refresh token", error)
      }
      onAccessTokenExpired={() => console.error("user session expired")}
    >
      <App />
    </AuthenticationProvider>
  );
};

export default AuthenticatedApp;
