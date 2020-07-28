import { reactive } from './reactivity'

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
