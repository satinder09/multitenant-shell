# XoroERP Lite - SaaS Shell Project Plan

## 1. Project Vision

To build a fully domain-independent, enterprise-grade SaaS application shell designed for multi-tenant, horizontally scalable, and highly secure deployments. This framework will provide all the essential architecture, security, tenancy, user management, RBAC, theming, and extensibility foundations needed to launch any vertical business module as a plug-in. It will serve as a reusable core for any future SaaS product, ensuring rapid development, robust compliance, and operational excellence from day one.

---

## 2. Guiding Principles

- **Domain-Agnostic:** The shell will contain zero business logic. All features will be platform-level.
- **Security First:** Every API endpoint and UI component will be protected by default.
- **Extensibility by Design:** The architecture will be built around a plugin model for future business modules.
- **Automated & Scalable:** Tenant lifecycle, deployments, and infrastructure will be managed through code and automation.
- **Developer Experience:** The shell must be easy to understand, extend, and maintain.
- **Environment Flexibility:** All domains, ports, and configurations must be environment-driven.
- **Component Reusability:** Prioritize existing user-defined components over creating new ones.

---

## 3. Execution Plan & Milestones

This project is broken down into five distinct milestones. We will tackle them sequentially, ensuring a solid foundation before building more advanced features.

### Milestone 1: Core Foundation & Structure
*(Status: ✅ COMPLETED)*

This phase focuses on establishing a robust monorepo structure, formalizing the multi-tenancy data model, and ensuring the core application shell is functional.

- [x] **Monorepo Structure**
    - [x] Create `apps/`, `packages/`, and `infra/` directories at the project root.
    - [x] Configure TypeScript path aliases (`@/`) to resolve shared packages correctly.
- [x] **Infrastructure as Code**
    - [x] Docker Compose setup for local PostgreSQL database.
    - [x] Create placeholder Terraform configurations in `infra/`.
- [x] **Core Tenancy**
    - [x] Master database schema with `MasterUser` and `Tenant` models.
    - [x] Centralized login authenticating against the master database.
    - [x] API endpoint to create a new tenant.
- [x] **Environment Configuration**
    - [x] Implement environment-driven domain and port configuration.
    - [x] Remove all hardcoded domains and ports from codebase.
    - [x] Establish consistent environment variable naming conventions.
    - [x] Add environment validation and fallback mechanisms.
- [x] **Component Architecture**
    - [x] Establish component hierarchy (ui-kit → ui → utils → extend → create new).
    - [x] Create reusable UI components and utilities.
    - [x] Implement component usage guidelines and patterns.
- [x] **Documentation**
    - [x] Create a comprehensive root `README.md` with setup instructions.
    - [x] Create a `.gitignore` file with appropriate rules for the monorepo.
    - [x] Establish this `PROJECT_PLAN.md` for progress tracking.
    - [x] Create comprehensive development rules and guidelines.

---

### Milestone 2: Role-Based Access Control (RBAC) & Security
*(Status: 🔄 PARTIALLY COMPLETED)*

This phase implements the complete RBAC system, which is the cornerstone of the application's security model.

- [x] **Data Model**
    - [x] Define `Role` and `Permission` models in the master Prisma schema.
    - [x] Define `TenantUserRole` and `RolePermission` models to link users, roles, and permissions within a tenant's scope.
- [x] **Authentication & Authorization**
    - [x] Implement JWT-based authentication with tenant context.
    - [x] Create tenant-aware authentication middleware.
    - [x] Implement secure session management with proper cookie handling.
    - [x] Add tenant isolation validation on all requests.
- [x] **Master-First Workflow**
    - [x] Implement master user dashboard for tenant management.
    - [x] Create secure login and impersonation capabilities.
    - [x] Add tenant access control and permission validation.
    - [x] Implement audit logging for all tenant access events.
- [ ] **Backend**
    - [ ] Implement CRUD APIs for managing Roles and Permissions.
    - [ ] Implement APIs for assigning Roles to Users for a specific Tenant.
    - [ ] Create a NestJS `RolesGuard` to protect all API endpoints based on user permissions.
    - [x] Add basic security middleware (`helmet`, `cors`, rate-limiting).
- [ ] **Frontend**
    - [ ] Create an `/admin/roles` page for managing roles and permissions.
    - [ ] Create an `/admin/users` page to assign roles to users.
    - [x] Implement dynamic navigation (sidebar/menus) that renders based on the user's permissions.
- [ ] **(Advanced) Enterprise Authentication**
    - [ ] Add support for Multi-Factor Authentication (MFA) via authenticator apps.
    - [ ] Implement Single Sign-On (SSO) capabilities with a standard like SAML or OAuth2.

---

### Milestone 3: Tenant Lifecycle & Theming
*(Status: 🔄 PARTIALLY COMPLETED)*

This phase automates the tenant lifecycle from onboarding to branding and introduces dynamic theming.

