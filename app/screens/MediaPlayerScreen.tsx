import { observer } from "mobx-react-lite"
import React, { FC, useEffect, useState } from "react"
import { AppStackScreenProps } from "../navigators"
import { StyleSheet, View, ImageBackground } from "react-native"
import { useSetupContext } from "app/context/SetupProvider"
import { extractFileName, isPlaylistActive, processPlaylists } from "../utils/global"
import { Video } from "react-native-video"

import * as FileSystem from "expo-file-system"

import { Text } from "../components"

const DOCUMENTS_DIR = FileSystem.documentDirectory

interface MediaPlayerScreenProps extends AppStackScreenProps<"MediaPlayer"> {}

export const MediaPlayerScreen: FC<MediaPlayerScreenProps> = observer(function MediaPlayerScreen(
  _props,
) {
  const { setup, setupUpdating } = useSetupContext()
  const [activePlaylist, setActivePlaylist] = useState(null)

  useEffect(() => {
    const checkActivePlaylist = () => {
      if (setup && !setupUpdating) {
        const processedPlaylists = processPlaylists(setup.data)
        const now = new Date()
        const currentActivePlaylist = processedPlaylists.find((playlist) =>
          isPlaylistActive(playlist, now),
        )

        if (currentActivePlaylist) {
          const newPlaylistFilesFormat = {
            ...currentActivePlaylist,
            videos: currentActivePlaylist.videos.map((vid) => ({
              url: DOCUMENTS_DIR + extractFileName(vid.url),
              duration: vid.duration,
              type: "video",
            })),
            images: currentActivePlaylist.images.map((img) => ({
              url: DOCUMENTS_DIR + extractFileName(img.url),
              duration: img.duration,
              type: "image",
            })),
          }
          if (JSON.stringify(newPlaylistFilesFormat) !== JSON.stringify(activePlaylist)) {
            console.log(newPlaylistFilesFormat)
            setActivePlaylist(newPlaylistFilesFormat)
          }
          // setActivePlaylist(newPlaylistFilesFormat)
        } else {
          setActivePlaylist(null)
        }
      }
    }

    checkActivePlaylist()

    const intervalId = setInterval(checkActivePlaylist, 10000)

    return () => clearInterval(intervalId)
  }, [setup, setupUpdating])

  if (!setup || setupUpdating) {
    null
  }

  if (!activePlaylist) {
    return (
      <View style={styles.container}>
        <Text preset="heading" size="lg" style={{ color: "white" }}>Waiting for next playlist</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <PlaylistDisplay playlist={activePlaylist} />
    </View>
  )
})

const PlaylistDisplay = ({ playlist }) => {
  const mediaList = [...playlist.images, ...playlist.videos]
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)

  const handleMediaEnd = () => {
    console.log("next is switched")
    const nextIndex = (currentMediaIndex + 1) % mediaList.length
    setCurrentMediaIndex(nextIndex)
  }

  return (
    <Media
      mediaList={mediaList}
      currentMediaIndex={currentMediaIndex}
      handleMediaEnd={handleMediaEnd}
    />
  )
}

function Media({ mediaList, currentMediaIndex, handleMediaEnd }) {
  return (
    <View style={styles.container}>
      {mediaList[currentMediaIndex].type === "video" ? (
        <VideoFullScreen
          key={Date.now()}
          vidObj={mediaList[currentMediaIndex]}
          onEnd={handleMediaEnd}
        />
      ) : (
        <ImageFullScreen
          key={Date.now()}
          imgObj={mediaList[currentMediaIndex]}
          onEnd={handleMediaEnd}
        />
      )}
    </View>
  )
}

function ImageFullScreen({ imgObj, onEnd }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onEnd()
    }, imgObj.duration * 1000)

    return () => clearTimeout(timer)
  }, [imgObj.duration, onEnd])

  return <ImageBackground source={{ uri: imgObj.url }} style={styles.media} resizeMode="cover" />
}

function VideoFullScreen({ vidObj, onEnd }) {
  const handleVideoEnd = () => {
    onEnd()
  }

  useEffect(() => {
    let timer = null

    if (vidObj.duration > 0) {
      timer = setTimeout(() => {
        onEnd()
      }, vidObj.duration * 1000)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [])

  return (
    <Video
      source={{ uri: vidObj.url }}
      style={styles.media}
      onEnd={handleVideoEnd}
      resizeMode="cover"
      controls={false}
      fullscreen={false}
      playInBackground={false}
      playWhenInactive={false}
      allowsExternalPlayback={false}
      paused={false}
    />
  )
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  text: {
    fontSize: 48,
    color: "white",
  },
  media: {
    width: "100%",
    height: "100%",
  },
})
