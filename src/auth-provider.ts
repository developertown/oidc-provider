import React from "react";
import { Events } from "./oidc-provider";

export type AuthProviderOptions = Events & {
  children?: React.ReactNode;
  domain: string;
  issuer?: string;
  clientId: string;
  redirectUri?: string;
  scope?: string;
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};
