import { useEffect } from 'react';

interface SeoProps {
  title?: string;
  description?: string;
  noindex?: boolean;
}

export const useSeo = ({ title, description, noindex }: SeoProps) => {
  useEffect(() => {
    if (title) {
      document.title = title;
    }
    if (description) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute('content', description);
      }
    }
  }, [title, description, noindex]);
};
