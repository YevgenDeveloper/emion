import test from 'ava'
import sinon from 'sinon'
import Vorpal from 'vorpal'
import { IExecutionEnvironement, IRepositoryConfiguration } from './configuration.interface'
import ConfigurationHandler from './configurationHandler'
import EnvironmentsRunner from './environmentsRunner'
test('Should return a runner from the static method', (t) => {
  const result = EnvironmentsRunner.getEnvironmentsRunner()
  t.is(result.constructor.name, 'EnvironmentsRunner')
})
test('Should log the correct information while executing an environement (TO BE COMPLETED TO MANAGE ASYNC)', async (t) => {
  const log = sinon.fake.returns(undefined)
  Vorpal.prototype.log = log
  const testEnv: IExecutionEnvironement = {
    command: 'echo "Haha" && exit 0',
    id: 'testEnv',
    repo: 'testRepo'
  }
  ConfigurationHandler.prototype.getEnvironment = sinon.fake.returns(testEnv)
  const testRepo: IRepositoryConfiguration = {
    environments: {
      testEnv
    },
    initCommand: 'echo "Huhu" && exit 0'
  }
  ConfigurationHandler.prototype.getRepository = sinon.fake.returns(testRepo)
  ConfigurationHandler.prototype.getRepoPath = sinon.fake.returns('/')
  const v: Vorpal = new Vorpal()
  const runner = EnvironmentsRunner.getEnvironmentsRunner()
  runner.initialize(v)
  runner.runEnvironement('testEnv')
  sinon.assert.calledWithExactly(log.getCall(0), '\u001b[31m[testEnv] STARTING ENVIRONMENT\u001b[39m')
  sinon.assert.calledWithExactly(log.getCall(1), '\u001b[31m[testEnv] INITIALISATION - START\u001b[39m')
  t.pass()
})
