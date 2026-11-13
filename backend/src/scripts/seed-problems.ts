import { prisma, connectPrisma, disconnectPrisma } from '../services/prisma.service';
import { ProblemService } from '../services/problem.service';
import { Logger } from '../utils/logger';

async function seedProblems() {
  await connectPrisma();

  Logger.info('SeedProblemsScript', 'Executing standalone curriculum synchronization for 600 problems...');
  await ProblemService.seedInitialProblems();

  const finalCount = await prisma.problem.count();
  const dsaCount = await prisma.problem.count({ where: { category: 'DSA' } });
  const sqlCount = await prisma.problem.count({ where: { category: 'SQL' } });

  Logger.info('SeedProblemsScript', `Curriculum verification: Total = ${finalCount} (${dsaCount} DSA, ${sqlCount} SQL).`);

  await disconnectPrisma();
}

seedProblems()
  .then(() => {
    console.log('Problem seeding completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to seed curriculum problems', err);
    process.exit(1);
  });

