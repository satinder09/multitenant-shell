# XoroERP Lite - Project Outline

**Generated:** {{CURRENT_DATE}}

## 📖 Project Description

XoroERP Lite is a modern, scalable, and lightweight multi-tenant Enterprise Resource Planning (ERP) application. It is designed to serve multiple client organizations (tenants) from a single deployed instance, while ensuring strict data isolation for each tenant.

The backend is built with **NestJS**, providing a robust and scalable architecture for business logic. The frontend is a responsive and interactive single-page application built with **Next.js** and **TypeScript**, using `shadcn/ui` for its component library. **Prisma** serves as the Object-Relational Mapper (ORM) for seamless and type-safe database interactions with a **PostgreSQL** database.

The core of the application is its **multi-tenant architecture with centralized authentication**. Each tenant operates with its own dedicated database, which is automatically provisioned and migrated upon creation. User identity is managed globally in a master database, and access to specific tenant environments is controlled through explicit permissions, allowing for a secure and manageable user base across the entire system.

## 🚀 High-Level Architecture

This project is a multi-tenant ERP system built with a NestJS backend and a Next.js frontend. It features a **centralized authentication** model where a single `MasterUser` database manages all users. User access to individual tenant instances is controlled through a `TenantUserPermission` join table.

When a new tenant is created, a dedicated database is automatically provisioned for it using a template. This ensures complete data isolation between tenants.

The frontend utilizes a set of custom, theme-aware UI utilities for consistent user feedback:
- `utils/ui/toastNotify.tsx`: A centralized function for displaying styled toast notifications for success, error, info, and warning states.
- `utils/ui/dialogUtils.tsx`: A global, imperative utility for showing `alert()` and `confirm()` dialogs without component boilerplate.
- `utils/ui/sheetUtils.tsx`: A global utility for programmatic control of side sheets.

## 🗂️ Project Structure
- XoroERP-Lite/
  - apps/
    - backend/
      - .env
      - docker-compose.yml
      - Dockerfile
      - nest-cli.json
      - package-lock.json
      - package.json
      - prisma/
        - migrations/
          - 20250620072216_init_master/
            - migration.sql
          - migration_lock.toml
        - schema.prisma
        - seed-master-user.ts
        - tenant-template/
          - migrations/
            - 20250620073027_init_tenant/
              - migration.sql
            - migration_lock.toml
          - schema.prisma
      - src/
        - common/
          - decorators/
            - auth-user.decorator.ts
        - config/
        - graphql/
        - logger/
        - main.ts
        - middleware/
          - tenant-resolver.middleware.ts
        - modules/
          - auth/
            - auth.controller.ts
            - auth.module.ts
            - auth.service.ts
            - jwt-auth.guard.ts
            - jwt.strategy.ts
          - master-prisma/
            - master-prisma.module.ts
            - master-prisma.service.ts
          - prisma-tenant/
            - eviction-scheduler.service.ts
            - get-tenant-client.ts
            - prisma-tenant.module.ts
            - tenant-context.ts
            - tenant-prisma.service.ts
          - tenant/
            - tenant.controller.ts
            - tenant.module.ts
            - tenant.service.ts
          - user/
      - test/
        - app.e2e-spec.js
        - app.e2e-spec.ts
      - tsconfig.build.json
      - tsconfig.build.tsbuildinfo
      - tsconfig.json
      - tsconfig.tsbuildinfo
    - encrypt-test.js
    - frontend/
      - .env
      - .gitignore
      - app/
        - api/
          - auth/
            - login/
              - route.ts
            - logout/
              - route.ts
            - me/
              - route.ts
          - tenants/
            - [id]/route.ts
            - route.ts
        - components-demo/
          - page.tsx
        - favicon.ico
        - globals.css
        - layout.tsx
        - login/
          - page.tsx
        - tenants/
          - page.tsx
        - page.tsx
      - components/
        - ui/
          - alert-dialog.tsx
          - badge.tsx
          - button.tsx
          - calendar.tsx
          - checkbox.tsx
          - command.tsx
          - dialog.tsx
          - dropdown-menu.tsx
          - input.tsx
          - label.tsx
          - popover.tsx
          - radio-group.tsx
          - select.tsx
          - sheet.tsx
          - sonner.tsx
          - table.tsx
          - tabs.tsx
        - ui-kit/
          - ActionButtons.tsx
          - AppSheet.tsx
          - DataTable.tsx
          - DateRangePicker.tsx
          - DialogForm.tsx
          - FormRow.tsx
          - MultiSelect.tsx
          - SearchBar.tsx
          - SectionHeader.tsx
          - SelectInput.tsx
          - StatusBadge.tsx
          - TabsBlock.tsx
        - AuthenticatedLayout.tsx
        - Header.tsx
        - ProtectedRoute.tsx
        - Sidebar.tsx
        - ThemeToggle.tsx
        - UserNav.tsx
      - components.json
      - context/
        - AuthContext.tsx
        - theme-provider.tsx
      - eslint.config.mjs
      - lib/
        - api.ts
        - security.ts
        - utils.ts
      - next-env.d.ts
      - next.config.ts
      - package-lock.json
      - package.json
      - postcss.config.js
      - postcss.config.mjs
      - public/
        - file.svg
        - globe.svg
        - next.svg
        - vercel.svg
        - window.svg
      - README.md
      - styles/
      - tailwind.config.js
      - tsconfig.json
      - utils/
        - ui/
          - dialogUtils.tsx
          - sheetUtils.tsx
          - toastNotify.tsx
  - docker-compose.yml
  - encrypt-test.js
  - generate-outline.js
  - infra/
  - prisma/
  - project-outline-detailed.md
  - project-outline.txt
  - README.md
  - scripts/

