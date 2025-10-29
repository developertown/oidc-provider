import { useState } from "react";
import "./App.css";
import reactLogo from "./assets/react.svg";
import {
  AuthenticationProvider,
  useAccessToken,
  useAuth,
} from "./authentication-provider";
import viteLogo from "/vite.svg";

function App() {
  const { user, loginWithRedirect, logout, isAuthenticated } = useAuth();
  const token = useAccessToken();
  const [count, setCount] = useState(0);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      {isAuthenticated ? (
        <>
          <button onClick={() => logout()}>{`Log out ${user?.name}?`}</button>
          <code className="App-token">{JSON.stringify(token, null, 2)}</code>
        </>
      ) : (
        <button onClick={() => loginWithRedirect()}>Log In</button>
      )}
    </>
  );
}

// const RequiredAuthApp = withAuthenticationRequired(App, {
//   onInitializing: () => <>Initializing Auth</>,
//   onRedirecting: () => <>Redirecting to Login</>,
//   onError: (error: Error) => <>{error.message}</>,
// });

const AuthenticatedApp = () => {
  return (
    <AuthenticationProvider
      // domain={import.meta.env.VITE_COGNITO_DOMAIN!}
      // issuer={import.meta.env.VITE_COGNITO_ISSUER!}
      // clientId={import.meta.env.VITE_COGNITO_CLIENT_ID!}
      //
      domain={import.meta.env.VITE_AUTH0_DOMAIN!}
      audience={import.meta.env.VITE_AUTH0_AUDIENCE!}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID!}
      //
      // domain={import.meta.env.VITE_AZURE_DOMAIN!}
      // policy={import.meta.env.VITE_AZURE_POLICY!}
      // issuer={import.meta.env.VITE_AZURE_ISSUER!}
      // clientId={import.meta.env.VITE_AZURE_CLIENT_ID!}
      // clientSecret={import.meta.env.VITE_AZURE_CLIENT_SECRET!}
      //
      useRefreshTokens
      redirectUri={window.location.origin}
      onAccessTokenExpiring={() => console.warn("user session expiring")}
      onAccessTokenChanged={(token: unknown) =>
        console.info("user session token", token)
      }
      onAccessTokenRefreshError={(error: unknown) =>
        console.error("failed to refresh token", error)
      }
      onAccessTokenExpired={() => console.error("user session expired")}
    >
      {
        <App />
        // <RequiredAuthApp />
      }
    </AuthenticationProvider>
  );
};

export default AuthenticatedApp;
