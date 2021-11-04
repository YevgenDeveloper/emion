import simplegit from 'simple-git/promise'
import fs from 'fs-extra'
import path from 'path'
import { getConfigHandler } from './configurationHandler'
let gitHandler: GitHandler
export default class GitHandler {
  static getGitHandler(vorpal: Vorpal) {
    if (!gitHandler) {
      gitHandler = new GitHandler(vorpal)
    }
    gitHandler.vorpal = vorpal
    return gitHandler
  }
  constructor(private vorpal: Vorpal) {}
  private currentRepo: simplegit.SimpleGit
  public async loadRepo(repoPath: string): Promise<void> {
    this.currentRepo = await simplegit(repoPath)
  }
  public async initializeRepo(repoPath: string) {
    await fs.mkdir(repoPath)
    this.currentRepo = await simplegit(repoPath)
    this.currentRepo.init()
    return this.currentRepo
  }
  public isRepoInitialized(repoPath: string) {
    return fs.existsSync(repoPath)
  }
  public async synchronise() {
    const repositories = getConfigHandler().getRepositoryNames()
    await this.currentRepo.submoduleUpdate(['--init', '--force'])
    for (const repository of repositories) {
      await this.synchroniseRepo(repository)
    }
  }
  public async synchroniseRepo(repoName: string) {
    this.vorpal.log(`SYNCHRONISATION OF ${repoName} - START`)
    try {
      const repository = getConfigHandler().getRepository(repoName)
      const subModulePath = path.join(
        getConfigHandler().getRepoPath(),
        repoName
      )
      if (repository.branch && repository.branch !== 'current') {
        try {
          if (repository.url && !fs.existsSync(subModulePath)) {
            try{
              await this.currentRepo.submoduleAdd(repository.url!, repoName)
            } catch(e) {
              console.log(e)
            }
          }
          const subModuleRepo = await simplegit(subModulePath)
          await subModuleRepo.checkout(repository.branch!)
          await subModuleRepo.pull('origin', repository.branch!)
        } catch (e) {
          console.log('Submodule addition error', e)
          throw e
        }
      } else {
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
          console.log('Submodule copy of current error', e)
          throw e
        }
      }
      this.vorpal.log(`SYNCHRONISATION OF ${repoName} - END`)
    } catch (e) {
      this.vorpal.log(`SYNCHRONISATION OF ${repoName} - FAILED`)
    }
  }
}
