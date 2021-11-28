import test from 'ava'
import fs from 'fs'
import sinon from 'sinon'
import { IConfigurationSchema } from './configuration.interface'
import ConfigurationHandler from './configurationHandler'
let configurationHandler: ConfigurationHandler
const INPUT_SCHEMA: IConfigurationSchema = {
  repoPath: 'A_PATH',
  repositories: {
    REPO_1: {
      branch: 'A_BRANCH',
      environments: {
        ENV_1: {
          command: 'A_COMMAND_1',
        },
        ENV_2: {
          command: 'A_COMMAND_2',
        }
      }
    },
    REPO_2: {
      branch: 'A_BRANCH',
      environments: {
        ENV_3: {
          command: 'A_COMMAND_4',
        },
      }
    }
  }
}
const FILE_PATH = '/A/FILE/PATH'
test.beforeEach((t) => {
  configurationHandler = new ConfigurationHandler(INPUT_SCHEMA)
})
test('It should be created ok with no initialization configuration provided', (t) => {
  configurationHandler = new ConfigurationHandler()
  t.truthy(configurationHandler)
})
test('It should be created ok with initialization configuration provided', (t) => {
  configurationHandler = new ConfigurationHandler(INPUT_SCHEMA)
  t.is(configurationHandler.configuration, INPUT_SCHEMA)
})
test.serial('It should be able to load the config file', async (t) => {
  configurationHandler = new ConfigurationHandler()
  const fake = sinon.fake.resolves(JSON.stringify(INPUT_SCHEMA))
  sinon.replace(fs.promises, 'readFile', fake)
  await configurationHandler.loadConfigFile(FILE_PATH)
  t.deepEqual(configurationHandler.configuration, INPUT_SCHEMA)
  sinon.restore()
})
test.serial('It should check the initialization fine', (t) => {
  const fake = sinon.fake.returns(true)
  sinon.replace(fs, 'existsSync', fake)
  configurationHandler = new ConfigurationHandler(INPUT_SCHEMA)
  const result = configurationHandler.isConfigFileExisting(FILE_PATH)
  t.is(result, true)
  sinon.restore()
})
test('It should return correctly the environement names', (t) => {
  configurationHandler = new ConfigurationHandler(INPUT_SCHEMA)
  const result = configurationHandler.getEnvironmentsNames()
  t.deepEqual(result, ['ENV_1', 'ENV_2', 'ENV_3'])
})
test('It should be able to get an environement from its name', (t) => {
  configurationHandler = new ConfigurationHandler(INPUT_SCHEMA)
  const result = configurationHandler.getEnvironment('ENV_2')
  t.deepEqual(result, {
    command: 'A_COMMAND_2',
    id: 'ENV_2',
    repo: 'REPO_1',
  })
})
test('It should be able to get a repository from its name', (t) => {
  configurationHandler = new ConfigurationHandler(INPUT_SCHEMA)
  const result = configurationHandler.getRepository('REPO_2')
  t.deepEqual(result, {
    branch: 'A_BRANCH',
    environments: {
      ENV_3: {
        command: 'A_COMMAND_4',
        id: 'ENV_3',
        repo: 'REPO_2',
      },
    }
  })
})
test('It should be able to get a repository names', (t) => {
  configurationHandler = new ConfigurationHandler(INPUT_SCHEMA)
  const result = configurationHandler.getRepositoryNames()
  t.deepEqual(result, ['REPO_1', 'REPO_2'])
})
test('It should be able to get the path of temp repo', (t) => {
  configurationHandler = new ConfigurationHandler(INPUT_SCHEMA)
  const result = configurationHandler.getRepoPath()
  t.is(result, 'A_PATH')
})
test('It should be able to get all the environements', (t) => {
  configurationHandler = new ConfigurationHandler(INPUT_SCHEMA)
  const result = configurationHandler.getEnvironments()
  t.deepEqual(result, {
    ENV_1: {
      command: 'A_COMMAND_1',
      id: 'ENV_1',
      repo: 'REPO_1',
    },
    ENV_2: {
      command: 'A_COMMAND_2',
      id: 'ENV_2',
      repo: 'REPO_1',
    },
    ENV_3: {
      command: 'A_COMMAND_4',
      id: 'ENV_3',
      repo: 'REPO_2',
    },
  }
  )
})
test.serial('It should be able to save the configuration file correctly', async (t) => {
  const fake = sinon.fake.resolves(undefined)
  sinon.replace(fs.promises, 'writeFile', fake)
  const fake2 = sinon.fake.resolves(JSON.stringify(INPUT_SCHEMA))
  sinon.replace(fs.promises, 'readFile', fake2)
  configurationHandler = new ConfigurationHandler(INPUT_SCHEMA)
  await configurationHandler.loadConfigFile(FILE_PATH)
  const result = await configurationHandler.save()
  t.is(fake.calledWith(FILE_PATH, JSON.stringify(INPUT_SCHEMA, undefined, '\t'),
    { encoding: 'utf8' }), true)
  sinon.restore()
  sinon.restore()
})
test.serial('It should be able to load the default config file correctly', async (t) => {
  const fake = sinon.fake.resolves(JSON.stringify(INPUT_SCHEMA))
  sinon.replace(fs.promises, 'readFile', fake)
  configurationHandler = new ConfigurationHandler(INPUT_SCHEMA)
  await configurationHandler.loadDefaultConfigFile()
  t.deepEqual(configurationHandler.configuration, INPUT_SCHEMA)
  sinon.restore()
})
test.serial('It should be able get the config file path correctly', async (t) => {
  const fake = sinon.fake.resolves(JSON.stringify(INPUT_SCHEMA))
  sinon.replace(fs.promises, 'readFile', fake)
  configurationHandler = new ConfigurationHandler(INPUT_SCHEMA)
  await configurationHandler.loadConfigFile(FILE_PATH)
  const result = await configurationHandler.getConfigFilePath()
  t.is(result, FILE_PATH)
  sinon.restore()
})
