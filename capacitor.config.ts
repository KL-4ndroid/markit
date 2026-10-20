import type { CapacitorConfig } from '@capacitor/cli';
import { createIosBootstrapConfig } from './scripts/lib/ios-bootstrap-config.cjs';

// The final Bundle ID is supplied at native integration, never invented here.
const config: CapacitorConfig = createIosBootstrapConfig(process.env);
export default config;
