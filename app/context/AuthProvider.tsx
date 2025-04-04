import { useState, useContext, createContext, useEffect } from "react";
import * as SecureStore from "expo-secure-store";

type contextType = {
    authenticated: boolean;
    setAuthanticated: React.Dispatch<React.SetStateAction<boolean>>;
    authLoading: boolean;
    setAuthLoading: React.Dispatch<React.SetStateAction<boolean>>;
    apiKey: null | string;
    setApiKey: React.Dispatch<React.SetStateAction<boolean>>;
};

const defaultValue: contextType = {
    authenticated: false,
    setAuthenticated: () => {},
    authLoading: true,
    setAuthLoading: () => {},
    apiKey: null,
    setApiKey: () => {},
};

const context = createContext<contextType>(defaultValue);

export const useAuthContext = () => useContext(context);

export default function AuthProvider({ children }: { children: any }) {
    const [authenticated, setAuthanticated] = useState(false);
    const [apiKey, setApiKey] = useState<null | string>(null);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        const handleAuth = async () => {
            const result = await SecureStore.getItemAsync("device_api_key");
            if (result) {
                setApiKey(result);
                setAuthanticated(true);
                setAuthLoading(false);
            } else {
                setAuthLoading(false);
            }
        };

        handleAuth();
    }, []);

    return (
        <context.Provider
            value={{
                authenticated,
                setAuthanticated,
                authLoading,
                setAuthLoading,
                setApiKey,
                apiKey,
            }}
        >
            {children}
        </context.Provider>
    );
}
