import test from 'ava'
import ConfigurationHandler from './configurationHandler';
import { mock } from 'sinon'
import fs from 'fs';
import { ConfigurationSchema } from './configuration.interface';
let configurationHandler: ConfigurationHandler
test.beforeEach(t => {
	configurationHandler = new ConfigurationHandler()
})
test('It should be created ok with no initialization configuration provided', t => {
	configurationHandler = new ConfigurationHandler()
	t.truthy(configurationHandler)
})
test('It should be created ok with initialization configuration provided', t => {
	const inputSchema: ConfigurationSchema = {
		repoPath: 'A_PATH',
		repositories: {
			'REPO_1': {
				branch: 'A_BRANCH',
				environments: {
					'ENV_1': {
						command: 'A_COMMAND_1',
					},
					'ENV_2': {
						command: 'A_COMMAND_2',
					}
				}
			},
			'REPO_2': {
				branch: 'A_BRANCH',
				environments: {
					'ENV_3': {
						command: 'A_COMMAND_4',
					},
				}
			}
		}
	}
	configurationHandler = new ConfigurationHandler(inputSchema)
	t.is(configurationHandler.configuration, inputSchema)
})
