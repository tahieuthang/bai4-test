<template>
  <div class="flex items-center justify-center min-h-screen bg-gradient-to-b from-neutral-600 to-black">
    <form
      @submit.prevent="goToEditor"
      class="bg-white/90 backdrop-blur-md shadow-lg rounded-2xl p-8 w-full max-w-md space-y-6"
    >
      <h2 class="text-2xl font-bold text-center text-gray-800">Tải File</h2>

      <!-- Audio -->
      <div>
        <label class="block mb-2 text-sm font-medium text-gray-700">🎵 Chọn file Audio</label>
        <input
          type="file"
          accept="audio/*"
          @change="onAudioChange"
          required
          class="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-black file:text-white"
        />
      </div>

      <!-- Text -->
      <div>
        <label class="block mb-2 text-sm font-medium text-gray-700">📄 Chọn file Text</label>
        <input
          type="file"
          accept=".txt"
          @change="onTextChange"
          required
          class="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer p-2 focus:outline-none focus:ring-2 focus:ring-purple-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-neutral-600 file:text-white"
        />
      </div>

      <!-- Button -->
      <button
        type="submit"
        class="w-full py-3 rounded-lg bg-gradient-to-b from-neutral-600 to-black text-white font-semibold shadow-md border-none transition"
        :class="loading ? 'disabled' : ''"
      >
        Tiếp tục ➡
      </button>
    </form>
  </div>
</template>


<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCounterStore } from '@/stores/store'

const stores = useCounterStore()
const router = useRouter()
const loading = ref(false)
let audioBase64 = ref('')
let textContent = ref('')

const onAudioChange = (e) => {
  const file = e.target.files[0]
  const reader = new FileReader()
  reader.onload = () => {
    audioBase64.value = reader.result
  }
  reader.readAsDataURL(file)
} 

const onTextChange = (e) => {
  const file = e.target.files[0]
  const reader = new FileReader()
  reader.onload = () => {
    textContent.value = reader.result
  }
  reader.readAsText(file)
}

const goToEditor = async () => {
  loading.value = true
  try {
    stores.setAudioFile(audioBase64.value)
    stores.setTextFile(textContent.value)
    await new Promise(resolve => setTimeout(resolve, 1000))
    router.push('/editor')
  } finally {
    setTimeout(() => {
      loading.value = false
    }, 1500)
  }
}
</script>

<style scoped>
.disabled {
  background-color: #ccc;
  color: #666;
  cursor: not-allowed;
  opacity: 0.6;
  pointer-events: none;
}
</style>