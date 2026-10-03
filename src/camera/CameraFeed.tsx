import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

export type CameraStatus = 'pending' | 'live' | 'denied';
export type VideoRect = { left: number; top: number; width: number; height: number };

type Props = {
  onStatus: (s: CameraStatus) => void;
  onVideo: (v: null) => void;
  rect?: VideoRect | null;
};

/** Native: live mirrored preview only. No frames are captured (no takePicture / recording calls). */
export function CameraFeed({ onStatus }: Props) {
  const [permission, request] = useCameraPermissions();

  useEffect(() => {
    if (!permission) return;
    if (permission.granted) onStatus('live');
    else if (permission.canAskAgain) void request();
    else onStatus('denied');
  }, [permission, request, onStatus]);

  if (!permission?.granted) return null;
  return <CameraView style={StyleSheet.absoluteFill} facing="front" mirror />;
}
