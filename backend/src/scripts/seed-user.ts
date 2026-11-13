import { prisma, connectPrisma, disconnectPrisma } from '../services/prisma.service';
import { hashPassword } from '../utils/password';
import { Logger } from '../utils/logger';

async function seedUser() {
  await connectPrisma();

  const email = process.argv[2] || 'admin@codeprep.dev';
  const plainPassword = process.argv[3] || 'Password123!';
  const displayName = process.argv[4] || 'Lead Engineer';

  const passwordHash = await hashPassword(plainPassword);

  const hasExplicitArgs = process.argv.length > 2;
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase().trim() },
    update: hasExplicitArgs
      ? {
          passwordHash,
          displayName,
        }
      : {},
    create: {
      email: email.toLowerCase().trim(),
      passwordHash,
      displayName,
      themePreference: 'dark',
      timezone: 'Asia/Kolkata',
    },
  });

  Logger.info('SeedScript', `Owner account ready: ${user.email} (Password: ${plainPassword})`);
  await disconnectPrisma();
}

seedUser().catch((err) => {
  console.error('Failed to seed user account', err);
  process.exit(1);
});

