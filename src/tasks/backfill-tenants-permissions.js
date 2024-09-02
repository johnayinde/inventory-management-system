require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const tenantPermissions = async () => {
  await prisma.auth.updateMany({
    where: { is_user: false },
    data: { is_super_admin: true },
  });
};

tenantPermissions()
  .then(async () => {
    console.info('Backfilling...');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(() => console.info('Done.'));
