import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'

// Importamos el CSS global que ahora procesa Tailwind
import './style.css' 
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

// Conectamos el gestor de estado (Pinia)
app.use(pinia)

// Conectamos PrimeVue en modo Unstyled (Híbrido)
app.use(PrimeVue, {
    unstyled: true
})

// Aquí conectaremos el Router más adelante

app.mount('#app')