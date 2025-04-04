import React, {
    createContext,
    useState,
    useEffect,
    ReactNode,
    useContext,
} from "react";
import NetInfo from "@react-native-community/netinfo";

type ContextType = {
    online: boolean | null;
    onlineLoading: boolean;
};

const context = createContext<ContextType | undefined>(undefined);

export const useOnlineStatus = () => useContext(context);

export default function OnlineStatusProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [online, setOnline] = useState<boolean | null>(null);
    const [onlineLoading, setOnlineLoading] = useState<boolean>(true);

    useEffect(() => {
        // added for initial app lunch
        NetInfo.fetch().then((state) => {
            setOnline(state.isConnected || false);
            setOnlineLoading(false);
        });

        const unsubscribe = NetInfo.addEventListener((state) => {
            setOnline(state.isConnected || false);
            setOnlineLoading(false);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    return (
        <context.Provider value={{ online, onlineLoading }}>
            {children}
        </context.Provider>
    );
}
