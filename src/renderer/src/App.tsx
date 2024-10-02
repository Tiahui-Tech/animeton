import { useState } from 'react'
import { useTorrentStream } from './hooks/useTorrentStream'
import { Progress } from '@nextui-org/react'

function App(): JSX.Element {
  const [torrentId] = useState(
    'https://t.erai-raws.info/Torrent/2024/Summer/Kami no Tou/[Erai-raws] Kami no Tou - Ouji no Kikan - 13 [1080p][Multiple Subtitle].mkv.torrent'
  )

  const {
    torrent,
    progress,
    downloadSpeed,
    uploadSpeed,
    numPeers,
    downloaded,
    total,
    remaining
  } = useTorrentStream(torrentId)

  return (
    <div className="dark flex flex-col h-screen bg-gray-100 p-4">
      <div className="mb-4">
        {progress !== 100 && (
          <Progress
            color="secondary"
            aria-label="Loading..."
            className="w-full"
            value={progress}
          />
        )}
        <video
          id="output"
          className="w-full mt-4 rounded-lg shadow-lg"
          controls
          autoPlay
        ></video>
      </div>
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="mb-2">
          <span
            className={`font-semibold ${torrent?.done ? 'text-green-600' : 'text-blue-600'}`}
          >
            {torrent?.done ? 'Seeding' : 'Downloading'}
          </span>
          <a
            className="text-sm text-gray-600 hover:text-gray-800 ml-2 break-all"
            href={torrentId}
          >
            {torrentId}
          </a>
          <span
            className={`ml-2 ${torrent?.done ? 'text-green-600' : 'text-blue-600'}`}
          >
            {torrent?.done ? ' to ' : ' from '}
          </span>
          <span className="font-mono text-sm">{numPeers} peers</span>
        </div>
        <div className="text-sm text-gray-700">
          <span className="font-mono">{downloaded}</span>
          <span> of </span>
          <span className="font-mono">{total}</span>
          <span className="ml-2 text-gray-500">{remaining}</span>
          <div className="mt-1">
            <span className="mr-2">↓</span>
            <span className="font-mono">{downloadSpeed}/s</span>
            <span className="mx-2">/</span>
            <span className="mr-2">↑</span>
            <span className="font-mono">{uploadSpeed}/s</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
