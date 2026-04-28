'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashAnimation() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
    
    // Auto-hide after animation completes
    const timer = setTimeout(() => setShow(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Subtle background glow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            style={{
              position: 'absolute',
              width: '300px',
              height: '300px',
              background: 'radial-gradient(circle, rgba(170,255,71,0.05) 0%, transparent 70%)',
              borderRadius: '50%',
              zIndex: 1,
            }}
          />

          {/* New Image Logo pulse loader */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: [0.5, 1.1, 1], opacity: [0, 1, 1], rotate: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              width: '100px',
              height: '100px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              position: 'relative',
              zIndex: 10,
            }}
          >
            {/* The Logo Image (Cropped) */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '14px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 40px rgba(0,191,165,0.3)',
              zIndex: 2,
            }}>
              <img 
                src="/logo.jpg" 
                alt="Logo" 
                style={{
                  width: '125%',
                  height: '125%',
                  objectFit: 'cover',
                }} 
              />
            </div>

            {/* Pulsing ring around logo */}
            <motion.div
               animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
               transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
               style={{
                 position: 'absolute',
                 width: '64px',
                 height: '64px',
                 borderRadius: '14px',
                 border: '2px solid var(--yes)',
                 zIndex: 0,
               }}
            />
          </motion.div>

          {/* Brand Name */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
            style={{
              fontSize: '22px',
              fontWeight: 900,
              color: 'var(--text)',
              letterSpacing: '-0.03em',
              display: 'flex',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            We<span style={{ color: 'var(--yes)' }}>Decide</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
