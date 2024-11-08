import { ipcRenderer } from 'electron';

export const extractSubtitles = (filePath: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const channel = 'extract-subtitles-request'
    const responseChannel = `${channel}-response-${Date.now()}`

    ipcRenderer.once(responseChannel, (_, result) => {
      if (result.error) {
        reject(new Error(result.error))
      } else {
        resolve(result.subtitles)
      }
    })

    // Use the VITE_PUBLIC_PATH environment variable
    const fullPath = `${process.env.VITE_PUBLIC_PATH}${filePath}`
    ipcRenderer.send(channel, { filePath: fullPath, responseChannel })
  })
};