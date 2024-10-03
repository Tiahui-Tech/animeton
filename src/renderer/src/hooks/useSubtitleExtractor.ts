import { useState, useCallback } from 'react';
import { extractSubtitles } from '@utils/subtitleExtractor';

export const useSubtitleExtractor = () => {
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState(null);

  const extractAndProcessSubtitles = useCallback(async (filePath: string) => {
    setIsExtracting(true);
    setError(null);
    try {
      const tracks = await extractSubtitles(filePath);
      setSubtitleTracks(tracks);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setIsExtracting(false);
    }
  }, []);

  return { subtitleTracks, isExtracting, error, extractSubtitles: extractAndProcessSubtitles };
};