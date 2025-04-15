import * as FileSystem from "expo-file-system"
import * as IntentLauncher from "expo-intent-launcher"

export const extractFileUrls = (setup: any): string[] => {
  if (!setup || !setup.data) return []

  let urls: string[] = []

  setup.data.forEach((playlist: any) => {
    playlist.images?.forEach((img: any) => urls.push(img.url))
    playlist.videos?.forEach((vid: any) => urls.push(vid.url || vid))
  })

  return urls
}

export const diffUrls = (onlineUrls: string[], localUrls: string[]) => {
  // we need to compare our urls via file name
  const localFileNames = localUrls.map((url) => extractFileName(url))
  const onlineFileNames = onlineUrls.map((url) => extractFileName(url))
  // this must be a set above

  // then we filter both
  const toDownloadArray = onlineUrls.filter((url) => !localFileNames.includes(extractFileName(url)))
  const toDeleteArray = localUrls.filter((url) => !onlineFileNames.includes(extractFileName(url)))

  const toDownload = [...new Set(toDownloadArray)]
  const toDelete = [...new Set(toDeleteArray)]

  return { toDownload, toDelete }
}

export const downloadFiles = async (urls: string[]) => {
  await Promise.all(
    urls.map(async (url) => {
      const fileName = extractFileName(url)
      const fileUri = FileSystem.documentDirectory + fileName

      const fileInfo = await FileSystem.getInfoAsync(fileUri)
      if (fileInfo.exists) {
        console.log("File already exists and we are skipping: " + fileUri)
        return
      }

      try {
        const result = await FileSystem.downloadAsync(url, fileUri)
        if (result.status !== 200) {
          throw new Error("Download failed")
        }
        console.log("Downloaded file: " + fileUri)
      } catch (error) {
        console.error("Download failed for", url, error)
        await FileSystem.deleteAsync(fileUri, { idempotent: true })
        console.log("Deleted incomplete file: " + fileUri)
      }
    }),
  )
}

export const deleteFiles = async (urls: string[], urlsFlag: boolean = true) => {
  await Promise.all(
    urls.map(async (url) => {
      const fileName = urlsFlag ? extractFileName(url) : url
      const fileUri = FileSystem.documentDirectory + fileName
      const fileInfo = await FileSystem.getInfoAsync(fileUri)
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(fileUri)
        console.log("Deleted file: " + fileUri)
      }
    }),
  )
}

export const extractFileName = (url: string): string => {
  const baseUrl = url.split("?")[0]

  return baseUrl.split("/").pop() || `file_${Date.now()}`
}

const utcToLocalTimeZone = (time: string) => {
  const [hh, mm] = time.split(":").map(Number)
  const tzOffsetMinutes = new Date().getTimezoneOffset()
  let totalMinutes = hh * 60 + mm
  totalMinutes -= tzOffsetMinutes

  const localHours = Math.floor(((totalMinutes + 1440) % 1440) / 60)
  const localMinutes = (totalMinutes + 1440) % 60

  return new Date(1970, 0, 1, localHours, localMinutes)
}

//    startTime: utcToLocalTimeZone(playlist.start_time),
//    endTime: utcToLocalTimeZone(playlist.end_time),

export const processPlaylists = (playlists) => {
  const processed = playlists.map((playlist) => ({
    ...playlist,
    startTime: utcToLocalTimeZone(playlist.start_time),
    endTime: utcToLocalTimeZone(playlist.end_time),
    days: {
      monday: playlist.monday,
      tuesday: playlist.tuesday,
      wednesday: playlist.wednesday,
      thursday: playlist.thursday,
      friday: playlist.friday,
      saturday: playlist.saturday,
      sunday: playlist.sunday,
    },
  }))
  //console.log("Processed Playlists:", processed)
  return processed
}

export const isPlaylistActive = (playlist: any, now: any) => {
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
  const currentDay = dayNames[now.getDay()]

  if (!playlist.days[currentDay]) {
    return false
  }

  const startTime = playlist.startTime
  const endTime = playlist.endTime

  // Create time only dates for comparison
  const nowTime = new Date(1970, 0, 1, now.getHours(), now.getMinutes())
  const startTimeTime = new Date(1970, 0, 1, startTime.getHours(), startTime.getMinutes())
  const endTimeTime = new Date(1970, 0, 1, endTime.getHours(), endTime.getMinutes())

  if (endTimeTime < startTimeTime) {
    // playlist time range cross midnight
    return nowTime >= startTimeTime || nowTime <= endTimeTime
  }

  return nowTime >= startTimeTime && nowTime < endTimeTime
}

const replaceUrls = (obj: any): any => {
  obj.data.forEach((item: any) => {
    if (item.images) {
      item.images.forEach((image: any) => {
        image.url = extractFileName(image.url)
      })
    }
    if (item.videos) {
      item.videos.forEach((video: any) => {
        video.url = extractFileName(video.url)
      })
    }
  })
}

export const isEqual = (a: any, b: any) => {
  if (!a && !b) return true
  if (!a || !b) return false

  const copyA = JSON.parse(JSON.stringify(a))
  const copyB = JSON.parse(JSON.stringify(b))

  replaceUrls(copyA)
  replaceUrls(copyB)
  return JSON.stringify(copyA) === JSON.stringify(copyB)
}

export const burnItToGround = async () => {
  // delete api key
  // if setup != null, we delete all medias, then delete setup.json
  // set authanticated to false so user get redirected to Activation screen
}

export const openSettings = () => {
  IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS)
}
