import { EConfigRepositoryItemType } from './configuration.interface'
import { getConfigHandler } from './configurationHandler'
import Vorpal from 'vorpal'
const ADD_CHOICE = '️️️🔆 Add'
const REMOVE_CHOICE = '❌ Remove'
const DEEP_INTERACTIVE_CONFIGURATION = false
const configureWorkingPath = async function(
  commandInstance: Vorpal.CommandInstance,
) {
  let response: any
  response = await commandInstance.prompt({
    type: 'input',
    name: 'repoPath',
    default: getConfigHandler().getRepoPath(),
    message: `In which folder should repositories be cloned? `
  })
  getConfigHandler().configuration.repoPath = response.repoPath.trim()
}
const configureRepositoryElem = async function(inputs: {
  commandInstance: Vorpal.CommandInstance
  configElemKind: string
  repository: string
}) {
  const { configElemKind, repository, commandInstance } = inputs
  if (!getConfigHandler().configuration.repositories) {
    getConfigHandler().configuration.repositories = {}
  }
  if (!getConfigHandler().getRepository(repository)) {
    getConfigHandler().configuration.repositories[repository] = {
      environments: {}
    }
  }
  let response: any
  const repo = getConfigHandler().getRepository(repository)
  if (
    configElemKind === EConfigRepositoryItemType.all ||
    configElemKind === EConfigRepositoryItemType.url
  ) {
    response = await commandInstance.prompt({
      type: 'input',
      name: 'url',
      default: repo.url,
      message: `What is the url or path of the repository ? `
    })
    repo.url = response.url.trim()
  }
  if (
    configElemKind === EConfigRepositoryItemType.all ||
    configElemKind === EConfigRepositoryItemType.branch
  ) {
    response = await commandInstance.prompt({
      type: 'input',
      name: 'branch',
      default: repo.branch,
      message: `What is the branch to use for this repository ? `
    })
    repo.branch = response.branch.trim()
  }
  if (
    configElemKind === EConfigRepositoryItemType.all ||
    configElemKind === EConfigRepositoryItemType.command
  ) {
    response = await commandInstance.prompt({
      type: 'input',
      name: 'initCommand',
      default: repo.initCommand,
      message: `What is the initialisation command for this repository ? `
    })
    repo.initCommand = response.initCommand.trim()
  }
  if (
    configElemKind === EConfigRepositoryItemType.all ||
    configElemKind === EConfigRepositoryItemType.environments
  ) {
    if (DEEP_INTERACTIVE_CONFIGURATION) {
      configureListOfItems({
        commandInstance,
        itemName: 'environment',
        itemList: Object.keys(
          repo.environments
        ),
        onModify: configureEnvironement,
        onAdd: () => {},
        onDelete: () => {}
      })
    } else {
      commandInstance.log(
        'For now, to edit environment, please modify directly the configuration file'
      )
    }
  }
}
const configureEnvironement = async function(inputs: {
  commandInstance: Vorpal.CommandInstance
  envName: string
  callback: any
}) {
  let response: any
  const { commandInstance, envName, callback } = inputs
  commandInstance.log(`Configuring environment ${envName}`)
  response = await commandInstance.prompt({
    type: 'list',
    name: 'elem',
    message: 'What do you want to configure? ',
    choices: ['command', 'parameters', 'depends on', 'is ready when']
  })
  callback()
}
const configureListOfItems = async function(inputs: {
  commandInstance: Vorpal.CommandInstance
  itemName: string
  itemList: string[]
  onModify: (inputs: any) => void
  onAdd: () => void
  onDelete: () => void
}) {
  const {
    itemList,
    itemName,
    onAdd,
    onDelete,
    onModify,
    commandInstance,
  } = inputs
  let response: any
  response = await commandInstance.prompt({
    type: 'list',
    name: 'elem',
    message: `Here are the ${itemName}s available. You can modify one by selecting it, or add/remove it`,
    choices: [...itemList, ADD_CHOICE, REMOVE_CHOICE]
  })
  if (response.elem === ADD_CHOICE) {
    await onAdd()
  } else if (response.elem === REMOVE_CHOICE) {
    await onDelete()
  } else {
    await onModify(response.elem)
  }
}
const configureRepository = async function(inputs: {
  commandInstance: Vorpal.CommandInstance
  repository: any
}) {
  const { commandInstance, repository } = inputs
  let response: any = await commandInstance.prompt({
    type: 'list',
    name: 'elem',
    message: 'What do you want to configure? ',
    choices: ['all', 'url', 'branch', 'initialization command', 'environments']
  })
  const configurationElemKind: EConfigRepositoryItemType = response.elem
  await configureRepositoryElem({
    commandInstance,
    configElemKind: configurationElemKind,
    repository
  })
  return response
}
const configureRepositories = async function(
  commandInstance: Vorpal.CommandInstance,
) {
  await configureListOfItems({
    commandInstance,
    itemName: 'repository',
    itemList: Object.keys(getConfigHandler().configuration.repositories),
    onModify: configureRepository,
    onDelete: async () => {
      let response: any = await commandInstance.prompt({
        type: 'list',
        name: 'repository',
        message: 'Which repository should be removed? ',
        choices: Object.keys(getConfigHandler().configuration.repositories)
      })
      delete getConfigHandler().configuration.repositories[response.repository]
    },
    onAdd: async () => {
      let response: any
      response = await commandInstance.prompt({
        type: 'input',
        name: 'repositoryName',
        message: `What is the name of this repository? `
      })
      getConfigHandler().configuration.repositories[response.repositoryName] = {
        environments: {}
      }
      await configureRepository({
        commandInstance,
        repository: response.repositoryName
      })
    }
  })
}
export {
  configureRepositories,
  configureRepository,
  configureListOfItems,
  configureEnvironement,
  configureRepositoryElem,
  configureWorkingPath
}
