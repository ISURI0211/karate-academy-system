'use client';

import { SessionProvider } from 'next-auth/react';
import { useState, useEffect } from 'react';
import AuthWrapper from './AuthWrapper';

export default function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <SessionProvider 
      refetchInterval={5 * 60} // Check session every 5 minutes
      refetchOnWindowFocus={true} // Check when window gets focus
      refetchWhenOffline={false} // Do not refetch when the device is offline
    >
      {mounted ? <AuthWrapper>{children}</AuthWrapper> : null}
    </SessionProvider>
  );
}