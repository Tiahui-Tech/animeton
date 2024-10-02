import { fork } from 'child_process'
import {
  convertAssToVtt,
  relabelAndFilterSubtitles,
  filterRenameAndSortSubtitles
} from '@utils/subtitles.utils'

export const checkForSubtitles = async (filePath: string) => {
  try {
    const subtitles = await parseSubtitles(filePath)
    await convertAndAddSubtitles(subtitles)
  } catch (err) {
    console.error('Error checking for subtitles: ', err)
  }
}

const parseSubtitles = (filePath: string) => {
  return new Promise((resolve, reject) => {
    const child = fork('./src/renderer/src/workers/subtitles.worker.ts')

    child.on('read-subtitles', (result: SubtitleResult) => {
      if (result.success) {
        resolve(result.subtitles)
      } else {
        reject(new Error('Subtitle error: ' + JSON.stringify(result)))
      }
    })

    child.on('error', reject)

    child.send(filePath)
  })
}

const convertAndAddSubtitles = async (subtitles: any) => {
  const convertedTracks = []

  for (const [trackNumber, subtitle] of Object.entries(subtitles) as [
    string,
    Subtitle
  ][]) {
    if (subtitle.track.type === 'ass') {
      try {
        const vttContent = await convertAssToVtt(subtitle)
        const subtitleData: SubtitleData = {
          buffer:
            'data:text/vtt;base64,' +
            Buffer.from(vttContent as string).toString('base64'),
          language: subtitle.track.language || 'Unknown',
          label: subtitle.track.name || `Track ${trackNumber}`,
          filePath: `memory:${trackNumber}`
        }
        convertedTracks.push(subtitleData)
      } catch (error) {
        console.error('Error converting subtitle:', error)
      }
    }
  }

  const uniqueSubtitles = relabelAndFilterSubtitles(convertedTracks)
  const filteredAndSortedTracks = filterRenameAndSortSubtitles(uniqueSubtitles)

  return filteredAndSortedTracks
}

interface Subtitle {
  track: {
    type: string
    language: string
    name: string
  }
}

interface SubtitleData {
  buffer: string
  language: string
  label?: string
  filePath?: string
}

interface SubtitleResult {
  success: boolean
  subtitles?: string[]
}
