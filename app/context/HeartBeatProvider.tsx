import { useEffect, useState, createContext, useContext, Children } from "react"
import { useAuthContext } from "./AuthProvider"
import { useOnlineStatus } from "./OnlineStatusProvider"

const context = createContext(null)

const HeartBeatProvider = ({ children }: { children: any }) => {
  // here all what we want is when online
  const { online, onlineLoading } = useOnlineStatus()
  const { authenticated, authLoading, apiKey } = useAuthContext()

  useEffect(() => {
    if (!online || onlineLoading || !authenticated || authLoading || !apiKey) return

    // TODO: clear interval when we are not online

    const interval = setInterval(async () => {
        try {
          await fetch("https://www.orino.me/api/devices/me/heartbeat", {
            headers: {
              "X-API-Key": apiKey,
              "Content-Type": "application/json",
            },
          })
        } catch (e) {

        }
      }, 30000)
  
      return () => clearInterval(interval)
  }, [online, onlineLoading, authenticated, authLoading, apiKey])
  return <context.Provider value={null}>{children}</context.Provider>
}

export default HeartBeatProvider
