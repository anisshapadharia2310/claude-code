/**
 * Repository factory.
 *
 * DATA_SOURCE=postgres (default) uses Prisma. DATA_SOURCE=memory boots the same
 * seed dataset in process, runs the real qualification engine over it, and
 * serves the application without a database.
 */
import { hashPassword } from '../auth/password';
import { MemoryRepository } from './memory-repo';
import { PrismaRepository } from './prisma-repo';
import { applySeedQualification } from '../seed/qualify-seed';
import type { SignalRepository } from './types';

export type { SignalRepository, CampaignContactFull, ContactWithAccount, AccountWithContacts } from './types';

const globalForRepo = globalThis as unknown as {
  signalRepository?: SignalRepository;
  signalRepositoryInit?: Promise<SignalRepository>;
};

export function dataSource(): 'postgres' | 'memory' {
  return process.env.DATA_SOURCE === 'memory' ? 'memory' : 'postgres';
}

async function createRepository(): Promise<SignalRepository> {
  if (dataSource() === 'memory') {
    const repo = new MemoryRepository(hashPassword(process.env.SEED_PASSWORD ?? 'signal123'));
    await applySeedQualification(repo);
    return repo;
  }
  return new PrismaRepository();
}

/**
 * The process-wide repository. Memory mode seeds and scores exactly once, even
 * under concurrent first requests.
 */
export function getRepository(): Promise<SignalRepository> {
  if (globalForRepo.signalRepository) return Promise.resolve(globalForRepo.signalRepository);
  if (!globalForRepo.signalRepositoryInit) {
    globalForRepo.signalRepositoryInit = createRepository().then((repo) => {
      globalForRepo.signalRepository = repo;
      return repo;
    });
  }
  return globalForRepo.signalRepositoryInit;
}
