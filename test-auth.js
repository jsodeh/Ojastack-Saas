// Simple test to verify Supabase connection and profile creation
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://unmhenheyfmpcnqnwtsf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVubWhlbmhleWZtcGNucW53dHNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MTQ4OTksImV4cCI6MjA2OTM5MDg5OX0.W-26AEkVHmt5-syf7lRxNXiO5gkuV6edv0WUwhDYLhw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test basic connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.error('Connection error:', error);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (err) {
    console.error('❌ Connection failed:', err);
    return false;
  }
}

async function testProfileQuery() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('Profile query error:', error);
      return false;
    }
    
    console.log('✅ Profile query successful');
    console.log('Profiles found:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('Sample profile:', data[0]);
    }
    return true;
  } catch (err) {
    console.error('❌ Profile query failed:', err);
    return false;
  }
}

// Run tests
console.log('Testing Supabase connection...');
await testConnection();
await testProfileQuery();