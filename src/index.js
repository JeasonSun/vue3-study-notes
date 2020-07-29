import { reactive, effect } from './reactivity'

const state = reactive({
  name: 'mojie',
  age: 29,
  hobbies: ['pet', 'read', 'music']
})

effect(() => {
  console.log('effect1', state.name)
  console.log('effect1', JSON.stringify(state.hobbies))
  console.log('effect1', state.sex)
})

effect(() => {
  console.log('effect2', state.name)
})

setTimeout(() => {
  state.name = 'jeason'
  state.hobbies.push('coding')
  state.sex = 'male'
}, 1000)
