import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import loadingDirective from './utils/loading.js'

const app = createApp(App)
app.use(router)
app.use(createPinia())
app.directive('loading', loadingDirective);
app.mount('#app')
