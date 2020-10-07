import { actionCreatorFactory } from "typescript-fsa";
import { Profile } from "oidc-client";

const createAction = actionCreatorFactory("OIDC");
const initialize = createAction<{ isAuthenticated: boolean; user?: Profile }>("INITIALIZE");
const error = createAction<Error>("ERROR");

export { initialize, error };
