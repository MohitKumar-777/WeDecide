'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import CategoryFilter from './CategoryFilter';
import { useEffect, useState } from 'react';
import { BarChart2, Trophy, User, Users, Bookmark, ChevronLeft, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV = [
  {
    section: 'Markets',
    items: [
      { href: '/',            label: 'Markets',     icon: <BarChart2 size={16} /> },
      { href: '/leaderboard', label: 'Leaderboard', icon: <Trophy size={16} /> },
    ],
  },
  {
    section: 'You',
    items: [
      { href: '/profile',   label: 'My Profile',  icon: <User size={16} /> },
      { href: '/clubs',     label: 'Clubs',       icon: <Users size={16} /> },
      { href: '/bookmarks', label: 'Bookmarks',   icon: <Bookmark size={16} /> },
    ],
  },
];

function BookmarkCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    try {
      const saved: string[] = JSON.parse(localStorage.getItem('px_bookmarks') ?? '[]');
      setCount(saved.length);
    } catch { /* ignore */ }
  }, []);
  if (count === 0) return null;
  return (
    <span style={{
      background: 'rgba(245,217,78,0.15)',
      color: '#f5d94e',
      border: '1px solid rgba(245,217,78,0.25)',
      fontSize: '9px', fontWeight: 800,
      padding: '1px 6px',
      borderRadius: '100px',
      marginLeft: 'auto',
    }}>{count}</span>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('px_sidebar_collapsed');
    if (saved === 'true') setIsCollapsed(true);
  }, []);

  const toggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('px_sidebar_collapsed', String(newState));
    // Emit event for main content to sync
    window.dispatchEvent(new Event('sidebar-toggle'));
  };

  return (
    <nav className={`app-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, position: 'relative' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            background: '#00bfa5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <img 
              src="/logo.jpg" 
              alt="Logo" 
              style={{ width: '125%', height: '125%', objectFit: 'cover' }} 
            />
          </div>
          <div className="sidebar-hide" style={{
            fontSize: '18px',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            color: 'var(--text)',
            whiteSpace: 'nowrap',
          }}>
            We<span style={{ color: 'var(--yes)' }}>Decide</span>
          </div>
        </Link>
      </div>

      {/* Toggle Button */}
      <motion.button 
        onClick={toggle}
        initial={false}
        whileHover={{ 
          scale: 1.1, 
          backgroundColor: 'var(--accent)', 
          color: '#fff',
          boxShadow: '0 0 15px var(--accent-glow)' 
        }}
        whileTap={{ scale: 0.9 }}
        style={{
          position: 'absolute',
          right: '-13px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '26px',
          height: '26px',
          borderRadius: '8px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-dim)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 100,
          boxShadow: 'var(--shadow-md)',
          transition: 'color 0.2s, background-color 0.2s, border-color 0.2s',
        }}
      >
        <motion.div
          animate={{ rotate: isCollapsed ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {isCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </motion.div>
      </motion.button>

      {/* Live pulse indicator */}
      <div className="sidebar-hide" style={{
        padding: '10px 20px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--green)' }} />
        <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Live Markets
        </span>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {NAV.map((group) => (
          <div key={group.section} style={{ marginBottom: '4px' }}>
            <div
              className="sidebar-hide"
              style={{
                fontSize: '9.5px',
                fontWeight: 800,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                padding: '0 10px',
                marginBottom: '2px',
                marginTop: '14px',
              }}
            >
              {group.section}
            </div>
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isCollapsed ? 'sidebar-icon-only' : ''}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isCollapsed ? '0' : '10px',
                    padding: isCollapsed ? '10px 0' : '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    fontWeight: active ? 600 : 400,
                    color: active ? 'var(--text)' : 'var(--text-muted)',
                    background: active ? 'var(--bg-hover)' : 'transparent',
                    textDecoration: 'none',
                    transition: 'all 0.1s',
                    marginBottom: '1px',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--text)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                    }
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', flexShrink: 0, color: active ? 'var(--accent)' : 'inherit' }}>
                    {item.icon}
                  </span>
                  <span className="sidebar-hide" style={{ flex: 1 }}>{item.label}</span>
                  {item.href === '/bookmarks' && !isCollapsed && <BookmarkCount />}
                </Link>
              );
            })}
          </div>
        ))}

        <div className={isCollapsed ? 'sidebar-hide' : ''}>
          <CategoryFilter />
        </div>
      </div>

      {/* Footer */}
      <div
        className="sidebar-hide"
        style={{
          padding: '14px 18px',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: '10px', color: 'var(--text-dim)', lineHeight: 1.6 }}>
          WeDecide · No Real Money<br />
          Markets open 24/7
        </div>
      </div>
    </nav>
  );
}
