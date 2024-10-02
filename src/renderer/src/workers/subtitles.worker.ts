import { readSubtitles } from '@renderer/utils/subtitles.utils'

let subtitles
process.on('read-subtitles', async (filePath) => {
  try {
    subtitles = await readSubtitles(filePath)
    ;(process as any).send({
      success: true,
      subtitles
    })
  } catch (error) {
    ;(process as any).send({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    })
  }
  process.exit()
})
