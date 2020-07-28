import { reactive, effect } from './reactivity'

const state = reactive({
  name: 'mojie',
  age: 29,
  hobbies: ['pet', 'read', 'music']
})

effect(() => {
  console.log('effect', state.name)
  console.log('effect', JSON.stringify(state.hobbies))
  console.log('effect', state.sex)
})

setTimeout(() => {
  state.name = 'jeason'
  state.hobbies.push('coding')
  state.sex = 'male'
}, 1000)
