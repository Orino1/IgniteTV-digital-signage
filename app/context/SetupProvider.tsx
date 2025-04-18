import { useState, useContext, useEffect, createContext, useRef } from "react"
import { useAuthContext } from "./AuthProvider"
import { useOnlineStatus } from "./OnlineStatusProvider"
import * as FileSystem from "expo-file-system"
import {
  downloadFiles,
  deleteFiles,
  diffUrls,
  extractFileUrls,
  isEqual,
  extractFileName,
} from "../utils/global"

type contextType = {
  setup: any
  setupLoading: boolean
  fetchOnlineSetup: () => Promise<void>
  setupUpdating: boolean
  setupAssetsComplete: boolean
}

const context = createContext<contextType | null>(null)

export const useSetupContext = () => useContext(context)

export default function SetupProvider({ children }: { children: any }) {
  const [setup, setSetup] = useState<any>(null)
  const [setupLoading, setSetupLoading] = useState(true)
  const [setupUpdating, setSetupUpdating] = useState(false)
  const [setupAssetsComplete, setSetupAssetsComplete] = useState(false)

  const isFetchingRef = useRef(false)
  const pendingCallsRef = useRef(0)

  const { authenticated, apiKey } = useAuthContext()
  const { online, onlineLoading } = useOnlineStatus()

  const DOCUMENTS_DIR = FileSystem.documentDirectory + "setup.json"

  // now we would need a simple thing but its a bit strange here
  // we would need to when ever we fetch setup local file to check if ecah files name exsist on the device
  // if someone is not that means that maybe when downloading stuff connection was lost and we need to re download stuff that was not downloaded
  // so now we can do a simple trick
  // wich changes the actual downloadfiles to first check if file exists then download it only if it doesnot exsist on the device
  // and we need a seperate state to mark the setup assets as not fully downloaded so in our screens and navigators we display correct msg and so on if you know what i mean
  const checkAllFilesExist = async (setup) => {
    if (!setup) return true

    const fileUrls = extractFileUrls(setup)
    const missingFiles = await Promise.all(
      fileUrls.map(async (url) => {
        const fileName = extractFileName(url)
        const fileUri = FileSystem.documentDirectory + fileName
        const fileInfo = await FileSystem.getInfoAsync(fileUri)
        return fileInfo.exists ? null : fileName
      }),
    )

    const missingFilesFiltered = missingFiles.filter((file) => file !== null)
    return missingFilesFiltered.length === 0
  }

  // fetch setup from lcoal file
  const fetchLocalSetup = async () => {
    console.log("fetch local invoked")
    try {
      const fileInfo = await FileSystem.getInfoAsync(DOCUMENTS_DIR)
      if (!fileInfo.exists) {
        setSetup(null)
        setSetupAssetsComplete(true)
        setSetupLoading(false)
        return
      }

      const file = await FileSystem.readAsStringAsync(DOCUMENTS_DIR)
      const data = JSON.parse(file)

      const allFilesExist = await checkAllFilesExist(data)
      setSetupAssetsComplete(allFilesExist)
      setSetup(data)
      setSetupLoading(false)
      console.log("setup fetched from lcoal file" + data)
    } catch (err) {
      setSetup(null)
      setSetupAssetsComplete(true)
      setSetupLoading(false)
      //console.log("Error while fetching local setup.json", err)
    }
  }

  // fetch setup from api
  const fetchOnlineSetup = async () => {
    console.log("Fetch online started")
    if (isFetchingRef.current) {
      pendingCallsRef.current += 1
      return
    }
    console.log("Fetch online passed lock: " + pendingCallsRef.current)

    isFetchingRef.current = true

    try {
      if (!authenticated || !apiKey) return

      const res = await fetch("https://videobackend.tashirpizza.ru/api/tv/devices/me", {
        headers: { "X-API-Key": apiKey },
      })
      const deviceInfo = await res.json()
      // extract setup key from response
      const onlineSetup = deviceInfo.setup

      // fetch setup from local storage
      const localFile = await FileSystem.readAsStringAsync(DOCUMENTS_DIR).catch(() => null)
      // parse setup.json if none set as null
      const localSetup = localFile ? JSON.parse(localFile) : null

      // running online setup against local setup
      if (!isEqual(onlineSetup, localSetup)) {
        //console.log("Online setup != Local setup")
        // setup updated or new one assigned
        setSetupUpdating(true)

        if (!onlineSetup) {
          // online setup is null, if lcoal setup != null, we remove all local files
          if (localSetup) {
            // extract all urls from setup
            const fileUrls = extractFileUrls(localSetup)
            // deleting all files (deleteFiles will extract the uris correctlly)
            await deleteFiles(fileUrls)
          }
          // we remove actual setup.json without file uri extraction proccess
          await deleteFiles(["setup.json"], false)
          return
        }

        const onlineUrls = extractFileUrls(onlineSetup)
        // local setup is not garanted to be != null
        if (localSetup) {
          const localUrls = extractFileUrls(localSetup)
          const { toDownload, toDelete } = diffUrls(onlineUrls, localUrls)
          //console.log({ toDownload, toDelete })
          // deleting unused files
          await deleteFiles(toDelete)
          // downloading new files
          await downloadFiles(toDownload)
        } else {
          // download all files without comparison betwen online setup and local setup
          const toDownload = [...new Set(onlineUrls)]
          await downloadFiles(toDownload)
        }

        // saving online setup as local
        await FileSystem.writeAsStringAsync(DOCUMENTS_DIR, JSON.stringify(onlineSetup))
        //console.log("setup update completed")
      } else {
        const allFilesExist = await checkAllFilesExist(onlineSetup)

        if (!allFilesExist) {
          setSetupUpdating(true)
          const onlineUrls = extractFileUrls(onlineSetup)
          await downloadFiles(onlineUrls)
        }
        // if so we need to ftech those new medias and at end set updating into false
        //console.log("No changes to setup")
      }
    } catch (err) {
      //console.error("Error while fetching online setup:", err)
    } finally {
      // re-fetch local setup
      await fetchLocalSetup()
      //console.log("finally completed and fetched new lcal ")
      isFetchingRef.current = false

      if (pendingCallsRef.current > 0) {
        pendingCallsRef.current -= 1
        fetchOnlineSetup()
      } else {
        setSetupUpdating(false)
      }
    }
  }

  // fetching local setup on app start ( will e null if not authanticated and no setup locally anyway )
  useEffect(() => {
    fetchLocalSetup()
  }, [])

  // fetch data form online as soon as we activate device
  // we need it to do it only when switching from online to offline and vers versa
  useEffect(() => {
    if (authenticated && apiKey && online && !onlineLoading) {
      fetchOnlineSetup()
    }
  }, [authenticated, apiKey, online, onlineLoading])

  // we gonna expose: setup object it self, a function to trigger refethcing setup from online,
  return (
    <context.Provider
      value={{ setup, setupLoading, fetchOnlineSetup, setupUpdating, setupAssetsComplete }}
    >
      {children}
    </context.Provider>
  )
}
