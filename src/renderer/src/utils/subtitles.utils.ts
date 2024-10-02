import path from 'path'
import fs from 'fs'
import Metadata from 'matroska-metadata'

const readSubtitles = async (filePath: string): Promise<any> => {
  const file = {
    name: path.basename(filePath),
    stream: () => fs.createReadStream(filePath),
    [Symbol.asyncIterator]: async function* () {
      const stream = this.stream()
      for await (const chunk of stream) {
        yield chunk
      }
    }
  }

  const metadata = new Metadata(file)
  const subtitles = {}

  try {
    const tracks = await metadata.getTracks()

    tracks.forEach((track) => {
      subtitles[track.number] = {
        track: track,
        cues: []
      }
    })

    metadata.on('subtitle', (subtitle, trackNumber) => {
      if (subtitles[trackNumber]) {
        subtitles[trackNumber].cues.push(subtitle)
      }
    })

    if (file.name.endsWith('.mkv') || file.name.endsWith('.webm')) {
      const fileStream = file[Symbol.asyncIterator]()

      // Without this, the code doesn't work
      for await (const chunk of metadata.parseStream(fileStream)) {
      }

      console.log('Finished parsing subtitles')
      return subtitles
    } else {
      throw new Error('Unsupported file format: ' + file.name)
    }
  } catch (error) {
    console.error('Error parsing subtitles:', error)
    throw error
  }
}

const convertAssTextToVtt = (text) => {
  text = text.replace(/\{[^}]+\}/g, '')

  text = text.replace(/\\N/g, '\n')

  text = text.replace(/\\h/g, ' ')

  text = text.replace(/\\b([01])/g, (match, p1) =>
    p1 === '1' ? '<b>' : '</b>'
  )

  text = text.replace(/\\i([01])/g, (match, p1) =>
    p1 === '1' ? '<i>' : '</i>'
  )

  text = text.replace(/\\u([01])/g, (match, p1) =>
    p1 === '1' ? '<u>' : '</u>'
  )

  text = text.replace(/\\s([01])/g, (match, p1) =>
    p1 === '1' ? '<span style="text-decoration: line-through;">' : '</span>'
  )

  text = text.replace(/\\fn([^\\]+)/g, '<span style="font-family: $1;">')

  text = text.replace(/\\fs([0-9]+)/g, '<span style="font-size: $1px;">')

  text = text.replace(
    /\\c&H([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})&/g,
    (match, r, g, b) =>
      `<span style="color: rgb(${parseInt(r, 16)},${parseInt(g, 16)},${parseInt(b, 16)});">`
  )

  const openSpans = (text.match(/<span/g) || []).length
  const closeSpans = (text.match(/<\/span>/g) || []).length
  text += '</span>'.repeat(openSpans - closeSpans)

  text = text
    .split('\n')
    .map((line) => line.trim())
    .join('\n')

  text = text.replace(/\n{3,}/g, '\n\n')

  return text
}

const convertAssToVtt = (subtitle: any) => {
  return new Promise((resolve) => {
    const vttContent =
      'WEBVTT\n\n' +
      subtitle.cues
        .map((cue, index) => {
          const startTime = formatVttTime(cue.time)
          const endTime = formatVttTime(cue.time + cue.duration)
          const text = convertAssTextToVtt(cue.text)

          return `${startTime} --> ${endTime}\n${text}\n`
        })
        .join('\n')

    resolve(vttContent)
  })
}

function formatVttTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const ms = milliseconds % 1000

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
}

// Make sure we don't have two subtitle tracks with the same label
// Labels each track by language, eg 'German', 'English', 'English 2', ...
function relabelAndFilterSubtitles(subtitles) {
  const counts = {}
  const uniquePaths = new Set()
  const uniqueSubtitles = []

  subtitles.forEach((track) => {
    // Avoid duplicate subtitles based on filePath
    if (!uniquePaths.has(track.filePath)) {
      uniquePaths.add(track.filePath)
      uniqueSubtitles.push(track)

      const lang = track.language
      counts[lang] = (counts[lang] || 0) + 1
      track.label = counts[lang] > 1 ? `${lang} ${counts[lang]}` : lang
    }
  })

  return uniqueSubtitles
}

function filterRenameAndSortSubtitles(subtitles) {
  const languageMap = {
    Unknown: 'Ingles'
  }

  // Helper function to determine Spanish subtitle type
  const getSpanishLabel = (track) => {
    const label = track.label.toLowerCase()
    if (label === 'spa' || label.includes('latin')) {
      return 'Español Latino'
    } else if (label.includes('spain') || label === 'spa 2') {
      return 'Español España'
    } else {
      return 'Español' // Default case for unspecified Spanish subtitles
    }
  }

  const filteredAndRenamed = subtitles
    .filter((track) => track.language === 'Unknown' || track.language === 'spa')
    .map((track) => ({
      ...track,
      label:
        track.language === 'spa'
          ? getSpanishLabel(track)
          : languageMap[track.language]
    }))

  // Sort order with 'Español' as the last option for Spanish subtitles
  const sortOrder = ['Español Latino', 'Español España', 'Español', 'Ingles']

  return filteredAndRenamed.sort(
    (a, b) => sortOrder.indexOf(a.label) - sortOrder.indexOf(b.label)
  )
}

export {
  readSubtitles,
  convertAssTextToVtt,
  convertAssToVtt,
  formatVttTime,
  relabelAndFilterSubtitles,
  filterRenameAndSortSubtitles
}
