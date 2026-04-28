'use client';

import { useEffect, useState } from 'react';

export default function MainContainer({ children }: { children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Initial check
    const saved = localStorage.getItem('px_sidebar_collapsed');
    setIsExpanded(saved === 'true');

    const handleToggle = () => {
      const current = localStorage.getItem('px_sidebar_collapsed');
      setIsExpanded(current === 'true');
    };

    window.addEventListener('sidebar-toggle', handleToggle);
    return () => window.removeEventListener('sidebar-toggle', handleToggle);
  }, []);

  return (
    <div className={`app-main ${isExpanded ? 'expanded' : ''}`}>
      {children}
    </div>
  );
}