## 🔑 Environment Files & Keys
- apps\frontend\.env
  - NEXT_PUBLIC_API_BASE_URL
  - DATABASE_URL
- apps\backend\.env
  - DATABASE_URL
  - JWT_SECRET
  - TENANT_DB_ENCRYPTION_KEY

## 🔧 NestJS Modules
- auth:
- master-prisma:
- prisma-tenant:
- tenant:
- user:

## 💾 Prisma Schemas & Models
- apps\backend\prisma\schema.prisma:
  - Model: Tenant
- apps\backend\prisma\tenant-template\schema.prisma:
  - Model: User
  - Model: Role
  - Model: Permission
  - Model: UserRole
  - Model: RolePermission
  - Model: Session
  - Model: RefreshToken
- apps\backend\generated\tenant-prisma\schema.prisma:
  - Model: User
  - Model: Role
  - Model: Permission
  - Model: UserRole
  - Model: RolePermission
  - Model: Session
  - Model: RefreshToken
- apps\backend\generated\master-prisma\schema.prisma:
  - Model: Tenant

## 📡 GraphQL SDL Files
- apps\backend\node_modules\@nestjs\schematics\dist\lib\resource\files\ts\__name__.graphql

## 🚀 Next.js Pages
- apps\frontend\app\page
- apps\frontend\app\layout
- apps\frontend\app\login\page
- apps\frontend\app\components-demo\page
- apps\frontend\app\api\auth\me\route
- apps\frontend\app\api\auth\logout\route
- apps\frontend\app\api\auth\login\route

## 🚀 Next.js API Routes
- apps\frontend\app\api\auth\me\route.ts
- apps\frontend\app\api\auth\logout\route.ts
- apps\frontend\app\api\auth\login\route.ts

## 🖥️ Frontend Pages

- `/login`: Login page for all users.
- `/`: Dashboard, landing page after login.
- `/tenants`: Page for super-admins to manage all tenants (create, view, activate/deactivate).

## 📦 PACKAGE.JSON SUMMARIES

