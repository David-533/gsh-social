// Point d'entrée de l'application Vue 3
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Crée l'instance Vue 3
const app = createApp(App)

// Initialise Pinia (gestion d'état) - permet d'utiliser les stores
app.use(createPinia())
// Initialise le routeur Vue Router - permet la navigation entre pages
app.use(router)

// Monte l'application Vue sur l'élément HTML avec id="app" du fichier index.html
createApp(App).use(router).mount("#app")
