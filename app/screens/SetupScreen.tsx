import { observer } from "mobx-react-lite"
import React, { FC } from "react"
import { StyleSheet, ActivityIndicator, View } from "react-native"
import { AppStackScreenProps } from "../navigators"

import { useSetupContext } from "app/context/SetupProvider"
import { Text } from "../components"
import NeedConnection from "app/components/NeedConnection"

interface SetupScreenProps extends AppStackScreenProps<"Setup"> {}

export const SetupScreen: FC<SetupScreenProps> = observer(function SetupScreen(_props) {
  const { setup, setupLoading, setupUpdating, setupAssetsComplete } = useSetupContext()

  if (setupLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (setupUpdating) {
    return (
      <View style={styles.container}>
        <Text preset="heading" size="lg" style={{ color: "white" }}>
          Updating setup, please hold...
        </Text>
      </View>
    )
  }

  if (!setupAssetsComplete) {
    return <NeedConnection text="Some assets are missing. Please connect to the internet." />
  }

  return (
    <View style={styles.container}>
      <Text preset="heading" size="lg" style={{ color: "white" }}>
        Waiting for setup to be assigned
      </Text>
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
})
