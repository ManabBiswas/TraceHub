import app from './src/app.js';
import 'dotenv/config';
import connectDB from './src/config/db.js';

const port = process.env.PORT || 3000;

// Validate required environment variables at startup
const requiredEnvVars = [
    'MONGODB_URL',
    'JWT_SECRET',
    'PROFESSOR_PASSCODE',
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease set these variables in your .env file and restart the server.');
    process.exit(1);
}



console.log('✅ All environment variables validated');

app.listen(port, '0.0.0.0', () => {
    console.log(`\n🚀 the Server running on port ${port}`);
    connectDB().catch(err => {
        console.error('Failed to connect to database:', err);
        process.exit(1);
    });
  
}).on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});