### apps\backend\package.json
- Name: backend
- Version: 0.1.0
- Scripts:
  - start: node dist/main.js
  - start:dev: nest start --watch
  - build: nest build
  - lint: eslint "src/**/*.ts" --fix
  - test: jest
  - test:watch: jest --watch
  - prisma:generate: prisma generate --schema=prisma/schema.prisma
- Dependencies:
  - @nestjs/common: ^11.1.3
  - @nestjs/config: ^4.0.2
  - @nestjs/core: ^11.1.3
  - @nestjs/jwt: ^11.0.0
  - @nestjs/passport: ^11.0.5
  - @nestjs/platform-express: ^11.1.3
  - @nestjs/schedule: ^6.0.0
  - @prisma/client: ^6.10.1
  - bcrypt: ^5.1.0
  - class-transformer: ^0.5.1
  - class-validator: ^0.14.0
  - cookie-parser: ^1.4.7
  - passport: ^0.6.0
  - passport-jwt: ^4.0.1
  - reflect-metadata: ^0.1.13
  - rxjs: ^7.8.0
- DevDependencies:
  - @nestjs/cli: ^11.0.7
  - @nestjs/schematics: ^11.0.5
  - @nestjs/testing: ^11.1.3
  - @types/bcrypt: ^5.0.0
  - @types/cookie-parser: ^1.4.9
  - @types/jest: ^29.5.2
  - @types/node: ^20.19.1
  - @types/passport-jwt: ^3.0.7
  - eslint: ^9.29.0
  - eslint-config-prettier: ^10.1.5
  - eslint-plugin-import: ^2.30.0
  - eslint-plugin-prettier: ^5.1.0
  - jest: ^29.6.1
  - prettier: ^3.0.0
  - prisma: ^6.10.1
  - rimraf: ^5.0.10
  - ts-jest: ^29.1.0
  - ts-node: ^10.9.1
  - typescript: ^5.1.6

### apps\frontend\package.json
- Name: frontend
- Version: 0.1.0
- Scripts:
  - dev: next dev --turbopack
  - build: next build
  - start: next start
  - lint: next lint
- Dependencies:
  - @fontsource/inter: ^5.2.6
  - @hookform/resolvers: ^5.1.1
  - @radix-ui/react-alert-dialog: ^1.1.14
  - @radix-ui/react-checkbox: ^1.3.2
  - @radix-ui/react-dialog: ^1.1.14
  - @radix-ui/react-dropdown-menu: ^2.1.15
  - @radix-ui/react-label: ^2.1.7
  - @radix-ui/react-popover: ^1.1.14
  - @radix-ui/react-radio-group: ^1.3.7
  - @radix-ui/react-select: ^2.2.5
  - @radix-ui/react-slot: ^1.2.3
  - @radix-ui/react-tabs: ^1.1.12
  - class-variance-authority: ^0.7.1
  - clsx: ^2.1.1
  - cmdk: ^1.1.1
  - date-fns: ^4.1.0
  - geist: ^1.4.2
  - lucide-react: ^0.516.0
  - next: 15.3.3
  - next-themes: ^0.4.6
  - react: ^19.0.0
  - react-day-picker: ^9.7.0
  - react-dom: ^19.0.0
  - react-hook-form: ^7.58.1
  - sonner: ^2.0.5
  - tailwind-merge: ^3.3.1
  - tailwind-variants: ^1.0.0
  - tailwindcss-animate: ^1.0.7
  - zod: ^3.25.67
  - zustand: ^5.0.5
- DevDependencies:
  - @eslint/eslintrc: ^3
  - @tailwindcss/postcss: ^4
  - @types/node: ^20
  - @types/react: ^19
  - @types/react-dom: ^19
  - autoprefixer: ^10.4.21
  - eslint: ^9
  - eslint-config-next: 15.3.3
  - postcss: ^8.5.6
  - tailwindcss: ^3.4.1
  - typescript: ^5
