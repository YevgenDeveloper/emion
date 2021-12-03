import fs from 'fs-extra'
import path from 'path'
import simplegit from 'simple-git/promise'
import Vorpal from 'vorpal'
import { getConfigHandler } from './configurationHandler'
import logger from './logger'
import { LogStartEnd } from './utils'
let gitHandler: GitHandler
export default class GitHandler {
  public static getGitHandler(vorpal: Vorpal) {
    if (!gitHandler) {
      gitHandler = new GitHandler(vorpal)
    }
    gitHandler.vorpal = vorpal
    return gitHandler
  }
  private currentRepo: simplegit.SimpleGit
  constructor(private vorpal: Vorpal) { }
  @LogStartEnd()
  public async loadRepo(repoPath: string): Promise<void> {
    this.currentRepo = await simplegit(repoPath)
  }
  @LogStartEnd()
  public async initializeRepo(repoPath: string) {
    await fs.mkdir(repoPath)
    logger.debug('Start simple git initialization')
    this.currentRepo = await simplegit(repoPath)
    logger.debug('Repo retrieved')
    this.currentRepo.init()
    logger.debug('Repo initialized')
    return this.currentRepo
  }
  public isRepoInitialized(repoPath: string) {
    return fs.existsSync(repoPath)
  }
  @LogStartEnd()
  public async synchronise() {
    const repositories = getConfigHandler().getRepositoryNames()
    logger.debug('Start updating submodules')
    try {
      await this.currentRepo.submoduleUpdate(['--init', '--force'])
    } catch (e) {
      logger.debug(e)
    }
    logger.debug('Updating submodules done')
    for (const repository of repositories) {
      logger.debug(`Starting synchronisation of repo ${repository}`)
      await this.synchroniseRepo(repository)
      logger.debug(`Synchronisation of repo ${repository} done`)
    }
  }
  @LogStartEnd()
  public async synchroniseRepo(repoName: string) {
    this.vorpal.log(`SYNCHRONISATION OF ${repoName} - START`)
    try {
      const repository = getConfigHandler().getRepository(repoName)
      const subModulePath = path.join(
        getConfigHandler().getRepoPath(),
        repoName
      )
      if (repository.branch && repository.branch !== 'current') {
        logger.info(`Retrieving branch ${repository.branch} of ${repoName}`)
        try {
          if (repository.url && !fs.existsSync(subModulePath)) {
            try {
              logger.debug(`Starting addition of submodule from ${repository.url} with name '${repoName}`)
              await this.currentRepo.submoduleAdd(repository.url!, repoName)
              logger.debug(`Addition of submodule from ${repository.url} with name '${repoName} done`)
            } catch (e) {
              logger.error(e)
            }
          }
          logger.debug(`Starting initialization of simple git at ${subModulePath}`)
          const subModuleRepo = await simplegit(subModulePath)
          logger.debug(`Initialization of simple git at ${subModulePath} done`)
          logger.debug('Starting fetch all')
          await subModuleRepo.fetch(['--all'])
          logger.debug('Fetch all done')
          logger.debug(`Starting checkout for branch ${repository.branch}`)
          await subModuleRepo.checkout(repository.branch!)
          logger.debug('Checkout done')
          logger.debug(`Starting pulling ${repository.branch}`)
          await subModuleRepo.pull('origin', repository.branch!)
          logger.debug('Pulling done')
          logger.debug(`Starting checkout for branch ${repository.branch}`)
          await subModuleRepo.checkout(repository.branch!)
          logger.debug('Checkout done')
        } catch (e) {
          logger.error('Submodule addition error', e)
          throw e
        }
      } else {
        logger.info(`Retrieving ${repoName} in current status (by copy)`)
        try {
          if (repository.url) {
            await fs.copy(repository.url, subModulePath, {
              overwrite: true,
              recursive: true,
              dereference: true,
              filter: (src, dest) => {
                return !(src.endsWith('.git') || src.endsWith('node_modules'))
              }
            })
          }
        } catch (e) {
          logger.error('Submodule copy of current error', e)
          throw e
        }
      }
      this.vorpal.log(`SYNCHRONISATION OF ${repoName} - END`)
    } catch (e) {
      this.vorpal.log(`SYNCHRONISATION OF ${repoName} - FAILED`)
    }
  }
}
