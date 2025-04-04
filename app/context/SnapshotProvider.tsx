// this must provide a single function that takes a url > when invoked it takes a snapshot of the app and uploads it to the actual provided url
import { useState, useEffect, createContext, useContext, useRef } from "react";
import { captureScreen } from "react-native-view-shot";
import { View } from "react-native";
import { useAuthContext } from "./AuthProvider";

type contextType = {
    setSnapshotUrl: React.Dispatch<React.SetStateAction<string | null>>;
};

const context = createContext<contextType | null>(null);

export const useSnapshotContext = () => useContext(context);

export default function SnapshotProvider({ children }: { children: any }) {
    const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
    const { apiKey } = useAuthContext();
    const isUploadingRef = useRef(false);

    useEffect(() => {
        if (!snapshotUrl || isUploadingRef.current) return;

        const takeAndUploadSnapshot = async () => {
            try {
                isUploadingRef.current = true;

                const uri = await captureScreen({
                    format: "jpg",
                    quality: 0.8,
                    handleGLSurfaceViewOnAndroid: true,
                });

                // Create form data manually
                const formData = new FormData();
                formData.append("file", {
                    uri: uri,
                    name: "screenshot.jpg",
                    type: "image/jpeg",
                } as any);

                await fetch(snapshotUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "multipart/form-data",
                        "X-API-Key": apiKey,
                    },
                    body: formData,
                });

                console.log("Snapshot uploaded successfully!");
            } catch (error) {
                console.error("Snapshot upload failed:", error);
            } finally {
                isUploadingRef.current = false;
                setSnapshotUrl(null);
            }
        };

        takeAndUploadSnapshot();
    }, [snapshotUrl]);

    return (
        <context.Provider value={{ setSnapshotUrl }}>
            <View style={{ flex: 1 }} collapsable={false}>
                {children}
            </View>
        </context.Provider>
    );
}
