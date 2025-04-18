// this must provide a single function that takes a url > when invoked it takes a snapshot of the app and uploads it to the actual provided url
import { useState, useEffect, createContext, useContext, useRef } from "react";
import { captureRef } from "react-native-view-shot";
import { View } from "react-native";
import { useAuthContext } from "./AuthProvider";

import * as FileSystem from "expo-file-system"


type contextType = {
    setSnapshotUrl: React.Dispatch<React.SetStateAction<string | null>>;
};

const context = createContext<contextType | null>(null);

export const useSnapshotContext = () => useContext(context);

export default function SnapshotProvider({ children }: { children: any }) {
    const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
    const { apiKey } = useAuthContext();
    //const isUploadingRef = useRef(false);
    const viewRef = useRef<View>(null)

    const upload_url = "https://videobackend.tashirpizza.ru/api/tv/devices/upload-screen-shot-raw"
    //const upload_url = "http://192.168.1.22:8000/devices/upload-screen-shot-raw"

    useEffect(() => {
        //if (!snapshotUrl || isUploadingRef.current) return;
        if (!snapshotUrl) return;

        const takeAndUploadSnapshot = async () => {
            try {
                //isUploadingRef.current = true;

                // captureScreen
                const uri = await captureRef(viewRef, {
                    format: "jpg",
                    quality: 0.8,
                    result: "tmpfile",
                    handleGLSurfaceViewOnAndroid: true,
                });
                
                // Create form data manually
                //const formData = new FormData();
                //formData.append("file", {
                //    uri: uri,
                //    name: `${snapshotUrl}.jpg`,
                //    type: "image/jpeg",
                //} as any);
                
                //upload
                /** 
                await fetch(upload_url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "multipart/form-data",
                        "X-API-Key": apiKey,
                    },
                    body: formData,
                });
                */
                const response = await fetch(uri);
                const blob = await response.blob();
                const arrayBuffer = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as ArrayBuffer);
                    reader.onerror = reject;
                    reader.readAsArrayBuffer(blob);
                });
                const byteArray = new Uint8Array(arrayBuffer);

//               const binary = await FileSystem.readAsStringAsync(uri)
                await fetch(upload_url, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/octet-stream',
                      'filename': snapshotUrl + '.jpg',
                      'X-API-Key': apiKey,
                    },
                    body: byteArray,
                  });

                console.log("Snapshot uploaded successfully!");
            } catch (error) {
                //console.error("Snapshot upload failed:", error);
            } finally {
                //isUploadingRef.current = false;
                //setSnapshotUrl(null);
            }
        };

        takeAndUploadSnapshot();
    }, [snapshotUrl]);

    return (
        <context.Provider value={{ setSnapshotUrl }}>
            <View ref={viewRef} style={{ flex: 1 }} collapsable={false}>
                {children}
            </View>
        </context.Provider>
    );
}
