import { PrismaClient } from '../generated/master-prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding master user...');
  const passwordHash = await bcrypt.hash('P@ssw0rd123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'admin@localhost.com' },
    update: {},
    create: {
      email: 'admin@localhost.com',
      passwordHash,
      name: 'Super Admin',
      isSuperAdmin: true,
    },
  });

  console.log({ user });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 