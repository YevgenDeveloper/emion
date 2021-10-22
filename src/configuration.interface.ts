export interface ConfigurationSchema {
    $schema?: string;
    repoPath:     string;
    repositories: { [key: string]: RepositoryConfiguration };
}
export interface RepositoryConfiguration {
    branch?: string;
    environments: { [key: string]: ExecutionEnvironement };
    initCommand?: string;
    url?:         string;
}
export interface ExecutionEnvironement {
    currentPid?: number;
    arguments?: string[];
    command?:   string;
    dependsOn?: string[];
    id: string
    readyWhen?: ReadyWhen;
    repo?:string;
}
export interface ReadyWhen {
    portIsUp?:              number;
    consoleMessageIsFound?: string;
}
export enum EConfigRepositoryItemType {
    all='all',
    url='url',
    command='command',
    branch='branch',
    environments='environments'
}
export enum EConfigEnvironmentItemType {
    command='command',
    parameters='parameters',
    dependsOn='dependsOn',
    isReadyWhen='isReadyWhen',
}
