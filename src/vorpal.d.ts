declare module 'vorpal'
declare class Vorpal {
    parse(argv: ReadonlyArray<string>): this;
    delimiter(value: string): this;
    show(): this;
    hide(): this;
    find(command: string): Vorpal.Command;
    exec(command: string): Promise<{}>;
    execSync(command: string): Promise<{}>;
    log(value: string, ...values: string[]): this;
    history(id: string): this;
    localStorage(id: string): object;
    help(value: (cmd: string) => string): this;
    pipe(value: (stdout: string) => string): this;
    use(extension: Vorpal.Extension): this;
    catch(command: string, description?: string): Vorpal.Catch;
    command(command: string, description?: string): Vorpal.Command;
    version(version: string): this;
    sigint(value: () => void): this;
    chalk: ({[key:string]:(cmd: string) => string});
    ui: Vorpal.UI;
    activeCommand: Vorpal.CommandInstance;
}
declare namespace Vorpal {
    interface Args {
        [key: string]: any;
        options: {
            [key: string]: any;
        };
    }
    type Action = (args: Args, callback : any) => Promise<void>;
    type Cancel = () => void;
    class Command {
        _name: string;
        _fn: Action;
        _cancel: Cancel | undefined;
        alias(command: string): this;
        parse(value: (command: string, args: Args) => string): this;
        option(option: string, description: string, autocomplete?: ReadonlyArray<string>): this;
        types(types: { string?: ReadonlyArray<string> }): this;
        hidden(): this;
        remove(): this;
        help(value: (args: Args) => void): this;
        validate(value: (args: Args) => boolean | string): this;
        autocomplete(values: ReadonlyArray<string> | { data: () => Promise<ReadonlyArray<string>> }): this;
        action(action: Action): this;
        cancel(cancel: Cancel): this;
        allowUnknownOptions(): this;
    }
    class Catch extends Command { }
    class Extension { }
    class UI {
        delimiter(text?: string): string;
        input(text?: string): string;
        imprint(): void;
        submit(command: string): string;
        cancel(): void;
        redraw: {
            (text: string, ...texts: string[]): void;
            clear(): void;
            done(): void;
        };
    }
    class CommandInstance {
        log(value: string, ...values: string[]): void;
        prompt(prompt: object | ReadonlyArray<object>): Promise<object>;
        delimiter(value: string): void;
    }
}
