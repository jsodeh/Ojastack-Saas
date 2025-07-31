# Implementation Plan

- [x] 1. Create database schema for user credentials
  - Create migration file for whatsapp_credentials table with encrypted storage
  - Create migration file for whatsapp_webhooks table for dynamic webhook management
  - Create migration file for agent_whatsapp_configs table for per-agent configuration
  - Create migration file for user_encryption_keys table for user-specific encryption
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 2. Implement encryption service for credential security
  - Create encryption service class with AES-256 encryption methods
  - Implement user-specific key generation and management
  - Add key rotation functionality for enhanced security
  - Write unit tests for encryption/decryption operations
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 3. Build credential management service
  - Create WhatsAppCredentialManager class with CRUD operations
  - Implement credential validation against WhatsApp Business API
  - Add credential health monitoring and status checking
  - Create secure credential storage and retrieval methods
  - Write unit tests for credential management operations
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2_

- [x] 4. Develop dynamic webhook management system
  - Create WebhookManager class for user-specific webhook handling
  - Implement unique webhook URL generation per user/credential
  - Add automatic webhook configuration with WhatsApp Business API
  - Create message routing logic based on webhook source
  - Write unit tests for webhook management and routing
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 5. Create user interface for credential management
  - Build WhatsApp credentials form component with validation
  - Create credential management dashboard showing status and health
  - Add credential testing and validation UI feedback
  - Implement credential update and deletion interfaces
  - Write component tests for credential management UI
  - _Requirements: 1.1, 1.4, 5.3, 5.4_

- [ ] 6. Implement agent-level WhatsApp configuration
  - Create AgentWhatsAppService for per-agent WhatsApp settings
  - Add WhatsApp integration toggle to agent configuration UI
  - Implement phone number selection for agents with multiple credentials
  - Create agent WhatsApp status monitoring dashboard
  - Write integration tests for agent WhatsApp configuration
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 7. Refactor WhatsApp message handling
  - Update WhatsApp service to use user credentials instead of platform credentials
  - Modify message sending logic to retrieve user credentials dynamically
  - Update webhook handler to route messages based on user-specific webhooks
  - Implement message history storage with user credential association
  - Write integration tests for message sending and receiving
  - _Requirements: 2.3, 3.4, 5.2_

- [x] 8. Update webhook function for user-specific routing
  - Modify netlify/functions/whatsapp-webhook.ts to handle user-specific webhooks
  - Implement webhook URL parsing to identify target user and agent
  - Add webhook signature verification using user-specific tokens
  - Update message processing to use correct user credentials
  - Write integration tests for webhook message routing
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 9. Remove platform credential dependencies
  - Update environment configuration to make WhatsApp credentials optional
  - Modify WhatsApp services to work without platform-level credentials
  - Add graceful handling when no WhatsApp credentials are configured
  - Update documentation to reflect user credential requirements
  - Write tests to ensure system works without platform WhatsApp credentials
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 10. Create migration tools for existing integrations
  - Build migration wizard component for existing users
  - Implement credential import functionality from platform to user credentials
  - Add rollback mechanism for failed migrations
  - Create migration status tracking and reporting
  - Write integration tests for migration process
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 11. Add comprehensive error handling and monitoring
  - Implement error handling for credential validation failures
  - Add retry logic for transient WhatsApp API failures
  - Create user notification system for credential issues
  - Implement health monitoring dashboard for WhatsApp integrations
  - Write tests for error scenarios and recovery mechanisms
  - _Requirements: 5.2, 5.3, 5.4_

- [ ] 12. Implement security measures and audit logging
  - Add audit logging for all credential operations
  - Implement rate limiting per user credential
  - Add webhook signature verification for security
  - Create security monitoring for suspicious credential access
  - Write security tests for credential protection and access control
  - _Requirements: 4.4, 5.4_

- [ ] 13. Create comprehensive documentation and user guides
  - Write user guide for setting up WhatsApp Business API credentials
  - Create troubleshooting documentation for common issues
  - Add API documentation for new credential management endpoints
  - Create migration guide for existing users
  - Write developer documentation for the new architecture
  - _Requirements: 1.1, 6.2, 7.4_

- [ ] 14. Perform end-to-end testing and validation
  - Test complete user journey from credential setup to message handling
  - Validate webhook routing with multiple users and agents
  - Test credential health monitoring and error recovery
  - Perform security testing for credential protection
  - Conduct load testing for webhook handling and message processing
  - _Requirements: All requirements validation_