// Node.js 环境模拟器
class NodeRunner {
  constructor() {
    this.modules = new Map()
    this.globals = this.createGlobals()
    this.setupBuiltinModules()
  }

  // 创建全局对象
  createGlobals() {
    return {
      console: {
        log: (...args) => this.output('log', this.formatArgs(args)),
        error: (...args) => this.output('error', this.formatArgs(args)),
        warn: (...args) => this.output('warn', this.formatArgs(args)),
        info: (...args) => this.output('info', this.formatArgs(args)),
        dir: (obj) => this.output('log', JSON.stringify(obj, null, 2)),
        table: (data) => this.output('log', this.formatTable(data))
      },
      process: {
        argv: ['node', 'index.js'],
        env: { 
          NODE_ENV: 'development',
          PATH: '/usr/bin:/bin'
        },
        cwd: () => '/workspace',
        exit: (code = 0) => {
          this.output('info', `Process exited with code ${code}`)
        },
        version: 'v18.17.0',
        platform: 'browser'
      },
      global: {},
      __filename: '',
      __dirname: '',
      Buffer: {
        from: (str, encoding = 'utf8') => {
          if (typeof str === 'string') {
            return new TextEncoder().encode(str)
          }
          return new Uint8Array(str)
        },
        toString: (buffer, encoding = 'utf8') => {
          return new TextDecoder().decode(buffer)
        },
        alloc: (size) => new Uint8Array(size),
        isBuffer: (obj) => obj instanceof Uint8Array
      },
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,
      setImmediate: (callback) => setTimeout(callback, 0),
      clearImmediate: clearTimeout
    }
  }

  // 格式化输出参数
  formatArgs(args) {
    return args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        return JSON.stringify(arg, null, 2)
      }
      return String(arg)
    }).join(' ')
  }

  // 格式化表格输出
  formatTable(data) {
    if (Array.isArray(data)) {
      return data.map((item, index) => `${index}: ${JSON.stringify(item)}`).join('\n')
    }
    return JSON.stringify(data, null, 2)
  }

  // 设置内置模块
  setupBuiltinModules() {
    // fs 模块模拟
    this.modules.set('fs', {
      readFileSync: (path, encoding = 'utf8') => {
        throw new Error('readFileSync not implemented in browser environment')
      },
      writeFileSync: (path, data, encoding = 'utf8') => {
        throw new Error('writeFileSync not implemented in browser environment')
      },
      existsSync: (path) => {
        this.output('warn', `fs.existsSync(${path}) - returning false (not implemented)`)
        return false
      },
      readFile: (path, callback) => {
        setTimeout(() => callback(new Error('readFile not implemented in browser environment')), 0)
      },
      writeFile: (path, data, callback) => {
        setTimeout(() => callback(new Error('writeFile not implemented in browser environment')), 0)
      }
    })

    // path 模块模拟
    this.modules.set('path', {
      join: (...paths) => {
        return paths.join('/').replace(/\/+/g, '/').replace(/\/$/, '') || '/'
      },
      resolve: (...paths) => {
        let resolved = '/workspace'
        for (const path of paths) {
          if (path.startsWith('/')) {
            resolved = path
          } else {
            resolved = this.modules.get('path').join(resolved, path)
          }
        }
        return resolved
      },
      dirname: (path) => {
        const parts = path.split('/')
        return parts.slice(0, -1).join('/') || '/'
      },
      basename: (path, ext) => {
        const name = path.split('/').pop() || ''
        if (ext && name.endsWith(ext)) {
          return name.slice(0, -ext.length)
        }
        return name
      },
      extname: (path) => {
        const name = path.split('/').pop() || ''
        const lastDot = name.lastIndexOf('.')
        return lastDot > 0 ? name.slice(lastDot) : ''
      }
    })

    // http 模块模拟
    this.modules.set('http', {
      createServer: (requestListener) => {
        return {
          listen: (port, hostname, callback) => {
            if (typeof hostname === 'function') {
              callback = hostname
              hostname = 'localhost'
            }
            this.output('info', `Server running at http://${hostname}:${port}/`)
            if (callback) callback()
            return this
          },
          on: (event, listener) => {
            return this
          }
        }
      }
    })

    // url 模块模拟
    this.modules.set('url', {
      parse: (urlString) => {
        try {
          const url = new URL(urlString)
          return {
            protocol: url.protocol,
            hostname: url.hostname,
            port: url.port,
            pathname: url.pathname,
            search: url.search,
            hash: url.hash
          }
        } catch (error) {
          throw new Error(`Invalid URL: ${urlString}`)
        }
      }
    })

    // util 模块模拟
    this.modules.set('util', {
      inspect: (obj, options = {}) => {
        return JSON.stringify(obj, null, options.depth || 2)
      },
      format: (f, ...args) => {
        let i = 0
        return f.replace(/%[sdj%]/g, (x) => {
          if (x === '%%') return x
          if (i >= args.length) return x
          switch (x) {
            case '%s': return String(args[i++])
            case '%d': return Number(args[i++])
            case '%j': return JSON.stringify(args[i++])
            default: return x
          }
        })
      }
    })
  }

  // 模拟 require 函数
  createRequire(currentPath = '/') {
    return (moduleName) => {
      if (this.modules.has(moduleName)) {
        return this.modules.get(moduleName)
      }
      
      // 模拟一些常用的第三方模块
      if (moduleName === 'lodash') {
        return {
          map: (arr, fn) => arr.map(fn),
          filter: (arr, fn) => arr.filter(fn),
          reduce: (arr, fn, init) => arr.reduce(fn, init)
        }
      }
      
      throw new Error(`Cannot find module '${moduleName}'`)
    }
  }

  // 执行代码
  async executeCode(code, filename = 'index.js') {
    try {
      // 创建执行环境
      const require = this.createRequire(filename)
      const module = { exports: {}, filename, id: filename }
      const exports = module.exports
      
      // 设置 __filename 和 __dirname
      const pathModule = this.modules.get('path')
      const __filename = filename
      const __dirname = pathModule.dirname(filename)
      
      this.globals.__filename = __filename
      this.globals.__dirname = __dirname

      // 创建函数包装器
      const wrapper = new Function(
        'require',
        'module',
        'exports',
        'console',
        'process',
        'global',
        '__filename',
        '__dirname',
        'Buffer',
        'setTimeout',
        'setInterval',
        'clearTimeout',
        'clearInterval',
        'setImmediate',
        'clearImmediate',
        code
      )

      // 执行代码
      const result = await wrapper.call(
        this.globals.global,
        require,
        module,
        exports,
        this.globals.console,
        this.globals.process,
        this.globals.global,
        __filename,
        __dirname,
        this.globals.Buffer,
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval,
        this.globals.setImmediate,
        this.globals.clearImmediate
      )

      return { success: true, result, module }
    } catch (error) {
      this.output('error', `${error.name}: ${error.message}`)
      if (error.stack) {
        this.output('error', error.stack)
      }
      return { success: false, error: error.message }
    }
  }

  // 输出处理 - 会被重写
  output(type, message) {
    console[type](message)
  }
}

export default NodeRunner
