import { reducerWithoutInitialState } from "typescript-fsa-reducers";
import { initialize, error } from "./actions";
import { AuthState } from "./state";

const reducer = reducerWithoutInitialState<AuthState>()
  .case(initialize, (state, { isAuthenticated, user }) => ({
    ...state,
    isAuthenticated,
    user,
    isLoading: false,
    error: undefined,
  }))
  .case(error, (state, e) => ({
    ...state,
    isLoading: false,
    error: e,
  }));

export default reducer;
