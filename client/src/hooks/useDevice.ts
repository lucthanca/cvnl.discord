import { useState, useEffect } from 'react';

type DeviceType = 'mobile' | 'tablet' | 'desktop';

export const useDevice = (): DeviceType => {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');

  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      if (isTouchDevice) {
        if (
          /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent)
        ) {
          if (window.innerWidth <= 768) {
            setDeviceType('mobile');
          } else {
            setDeviceType('tablet');
          }
        } else {
          setDeviceType('tablet');
        }
      } else {
        setDeviceType('desktop');
      }
    };

    detectDevice();

    const handleResize = () => {
      detectDevice();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return deviceType;
};
