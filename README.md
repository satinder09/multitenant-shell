# XoroERP Lite - Multi-Tenant ERP System

XoroERP Lite is a modern, scalable, and lightweight multi-tenant Enterprise Resource Planning (ERP) application. It is designed to serve multiple client organizations (tenants) from a single deployed instance, while ensuring strict data isolation for each tenant through a database-per-tenant architecture.

## ✨ Key Features

- **Multi-Tenancy**: Separate database for each tenant ensures data isolation and security.
- **Centralized Authentication**: A single master user database manages all users and their access to different tenants.
- **Automated Tenant Provisioning**: New tenant databases are created and migrated automatically on tenant creation.
- **Role-Based Access Control**: (Future-ready) The schema is prepared for granular user permissions within each tenant.
- **Modern Tech Stack**: Built with NestJS and Next.js for a robust and scalable solution.

## 🛠️ Technology Stack

- **Backend**:
  - [NestJS](https://nestjs.com/) - A progressive Node.js framework for building efficient, reliable and scalable server-side applications.
  - [Prisma](https://www.prisma.io/) - Next-generation ORM for Node.js and TypeScript.
- **Frontend**:
  - [Next.js](https://nextjs.org/) - The React Framework for Production.
  - [TypeScript](https://www.typescriptlang.org/) - Strongly typed programming language that builds on JavaScript.
  - [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework for rapid UI development.
  - [shadcn/ui](https://ui.shadcn.com/) - Beautifully designed components that you can copy and paste into your apps.
- **Database**:
  - [PostgreSQL](https://www.postgresql.org/) - A powerful, open source object-relational database system.
- **Containerization**:
  - [Docker](https://www.docker.com/) - For running the PostgreSQL database consistently across environments.

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or later)
- [Docker](https://www.docker.com/products/docker-desktop/) and Docker Compose
- A package manager like `npm`, `yarn`, or `pnpm`

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd XoroERP-Lite
```

### 2. Configure Environment Variables

You need to set up `.env` files for both the backend and frontend.

**Backend (`apps/backend/.env`)**:
```env
# Example for apps/backend/.env
# Use the credentials from your docker-compose.yml
DATABASE_URL="postgresql://user:password@localhost:5432/xoroerplite_master?schema=public"

# A strong secret for signing JWTs
JWT_SECRET="YOUR_SUPER_SECRET_JWT_KEY"

# A 32-character key for encrypting tenant DB credentials
TENANT_DB_ENCRYPTION_KEY="YOUR_SUPER_SECRET_ENCRYPTION_KEY"
```

**Frontend (`apps/frontend/.env`)**:
```env
# Example for apps/frontend/.env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

### 3. Install Dependencies

Install dependencies for both the frontend and backend applications.

```bash
# From the root directory
npm install
# Or if you have a monorepo setup, you might install at the root
# and then in individual apps if needed.
```
*Note: This project is structured like a monorepo but doesn't use a formal tool like Turborepo or Nx. You will need to install dependencies in each app separately.*

```bash
# In the backend directory
cd apps/backend
npm install

# In the frontend directory
cd ../frontend
npm install

# Go back to root
cd ../..
```

### 4. Start the Database

From the root directory, start the PostgreSQL database using Docker.

```bash
docker-compose up -d
```

### 5. Run Database Migrations

Apply migrations to the master database to set up the required tables.

```bash
cd apps/backend
npx prisma migrate dev --name init
```

### 6. Seed the Database

Create the initial super-admin user by running the seed script.

```bash
npx prisma db seed
```

### 7. Run the Application

Now you can start the development servers for both the backend and frontend.

**Terminal 1: Start the Backend**
```bash
cd apps/backend
npm run start:dev
```
The backend will be running on `http://localhost:3001`.

**Terminal 2: Start the Frontend**
```bash
cd apps/frontend
npm run dev
```
The frontend will be running on `http://localhost:3000`.

You can now log in with the super-admin credentials created by the seed script.

## 📂 Project Structure

The project is organized as a monorepo-style workspace with two main applications:

- `apps/backend/`: The NestJS application that handles all business logic, API endpoints, and database interactions.
- `apps/frontend/`: The Next.js application that provides the user interface.

This separation of concerns allows for independent development, testing, and deployment of the backend and frontend.
