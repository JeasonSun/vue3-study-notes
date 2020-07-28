# 一步步手写迷你 Vue3

## 初始化项目开发结构

在手写 Vue3 前，我们先搭建好项目开发的结构，在本文中使用 webpack 进行打包编译，当然你可以使用其他熟悉的工具进行打包开发，这不是本文的重点，只要能够将我们的代码打包成一份 vue 库，然后在服务中引用，以便观察测试即可。

## reactive 的实现

Vue2 升级 Vue3 后很重要的变化就是数据的响应机制，这也是目前大家认识 Vue3 最初需要了解的一个变化。Vue3 中基于 Proxy 的 observer 实现，消除了 Vue2 中基于 Object.defineProperty 的实现所存在的很多限制：

* 检测属性的添加和删除
* 检测数组索引的长度和变更
* 支持 Map、Set、WeakMap 和 WeakSet

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

在迷你Vue中具体实现时候，我们稍微增加了一些细节的处理，当然比起源码，还是省略了很多。

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

在`reactivity/reactive.js`中，主要的作用就是创建一个reactive的对象，我们通过Proxy代理拦截target的操作，具体方法前面我们已经讲过。在这里我们将创建的过程提出，以便根据不同的对象，传入不同的拦截handler，比如集合类型(Map,Set,WeakMap,WeakSet)的处理函数、普通对象类型(Object,Array)的处理函数是不同的。

源码中对于不能进行 Proxy 包装的 target 做了很多判断，比如：
如果有标识`[ReactiveFlags.READONLY]`；如果不是Object对象`!isObject: val !== null && typeof val === 'object'`；如果target本身就已经是一个Proxy包装过的对象了；如果不在可以观察的对象范围内(Object,Array,Map,Set,WeakMap,WeakSet)都直接返回target，不进行Proxy的包装。

在迷你Vue中，我们稍作简单处理，只是对于非对象类型，直接返回target。

在`reactivity/baseHandler.js`中，我们先只写了一个基础的拦截处理函数，`get`和`set`。

值得指出的是，在`get`拦截中，如果`Reflect.get(target, key, receiver)`后的值还是一个对象，我们需要再次做Proxy包装。在`set`拦截中，我们可以通过判断原先是否有这个属性以及新老值是否改变，来标识该操作是属性的新增操作还是属性的修改操作，这样也优化了数组push等对于length属性修改时候的无效操作(因为修改length的时候`hasChanged(value, oldValue)为false`)。

具体代码，查看分支[reactivity/proxy](https://github.com/JeasonSun/vue3-study-notes/tree/reactivity/proxy)
