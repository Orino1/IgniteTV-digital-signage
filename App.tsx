import "@expo/metro-runtime"
import React, { useEffect } from "react"
import * as SplashScreen from "expo-splash-screen"
import App from "./app/app"
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake"

SplashScreen.preventAutoHideAsync()

function IgniteApp() {
  useEffect(() => {
    activateKeepAwakeAsync()

    return () => {
      deactivateKeepAwake()
    }
  }, [])

  return <App hideSplashScreen={SplashScreen.hideAsync} />
}

export default IgniteApp
