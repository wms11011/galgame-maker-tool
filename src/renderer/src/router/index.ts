import { createRouter, createWebHashHistory } from 'vue-router'
import { useProjectStore } from '../stores/projectStore'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'welcome',
      component: () => import('../views/WelcomeView.vue')
    },
    {
      path: '/editor',
      name: 'editor',
      component: () => import('../layouts/MainLayout.vue')
    }
  ]
})

router.beforeEach((to) => {
  const projectStore = useProjectStore()
  if (to.name === 'editor' && !projectStore.isOpen) {
    return { name: 'welcome' }
  }
})

export default router
