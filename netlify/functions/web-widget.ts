import { Handler } from "@netlify/functions";

const handler: Handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/javascript",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod === "GET") {
    // Return the widget JavaScript code
    const widgetScript = `
(function() {
  'use strict';
  
  // Widget configuration
  var config = window.OjastackConfig || {};
  var agentId = config.agentId;
  var agentName = config.agentName || 'AI Assistant';
  var position = config.position || 'bottom-right';
  var theme = config.theme || 'light';
  var primaryColor = config.primaryColor || '#3b82f6';
  
  if (!agentId) {
    console.error('Ojastack Widget: agentId is required');
    return;
  }
  
  // Create widget container
  var widgetContainer = document.getElementById('ojastack-chat-widget');
  if (!widgetContainer) {
    widgetContainer = document.createElement('div');
    widgetContainer.id = 'ojastack-chat-widget';
    document.body.appendChild(widgetContainer);
  }
  
  // Widget styles
  var styles = \`
    #ojastack-chat-widget {
      position: fixed;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .ojastack-widget-\${position} {
      \${position.includes('bottom') ? 'bottom: 20px;' : 'top: 50%;'}
      \${position.includes('right') ? 'right: 20px;' : position.includes('left') ? 'left: 20px;' : 'left: 50%; transform: translateX(-50%);'}
      \${position === 'center' ? 'transform: translate(-50%, -50%);' : ''}
    }
    
    .ojastack-chat-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: \${primaryColor};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }
    
    .ojastack-chat-button:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }
    
    .ojastack-chat-button svg {
      width: 24px;
      height: 24px;
      fill: white;
    }
    
    .ojastack-chat-window {
      width: 380px;
      height: 500px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      display: none;
      flex-direction: column;
      overflow: hidden;
      \${theme === 'dark' ? 'background: #1a1a1a; color: white;' : ''}
    }
    
    .ojastack-chat-header {
      background-color: \${primaryColor};
      color: white;
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .ojastack-chat-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .ojastack-message {
      max-width: 80%;
      padding: 8px 12px;
      border-radius: 12px;
      word-wrap: break-word;
    }
    
    .ojastack-message-user {
      background-color: \${primaryColor};
      color: white;
      align-self: flex-end;
    }
    
    .ojastack-message-agent {
      background-color: #f1f5f9;
      color: #334155;
      align-self: flex-start;
      \${theme === 'dark' ? 'background-color: #374151; color: #f9fafb;' : ''}
    }
    
    .ojastack-chat-input {
      padding: 16px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      gap: 8px;
      \${theme === 'dark' ? 'border-top-color: #374151;' : ''}
    }
    
    .ojastack-input-field {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      outline: none;
      \${theme === 'dark' ? 'background: #374151; border-color: #4b5563; color: white;' : ''}
    }
    
    .ojastack-send-button {
      padding: 8px 16px;
      background-color: \${primaryColor};
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
  \`;
  
  // Inject styles
  var styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
  
  // Widget state
  var isOpen = false;
  var conversationId = null;
  var messages = [];
  
  // Create widget HTML
  function createWidget() {
    widgetContainer.className = 'ojastack-widget-' + position;
    widgetContainer.innerHTML = \`
      <button class="ojastack-chat-button" onclick="toggleWidget()">
        <svg viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
      </button>
      <div class="ojastack-chat-window">
        <div class="ojastack-chat-header">
          <div>
            <div style="font-weight: 600;">\${agentName}</div>
            <div style="font-size: 12px; opacity: 0.9;">Online</div>
          </div>
          <button onclick="toggleWidget()" style="background: none; border: none; color: white; cursor: pointer;">×</button>
        </div>
        <div class="ojastack-chat-messages" id="ojastack-messages">
          <div class="ojastack-message ojastack-message-agent">
            Hello! I'm \${agentName}. How can I help you today?
          </div>
        </div>
        <div class="ojastack-chat-input">
          <input type="text" class="ojastack-input-field" placeholder="Type your message..." onkeypress="handleKeyPress(event)">
          <button class="ojastack-send-button" onclick="sendMessage()">Send</button>
        </div>
      </div>
    \`;
  }
  
  // Toggle widget visibility
  window.toggleWidget = function() {
    var button = widgetContainer.querySelector('.ojastack-chat-button');
    var window = widgetContainer.querySelector('.ojastack-chat-window');
    
    if (isOpen) {
      button.style.display = 'flex';
      window.style.display = 'none';
      isOpen = false;
    } else {
      button.style.display = 'none';
      window.style.display = 'flex';
      isOpen = true;
      
      if (!conversationId) {
        initializeConversation();
      }
    }
  };
  
  // Handle enter key press
  window.handleKeyPress = function(event) {
    if (event.key === 'Enter') {
      sendMessage();
    }
  };
  
  // Send message
  window.sendMessage = function() {
    var input = widgetContainer.querySelector('.ojastack-input-field');
    var message = input.value.trim();
    
    if (!message || !conversationId) return;
    
    // Add user message to UI
    addMessageToUI('user', message);
    input.value = '';
    
    // Send to API
    fetch('/.netlify/functions/conversations/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentId: agentId,
        message: message,
        customerId: 'widget_user_' + Date.now(),
        channel: 'web',
        messageType: 'text'
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.response) {
        addMessageToUI('agent', data.response);
      }
    })
    .catch(error => {
      console.error('Error sending message:', error);
      addMessageToUI('agent', 'Sorry, I encountered an error. Please try again.');
    });
  };
  
  // Add message to UI
  function addMessageToUI(role, content) {
    var messagesContainer = document.getElementById('ojastack-messages');
    var messageDiv = document.createElement('div');
    messageDiv.className = 'ojastack-message ojastack-message-' + role;
    messageDiv.textContent = content;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  // Initialize conversation
  function initializeConversation() {
    fetch('/.netlify/functions/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
        customer_id: 'widget_user_' + Date.now(),
        channel: 'web',
        metadata: {
          widget_session: true,
          user_agent: navigator.userAgent
        }
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.conversation) {
        conversationId = data.conversation.id;
      }
    })
    .catch(error => {
      console.error('Error initializing conversation:', error);
    });
  }
  
  // Initialize widget
  createWidget();
  
})();
`;

    return {
      statusCode: 200,
      headers,
      body: widgetScript,
    };
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: "Method not allowed" }),
  };
};

export { handler };