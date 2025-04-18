import {
    useEffect,
    useState,
    createContext,
    useContext,
    ReactNode,
    useRef
} from "react";
import { AppState, AppStateStatus } from "react-native";
import { useOnlineStatus } from "./OnlineStatusProvider";
import { useAuthContext } from "./AuthProvider";
import { useSnapshotContext } from "./SnapshotProvider";
import { useSetupContext } from "./SetupProvider";

import EventSource from "react-native-sse";


type contextType = {};

const context = createContext<null | contextType>(null);

export const useInstructionContext = () => useContext(context);

export default function InstructionsProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [eventSource, setEventSource] = useState<EventSource | null>(null);

    const { online, onlineLoading } = useOnlineStatus();
    const { authenticated, apiKey, authLoading } = useAuthContext();
    const { setSnapshotUrl } = useSnapshotContext();
    const { fetchOnlineSetup } = useSetupContext();

    const appState = useRef(AppState.currentState);
    const [appVisible, setAppVisible] = useState(true);
    
    const connectEventSource = () => {
        if (!online || !authenticated || !apiKey) return;

        const es = new EventSource("https://videobackend.tashirpizza.ru/api/tv/devices/me/instructions", {
            headers: {
                "X-API-Key": apiKey,
            },
        });

        es.addEventListener("message", (event) => {
            const instruction = JSON.parse(event.data);
            console.log("We got an instruction:", instruction);

            if (instruction.instruction === "snapshot") {
                setSnapshotUrl(instruction.file_id);
            } else if (instruction.instruction === "update_setup") {
                fetchOnlineSetup();
            } else if (instruction.instruction === "deleted") {
                // TODO: Handle delete
            }
        });

        es.addEventListener("error", () => {
            es.removeAllEventListeners();
            es.close();
            setEventSource(null);

            setTimeout(() => {
                if (online && authenticated && apiKey && appVisible) {
                    connectEventSource();
                }
            }, 5000);
        });

        setEventSource(es);
    };

    const disconnectEventSource = () => {
        if (eventSource) {
            eventSource.removeAllEventListeners();
            eventSource.close();
            setEventSource(null);
        }
    };

    // i need the authantication and gets from it teh actual apikey
    useEffect(() => {
        if (onlineLoading || authLoading || !authenticated || !apiKey) return;

        //let es: EventSource | null = null

        if (online && !eventSource) {
            connectEventSource();
        } else if (!online) {
            disconnectEventSource();
        }

        return () => {
            disconnectEventSource();
        };
    }, [online, onlineLoading, authLoading, authenticated, apiKey]);

    useEffect(() => {
        if (
            appVisible && // we just came back to foreground
            online &&
            authenticated &&
            apiKey &&
            !eventSource
        ) {
            connectEventSource();
        }
    }, [appVisible, online, authenticated, apiKey, eventSource]);

    useEffect(() => {
        const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
            const isNowVisible = nextAppState === "active";
            setAppVisible(isNowVisible);
            appState.current = nextAppState;
        });
    
        return () => subscription.remove();
    }, []);
    return <context.Provider value={{}}>{children}</context.Provider>;
}
