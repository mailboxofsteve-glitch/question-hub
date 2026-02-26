import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const RouteAnnouncer = () => {
  const location = useLocation();
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    // Small delay so the new page title is set before we announce
    const timer = setTimeout(() => {
      setAnnouncement(document.title || `Navigated to ${location.pathname}`);
    }, 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

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
