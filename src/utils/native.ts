import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativeReceiverInfo {
  room: string;
  deviceName: string;
  deviceType: string;
  address: string;
  url: string;
  token: string;
  port: number;
}

export interface NativeDiscoveredReceiver {
  room: string;
  deviceName: string;
  deviceType: string;
  address: string;
  url: string;
  token: string;
  port: number;
}

interface LocalSignalingPlugin {
  startReceiver(options: { room: string; deviceName: string }): Promise<NativeReceiverInfo>;
  stopReceiver(): Promise<void>;
  discoverReceivers(options: { room?: string; timeoutMs?: number }): Promise<{ receivers: NativeDiscoveredReceiver[] }>;
  postSignal(options: {
    address: string;
    token: string;
    role: 'sender' | 'receiver';
    message: unknown;
  }): Promise<{ ok: boolean }>;
  pollSignal(options: {
    address: string;
    token: string;
    role: 'sender' | 'receiver';
  }): Promise<{ message?: unknown; ok: boolean }>;
}

export const LocalSignaling = registerPlugin<LocalSignalingPlugin>('LocalSignaling');

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}
