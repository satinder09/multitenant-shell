#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, '..', 'apps', 'backend');
const DOCS_DIR = path.join(__dirname, '..', 'apps', 'docs');

async function generateApiDocs() {
  console.log('🚀 Starting Users API documentation generation...');
  console.log('================================================');
  
  try {
    // Step 1: Build the backend
    console.log('\n📦 Step 1: Building backend...');
    process.chdir(BACKEND_DIR);
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Backend built successfully');

    // Step 2: Generate OpenAPI spec for Users API
    console.log('\n📋 Step 2: Generating Users API OpenAPI specification...');
    execSync('node scripts/generate-openapi-spec.js', { stdio: 'inherit' });
    console.log('✅ Users API OpenAPI spec generated');

    // Step 3: Move to docs directory and integrate
    console.log('\n📚 Step 3: Integrating with Fumadocs...');
    process.chdir(DOCS_DIR);
    
    // Check if the generated spec exists
    const specPath = path.join(DOCS_DIR, 'generated', 'user-api-spec.json');
    if (!fs.existsSync(specPath)) {
      throw new Error('Users API OpenAPI spec not found after generation');
    }

    // Run the integration script
    execSync('node scripts/integrate-api-spec.js', { stdio: 'inherit' });
    console.log('✅ Fumadocs integration completed');

    // Step 4: Install/update Fumadocs OpenAPI dependency if needed
    console.log('\n🔧 Step 4: Checking Fumadocs OpenAPI dependencies...');
    const packageJsonPath = path.join(DOCS_DIR, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (!packageJson.dependencies['fumadocs-openapi']) {
      console.log('Installing fumadocs-openapi...');
      execSync('npm install fumadocs-openapi', { stdio: 'inherit' });
      console.log('✅ Dependencies updated');
    } else {
      console.log('✅ Dependencies already up to date');
    }

    // Step 5: Generate summary report
    console.log('\n📊 Step 5: Generating summary report...');
    await generateSummaryReport();

    console.log('\n🎉 Users API documentation generation completed successfully!');
    console.log('================================================');
    console.log('📖 Documentation is ready at: http://localhost:3001');
    console.log('🔗 Swagger UI available at: http://localhost:4000/api-docs');
    console.log('\nNext steps:');
    console.log('1. Start the docs server: npm run dev (in apps/docs)');
    console.log('2. Start the backend: npm run start:dev (in apps/backend)');
    console.log('3. Review the generated Users API documentation');
    console.log('4. Update any custom content as needed');
    
    return {
      success: true,
      message: 'Users API documentation generated successfully'
    };

  } catch (error) {
    console.error('\n❌ Error during Users API documentation generation:', error.message);
    console.error('Stack trace:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

async function generateSummaryReport() {
  try {
    const specPath = path.join(DOCS_DIR, 'generated', 'user-api-spec.json');
    const openApiSpec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    
    const pathCount = Object.keys(openApiSpec.paths).length;
    const methodCount = Object.values(openApiSpec.paths).reduce((total, pathItem) => {
      return total + Object.keys(pathItem).length;
    }, 0);
    
    const tags = openApiSpec.tags || [];
    const securitySchemes = Object.keys(openApiSpec.components?.securitySchemes || {});
    
    const reportContent = `# Users API Documentation Generation Report

Generated on: ${new Date().toISOString()}

## Summary Statistics

- **API Title**: ${openApiSpec.info.title}
- **Version**: ${openApiSpec.info.version}
- **Total API Paths**: ${pathCount}
- **Total HTTP Methods**: ${methodCount}
- **API Groups (Tags)**: ${tags.length}
- **Security Schemes**: ${securitySchemes.length}

## API Overview

This documentation covers the complete Users API for the multitenant shell application, providing:

- **Complete CRUD Operations**: Create, read, update, and delete users
- **Advanced Filtering**: Search users by name, email, role, and status
- **Pagination**: Efficient handling of large user datasets
- **Role-based Access**: Support for different user roles (user, admin, manager)
- **Status Management**: Handle active, inactive, and suspended users
- **Comprehensive Validation**: Robust input validation with detailed error messages

## API Endpoints

${Object.entries(openApiSpec.paths).map(([path, methods]) => {
  const methodList = Object.keys(methods).map(method => method.toUpperCase()).join(', ');
  return `### ${path}
Supported methods: ${methodList}
`;
}).join('\n')}

## Security Configuration

${securitySchemes.map(scheme => `- ${scheme}`).join('\n')}

## Generated Files

### Backend
- \`apps/backend/dist/\` - Compiled NestJS application
- \`apps/docs/generated/user-api-spec.json\` - Users API OpenAPI specification

### Documentation
- \`apps/docs/content/api.mdx\` - Complete Users API documentation
- \`apps/docs/content/api/users.mdx\` - Users API overview (auto-generated)
- \`apps/docs/content/api/users-reference.mdx\` - Interactive API reference (auto-generated)

## User Roles Supported

- **user**: Standard user with basic permissions
- **admin**: Administrative user with elevated permissions
- **manager**: Management user with intermediate permissions

## User Status Types

- **active**: User can access the system
- **inactive**: User account is temporarily disabled
- **suspended**: User account is suspended due to policy violations

## Next Steps

1. **Review Generated Documentation**: Check the generated MDX files for accuracy
2. **Customize Content**: Add examples, tutorials, or additional explanations
3. **Update Authentication Guide**: Ensure auth instructions are up to date
4. **Test Interactive Features**: Verify the OpenAPI integration works correctly
5. **Deploy**: Push changes to your documentation hosting platform

## Automation Commands

To regenerate this documentation:
\`\`\`bash
# From project root
npm run api:generate

# Or step by step:
cd apps/backend && npm run build
cd apps/backend && npm run api:generate
cd apps/docs && npm run api:sync
\`\`\`

## Developer Workflow

1. **Add new endpoints**: Create controllers with proper Swagger decorators
2. **Update documentation**: Run \`npm run api:generate\` from project root
3. **Customize content**: Edit the generated MDX files as needed
4. **Test**: Start both backend and docs servers to verify integration
5. **Deploy**: Commit and push changes

## Perfect Sample Features

This Users API serves as a perfect sample with:
- ✅ Comprehensive Swagger documentation
- ✅ Complete CRUD operations
- ✅ Advanced filtering and pagination
- ✅ Role-based access control
- ✅ Status management
- ✅ Robust error handling
- ✅ Input validation
- ✅ Consistent response formats
- ✅ Security best practices
- ✅ Auto-generated documentation

---

*This report was generated automatically by the Multitenant Shell Users API Documentation Generator*
`;

    const reportPath = path.join(DOCS_DIR, 'generated', 'generation-report.md');
    fs.writeFileSync(reportPath, reportContent);
    
    console.log(`📄 Summary report generated: ${reportPath}`);
    console.log(`📊 Generated documentation for ${pathCount} API paths with ${methodCount} HTTP methods`);
    
  } catch (error) {
    console.error('⚠️  Could not generate summary report:', error.message);
  }
}

// Run the generator if this file is executed directly
if (require.main === module) {
  generateApiDocs()
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { generateApiDocs }; 