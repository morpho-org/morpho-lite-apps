import { createContext, useContext, useCallback, useEffect, useRef, useState, ReactNode } from "react";

import { usePWAInstall } from "./use-pwa-install";

interface PWAContextValue {
  // PWA Install
  isInstallable: boolean;
  isInstalled: boolean;
  install: () => Promise<boolean>;

  // Notifications
  canSendNotifications: boolean;
}

const PWAContext = createContext<PWAContextValue | undefined>(undefined);

export function PWAProvider({ children }: { children: ReactNode }) {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  // Notifications permissions state
  const [isNotificationSupported, setIsNotificationSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  const hasNotificationPermission = notificationPermission === "granted";
  const canSendNotifications = isNotificationSupported && hasNotificationPermission;
  const hasRequestedNotificationsRef = useRef(false);

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!isNotificationSupported) {
      return false;
    }

    const perm = await Notification.requestPermission();
    setNotificationPermission(perm);
    return perm === "granted";
  }, [isNotificationSupported]);

  useEffect(() => {
    if ("Notification" in window && "serviceWorker" in navigator) {
      setIsNotificationSupported(true);
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Automatically request notification permission after PWA installation
  useEffect(() => {
    if (isInstalled && !hasNotificationPermission && !hasRequestedNotificationsRef.current) {
      hasRequestedNotificationsRef.current = true;
      // Small delay to let the install UI settle
      setTimeout(() => {
        void requestNotificationPermission();
      }, 1000);
    }
  }, [isInstalled, hasNotificationPermission, requestNotificationPermission]);

  const value: PWAContextValue = {
    isInstallable,
    isInstalled,
    install,
    canSendNotifications,
  };

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>;
}

export function usePWA(): PWAContextValue {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error("usePWA must be used within a PWAProvider");
  }
  return context;
}
