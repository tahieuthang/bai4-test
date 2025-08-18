import { createRouter, createWebHistory } from 'vue-router'
import UploadView from '@/views/UploadView.vue'
import EditorView from '@/views/EditorView.vue'
import PlayerView from '@/views/PlayerView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'upload',
      component: UploadView,
      meta: {
        requiresAuth: false,
      }
    },
    {
      path: '/editor',
      name: 'editor',
      component: EditorView,
      meta: {
        requiresAuth: false,
      }
    },
    {
      path: '/player',
      name: 'player',
      component: PlayerView,
      meta: {
        requiresAuth: false,
      }
    },
  ]
})

export default router