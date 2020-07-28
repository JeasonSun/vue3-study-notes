import { TriggerOpTypes } from './operation'

export function effect (fn, options = {}) {
  const effect = createReactiveEffect(fn, options)
  if (!options.lazy) {
    effect() // 默认就要执行
  }
}

const effectStack = []
let activeEffect
let uid = 0

function createReactiveEffect (fn, options) {
  const effect = function reactiveEffect () {
    if (!effectStack.includes(effect)) {
      try {
        effectStack.push(effect)
        activeEffect = effect
        return fn()
      } catch (error) {
        console.log(error)
      } finally {
        effectStack.pop()
        activeEffect = effectStack[effectStack.length - 1]
      }
    }
  }
  effect.options = options
  effect.id = uid++
  effect.deps = []
  return effect
}

const targetMap = new WeakMap()
/**
 * 收集effect
 */
export function track (target, type, key) {
  if (activeEffect === undefined) {
    return // 说明当前的取值操作没有在effect下，并没有依赖于effect
  }
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep) // 让这个effect记录dep属性。
  }
}
/**
 * 触发通知
 */
export function trigger (target, type, key, value, oldValue) {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }
  const run = effects => {
    if (effects) {
      effects.forEach(effect => effect())
    }
  }
  if (key !== null) {
    run(depsMap.get(key)) //
  }
  if (type === TriggerOpTypes.ADD) {
    run(depsMap.get(Array.isArray(target) ? 'length' : ''))
  }
}
