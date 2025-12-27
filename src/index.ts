import path from 'path'
import deepExtend from 'deep-extend'
import minimist from 'minimist'
import * as utils from './utils.js'

const etc = '/etc'
const win = process.platform === 'win32'
const home = win ?
    process.env.USERPROFILE :
    process.env.HOME

export interface RcOptions {
    configs?:string[];
    config?:string;
    [key:string]:any;
}

export type ParseFn = (content:string) => Record<string, any>

export function rc (
    name:string,
    defaults?:string|Record<string, any>,
    argv?:Record<string, any>,
    parse?:ParseFn
):RcOptions {
    if (typeof name !== 'string') {
        throw new Error('rc(name): name *must* be string')
    }

    const resolvedArgv = argv || minimist(process.argv.slice(2))

    const resolvedDefaults:Record<string, any> = (
        typeof defaults === 'string'
            ? utils.json(defaults)
            : defaults
    ) || {}

    const parseFn = parse || utils.parse

    const envConfig = utils.env(name + '_')

    const configs:Record<string, any>[] = [resolvedDefaults]
    const configFiles:string[] = []

    function addConfigFile (file:string|undefined):void {
        if (!file || configFiles.indexOf(file) >= 0) return
        const fileConfig = utils.file(file)
        if (fileConfig) {
            configs.push(parseFn(fileConfig))
            configFiles.push(file)
        }
    }

    // which files do we look at?
    if (!win) {
        [
            path.join(etc, name, 'config'),
            path.join(etc, name + 'rc')
        ].forEach(addConfigFile)
    }

    if (home) {
        [
            path.join(home, '.config', name, 'config'),
            path.join(home, '.config', name),
            path.join(home, '.' + name, 'config'),
            path.join(home, '.' + name + 'rc')
        ].forEach(addConfigFile)
    }

    addConfigFile(utils.find('.' + name + 'rc'))
    if (envConfig.config) addConfigFile(envConfig.config)
    if (resolvedArgv.config) addConfigFile(resolvedArgv.config)

    return deepExtend(
        {},
        ...configs,
        envConfig,
        resolvedArgv,
        configFiles.length
            ? { configs: configFiles, config: configFiles[configFiles.length - 1] }
            : {}
    )
}

export default rc
export { utils }