- [x] **Automated Tenant Provisioning** *(Status: ✅ COMPLETED)*
    - [x] Automate tenant database creation upon new tenant registration.
    - [x] Automate running migrations on the new tenant database.
    - [x] Seed the new tenant database with default roles and permissions.
    - [x] Implement tenant database connection pooling and management.
    - [x] Add tenant database health monitoring and recovery mechanisms.
- [x] **Tenant Isolation From Master DB** *(Status: ✅ COMPLETED)*
    - [x] Ensure complete data isolation between tenant databases and master database.
    - [x] Implement secure tenant database URL encryption and storage.
    - [x] Add tenant context middleware for automatic database switching.
    - [x] Implement tenant-specific connection management and cleanup.
    - [x] Add tenant database backup and restore capabilities.
- [x] **SAAS based secure Tenant Impersonation** *(Status: ✅ COMPLETED)*
    - [x] Implement secure tenant impersonation system with audit logging.
    - [x] Add permission-based impersonation controls (super admin only).
    - [x] Create impersonation session management with automatic timeout.
    - [x] Implement comprehensive audit trail for all impersonation actions.
    - [x] Add impersonation UI for support and debugging purposes.
    - [x] Create impersonation API endpoints with proper security validation.
- [x] **Subdomain-Based Tenant Resolution**
    - [x] Implement tenant resolution from subdomain (e.g., tenant1.lvh.me).
    - [x] Add middleware for automatic tenant context detection.
    - [x] Implement cross-subdomain authentication with proper cookie handling.
    - [x] Add tenant isolation validation and security checks.
- [ ] **Theming Engine**
    - [ ] Add theme-related fields (e.g., `primaryColor`, `logoUrl`) to the `Tenant` model.
    - [ ] Create an API endpoint for tenants to manage their theme settings.
    - [x] Implement a `ThemeProvider` on the frontend that dynamically loads and applies the current tenant's theme.
- [x] **Tenant Context**
    - [x] Implement tenant resolution from the URL (subdomain or path).
    - [x] Ensure all API requests are scoped to the resolved tenant context.
- [ ] **Billing & Subscription Management** *(Status: ❌ NOT STARTED)*
    - [ ] Implement subscription plans and pricing tiers.
    - [ ] Add usage tracking and metering for API calls, storage, etc.
    - [ ] Integrate with payment processors (Stripe, PayPal, etc.).
    - [ ] Create billing dashboard for tenants.
    - [ ] Implement automated billing cycles and invoice generation.
    - [ ] Add usage alerts and quota management.
- [ ] **Tenant Onboarding & Self-Service** *(Status: ❌ NOT STARTED)*
    - [ ] Create guided onboarding flow for new tenants.
    - [ ] Implement tenant self-service portal for account management.
    - [ ] Add tenant-specific documentation and help system.
    - [ ] Create tenant activation/deactivation workflows.
    - [ ] Implement tenant data export/import capabilities.
- [ ] **(Advanced) Compliance & Data Governance**
    - [ ] Implement Data Residency controls (allowing tenants to choose their data region).
    - [ ] Implement Data Retention policies (automated archival/deletion of data).
    - [ ] Add GDPR compliance features (data portability, right to be forgotten).
    - [ ] Implement data encryption at rest and in transit.
    - [ ] Add compliance reporting and audit trails.

---

### Milestone 4: Extensibility & Communication
*(Status: ❌ NOT STARTED)*

This phase builds the foundation for extending the shell with business modules and adding core communication features.

- [ ] **(Advanced) Core Architecture**
    - [ ] Integrate a `Service Bus / Message Broker` (e.g., RabbitMQ, Kafka) for robust, asynchronous inter-module communication.
    - [ ] Define a `Core Services API` (`packages/core`) to provide stable interfaces for logging, notifications, caching, etc., for plugins to consume.
- [ ] **Feature Flagging**
    - [ ] Define `FeatureFlag` models in the master database.
    - [ ] Build an API and UI for toggling feature flags per tenant or per user.
    - [ ] Create a `useFeatureFlag` hook for the frontend and a service for the backend.
- [ ] **Notifications & Background Jobs**
    - [ ] Rearchitect background jobs to use the Service Bus.
    - [ ] Implement a core in-app notification system (UI and API).
    - [ ] Create a background job for sending email notifications (e.g., for user invites).
- [ ] **(Advanced) Plugin & Data Extensibility**
    - [ ] Define a formal "Plugin Registry" service on the backend.
    - [ ] Implement a `Custom Fields` strategy (e.g., via JSONB columns) to allow tenants to extend core models.
- [ ] **API Management & Developer Portal** *(Status: ❌ NOT STARTED)*
    - [ ] Implement API versioning and backward compatibility.
    - [ ] Create API rate limiting and quota management per tenant.
    - [ ] Build developer portal for API documentation and testing.
    - [ ] Add API key management and authentication.
    - [ ] Implement webhook system for real-time integrations.
    - [ ] Create API analytics and usage monitoring.
