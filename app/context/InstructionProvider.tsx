import {
    useEffect,
    useState,
    createContext,
    useContext,
    ReactNode,
} from "react";
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

    
    // i need the authantication and gets from it teh actual apikey
    useEffect(() => {
        if (onlineLoading || authLoading || !authenticated || !apiKey) return;

        if (!online && eventSource) {
            eventSource.removeAllEventListeners()
            eventSource.close();
            setEventSource(null);
            //console.log("closing sse becouse conection was lost")
        }

        if (online && !eventSource) {
            const es = new EventSource(
                "https://www.orino.me/api/devices/me/instructions",
                {
                    headers: {
                        "X-API-Key": apiKey,
                    },
                }
            );

            es.addEventListener("open", (event) => {
                console.log("Opened sse connection from instructions")
            })

            es.addEventListener("message", (event) => {
                const instruction = JSON.parse(event.data);
                //console.log("We got an instruction:", instruction);
                if (instruction.instruction === "snapshot") {
                    const upload_url = "https://www.orino.me/api/devices/upload-screen-shot"
                    setSnapshotUrl(upload_url);
                    //console.log("snapshot instruction is onvoked");
                } else if (instruction.instruction === "update_setup") {
                    // means update teh setup
                    fetchOnlineSetup();
                    //console.log("update instruction is onvoked");
                } else if (instruction.instruction === "deleted") {
                    // TODO: delete all files and remove api key
                }
            });

            es.addEventListener("error", (e) => {
                //console.error("⚠️ SSE error:", e);
            });

            setEventSource(es);
        }

        return () => {
            if (eventSource) {
                eventSource.removeAllEventListeners()
                eventSource.close();
                setEventSource(null);
                //console.log("closing sse from clean up function")
            }
        };
    }, [online, onlineLoading, authLoading, authenticated, apiKey]);
    return <context.Provider value={{}}>{children}</context.Provider>;
}
