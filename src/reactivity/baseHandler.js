import { hasOwn, hasChanged, isObject } from '../shared/utils'
import { reactive } from './reactive'
import { track, trigger } from './effect'
import { TriggerOpTypes, TrackOpTypes } from './operation'

const get = createGetter()
const set = createSetter()

function createGetter () {
  return function get (target, key, receiver) {
    const res = Reflect.get(target, key, receiver)
    // console.log('用户对这个对象取值了', target, key)
    track(target, TrackOpTypes.GET, key)
    if (isObject(res)) {
      return reactive(res)
    }
    return res
  }
}
function createSetter () {
  return function set (target, key, value, receiver) {
    const hadKey = hasOwn(target, key)
    const oldValue = target[key]
    const res = Reflect.set(target, key, value, receiver)
    if (!hadKey) {
      // console.log('属性的新增操作', target, key)
      trigger(target, TriggerOpTypes.ADD, key, value)
    } else if (hasChanged(value, oldValue)) {
      // console.log('修改操作', target, key, value)
      trigger(target, TriggerOpTypes.SET, key, value, oldValue)
    }
    return res
  }
}

export const mutableHandler = { get, set }
