import simplegit from 'simple-git/promise'
import fs from 'fs'
const fsPromises = fs.promises
import path from 'path'
import { getConfigHandler } from './configurationHandler';
let gitHandler: GitHandler
export default class GitHandler {
  static getGitHandler(vorpal:Vorpal) {
    if(!gitHandler){
      gitHandler = new GitHandler(vorpal)
    }
    gitHandler.vorpal = vorpal
    return gitHandler
  }
  constructor(private vorpal:Vorpal) {
  }
  private currentRepo: simplegit.SimpleGit
 public loadRepo(
  repoPath: string
): simplegit.SimpleGit | PromiseLike<simplegit.SimpleGit> {
  return simplegit(repoPath)
}
public async initializeRepo(repoPath: string) {
  await fsPromises.mkdir(repoPath)
  this.currentRepo = await simplegit(repoPath)
  this.currentRepo.init()
  return this.currentRepo
}
public isRepoInitialized(repoPath: string) {
  return fs.existsSync(repoPath)
}
 public async synchronise() {
  const repositories = getConfigHandler().getRepositoryNames()
  for (const repository of repositories) {
    await this.synchroniseRepo(repository)
  }
}
public async  synchroniseRepo(repoName: string) {
  this.vorpal.log(`SYNCHRONISATION OF ${repoName} - START`)
  const repository = getConfigHandler().getRepository(repoName)
  try {
    if (repository.url) {
      await this.currentRepo.submoduleAdd(
        repository.url!,
        path.join(getConfigHandler().getRepoPath(), repoName)
      )
    }
  } catch (e) {
  }
  const subModuleRepo = await simplegit(
    path.join(getConfigHandler().getRepoPath(), repoName)
  )
  if (repository.branch) {
    await subModuleRepo.checkout(repository.branch!)
    await subModuleRepo.pull('origin', repository.branch!)
  }
  this.vorpal.log(`SYNCHRONISATION OF ${repoName} - END`)
}
}
