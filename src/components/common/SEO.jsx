import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SEO = ({ title, description, keywords, image, url }) => {
  const location = useLocation();
  const baseUrl = 'https://edupro.uz';
  const fullUrl = url || `${baseUrl}${location.pathname}`;
  const defaultImage = `${baseUrl}/default-course.jpg`;

  useEffect(() => {
    // Update document title
    if (title) {
      document.title = title;
    }

    // Update or create meta tags
    const updateMetaTag = (name, content, isProperty = false) => {
      if (!content) return;
      
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      
      meta.setAttribute('content', content);
    };

    // Update meta tags
    if (description) {
      updateMetaTag('description', description);
      updateMetaTag('og:description', description, true);
      updateMetaTag('twitter:description', description, true);
    }

    if (title) {
      updateMetaTag('og:title', title, true);
      updateMetaTag('twitter:title', title, true);
    }

    if (keywords) {
      updateMetaTag('keywords', keywords);
    }

    // Update Open Graph and Twitter Card
    const ogImage = image || defaultImage;
    updateMetaTag('og:image', ogImage, true);
    updateMetaTag('twitter:image', ogImage, true);
    updateMetaTag('og:url', fullUrl, true);
    updateMetaTag('twitter:url', fullUrl, true);

    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', fullUrl);

  }, [title, description, keywords, image, url, fullUrl, defaultImage]);

  return null;
};

export default SEO;

