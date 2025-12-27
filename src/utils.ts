import fs from 'node:fs'
import ini from 'ini'
import path from 'path'
import stripJsonComments from 'strip-json-comments'

export function parse (content:string):Record<string, any> {
    // if it ends in .json or starts with { then it must be json.
    // must be done this way, because ini accepts everything.
    // can't just try and parse it and let it throw if it's not ini.
    // everything is ini. even json with a syntax error.
    if (/^\s*{/.test(content)) {
        return JSON.parse(stripJsonComments(content))
    }
    return ini.parse(content)
}

export function file (...args:(string|null|undefined)[]):string|undefined {
    const filtered = args.filter((arg):arg is string => arg != null)

    // path.join breaks if it's a not a string, so just skip this.
    for (const arg of filtered) {
        if (typeof arg !== 'string') {
            return
        }
    }

    const filePath = path.join(...filtered)
    try {
        return fs.readFileSync(filePath, 'utf-8')
    } catch (_err) {
        return undefined
    }
}

export function json (...args:(string|null|undefined)[]):Record<string, any>|null {
    const content = file(...args)
    return content ? parse(content) : null
}

export function env (
    prefix:string,
    envObj:Record<string, string|undefined> = process.env
):Record<string, any> {
    const obj:Record<string, any> = {}
    const l = prefix.length

    for (const k in envObj) {
        if (k.toLowerCase().indexOf(prefix.toLowerCase()) === 0) {
            const keypath = k.substring(l).split('__')

            // Trim empty strings from keypath array
            let emptyStringIndex
            while ((emptyStringIndex = keypath.indexOf('')) > -1) {
                keypath.splice(emptyStringIndex, 1)
            }

            let cursor:Record<string, any> = obj
            keypath.forEach(function _buildSubObj (_subkey, i) {
                // (check for _subkey first so we ignore empty strings)
                // (check for cursor to avoid assignment to primitive objects)
                if (!_subkey || typeof cursor !== 'object') {
                    return
                }

                // If this is the last key, just stuff the value in there
                // Assigns actual value from env variable to final key
                // (unless it's just an empty string- in that case use the last valid key)
                if (i === keypath.length - 1) {
                    cursor[_subkey] = envObj[k]
                }

                // Build sub-object if nothing already exists at the keypath
                if (cursor[_subkey] === undefined) {
                    cursor[_subkey] = {}
                }

                // Increment cursor used to track the object at the current depth
                cursor = cursor[_subkey]
            })
        }
    }

    return obj
}

export function find (...args:string[]):string|undefined {
    const rel = path.join(...args)

    function findFile (start:string, relPath:string):string|undefined {
        const filePath = path.join(start, relPath)
        try {
            fs.statSync(filePath)
            return filePath
        } catch (_err) {
            if (path.dirname(start) !== start) { // root
                return findFile(path.dirname(start), relPath)
            }
        }
    }

    return findFile(process.cwd(), rel)
}
