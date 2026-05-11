export * from './constants';
export * from './codec';
export * from './permissions';
export * from './storage';
export { HoneypotClient } from './HoneypotClient';

import { HoneypotClient } from './HoneypotClient';
export const honeypotClient = new HoneypotClient();
