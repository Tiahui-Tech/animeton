import fs from 'fs'
import path from 'path'

export interface Subtitle {
  start: number
  end: number
  text: string
}

export interface SubtitleTrack {
  number: number
  language: string
  name: string
  subtitles: Subtitle[]
}

export const extractSubtitles = async (
  filePath: string
): Promise<SubtitleTrack[]> => {
  const { default: MetadataModule } = await import('matroska-metadata')
  const fileStats = await fs.promises.stat(filePath)
  const fileSize = fileStats.size

  const file = {
    name: path.basename(filePath),
    size: fileSize,
    slice: (start: number, end: number) => {
      return {
        stream: () => fs.createReadStream(filePath, { start, end: end - 1 }),
        arrayBuffer: async () => {
          const stream = fs.createReadStream(filePath, { start, end: end - 1 })
          const chunks = []
          for await (const chunk of stream) {
            chunks.push(chunk)
          }
          return Buffer.concat(chunks)
        }
      }
    },
    stream: () => fs.createReadStream(filePath),
    [Symbol.asyncIterator]: async function* () {
      const stream = this.stream()
      for await (const chunk of stream) {
        yield chunk
      }
    }
  }

  let metadata
  try {
    const Metadata = MetadataModule.default || MetadataModule
    metadata = new Metadata(file)
  } catch (error) {
    console.error('Error creating Metadata instance:', error)
    throw error
  }
  const subtitleTracks: SubtitleTrack[] = []

  try {
    const tracks = await metadata.getTracks()

    tracks.forEach((track) => {
      if (track.type.startsWith('subtitle')) {
        subtitleTracks.push({
          number: track.number,
          language: track.language || 'und',
          name: track.name || `Track ${track.number}`,
          subtitles: []
        })
      }
    })

    await new Promise<void>((resolve) => {
      metadata.on('subtitle', (subtitle, trackNumber) => {
        const track = subtitleTracks.find((t) => t.number === trackNumber)
        if (track) {
          track.subtitles.push({
            start: subtitle.time / 1000000000, // Convert to seconds
            end: (subtitle.time + subtitle.duration) / 1000000000, // Convert to seconds
            text: subtitle.text
          })
        }
      })

      metadata.on('finish', () => {
        resolve()
      })

      metadata.parseFile()
    })

    return subtitleTracks
  } catch (error) {
    console.error('Error extracting subtitles:', error)
    throw error
  }
}
