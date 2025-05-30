import { observer } from "mobx-react-lite"
import React, { FC, useEffect, useRef, useState } from "react"
import { AppStackScreenProps } from "../navigators"
import { StyleSheet, View, ImageBackground } from "react-native"
import { useSetupContext } from "app/context/SetupProvider"
import { extractFileName, isPlaylistActive, processPlaylists } from "../utils/global"
import { Video, ViewType } from "react-native-video"

import * as FileSystem from "expo-file-system"

import { Text } from "../components"

import { Dimensions, ActivityIndicator } from "react-native"

const DOCUMENTS_DIR = FileSystem.documentDirectory

interface MediaPlayerScreenProps extends AppStackScreenProps<"MediaPlayer"> {}

export const MediaPlayerScreen: FC<MediaPlayerScreenProps> = observer(function MediaPlayerScreen(
  _props,
) {
  const { setup, setupUpdating } = useSetupContext()
  const [activePlaylist, setActivePlaylist] = useState(null)

  const activePlaylistRef = useRef(null)

  useEffect(() => {
    const checkActivePlaylist = () => {
      if (setup && !setupUpdating) {
        const processedPlaylists = processPlaylists(setup.data)
        const now = new Date()
        const currentActivePlaylist = processedPlaylists.find((playlist) =>
          isPlaylistActive(playlist, now),
        )
        //console.log("runned 1")
        if (currentActivePlaylist) {
          // copy playlist obj
          const playlistTarger = JSON.parse(JSON.stringify(currentActivePlaylist))
          // now shall we make the new playlist format
          const newPlaylistFilesFormat = {
            ...playlistTarger,
            videos: playlistTarger.videos.map((vid) => ({
              url: DOCUMENTS_DIR + extractFileName(vid.url),
              duration: vid.duration,
              type: "video",
            })),
            images: playlistTarger.images.map((img) => ({
              url: DOCUMENTS_DIR + extractFileName(img.url),
              duration: img.duration,
              type: "image",
            })),
          }
          if (
            JSON.stringify(newPlaylistFilesFormat) !== JSON.stringify(activePlaylistRef.current)
          ) {
            //console.log("Updating playlist")
            //console.log("OLD:", activePlaylistRef.current)
            //console.log("NEW:", newPlaylistFilesFormat)
            setActivePlaylist(newPlaylistFilesFormat)
          }
          // setActivePlaylist(newPlaylistFilesFormat)
        } else {
          //console.log("runing here")
          setActivePlaylist(null)
        }
      }
    }

    

    checkActivePlaylist()

    const intervalId = setInterval(checkActivePlaylist, 10000)

    return () => clearInterval(intervalId)
  }, [setup, setupUpdating])

  useEffect(() => {
    activePlaylistRef.current = activePlaylist
  }, [activePlaylist])

  if (!setup || setupUpdating) {
    null
  }

  if (!activePlaylist) {
    return (
      <View style={styles.container}>
        <Text preset="heading" size="lg" style={{ color: "white" }}>
          Waiting for next playlist
        </Text>
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
  const [mediaList, setMediaList] = useState(null)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    let isCancelled = false

    const processVideosAndImages = async () => {
      setIsProcessing(true)

      let videosWithThumbnails = []
      let lastImageObj = playlist.images.length
        ? JSON.parse(JSON.stringify(playlist.images[playlist.images.length - 1]))
        : null

      for (const videoObj of playlist.videos) {
        videosWithThumbnails.push({
          url: videoObj.url,
          type: "video",
          uri: lastImageObj,
        })
      }

      const imageCopies = playlist.images.map((img) => JSON.parse(JSON.stringify(img)))
      const newMediaList = [...imageCopies, ...videosWithThumbnails]

      if (!isCancelled) {
        setMediaList(newMediaList)
        setCurrentMediaIndex(0) // reset index on new playlist
        setIsProcessing(false)
      }
    }

    processVideosAndImages()

    return () => {
      isCancelled = true // clean up to prevent setting state after unmount
    }
  }, [playlist])

  if (isProcessing || !mediaList) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Media
        mediaList={mediaList}
        currentMediaIndex={currentMediaIndex}
        handleMediaEnd={() => {
          const nextIndex = (currentMediaIndex + 1) % mediaList.length
          setCurrentMediaIndex(nextIndex)
        }}
      />
    </View>
  )
}
function Media({ mediaList, currentMediaIndex, handleMediaEnd }) {
  return (
    <View style={styles.container}>
      {mediaList[currentMediaIndex]?.type === "video" ? (
        <VideoFullScreen
          key={mediaList[currentMediaIndex]}
          vidObj={mediaList[currentMediaIndex]}
          onEnd={handleMediaEnd}
          mediaTotal={mediaList.length}
        />
      ) : (
        <ImageFullScreen
          key={mediaList[currentMediaIndex]}
          imgObj={mediaList[currentMediaIndex]}
          onEnd={handleMediaEnd}
          mediaTotal={mediaList.length}
        />
      )}
    </View>
  )
}

