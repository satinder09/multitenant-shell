#!/usr/bin/env node

/**
 * Database Connection Test Script
 * Tests various database connection options and provides specific setup guidance
 */

const { spawn } = require('child_process');
const { existsSync } = require('fs');

function runCommand(command, args = []) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'pipe' });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout?.on('data', (data) => stdout += data.toString());
    child.stderr?.on('data', (data) => stderr += data.toString());
    
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
    
    child.on('error', () => {
      resolve({ code: -1, stdout: '', stderr: 'Command not found' });
    });
  });
}

async function testPostgreSQL() {
  console.log('🔍 Testing PostgreSQL availability...\n');
  
  // Test 1: Check if psql command exists
  console.log('1. Checking if PostgreSQL client is installed...');
  const psqlTest = await runCommand('psql', ['--version']);
  
  if (psqlTest.code === 0) {
    console.log('✅ PostgreSQL client found:', psqlTest.stdout.trim());
  } else {
    console.log('❌ PostgreSQL client not found');
    console.log('   Install from: https://www.postgresql.org/download/windows/\n');
    return false;
  }
  
  // Test 2: Check if PostgreSQL server is running
  console.log('\n2. Testing PostgreSQL server connection...');
  const connectionTest = await runCommand('psql', [
    '-h', 'localhost',
    '-U', 'postgres', 
    '-d', 'postgres',
    '-c', 'SELECT version();'
  ]);
  
  if (connectionTest.code === 0) {
    console.log('✅ PostgreSQL server is running');
    console.log('✅ Connection successful');
    return true;
  } else {
    console.log('❌ Cannot connect to PostgreSQL server');
    console.log('   Error:', connectionTest.stderr.trim() || 'Connection refused');
    console.log('   Make sure PostgreSQL service is running\n');
    return false;
  }
}

async function testDatabase() {
  console.log('3. Testing multitenant_master database...');
  
  const dbTest = await runCommand('psql', [
    '-h', 'localhost',
    '-U', 'postgres',
    '-d', 'multitenant_master',
    '-c', 'SELECT 1;'
  ]);
  
  if (dbTest.code === 0) {
    console.log('✅ Database multitenant_master exists');
    return true;
  } else {
    console.log('❌ Database multitenant_master does not exist');
    console.log('   Creating database...');
    
    const createDb = await runCommand('psql', [
      '-h', 'localhost',
      '-U', 'postgres',
      '-d', 'postgres',
      '-c', 'CREATE DATABASE multitenant_master;'
    ]);
    
    if (createDb.code === 0) {
      console.log('✅ Database created successfully');
      return true;
    } else {
      console.log('❌ Failed to create database');
      console.log('   Error:', createDb.stderr.trim());
      return false;
    }
  }
}

async function testPrisma() {
  console.log('\n4. Testing Prisma setup...');
  
  // Check if Prisma client is generated
  if (existsSync('./generated/master-prisma')) {
    console.log('✅ Prisma client exists');
  } else {
    console.log('⚠️  Prisma client not generated, generating...');
    const generate = await runCommand('npx', ['prisma', 'generate']);
    
    if (generate.code === 0) {
      console.log('✅ Prisma client generated');
    } else {
      console.log('❌ Failed to generate Prisma client');
      console.log('   Error:', generate.stderr.trim());
      return false;
    }
  }
  
  // Test migrations
  console.log('   Testing database migrations...');
  const migrate = await runCommand('npx', ['prisma', 'migrate', 'deploy']);
  
  if (migrate.code === 0) {
    console.log('✅ Database migrations applied');
    return true;
  } else {
    console.log('❌ Failed to apply migrations');
    console.log('   Error:', migrate.stderr.trim());
    return false;
  }
}

async function main() {
  console.log('🚀 Database Setup Test\n');
  console.log('============================\n');
  
  const postgresOk = await testPostgreSQL();
  
  if (!postgresOk) {
    console.log('\n📋 Setup Instructions:');
    console.log('1. Install PostgreSQL: https://www.postgresql.org/download/windows/');
    console.log('2. Set password to "postgres" during installation');
    console.log('3. Start PostgreSQL service');
    console.log('4. Run this script again');
    console.log('\n💡 Alternative: Use a cloud database (see quick-db-setup.md)');
    return;
  }
  
  const dbOk = await testDatabase();
  if (!dbOk) {
    console.log('\n❌ Database setup failed. Please check PostgreSQL installation.');
    return;
  }
  
  const prismaOk = await testPrisma();
  if (!prismaOk) {
    console.log('\n❌ Prisma setup failed. Please check the error messages above.');
    return;
  }
  
  console.log('\n🎉 Database setup complete!');
  console.log('\n✅ Next steps:');
  console.log('1. npm run start:dev');
  console.log('2. Visit http://lvh.me:3000/login');
  console.log('3. Run debugCsrf() in browser console');
  console.log('4. Try logging in');
}

if (require.main === module) {
  main().catch(console.error);
} 