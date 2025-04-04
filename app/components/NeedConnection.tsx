import { StyleSheet, View } from "react-native"
import React from "react"
import { Text } from "./Text"
import { Button } from "./Button"
import { openSettings } from "app/utils/global"

const NeedConnection = ({ text }: { text: string }) => {
  return (
    <View style={styles.container}>
      <Text preset="heading" size="lg" style={{ color: "white" }}>
        {text}
      </Text>
      <Button
        text="Open Settings"
        preset="filled"
        onPress={openSettings}
        style={{
          backgroundColor: "white",
          borderRadius: 8,
          paddingVertical: 12,
          paddingHorizontal: 20,
          marginTop: 20,
        }}
        textStyle={{
          color: "#000",
          fontSize: 16,
          fontWeight: "bold",
        }}
      />
    </View>
  )
}

export default NeedConnection

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: "3%",
    justifyContent: "center",
    alignItems: "center",
  },
})