function ImageFullScreen({ imgObj, onEnd, mediaTotal }) {
  let timer = null
  useEffect(() => {
    if (mediaTotal > 1) {
      timer = setTimeout(() => {
        onEnd()
      }, imgObj.duration * 1000)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [imgObj])

  return <ImageBackground source={{ uri: imgObj.url }} style={styles.media} resizeMode="cover" />
}

function VideoFullScreen({ vidObj, onEnd, mediaTotal }) {
  const videoRef = useRef()
  const loadStartTimeRef = useRef(null)

  const [posterDisplayed, setPosterDisplayed] = useState(true)

  const handleVideoEnd = () => {
    if (mediaTotal > 1) {
      onEnd()
    }
  }

  useEffect(() => {
    let timer = null

    if (vidObj.duration > 0) {
      timer = setTimeout(() => {
        onEnd()
      }, vidObj.duration * 1000)
    }

    return () => {
      videoRef.current = null
      if (timer) clearTimeout(timer)
    }
  }, [])

  const handleLoadStart = () => {
    loadStartTimeRef.current = Date.now()
    //console.log("Video loading started...")
  }

  const handleReadyForDisplay = () => {
    if (loadStartTimeRef.current) {
      const shutterTime = Date.now() - loadStartTimeRef.current
      //console.log(`Shutter time: ${shutterTime}ms`)
      //console.log(vidObj.uri)
      setPosterDisplayed(false)
    }
  }

  return (
    <>
      <Video
        ref={videoRef}
        repeat={mediaTotal === 1}
        onLoadStart={handleLoadStart}
        onReadyForDisplay={() => {
          handleReadyForDisplay()
        }}
        onLoad={() => {
          //videoRef.current?.seek(0)
          //videoRef.current?.resume()
        }}
        source={{
          uri: vidObj.url,
          bufferConfig: {
            // Extreme low buffer values for local files
            //minBufferMs: 10,
            //maxBufferMs: 1000,
            //bufferForPlaybackMs: 1,
            //bufferForPlaybackAfterRebufferMs: 2,
            //minBufferMemoryReservePercent: 2
            //cacheSizeMB: 10
            bufferForPlaybackMs: 250, // Minimum for smooth playback
            bufferForPlaybackAfterRebufferMs: 100,
            minBufferMs: 1500,
            maxBufferMs: 2500,
          },
        }}
        style={styles.media}
        onEnd={handleVideoEnd}
        //resizeMode="cover"
        controls={false}
        muted={true}
        fullscreen={false}
        playInBackground={false}
        playWhenInactive={false}
        allowsExternalPlayback={false}
        paused={false}
        hideShutterView={true}
        shutterColor="transparent"
        viewType={ViewType.TEXTURE}
        reportBandwidth={false}
        /**
        usePoster={true} // <- REQUIRED to show poster!
        poster={{
          source: {uri: vidObj.uri},
          resizeMode: "cover",
        }}
           */
      />
      {posterDisplayed && vidObj.uri && (
        <ImageBackground
          resizeMode="cover"
          style={{
            flex: 1,
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 9999,
          }}
          source={{ uri: vidObj.uri.url }}
        />
      )}
    </>
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
    //backgroundColor: "red",
    position: "relative",
  },
  overlay: {
    flex: 1,
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "rgb(0, 0, 0)",
    zIndex: 9999,
  },
  text: {
    fontSize: 48,
    color: "white",
  },
  media: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
})
