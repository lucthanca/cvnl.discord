import { config } from 'dotenv';
import { resolve, dirname } from 'path';

// Load .env file explicitly
const envPath = resolve(process.cwd(), '.env');
console.log('Loading .env from:', envPath);

const result = config({ path: envPath });

if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('✅ .env file loaded successfully');
}

export default result;
