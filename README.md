# @developertown/oidc-provider

OpenID Connect (OIDC) and OAuth2 protocol support for React Single Page Applications (SPA).

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
  <Auth0Provider domain="YOUR_AUTH0_DOMAIN" clientId="YOUR_AUTH0_CLIENT_ID" redirectUri={window.location.origin}>
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

## License

This project is licensed under the MIT license. See the [LICENSE](https://github.com/developertown/oidc-provider/blob/master/LICENSE) file for more info.
