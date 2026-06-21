import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UserData {
    id: number | null;
    name: string | null;
    email: string | null;
}

interface AuthInitialStateType {
    userData: UserData;
    isAuthenticated: boolean;
}

const initialState: AuthInitialStateType = {
    userData: {
        id: null,
        name: null,
        email: null,
    },
    isAuthenticated: false,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setUser: (state, action: PayloadAction<UserData>) => {
            state.userData = action.payload;
            state.isAuthenticated = true;
        },
        clearUser: (state) => {
            state.userData = {
                id: null,
                name: null,
                email: null,
            };
            state.isAuthenticated = false;
        },
    },
});

export const { setUser, clearUser } = authSlice.actions;
export default authSlice.reducer;