import { observer } from "mobx-react-lite"
import React, { FC, useState, useEffect } from "react"
import { StyleSheet, ActivityIndicator, View, useWindowDimensions } from "react-native"
import { Text } from "../components"
import { AppStackScreenProps } from "../navigators"

import QRCode from "react-native-qrcode-svg"
import EventSource from "react-native-sse"
import * as SecureStore from "expo-secure-store"

import { useAuthContext } from "../context/AuthProvider"
import { useOnlineStatus } from "app/context/OnlineStatusProvider"

import NeedConnection from "app/components/NeedConnection"

interface ActivationScreenProps extends AppStackScreenProps<"Activation"> {}

export const ActivationScreen: FC<ActivationScreenProps> = observer(function ActivationScreen(
  _props,
) {
  // here we gonna do somthing
  const [code, setCode] = useState<null | number>(null)
  const [eventSource, setEventSource] = useState<EventSource | null>(null)
  const { width } = useWindowDimensions()

  const { setAuthanticated, setApiKey } = useAuthContext()
  const { online, onlineLoading } = useOnlineStatus()

  // here we need a single use effect to handle retrival of the code and at same time connecting to teh actual
  useEffect(() => {
    const handleCode = async () => {
      const res = await fetch("https://www.orino.me/api/codes")
      const data = await res.json()
      const code = data.code
      setCode(code)
    }

    handleCode()
  }, [])

  useEffect(() => {
    if (!code) {
      return
    }

    const es = new EventSource(`https://www.orino.me/api/codes/${code}/status`)

    es.addEventListener("open", (event) => {
      //console.log("Open SSE connection from index.")
    })

    es.addEventListener("message", async (event) => {
      const data = JSON.parse(event.data)
      await SecureStore.setItemAsync("device_api_key", data.api_key)
      await SecureStore.setItemAsync("device_name", data.name)

      es.removeAllEventListeners()
      es.close()
      setEventSource(null)
      setApiKey(data.api_key)
      setAuthanticated(true)
      //console.log("Device activated")
    })

    setEventSource(es)

    return () => {
      if (eventSource) {
        es.removeAllEventListeners()
        es.close()
      }
    }
  }, [code])

  if (!code || onlineLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!online) {
    return <NeedConnection text="Please connect to Wi-Fi to activate your device." />
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text preset="heading" size="xl" style={styles.title}>
          There are 2 ways to activate the device
        </Text>
      </View>
      <View style={styles.body}>
        {/* Left Section - QR Code */}
        <View style={styles.left}>
          <Text preset="heading" size="xl" style={styles.title}>
            Scan QR Code
          </Text>
          <Text size="md" style={styles.subtitle}>
            Use the admin portal or your phone camera to scan QR code and activate the device.
          </Text>
          <View style={[styles.qrWrapper, { width: width * 0.3, height: width * 0.3 }]}>
            <QRCode
              value={`https://www.orino.me/dashboard/setup-new-device?pin=${code}`}
              size={width * 0.25}
              backgroundColor="white"
              quietZone={10}
            />
          </View>
        </View>

        <View style={styles.divider} />

        {/* Right Section - PIN Code */}
        <View style={styles.right}>
          <Text preset="heading" size="xl" style={styles.title}>
            Enter PIN Code
          </Text>
          <Text size="md" style={styles.subtitle}>
            Or manually enter the code below in the admin portal.
          </Text>
          <Text preset="heading" size="xxl" style={styles.pinCode}>
            {String(code).replace(/(\d{3})(?=\d)/g, "$1 ")}
          </Text>
        </View>
      </View>
    </View>
  )
})
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: "3%",
  },
  header: {
    display: "flex",
    marginBottom: "3%",
  },
  body: {
    flex: 1,
    flexDirection: "row",
  },
  left: {
    flex: 1,
    paddingRight: "3%",
  },
  right: {
    flex: 1,
    paddingLeft: "3%",
  },
  divider: {
    width: 1,
    backgroundColor: "#ffffff70",
  },
  title: {
    color: "white",
    marginBottom: 10,
    textAlign: "left",
  },
  subtitle: {
    color: "#ccc",
    marginBottom: 20,
    textAlign: "left",
  },
  qrWrapper: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 10,
  },
  pinCode: {
    color: "white",
    fontSize: 48,
    fontWeight: "bold",
    letterSpacing: 2,
    paddingTop: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
})
