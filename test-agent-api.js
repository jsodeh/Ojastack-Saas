// Simple test script to verify agent API functionality
const testAgentAPI = async () => {
  const baseUrl = 'http://localhost:8888/.netlify/functions';
  
  // Mock user token (you'll need to replace this with a real token)
  const mockToken = 'your-test-token-here';
  
  try {
    console.log('Testing agent creation...');
    
    const createResponse = await fetch(`${baseUrl}/agents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Agent',
        description: 'A test agent for API verification',
        type: 'chat',
        personality: 'You are a helpful test assistant.',
        instructions: 'Respond to test queries helpfully.',
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 500,
      }),
    });
    
    if (createResponse.ok) {
      const createData = await createResponse.json();
      console.log('✅ Agent created successfully:', createData.agent.name);
      
      // Test listing agents
      console.log('Testing agent listing...');
      const listResponse = await fetch(`${baseUrl}/agents`, {
        headers: {
          'Authorization': `Bearer ${mockToken}`,
        },
      });
      
      if (listResponse.ok) {
        const listData = await listResponse.json();
        console.log('✅ Agents listed successfully:', listData.agents.length, 'agents found');
      } else {
        console.log('❌ Failed to list agents:', listResponse.status);
      }
      
    } else {
      const error = await createResponse.json();
      console.log('❌ Failed to create agent:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
console.log('🧪 Starting Agent API Test...');
console.log('Note: You need to replace mockToken with a real JWT token from your auth system');
console.log('You can get this from the browser dev tools after logging in');

// Uncomment the line below to run the test (after setting up a real token)
// testAgentAPI();