import dotenv from 'dotenv'
const envs = dotenv.config({ path: `${process.env.ENV_ORCHESTRATOR_CONFIG_PATH || '.'}/.env` })
export default envs
