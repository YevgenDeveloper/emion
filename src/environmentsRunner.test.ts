import ChildProcessEnventsHandler from '@/childProcessEventsHandlers'
import { IExecutionEnvironement, IRepositoryConfiguration } from '@/configuration.interface'
import ConfigurationHandler from '@/configurationHandler'
import EnvironmentsRunner from '@/environmentsRunner'
import test from 'ava'
import sinon, { stub } from 'sinon'
import Vorpal from 'vorpal'
test('Should return a runner from the static method', (t) => {
  const result = EnvironmentsRunner.getEnvironmentsRunner()
  t.is(result.constructor.name, 'EnvironmentsRunner')
})
function plugInStubs({ env, repo, execFunction, doNotStubExecuteEnvironement }: {
  env?: IExecutionEnvironement,
  repo?: IRepositoryConfiguration,
  execFunction?: () => Promise<number>,
  doNotStubExecuteEnvironement?: boolean
}) {
  const stubs: any = {
  }
  if (execFunction) {
    stubs.execute = stub(ChildProcessEnventsHandler.prototype, 'execute')
      .callsFake(execFunction)
  } else {
    stubs.execute = stub(ChildProcessEnventsHandler.prototype, 'execute')
      .callsFake(async function f(this: ChildProcessEnventsHandler) {
        if (this.onInit) {
          await this.onInit()
        }
        await this.onNewDataFromStandardOutput('Standard Output', 1)
        await this.onNewDataFromErrorOutput('Error Output', 1)
        await this.onExit(0, 1)
        return 1
      })
  }
  stubs.log = stub(Vorpal.prototype, 'log').returnsThis()
  const testEnv: IExecutionEnvironement = env || {
    command: 'echo "Haha" && exit 0',
    id: 'testEnv',
    repo: 'testRepo'
  }
  stubs.getEnvironment = stub(ConfigurationHandler.prototype, 'getEnvironment').returns(testEnv)
  const testRepo: IRepositoryConfiguration = repo || {
    environments: {
      testEnv
    },
    initCommand: 'echo "Huhu" && exit 0'
  }
  stubs.getRepository = stub(ConfigurationHandler.prototype, 'getRepository').returns(testRepo)
  stubs.getRepoPath = stub(ConfigurationHandler.prototype, 'getRepoPath').returns('/')
  if (!doNotStubExecuteEnvironement) {
    stubs.executeEnvironement = stub(EnvironmentsRunner.prototype, 'executeEnvironement').resolves(undefined)
  }
  return stubs
}
function restoreMethods(stubs: {
  [key: string]: sinon.SinonStub
}) {
  const keys = Object.keys(stubs)
  keys.forEach((key) => stubs[key].restore())
}
test.serial('Should log the correct information while running an environement', async (t) => {
  const stubs = plugInStubs({})
  const v: Vorpal = new Vorpal()
  const runner = EnvironmentsRunner.getEnvironmentsRunner()
  runner.initialize(v)
  await runner.runEnvironement('testEnv')
  const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
  t.is(stubs.log.getCall(0).args.length, 1)
  t.is(stubs.log.getCall(0).args[0].replace(ansiRegex, ''), '[testEnv] STARTING ENVIRONMENT')
  t.is(stubs.log.getCall(1).args.length, 1)
  t.is(stubs.log.getCall(1).args[0].replace(ansiRegex, ''), '[testEnv] INITIALISATION - START')
  t.is(stubs.log.getCall(2).args.length, 1)
  t.is(stubs.log.getCall(2).args[0].replace(ansiRegex, ''), '[testEnv] Standard Output')
  t.is(stubs.log.getCall(3).args.length, 1)
  t.is(stubs.log.getCall(3).args[0].replace(ansiRegex, ''), '[testEnv] Error Output')
  t.is(stubs.log.getCall(4).args.length, 1)
  t.is(stubs.log.getCall(4).args[0].replace(ansiRegex, ''), '[testEnv] INITIALISATION - END')
  t.pass()
  restoreMethods(stubs)
})
test.serial('Should log the correct information while running an environement with no init command', async (t) => {
  const testEnv = {
    command: 'echo "Haha" && exit 0',
    id: 'testEnv',
    repo: 'testRepo',
    currentPid: 1
  }
  const stubs = plugInStubs({
    repo: {
      environments: {
        testEnv
      }
    }
  })
  const v: Vorpal = new Vorpal()
  const runner = EnvironmentsRunner.getEnvironmentsRunner()
  runner.initialize(v)
  await runner.runEnvironement('testEnv')
  const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
  t.is(stubs.log.getCall(0).args.length, 1)
  t.is(stubs.log.getCall(0).args[0].replace(ansiRegex, ''), '[testEnv] STARTING ENVIRONMENT')
  t.pass()
  restoreMethods(stubs)
})
test.serial('Should log the correct information while trying to run an already running environement', async (t) => {
  const stubs = plugInStubs({
    env: {
      command: 'echo "Haha" && exit 0',
      id: 'testEnv',
      repo: 'testRepo',
      currentPid: 1
    },
    execFunction: async function f(this: ChildProcessEnventsHandler) {
      this.onInit()
      this.onNewDataFromStandardOutput('Standard Output', 1)
      this.onNewDataFromErrorOutput('Error Output', 1)
      this.onExit(0, 1)
      return 1
    }
  })
  const v: Vorpal = new Vorpal()
  const runner = EnvironmentsRunner.getEnvironmentsRunner()
  runner.initialize(v)
  await runner.runEnvironement('testEnv')
  const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
  t.is(stubs.log.getCall(0).args.length, 1)
  t.is(stubs.log.getCall(0).args[0].replace(ansiRegex, ''), '[testEnv] ENVIRONMENT IS ALREADY RUNNING WITH PID 1')
  t.pass()
  restoreMethods(stubs)
})
test.serial('Should log the correct information while executing an environement', async (t) => {
  const testEnv: IExecutionEnvironement = {
    command: 'echo "Haha" && exit 0',
    id: 'testEnv',
    repo: 'testRepo'
  }
  const stubs = plugInStubs({
    doNotStubExecuteEnvironement: true
  })
  const v: Vorpal = new Vorpal()
  const runner = EnvironmentsRunner.getEnvironmentsRunner()
  runner.initialize(v)
  await runner.executeEnvironement({ env: testEnv, color: 'red' })
  const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
  t.is(stubs.log.getCall(0).args.length, 1)
  t.is(stubs.log.getCall(0).args[0].replace(ansiRegex, ''), '[testEnv] Standard Output')
  t.is(stubs.log.getCall(1).args.length, 1)
  t.is(stubs.log.getCall(1).args[0].replace(ansiRegex, ''), '[testEnv] Error Output')
  t.pass()
  restoreMethods(stubs)
})
test.serial('Should log the correct information while executing an environement that waits for a console mesage', async (t) => {
  const testEnv: IExecutionEnvironement = {
    command: 'echo "Haha" && exit 0',
    id: 'testEnv',
    repo: 'testRepo',
    readyWhen: {
      consoleMessageIsFound: 'READY on port ${port}'
    }
  }
  const stubs = plugInStubs({
    doNotStubExecuteEnvironement: true,
    env: testEnv,
    execFunction: async function f(this: ChildProcessEnventsHandler) {
      if (this.onInit) {
        await this.onInit()
      }
      await this.onNewDataFromStandardOutput('Standard Output 1', 1)
      await this.onNewDataFromStandardOutput('READY on port 1234', 1)
      await this.onNewDataFromStandardOutput('Standard Output 2', 1)
      await this.onExit(0, 1)
      return 1
    }
  })
  const v: Vorpal = new Vorpal()
  const runner = EnvironmentsRunner.getEnvironmentsRunner()
  runner.initialize(v)
  await runner.executeEnvironement({ env: testEnv })
  const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
  t.is(stubs.log.getCall(0).args.length, 1)
  t.is(stubs.log.getCall(0).args[0].replace(ansiRegex, ''), '[testEnv] Standard Output 1')
  t.is(stubs.log.getCall(1).args.length, 1)
  t.is(stubs.log.getCall(1).args[0].replace(ansiRegex, ''), '[testEnv] READY on port 1234')
  t.is(stubs.log.getCall(2).args.length, 1)
  t.is(stubs.log.getCall(2).args[0].replace(ansiRegex, ''), '[testEnv] ENVIRONMENT READY ON PORT 1234')
  t.is(stubs.log.getCall(3).args.length, 1)
  t.is(stubs.log.getCall(3).args[0].replace(ansiRegex, ''), '[testEnv] Standard Output 2')
  t.pass()
  restoreMethods(stubs)
})
test.serial('Should log the correct information while executing an environement that waits for a port to be up', async (t) => {
  const testEnv: IExecutionEnvironement = {
    command: 'echo "Haha" && exit 0',
    id: 'testEnv',
    repo: 'testRepo',
    readyWhen: {
      portIsUp: 1234
    }
  }
  const stubs = plugInStubs({
    doNotStubExecuteEnvironement: true,
    env: testEnv,
    execFunction: async function f(this: ChildProcessEnventsHandler) {
      if (this.onInit) {
        await this.onInit()
      }
      await this.onNewDataFromStandardOutput('Standard Output 1', 1)
      await this.onNewDataFromStandardOutput('Standard Output 2', 1)
      await this.onExit(0, 1)
      return 1
    }
  })
  stubs.stubbedModule = stub(
    require.cache[require.resolve('portscanner')].exports,
    'checkPortStatus')
    .resolves('closed')
  delete require.cache[require.resolve('@/environmentsRunner')]
  const EnvironmentsRunnerTemp = require('@/environmentsRunner').default
  const v: Vorpal = new Vorpal()
  const runner = EnvironmentsRunnerTemp.getEnvironmentsRunner()
  runner.initialize(v)
  await runner.executeEnvironement({ env: testEnv })
  const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
  t.is(stubs.log.getCall(0).args.length, 1)
  t.is(stubs.log.getCall(0).args[0].replace(ansiRegex, ''), '[testEnv] Standard Output 1')
  t.is(stubs.log.getCall(1).args.length, 1)
  t.is(stubs.log.getCall(1).args[0].replace(ansiRegex, ''), '[testEnv] ENVIRONMENT READY ON PORT 1234')
  t.is(stubs.log.getCall(2).args.length, 1)
  t.is(stubs.log.getCall(2).args[0].replace(ansiRegex, ''), '[testEnv] Standard Output 2')
  t.pass()
  restoreMethods(stubs)
})
