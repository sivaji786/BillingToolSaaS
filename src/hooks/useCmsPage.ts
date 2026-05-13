import { useState, useEffect } from 'react';
import { publicCmsService } from '../services/api';

export function useCmsPage(slug: string, language: string) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setContent(null);

    publicCmsService
      .getPage(slug, language)
      .then(response => {
        if (!cancelled && response.success && response.data?.content) {
          setContent(response.data.content);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [slug, language]);

  return { content, isLoading };
}
