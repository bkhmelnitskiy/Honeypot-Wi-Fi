import {
  BleError,
  BleManager,
  Device,
  State,
  Subscription,
} from 'react-native-ble-plx';
import { decodeSecurity, encodeSSID } from './codec';
import {
  ConnectionState,
  HONEYPOT_DEVICE_NAME,
  SECURITY_CHAR_UUID,
  SERVICE_UUID,
  SSID_CHAR_UUID,
  SecurityFrame,
} from './constants';
import { deleteDeviceId, getDeviceId, saveDeviceId } from './storage';

const DEFAULT_SCAN_TIMEOUT_MS = 10_000;
const DEFAULT_CONNECT_TIMEOUT_MS = 8_000;

type ConnectionListener = (state: ConnectionState) => void;

export class HoneypotClient {
  private manager: BleManager | null = null;
  private device: Device | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private connectionListeners = new Set<ConnectionListener>();
  private disconnectSubscription: Subscription | null = null;
  private securitySubscription: Subscription | null = null;

  async init(): Promise<void> {
    if (this.manager) return;
    this.manager = new BleManager();
    await this.waitForPoweredOn();
  }

  destroy(): void {
    this.securitySubscription?.remove();
    this.disconnectSubscription?.remove();
    this.securitySubscription = null;
    this.disconnectSubscription = null;
    this.device = null;
    this.setConnectionState('disconnected');
    this.connectionListeners.clear();
    this.manager?.destroy();
    this.manager = null;
  }

  isConnected(): boolean {
    return this.connectionState === 'connected' && this.device !== null;
  }

  onConnectionChange(cb: ConnectionListener): () => void {
    this.connectionListeners.add(cb);
    cb(this.connectionState);
    return () => {
      this.connectionListeners.delete(cb);
    };
  }

  async scan(opts?: { timeoutMs?: number }): Promise<Device | null> {
    const manager = this.requireManager();
    const timeoutMs = opts?.timeoutMs ?? DEFAULT_SCAN_TIMEOUT_MS;

    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        manager.stopDeviceScan();
        resolve(null);
      }, timeoutMs);

      manager.startDeviceScan([SERVICE_UUID], null, (error, device) => {
        if (settled) return;
        if (error) {
          settled = true;
          clearTimeout(timer);
          manager.stopDeviceScan();
          reject(error);
          return;
        }
        if (!device) return;
        const matches =
          device.name === HONEYPOT_DEVICE_NAME ||
          device.localName === HONEYPOT_DEVICE_NAME;
        if (!matches) return;
        settled = true;
        clearTimeout(timer);
        manager.stopDeviceScan();
        resolve(device);
      });
    });
  }

  stopScan(): void {
    this.manager?.stopDeviceScan();
  }

  async connect(deviceId: string): Promise<void> {
    const manager = this.requireManager();
    this.setConnectionState('connecting');
    try {
      const device = await manager.connectToDevice(deviceId, {
        timeout: DEFAULT_CONNECT_TIMEOUT_MS,
      });
      await device.discoverAllServicesAndCharacteristics();
      this.device = device;
      this.subscribeDisconnect(device);
      this.setConnectionState('connected');
    } catch (e) {
      this.setConnectionState('disconnected');
      throw e;
    }
  }

  async disconnect(): Promise<void> {
    const device = this.device;
    this.securitySubscription?.remove();
    this.securitySubscription = null;
    this.disconnectSubscription?.remove();
    this.disconnectSubscription = null;
    this.device = null;
    this.setConnectionState('disconnected');
    if (device) {
      await device.cancelConnection().catch(() => undefined);
    }
  }

  async connectKnown(): Promise<boolean> {
    const id = await getDeviceId();
    if (!id) return false;
    try {
      await this.connect(id);
      return true;
    } catch {
      return false;
    }
  }

  async scanAndPair(): Promise<void> {
    const found = await this.scan();
    if (!found) throw new Error('honeypot device not found');
    await this.connect(found.id);
    await this.writeSSID('__pair__');
    await saveDeviceId(found.id);
  }

  async forget(): Promise<void> {
    await this.disconnect();
    await deleteDeviceId();
  }

  async writeSSID(ssid: string): Promise<void> {
    const device = this.requireDevice();
    await device.writeCharacteristicWithoutResponseForService(
      SERVICE_UUID,
      SSID_CHAR_UUID,
      encodeSSID(ssid),
    );
  }

  subscribeSecurity(
    cb: (frame: SecurityFrame) => void,
    onError?: (error: Error) => void,
  ): () => void {
    const device = this.requireDevice();
    this.securitySubscription?.remove();

    this.securitySubscription = device.monitorCharacteristicForService(
      SERVICE_UUID,
      SECURITY_CHAR_UUID,
      (error, characteristic) => {
        if (error) {
          onError?.(this.toError(error));
          return;
        }
        const value = characteristic?.value;
        if (!value) return;
        try {
          cb(decodeSecurity(value));
        } catch (e) {
          onError?.(e instanceof Error ? e : new Error(String(e)));
        }
      },
    );

    return () => {
      this.securitySubscription?.remove();
      this.securitySubscription = null;
    };
  }

  private requireManager(): BleManager {
    if (!this.manager) {
      throw new Error('HoneypotClient not initialized — call init() first');
    }
    return this.manager;
  }

  private requireDevice(): Device {
    if (!this.device || !this.isConnected()) {
      throw new Error('not connected — call connect() or scanAndPair() first');
    }
    return this.device;
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState === state) return;
    this.connectionState = state;
    for (const cb of this.connectionListeners) cb(state);
  }

  private subscribeDisconnect(device: Device): void {
    this.disconnectSubscription?.remove();
    this.disconnectSubscription = device.onDisconnected(() => {
      this.securitySubscription?.remove();
      this.securitySubscription = null;
      this.device = null;
      this.setConnectionState('disconnected');
    });
  }

  private async waitForPoweredOn(): Promise<void> {
    const manager = this.requireManager();
    const current = await manager.state();
    if (current === State.PoweredOn) return;
    await new Promise<void>((resolve, reject) => {
      const sub = manager.onStateChange((state) => {
        if (state === State.PoweredOn) {
          sub.remove();
          resolve();
        } else if (state === State.Unsupported) {
          sub.remove();
          reject(new Error('BLE not supported on this device'));
        }
      }, true);
    });
  }

  private toError(e: BleError | Error): Error {
    if (e instanceof Error) return e;
    return new Error(String(e));
  }
}
