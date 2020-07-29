# 一步步手写迷你 Vue3

## 初始化项目开发结构

在手写 Vue3 前，我们先搭建好项目开发的结构，在本文中使用 webpack 进行打包编译，当然你可以使用其他熟悉的工具进行打包开发，这不是本文的重点，只要能够将我们的代码打包成一份 vue 库，然后在服务中引用，以便观察测试即可。

## Vue3 的数据响应式系统

### reactive 的实现（代理模式 Proxy）

Vue2 升级 Vue3 后很重要的变化就是数据的响应机制，这也是目前大家认识 Vue3 最初需要了解的一个变化。Vue3 中基于 Proxy 的 observer 实现，消除了 Vue2 中基于 Object.defineProperty 的实现所存在的很多限制：

- 检测属性的添加和删除
- 检测数组索引的长度和变更
- 支持 Map、Set、WeakMap 和 WeakSet

基于 Proxy 实现的 observer 是怎样实现的呢？Proxy 是 ES6 的语法，主要是用来修改某些操作的默认行为，你可以把它理解为一个拦截器，想要访问对象，都要经过这层拦截，我们在这层拦截上做各种操作，比如你设置一个对象的值的时候，对对象的值进行校验等。

Proxy 支持的拦截操作有 13 种：get、set、has、deleteProperty、ownKeys......Vue 中也主要拦截了上述的五种方法，在我们迷你 Vue3 中先以最基础的 get 和 set 加以说明其中的使用方法和原理。

先看一下 Proxy 的使用 demo。

```javascript
function reactive (target) {
  const handler = {
    get(target, key, value, receiver) {
      const res = Reflect.get(target, key, receiver)
      console.log('用户对这个对象取值了', target, key)
      return res
    },
    set(target, key, value, receiver) {
      const res = Reflect.set(target, key, value, receiver)
      console.log('属性的更新操作', target, key)
      return res
    },
    deleteProperty(target, key) {
      const oldValue = target[key]
      const res = Reflect.deleteProperty(target, key)
      console.log('删除属性', key, oldValue)
      return res
    }
  }

  return new Proxy(target, handler)
}

// 测试 demo
const state = reactive({
  name: 'mojie',
  age: 29,
  hobbies: ['pet', 'read', 'music']
})

console.log(state)
console.log(state.name)
console.log(state.hobbies)
state.name = 'jeason'
state.age = 32
state.sex = 'male'
delete state.age

// console 输出

// Proxy {name: "mojie", age: 29, hobbies: Array(3)}
// 用户对这个对象取值了 {name: "mojie", age: 29, hobbies: Array(3)} name mojie
// 用户对这个对象取值了 {name: "mojie", age: 29, hobbies: Array(3)} hobbies ["pet", "read", "music"]
// 属性的更新操作 {name: "jeason", age: 29, hobbies: Array(3)} name
// 属性的更新操作 {name: "jeason", age: 32, hobbies: Array(3)} age
// 属性的更新操作 {name: "jeason", age: 32, hobbies: Array(3), sex: "male"} sex
// 删除属性 age 32
```

从上述的 demo 中我们可以了解 Proxy 的用法，也可以看到基于 Proxy，我们很容易做到检测属性的添加和删除，同时检测数组索引的长度和变更也很简单，我们看一下以下测试 demo。

```javascript
const arr = reactive(['a', 'b', 'c'])
arr.push('d')

// console 输出

// 用户对这个对象取值了 (3) ["a", "b", "c"] push
// 用户对这个对象取值了 (3) ["a", "b", "c"] length
// 属性的更新操作 (4) ["a", "b", "c", "d"] 3
// 属性的更新操作 (4) ["a", "b", "c", "d"] length
```

对于数组的 push 操作先后经历的取出数据的 push 方法和 length 属性，然后更新 arr[3]的属性，同时更新 length 属性。不过，在源码中我们会对此加以优化，在更新数组 arr[3]的时候，我们看到 length 已经是 4 了，再次更新 length 属性的时候，可以减少一次数据的改变通知，具体看我们后续的实现代码。

在迷你 Vue 中具体实现时候，我们稍微增加了一些细节的处理，当然比起源码，还是省略了很多。

```javascript
import { isObject } from '../shared/utils'
import { mutableHandler } from './baseHandler'

export function reactive (target) {
  return createReactiveObject(target, mutableHandler)
}

function createReactiveObject (target, baseHandler) {
  if (!isObject(target)) {
    return target
  }
  const observed = new Proxy(target, baseHandler)
  return observed
}
```

在`reactivity/reactive.js`中，主要的作用就是创建一个 reactive 的对象，我们通过 Proxy 代理拦截 target 的操作，具体方法前面我们已经讲过。在这里我们将创建的过程提出，以便根据不同的对象，传入不同的拦截 handler，比如集合类型(Map,Set,WeakMap,WeakSet)的处理函数、普通对象类型(Object,Array)的处理函数是不同的。

源码中对于不能进行 Proxy 包装的 target 做了很多判断，比如：
如果有标识`[ReactiveFlags.READONLY]`；如果不是 Object 对象`!isObject: val !== null && typeof val === 'object'`；如果 target 本身就已经是一个 Proxy 包装过的对象了；如果不在可以观察的对象范围内(Object,Array,Map,Set,WeakMap,WeakSet)都直接返回 target，不进行 Proxy 的包装。

在迷你 Vue 中，我们稍作简单处理，只是对于非对象类型，直接返回 target。

在`reactivity/baseHandler.js`中，我们先只写了一个基础的拦截处理函数，`get`和`set`。

