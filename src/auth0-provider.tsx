import React from "react";
import { OIDCProvider, useAuth as useAuth0 } from "./oidc-provider";
import { AuthProviderOptions } from "./auth-provider";

const Auth0Provider: React.FC<AuthProviderOptions> = ({
  children,
  domain,
  issuer,
  clientId,
  redirectUri,
  scope = "openid profile email",
  ...events
}) => (
  <OIDCProvider
    authority={domain}
    metadata={{
      issuer: issuer || `https://${domain}/`,
      authorization_endpoint: `https://${domain}/authorize`,
      token_endpoint: `https://${domain}/oauth/token`,
      end_session_endpoint: `https://${domain}/v2/logout`,
    }}
    client_id={clientId}
    scope={scope}
    response_type="code"
    loadUserInfo={false}
    automaticSilentRenew
    redirect_uri={redirectUri}
    post_logout_redirect_uri={redirectUri}
    {...events}
  >
    {children}
  </OIDCProvider>
);

export { Auth0Provider, useAuth0 };
