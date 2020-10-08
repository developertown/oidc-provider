# @developertown/oidc-provider

OpenID Connect (OIDC) and OAuth2 protocol support for React Single Page Applications (SPA).

[![Version](https://img.shields.io/npm/v/@developertown/oidc-provider.svg)](https://npmjs.org/package/@developertown/oidc-provider)
[![Downloads/week](https://img.shields.io/npm/dw/@developertown/oidc-provider.svg)](https://npmjs.org/package/@developertown/oidc-provider)
![License](https://img.shields.io/npm/l/@developertown/oidc-provider)

## Installation

Using [npm](https://npmjs.org/)

```bash
npm install @developertown/oidc-provider
```

Using [yarn](https://yarnpkg.com/)

```bash
yarn add @developertown/oidc-provider
```

## Getting Started

### Auth0

`@developertown/oidc-provider` provides a simplified api for integrating Auth0. The simplified api is nearly drop in equilvalent to [@auth0/auth0-react](https://github.com/auth0/auth0-react)

Configure the SDK by wrapping your application in `Auth0Provider`:

```jsx
// src/index.js
import React from "react";
import ReactDOM from "react-dom";
import { Auth0Provider } from "@developertown/oidc-provider";
import App from "./App";

ReactDOM.render(
  <Auth0Provider
    domain="YOUR_AUTH0_DOMAIN"
    audience="YOUR_API_DOMAIN"
    clientId="YOUR_AUTH0_CLIENT_ID"
    redirectUri={window.location.origin}
  >
    <App />
  </Auth0Provider>,
  document.getElementById("app"),
);
```

Use the `useAuth0` hook in your components to access authentication state (`isLoading`, `isAuthenticated` and `user`) and authentication methods (`loginWithRedirect` and `logout`):

```jsx
// src/App.js
import React from "react";
import { useAuth0 } from "@developertown/oidc-provider";

function App() {
  const { isLoading, isAuthenticated, error, user, loginWithRedirect, logout } = useAuth0();

  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div>Oops... {error.message}</div>;
  }

  if (isAuthenticated) {
    return (
      <div>
        Hello {user.name} <button onClick={() => logout()}>Log out</button>
      </div>
    );
  } else {
    return <button onClick={loginWithRedirect}>Log in</button>;
  }
}

export default App;
```

### AWS Cognito

Configure the SDK by wrapping your application in `CognitoProvider`:

```jsx
// src/index.js
import React from "react";
import ReactDOM from "react-dom";
import { CognitoProvider } from "@developertown/oidc-provider";
import App from "./App";

ReactDOM.render(
  <CognitoProvider
    domain="YOUR_COGNITO_DOMAIN"
    issuer="YOUR_COGNITO_ISSUER"
    clientId="YOUR_COGNITO_CLIENT_ID"
    redirectUri={window.location.origin}
  >
    <App />
  </CognitoProvider>,
  document.getElementById("app"),
);
```

Use the `useCongito` hook in your components to access authentication state (`isLoading`, `isAuthenticated` and `user`) and authentication methods (`loginWithRedirect` and `logout`):

```jsx
// src/App.js
import React from "react";
import { useCongito } from "@developertown/oidc-provider";

function App() {
  const { isLoading, isAuthenticated, error, user, loginWithRedirect, logout } = useCongito();

  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div>Oops... {error.message}</div>;
  }

  if (isAuthenticated) {
    return (
      <div>
        Hello {user.name} <button onClick={() => logout()}>Log out</button>
      </div>
    );
  } else {
    return <button onClick={loginWithRedirect}>Log in</button>;
  }
}

export default App;
```

### Other OpenID Connect

This library can be configured to work with an OpenID Connect authentication provider. Configure the SDK by wrapping your application in `OIDCProvider` see [IdentityModel/oidc-client-js](https://github.com/IdentityModel/oidc-client-js/wiki#usermanager) for the full list of options when configuring the `OIDCProvider`:

```jsx
// src/index.js
import React from "react";
import ReactDOM from "react-dom";
import { OIDCProvider } from "@developertown/oidc-provider";
import App from "./App";

ReactDOM.render(
  <OIDCProvider
    authority={"YOUR_OIDC_DOMAIN"}
    metadata={{
      issuer: "YOUR_OIDC_ISSUER",
      authorization_endpoint: "YOUR_OIDC_AUTHORIZATION_ENDPOINT",
      token_endpoint: "YOUR_OIDC_TOKEN_ENDPOINT",
      end_session_endpoint: "YOUR_OIDC_END_SESSION_ENDPOINT",
    }}
    client_id={"YOUR_OIDC_CLIENT_ID"}
    response_type="code"
    loadUserInfo={false}
    automaticSilentRenew
    redirect_uri={window.location.origin}
    post_logout_redirect_uri={window.location.origin}
  >
    <App />
  </OIDCProvider>,
  document.getElementById("app"),
);
```

Use the `useAuth` hook in your components to access authentication state (`isLoading`, `isAuthenticated` and `user`) and authentication methods (`loginWithRedirect` and `logout`):

```jsx
// src/App.js
import React from "react";
import { useAuth } from "@developertown/oidc-provider";

function App() {
  const { isLoading, isAuthenticated, error, user, loginWithRedirect, logout } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div>Oops... {error.message}</div>;
  }

  if (isAuthenticated) {
    return (
      <div>
        Hello {user.name} <button onClick={() => logout()}>Log out</button>
      </div>
    );
  } else {
    return <button onClick={loginWithRedirect}>Log in</button>;
  }
}

export default App;
```

### Protect a Route

Protect a route component using the `withAuthenticationRequired` higher order component. Visits to this route when unauthenticated will redirect the user to the login page and back to this page after login:

```jsx
import React from "react";
import { withAuthenticationRequired } from "@developertown/oidc-provider";

const PrivateRoute = () => <div>Private</div>;

export default withAuthenticationRequired(PrivateRoute, {
  // Show a message while the user waits to be redirected to the login page.
  onRedirecting: () => <div>Redirecting you to the login page...</div>,
});
```

### Call an API

Call a protected API with an Access Token:

```jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "@developertown/oidc-provider";

const Posts = () => {
  const { getAccessTokenSilently } = useAuth();
  const [posts, setPosts] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessTokenSilently();
        const response = await fetch("https://api.example.com/posts", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setPosts(await response.json());
      } catch (e) {
        console.error(e);
      }
    })();
  }, [getAccessTokenSilently]);

  if (!posts) {
    return <div>Loading...</div>;
  }

  return (
    <ul>
      {posts.map((post, index) => {
        return <li key={index}>{post}</li>;
      })}
    </ul>
  );
};

export default Posts;
```

### Events

```jsx
// src/index.js
import React from "react";
import ReactDOM from "react-dom";
import { Auth0Provider as AuthenticationProvider, AppState } from "@developertown/oidc-provider";
import App from "./App";

ReactDOM.render(
  <AuthenticationProvider
    domain="YOUR_DOMAIN"
    clientId="YOUR_CLIENT_ID"
    redirectUri={window.location.origin}
    useRefreshTokens
    onAccessTokenChanged={(accessToken: string) => {
      /* Do something with the accessToken*/
      // dispatch(accessTokenChanged(accessToken))
      // NOTE: this event may not be needed since getAccessTokenSilently() will always grab the latest access token
      // or perform a silent refresh to get a fresh one
    }}
    onAccessTokenExpiring={() => {
      // Let the user know their session is expiring
      // NOTE: when useRefreshTokens is true accessTokens will be automatically refreshed
    }}
    onAccessTokenExpired={() => {
      // Let the user know their session has expired
      // NOTE: when useRefreshTokens is true as long as the silent refresh occurs successfully the token will not expire
    }}
    onAccessTokenRefreshError={(error: Error) => {
      // Handle errors when silently refreshing access tokens.  Only applies when useRefreshTokens is true
    }}
    onRedirectCallback={(appState?: AppState) => {
      // Perform action after redirecting from the authentication provider
      // NOTE: if no onRedirectCallback is provided the default behavior is
      window.history.replaceState({}, document.title, appState?.returnTo || window.location.pathname);
    }}
  >
    <App />
  </AuthenticationProvider>,
  document.getElementById("app"),
);
```

## License

This project is licensed under the MIT license. See the [LICENSE](https://github.com/developertown/oidc-provider/blob/master/LICENSE) file for more info.
