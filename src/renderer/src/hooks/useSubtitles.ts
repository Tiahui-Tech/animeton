import { useState, useEffect, useCallback } from 'react'
import { defaultHeader } from '@renderer/constants/subtitles'

import JASSUB from 'jassub'
import workerUrl from 'jassub/dist/jassub-worker.js?url'
import wasmUrl from 'jassub/dist/jassub-worker.wasm?url'
import legacyWasmUrl from 'jassub/dist/jassub-worker.wasm.js?url'
import modernWasmUrl from 'jassub/dist/jassub-worker-modern.wasm?url'

export const useSubtitles = (videoRef: React.RefObject<HTMLVideoElement>, isVideoReady: boolean) => {
  const [subtitlesRenderer, setSubtitlesRenderer] = useState<JASSUB | null>(null)

  const initializeSubtitlesRenderer = useCallback(() => {
    if (videoRef.current && !subtitlesRenderer && isVideoReady) {
      const renderer = new JASSUB({
        video: videoRef.current,
        subContent: defaultHeader,
        workerUrl,
        wasmUrl,
        legacyWasmUrl,
        modernWasmUrl,
        asyncRender: true,
        onDemandRender: true,
        debug: false,
        prescaleFactor: 1.0,
        libassMemoryLimit: 0
      })

      console.log('JASSUB renderer initialized')
      setSubtitlesRenderer(renderer)
    }
  }, [videoRef, subtitlesRenderer, isVideoReady])

  useEffect(() => {
    if (isVideoReady) {
      initializeSubtitlesRenderer()
    }

    return () => {
      if (subtitlesRenderer) {
        subtitlesRenderer.destroy()
      }
    }
  }, [initializeSubtitlesRenderer, subtitlesRenderer, isVideoReady])

  const loadSubtitles = useCallback(
    (subtitleContent: string) => {
      if (subtitlesRenderer) {
        subtitlesRenderer.setTrack(subtitleContent)
      }
    },
    [subtitlesRenderer]
  )

  const loadSubtitlesFromFile = useCallback(
    async (file: File) => {
      const content = await file.text()
      loadSubtitles(content)
    },
    [loadSubtitles]
  )

  return {
    loadSubtitles,
    loadSubtitlesFromFile
  }
}