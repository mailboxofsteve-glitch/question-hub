import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';

const RouteAnnouncer = () => {
  const location = useLocation();
  const [announcement, setAnnouncement] = useState('');
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    // Small delay so the new page title is set before we announce
    const timer = setTimeout(() => {
      setAnnouncement(document.title || `Navigated to ${location.pathname}`);
    }, 100);

    // Track page_view on every route change
    trackEvent('page_view', null, {
      path: location.pathname + location.search,
      referrer: prevPathRef.current,
    });
    prevPathRef.current = location.pathname;

    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  return (
    <div
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
};

export default RouteAnnouncer;
