import { actionCreatorFactory } from "typescript-fsa";
import { UserProfile } from "oidc-client-ts";

const createAction = actionCreatorFactory("OIDC");
const initialize = createAction<{ isAuthenticated: boolean; user?: UserProfile }>("INITIALIZE");
const error = createAction<Error>("ERROR");

export { initialize, error };
