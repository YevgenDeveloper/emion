const tsConfig = require('../tsconfig.json')
import * as tsConfigPaths from 'tsconfig-paths'
const baseUrl = './dist' 
tsConfigPaths.register({
  baseUrl,
  paths: tsConfig.compilerOptions.paths
})
