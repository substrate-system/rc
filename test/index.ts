import { test } from '@substrate-system/tapzero'
import fs from 'fs'
import path from 'path'
import { rc, utils } from '../src/index.js'

const n = 'rc' + Math.random()

test('rc with defaults and env', async t => {
    process.env[n + '_envOption'] = '42'

    const config = rc(n, {
        option: true
    })

    t.equal(config.option, true, 'should use default option')
    t.equal(config.envOption, '42', 'should use env option')

    delete process.env[n + '_envOption']
})

test('rc with custom argv', async t => {
    process.env[n + '_envOption'] = '42'

    const customArgv = rc(n, {
        option: true
    }, {
        option: false,
        envOption: 24,
        argv: {
            remain: [],
            cooked: ['--no-option', '--envOption', '24'],
            original: ['--no-option', '--envOption=24']
        }
    })

    t.equal(customArgv.option, false, 'argv should override default')
    t.equal(customArgv.envOption, 24, 'argv should override env')

    delete process.env[n + '_envOption']
})

test('rc with commented JSON config', async t => {
    process.env[n + '_envOption'] = '42'

    const jsonrc = path.resolve('.' + n + 'rc')

    fs.writeFileSync(jsonrc, [
        '{',
        '// json overrides default',
        '"option": false,',
        '/* env overrides json */',
        '"envOption": 24',
        '}'
    ].join('\n'))

    const commentedJSON = rc(n, {
        option: true
    })

    fs.unlinkSync(jsonrc)

    t.equal(commentedJSON.option, false, 'json should override default')
    t.equal(commentedJSON.envOption, '42', 'env should override json')
    t.equal(commentedJSON.config, jsonrc, 'should have config path')
    t.equal(commentedJSON.configs?.length, 1, 'should have one config')
    t.equal(commentedJSON.configs?.[0], jsonrc, 'should have correct config path')

    delete process.env[n + '_envOption']
})

test('utils.parse with JSON', async t => {
    const result = utils.parse('{"foo": "bar"}')
    t.equal(result.foo, 'bar', 'should parse JSON')
})

test('utils.parse with INI', async t => {
    const result = utils.parse('foo=bar')
    t.equal(result.foo, 'bar', 'should parse INI')
})
