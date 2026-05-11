import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'honeypot.device.id'
export const saveDeviceId = (id: string) => AsyncStorage.setItem(KEY, id);
export const getDeviceId = () => AsyncStorage.getItem(KEY);
export const deleteDeviceId = () => AsyncStorage.removeItem(KEY);