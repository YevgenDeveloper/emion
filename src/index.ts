import { getConfigHandler } from '@/configurationHandler'
import { configureWorkingPath } from '@/configurationSteps'
import EnvironmentsRunner from '@/environmentsRunner'
import GitHandler from '@/gitHandler'
import { vorpalLog } from '@/utils'
import CFonts from 'cfonts'
import Vorpal from 'vorpal'
const v: Vorpal = new Vorpal()
const run = async (configFilePath: string) => {
  try {
    await plugInExitHandler()
    await initializeCommands(configFilePath)
    await start(configFilePath)
  } catch (e) {
    vorpalLog(v, `An error occured: ${e.toString()}`)
    v.exec('exit')
  }
}
async function initializeCommands(configFilePath: string) {
  v.command(
    'init',
    'Initialisation of empty configuration file'
  ).action(async function (
    this: Vorpal.CommandInstance,
    args: any,
    callback: any
  ) {
    this.log((v as any).chalk.yellow('Initialisation of empty configuration file'))
    const response: any = await this.prompt({
      type: 'confirm',
      name: 'configureSetup',
      message:
        `Do you want to configure blank configuration file at ${configFilePath} ?`
    })
    if (response.configureSetup) {
      await getConfigHandler().loadDefaultConfigFile(configFilePath)
      await configureWorkingPath(this)
      await getConfigHandler().save()
    }
    callback()
  } as Vorpal.Action)
  v.command(
    'run [envName] [additionalArgs]',
    'Select an environment to run (with all its dependencies)'
  ).autocomplete({
    async data() {
      return getConfigHandler().getEnvironmentsNames()
    }
  }).action(
    async function (
      this: Vorpal.CommandInstance,
      args: any,
      callback: any
    ) {
      await GitHandler.getGitHandler(v).synchronise()
      const envs: string[] = getConfigHandler().getEnvironmentsNames()
      if (envs.length > 0) {
        if (args.envName) {
          EnvironmentsRunner.getEnvironmentsRunner().initialize(v)
          await EnvironmentsRunner.getEnvironmentsRunner().runEnvironment(
            { envName: args.envName, args: args.additionalArgs }
          )
          callback()
        } else {
          const env = (await this.prompt({
            type: 'list',
            name: 'env',
            message: 'Which environment do you want to run ? ',
            choices: envs
          })).env as string
          EnvironmentsRunner.getEnvironmentsRunner().initialize(v)
          await EnvironmentsRunner.getEnvironmentsRunner().runEnvironment({ envName: env })
          callback()
        }
      } else {
        v.log((v as any).chalk.red('No repository with tasks to be run found. Did you edited the configuration file ?'))
        callback()
      }
    } as Vorpal.Action)
  v.command('running', 'List all running environments').action(
    async function (
      this: Vorpal.CommandInstance,
      args: any,
      callback: any
    ) {
      this.log((v as any).chalk.green('Here is the list of the running environments:'))
      const runningCommands = EnvironmentsRunner.getEnvironmentsRunner().getRunningCommands()
      const pids = Object.keys(runningCommands)
      for (const pid of pids) {
        vorpalLog(v, `${runningCommands[pid].id} (pid:${pid})`)
      }
      callback()
    } as Vorpal.Action)
  v.command('reload', 'Reload the configuration file with last version from disk').action(
    async function (
      this: Vorpal.CommandInstance,
      args: any,
      callback: any
    ) {
      this.log((v as any).chalk.green('Reloading...'))
      await getConfigHandler().loadConfigFile(configFilePath)
      this.log((v as any).chalk.green('Done'))
      callback()
    } as Vorpal.Action)
}
async function start(configFilePath: string) {
  v.show()
  const title = CFonts.render('Endymion', {
    font: 'chrome', 
    align: 'center', 
    colors: ['candy', 'candy', 'candy'], 
    background: 'transparent', 
    letterSpacing: 1, 
    lineHeight: 1, 
    space: false, 
    maxLength: '0' 
  })
  vorpalLog(v, title.string)
  const subtitle = CFonts.render('A simple Node.js task orchestrator\n', {
    font: 'console', 
    align: 'center', 
    colors: 'white', 
    background: 'transparent', 
    letterSpacing: 1, 
    lineHeight: 1, 
    space: false, 
    maxLength: '0' 
  })
  vorpalLog(v, subtitle.string)
  const isConfigFileExisting = getConfigHandler().isConfigFileExisting(configFilePath)
  if (!isConfigFileExisting) {
    await v.exec('init')
  }
  await getConfigHandler().loadConfigFile(configFilePath)
  vorpalLog(v,
    (v as any).chalk.yellow(
      `Config file is avaible at: ${getConfigHandler().getConfigFilePath()}\nEdit it through VSCode to take benefit from autocomplete & documentation`
    )
  )
  const repoPath = getConfigHandler().getRepoPath()
  if (!repoPath) {
    v.log((v as any).chalk.red('No folder path defined for execution repository. Exiting...'))
    await v.exec('exit')
  }
  if (!GitHandler.getGitHandler(v).isRepoInitialized(repoPath)) {
    await GitHandler.getGitHandler(v).initializeRepo(repoPath)
  } else {
    await GitHandler.getGitHandler(v).loadRepo(repoPath)
  }
  const runEnv = process.argv.slice(3)[0]
  if (runEnv) {
    await GitHandler.getGitHandler(v).synchronise()
    EnvironmentsRunner.getEnvironmentsRunner().initialize(v)
    await EnvironmentsRunner.getEnvironmentsRunner().runEnvironment({ envName: runEnv, args: process.argv.slice(4) })
    await v.exec('exit')
  } else {
    await v.exec('help')
  }
}
async function plugInExitHandler() {
  function exitHandler(options: any, exitCode: any) {
    if (options.cleanup) {
      EnvironmentsRunner.getEnvironmentsRunner().cleanRunningCommands()
    }
    if (exitCode || exitCode === 0) {
      if (options.exit) { process.exit(0) }
    }
  }
  process.on('exit', async (code) => {
    await exitHandler({ cleanup: true }, code)
  })
  process.on('SIGINT', async (code) => {
    await exitHandler({ exit: true }, code)
  })
  process.on('SIGUSR1', async (code) => {
    await exitHandler({ exit: true }, code)
  })
  process.on('SIGUSR2', async (code) => {
    await exitHandler({ exit: true }, code)
  })
  process.on('uncaughtException', async (code) => {
    await exitHandler({ exit: true }, code)
  })
}
const [nodePath, scriptPath, cfgFilePath] = process.argv
run(cfgFilePath)
