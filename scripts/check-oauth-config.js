#!/usr/bin/env node

/**
 * OAuth Configuration Diagnostic Script
 * Run this to check if your OAuth environment variables are properly configured
 */

console.log('🔍 VoiceLoop HR OAuth Configuration Check\n');

// Check required environment variables
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'MICROSOFT_CLIENT_ID',
  'MICROSOFT_CLIENT_SECRET',
  'NEXT_PUBLIC_APP_URL'
];

const optionalVars = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'ELEVENLABS_API_KEY',
  'ELEVENLABS_VOICE_ID'
];

console.log('📋 Required Environment Variables:');
let missingRequired = 0;
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${varName}: MISSING`);
    missingRequired++;
  }
});

console.log('\n📋 Optional Environment Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`⚠️  ${varName}: Not set`);
  }
});

console.log('\n🔧 Configuration Recommendations:');

if (missingRequired > 0) {
  console.log(`❌ ${missingRequired} required environment variables are missing!`);
  console.log('   This will cause OAuth authentication failures.');
  console.log('\n📝 Next Steps:');
  console.log('   1. Set all required environment variables in your deployment');
  console.log('   2. Configure OAuth providers in Supabase dashboard');
  console.log('   3. Update redirect URIs in OAuth app configurations');
  console.log('   4. Redeploy your application');
} else {
  console.log('✅ All required environment variables are configured!');
  console.log('\n📝 Still having issues? Check:');
  console.log('   1. Supabase OAuth providers are enabled');
  console.log('   2. Redirect URIs match your production domain');
  console.log('   3. OAuth apps are properly configured');
}

// Check URL format
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
if (appUrl) {
  if (appUrl.startsWith('http://localhost')) {
    console.log('\n⚠️  WARNING: Using localhost URL in production!');
    console.log('   Update NEXT_PUBLIC_APP_URL to your production domain');
  } else if (appUrl.startsWith('https://')) {
    console.log('\n✅ Production URL format looks correct');
  }
}

console.log('\n🌐 OAuth Provider URLs to configure:');
console.log('   Google: https://console.cloud.google.com/apis/credentials');
console.log('   Microsoft: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade');
console.log('   Supabase: https://supabase.com/dashboard/project/[your-project]/auth/providers');

process.exit(missingRequired > 0 ? 1 : 0);
