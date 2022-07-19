import React from "react";
import { Events } from "./oidc-provider";
import { StorageType } from "./token-storage";

export type AuthProviderOptions = Events & {
  children?: React.ReactNode;
  domain: string;
  issuer?: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scope?: string;
  useRefreshTokens?: boolean;
  tokenStorage?: StorageType;
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};
