import { useCallback, useEffect, useRef, useState } from 'react';

export interface OrientationData {
  /** Compass heading 0-360, 0 = North. null if unavailable. */
  heading: number | null;
  /** Device tilt / elevation angle in degrees (0 = horizon, 90 = zenith). null if unavailable. */
  tilt: number | null;
}

export type OrientationStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'no-sensor'
  | 'denied'
  | 'insecure'
  | 'unsupported';

const SENSOR_TIMEOUT_MS = 2200;

export function useDeviceOrientation() {
  const [status, setStatus] = useState<OrientationStatus>('idle');
  const [data, setData] = useState<OrientationData>({ heading: null, tilt: null });
  const listenerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const receivedReadingRef = useRef(false);

  const isSupported =
    typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
  const isSecureContext =
    typeof window === 'undefined' || window.isSecureContext;

  const clearWaitTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const removeListener = useCallback(() => {
    if (listenerRef.current) {
      window.removeEventListener('deviceorientation', listenerRef.current, true);
      listenerRef.current = null;
    }
  }, []);

  const handleOrientation = useCallback(
    (e: DeviceOrientationEvent) => {
      const webkit = (e as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading;
      let heading: number | null = null;
      if (typeof webkit === 'number' && Number.isFinite(webkit)) {
        heading = ((webkit % 360) + 360) % 360;
      } else if (typeof e.alpha === 'number' && Number.isFinite(e.alpha)) {
        heading = ((360 - e.alpha) % 360 + 360) % 360;
      }

      let tilt: number | null = null;
      if (typeof e.beta === 'number' && Number.isFinite(e.beta)) {
        tilt = Math.max(0, Math.min(90, 90 - e.beta));
      }

      if (heading === null && tilt === null) {
        return;
      }

      if (!receivedReadingRef.current) {
        receivedReadingRef.current = true;
        clearWaitTimeout();
        setStatus('active');
      }

      setData({ heading, tilt });
    },
    [clearWaitTimeout],
  );

  const start = useCallback(async () => {
    clearWaitTimeout();
    removeListener();
    receivedReadingRef.current = false;
    setData({ heading: null, tilt: null });

    if (!isSecureContext) {
      setStatus('insecure');
      return;
    }

    if (!isSupported) {
      setStatus('unsupported');
      return;
    }

    setStatus('requesting');

    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof DOE.requestPermission === 'function') {
      try {
        const perm = await DOE.requestPermission();
        if (perm !== 'granted') {
          setStatus('denied');
          return;
        }
      } catch {
        setStatus('denied');
        return;
      }
    }

    listenerRef.current = handleOrientation;
    window.addEventListener('deviceorientation', handleOrientation, true);

    timeoutRef.current = window.setTimeout(() => {
      if (!receivedReadingRef.current) {
        removeListener();
        setData({ heading: null, tilt: null });
        setStatus('no-sensor');
      }
    }, SENSOR_TIMEOUT_MS);
  }, [clearWaitTimeout, handleOrientation, isSecureContext, isSupported, removeListener]);

  const stop = useCallback(() => {
    clearWaitTimeout();
    removeListener();
    receivedReadingRef.current = false;
    setStatus('idle');
    setData({ heading: null, tilt: null });
  }, [clearWaitTimeout, removeListener]);

  useEffect(() => {
    return () => {
      clearWaitTimeout();
      removeListener();
    };
  }, [clearWaitTimeout, removeListener]);

  return { status, data, start, stop, isSupported, isSecureContext };
}
