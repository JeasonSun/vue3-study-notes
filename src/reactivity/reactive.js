import { isObject } from '../shared/utils'
import { mutableHandler } from './baseHandler'

export function reactive (target) {
  // 创建一个响应式的对象
  // 源码中的参数有 target,isReadonly, baseHandlers,collectionHandlers
  // 源码中会对target类型的不同，选择不同的handler函数，比如集合类型的处理函数、普通对象类型的处理函数。
  // 这里我们以最普通的对象类型加以说明。
  return createReactiveObject(target, mutableHandler)
}

function createReactiveObject (target, baseHandler) {
  // 源码中对于不能进行Proxy包装的target做了很多判断，比如：
  // 1. 如果有标识[ReactiveFlags.READONLY]
  // 2. !isObject:  val !== null && typeof val === 'object'
  // 3. target[ReactiveFlags.RAW] &&!(isReadonly && target[ReactiveFlags.IS_REACTIVE]) 如果target已经是一个Proxy，就直接返回它
  // 4. canObserve: 'Object,Array,Map,Set,WeakMap,WeakSet'
  if (!isObject(target)) {
    return target
  }
  const observed = new Proxy(target, baseHandler)
  return observed
}