值得指出的是，在`get`拦截中，如果`Reflect.get(target, key, receiver)`后的值还是一个对象，我们需要再次做 Proxy 包装。在`set`拦截中，我们可以通过判断原先是否有这个属性以及新老值是否改变，来标识该操作是属性的新增操作还是属性的修改操作，这样也优化了数组 push 等对于 length 属性修改时候的无效操作(因为修改 length 的时候`hasChanged(value, oldValue)为false`)。

具体代码，查看分支[reactivity/proxy](https://github.com/JeasonSun/vue3-study-notes/tree/reactivity/proxy)

### 依赖收集和触发更新（effect）

通过前面的学习，我们已经了解了如何劫持数据了，接下来我们看一下 Vue3 响应式系统中的两个问题：如何进行依赖收集，如何触发监听函数。我们大致能够猜到其中的实现逻辑：当用户调用一个 effect 函数时，会向其中传入一个原始函数，并且创建一个监听函数，并且默认会立即执行一次。在执行过程中，可以通过 get 读操作进行 track 依赖收集，将该监听函数与数据进行关联。在 set 写操作时候，通过 trigger 触发这个监听函数。

在 Vue 中，组件进入 mount 后初始化组件实例代理响应式对象，并且运行组件的 ReactiveEffect，render 组件会对数据进行 get 读操作，从而触发 track 依赖收集，当用户交互，比如点击按钮 count++，就会产生副作用，触发代理对象的 set 读操作，从而触发 trigger 通知更新，遍历执行依赖。

接下来看一下如何生成 effect 监听函数，创建副作用。

```javascript
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
```

在 createReactiveEffect 函数中，创建一个新的 effect 函数，并且给这个 effect 函数挂载一些属性，为后面的 computed 以及收集依赖做准备，当执行这个 effect 的时候，会把这个 effect 推送到一个 activeEffectStack 栈中，并且把它赋值给全局变量 activeEffect，然后执行传进来的 fn()，这里的 fn 就是

```javascript
fn = () => {
  console.log('effect', state.name)
  console.log('effect', JSON.stringify(state.hobbies))
  console.log('effect', state.sex)
}
```

执行上面的 fn 访问 state.name、state.hobbies、state.sex，这样就会触发到 proxy 中的 getter 拦截，在这里我们就可以对相应的对象和值进行依赖的收集了。而当我们修改数据的时候，就会触发 proxy 中的 setter 拦截，我们可以在这里触发更新通知。

现在我们在`reactivity/baseHandler.js`中的`createGetter`中添加收集依赖的`track`代码，并且在`createSetter`中添加触发通知代码`trigger`。

```javascript
function createGetter () {
  return function get (target, key, receiver) {
    const res = Reflect.get(target, key, receiver)
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
```

接下来我们重点看一下`track`和`trigger`的实现。

```javascript
let activeEffect
const targetMap = new WeakMap()
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
```

依赖收集阶段最重要的目的就是建立一份“依赖收集表”，也就是`targetMap`。`targetMap`是一个`WeakMap`，其中 key 值是被 Proxy 代理的原始对象，而 value 是该对象所对应的 depsMap。

depsMap 还是一个 Map，key 是触发 getter 时候的属性值(demo 中就是 name、hobbies、sex)，而 value 则是触发过该属性值所对应的各个 effect。

以 demo 为例，经过收集，targetMap 应该对应这个样子：

```
 ------------------------------
|   targetMap = new WeakMap()  |
|------------------------------|
|    key:target   |   depsMap  |
|-----------------|------------|
| {               |            |
|   name: 'mojie',|            |
|   age: 29,      |            |
|   hobbies: [    | new Map()  |
|     'pet',      |     |      |
|     'read',     |     |      |
|     'music'     |      ------|----->  |---------|------------------|
|     ]           |            |        |   key   | dep = new Set()  |
| }               |            |        |---------|------------------|
 ------------------------------         |  name   |  effect1,effect2 |
                                        |---------|------------------|
                                        | hobbies |  effect1         |
                                        |---------|------------------|
                                        |  sex    |  effect1         |
                                         -----------------------------
```

依赖收集表 targetMap 是整个响应式系统的核心，大家可以仔细思考一下，其中的原理说来也是简单。可能有人会疑问，为什么收集的时候是把`activeEffect`加入依赖列表，这个大家可以回忆一下 JavaScript 的执行栈，然后看一下`createReactiveEffect`中的`effectStack.push(effect)`->`activeEffect = effect`->`return fn()`这个流程，结合触发收集的时机，应该就能想明白。

然后我们看一下触发通知的`trigger`函数。setter 里面的`trigger`会从依赖收集表里面找到当前属性对应的各个 dep，然后把依次执行即可。这里值得说明的是，当我们做`state.hobbies.push('coding')`操作的时候，setter 中拦截到的是`属性的新增操作 target=>(4) ["pet", "read", "music", "coding"] key=>3`，由于这个 key 为 3，在收集的时候并没有收集到这个依赖表，所以，我们得对数组做一下特殊处理。

```javascript
if (type === TriggerOpTypes.ADD) {
   run(depsMap.get(Array.isArray(target) ? 'length' : ''))
}
```

到这里，响应式系统的收集依赖逻辑已经基本清楚了，当然源码中对于计算属性 effect 和普通 effect 作了不同优先级的处理，这一点，我们在后续的 computed 源码中再加以说明。

具体代码，查看分支[reactivity/effect](https://github.com/JeasonSun/vue3-study-notes/tree/reactivity/effect)