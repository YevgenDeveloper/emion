export interface ConfigSchema {
    $schema?: string;
    repoPath:     string;
    repositories: { [key: string]: RepoConfig };
}
export interface RepoConfig {
    branch?: string;
    environments: { [key: string]: ExecutionEnvironement };
    initCommand?: string;
    url?:         string;
}
export interface ExecutionEnvironement {
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
export enum EConfigElemType {
    all='tous',
    url='url',
    command='commande',
    branch='branche'
}