- [ ] **Integration Framework** *(Status: ❌ NOT STARTED)*
    - [ ] Build integration marketplace for third-party connectors.
    - [ ] Implement OAuth2 provider for external integrations.
    - [ ] Create webhook management system.
    - [ ] Add data synchronization capabilities.
    - [ ] Implement integration health monitoring.
- [ ] **Multi-Language & Localization** *(Status: ❌ NOT STARTED)*
    - [ ] Implement i18n framework for multi-language support.
    - [ ] Add tenant-specific language preferences.
    - [ ] Create localization management system.
    - [ ] Implement currency and timezone handling.
    - [ ] Add RTL language support.

---

### Milestone 5: Production Readiness & DevOps
*(Status: ❌ NOT STARTED)*

This final phase prepares the shell for production deployment with a focus on observability, compliance, and developer experience.

- [ ] **Observability**
    - [ ] Implement structured, context-aware logging (e.g., Winston) on the backend.
    - [ ] Create an `AuditLog` model and service to record all critical actions.
    - [ ] Add health check (`/health`) and metrics (`/metrics`) endpoints.
- [ ] **Compliance & DX**
    - [ ] Auto-generate API documentation (Swagger/OpenAPI).
    - [ ] Implement a basic data import/export feature.
- [ ] **CI/CD**
    - [ ] Set up a GitHub Actions pipeline to run linting, testing, and builds on every pull request.
    - [x] Add unit and integration test suites for core functionality (Jest).
    - [ ] Add E2E tests for critical user flows like login and tenant creation (Cypress/Playwright).
- [ ] **(Advanced) Scalability & Performance**
    - [ ] Implement an `Advanced Caching Strategy` (Application-level caching with Redis, CDN for frontend assets).
    - [ ] Introduce `Advanced DB Connection Pooling` (e.g., PgBouncer) to handle high load.
- [ ] **(Advanced) Network Security**
    - [ ] Implement a `Web Application Firewall (WAF)` at the infrastructure level.
- [ ] **Enterprise Security & Compliance** *(Status: ❌ NOT STARTED)*
    - [ ] Implement SOC 2 Type II compliance framework.
    - [ ] Add enterprise SSO (SAML, OIDC) with multiple identity providers.
    - [ ] Create security incident response procedures.
    - [ ] Implement advanced threat detection and monitoring.
    - [ ] Add penetration testing and security audit capabilities.
- [ ] **Disaster Recovery & Business Continuity** *(Status: ❌ NOT STARTED)*
    - [ ] Implement automated backup and recovery procedures.
    - [ ] Create disaster recovery runbooks and procedures.
    - [ ] Add cross-region data replication.
    - [ ] Implement business continuity testing.
    - [ ] Create incident response and communication plans.
- [ ] **Performance & Scalability** *(Status: ❌ NOT STARTED)*
    - [ ] Implement horizontal scaling for application servers.
    - [ ] Add database sharding and read replicas.
    - [ ] Create performance monitoring and alerting.
    - [ ] Implement auto-scaling based on load.
    - [ ] Add performance optimization and caching strategies.

---

## 4. Key Learnings & Best Practices

### Environment Configuration
- **Never use hardcoded domains or ports** - always use environment variables
- **Use consistent naming conventions** across backend and frontend
- **Validate environment variables** at startup with proper error messages
- **Test with different configurations** to ensure flexibility

### Component Architecture
- **Always check existing user-defined components first** before creating new ones
- **Follow component hierarchy**: ui-kit → ui → utils → extend → create new
- **Use established patterns** in existing user-defined components
- **Leverage existing TypeScript interfaces** from user-defined components

### Security & Authentication
- **Implement tenant isolation** at every level (database, API, UI)
- **Use secure session management** with proper cookie handling
- **Audit all authentication events** for security compliance
- **Validate tenant context** on every request

### Development Workflow
- **Test incrementally** - don't make too many changes at once
- **Use proper logging** to track execution flow
- **Handle edge cases** and error conditions
- **Maintain type safety** throughout the codebase
- **Update documentation** when making architectural changes

---

## 5. Next Steps

### Immediate Priorities
1. **Complete RBAC Implementation**: Finish role and permission management
2. **Enhance Security**: Add MFA and SSO capabilities
3. **Improve Testing**: Add comprehensive test coverage
4. **Documentation**: Update API documentation and user guides

### Medium-term Goals
1. **Billing Integration**: Implement subscription management
2. **Advanced Theming**: Complete dynamic theming engine
3. **Performance Optimization**: Add caching and connection pooling
4. **Monitoring**: Implement comprehensive observability

### Long-term Vision
1. **Plugin Architecture**: Build extensible plugin system
2. **Enterprise Features**: Add advanced compliance and security
3. **Scalability**: Implement horizontal scaling and sharding
4. **Marketplace**: Create integration marketplace 