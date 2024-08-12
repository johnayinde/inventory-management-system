const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const tenantPermissions = async () => {
  const auth_permissions_ids = (
    await prisma.auth.findMany({
      where: { is_user: false },
      select: { permission: { select: { id: true } } },
    })
  ).map((auth) => auth.permission.id);

  await prisma.permission.updateMany({
    where: { id: { in: auth_permissions_ids } },
    data: {
      dashboard: true,
      customers: true,
      expenses: true,
      inventory: true,
      report: true,
      sales: true,
      product: true,
      settings: true,
      shipment: true,
    },
  });
};

tenantPermissions()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
