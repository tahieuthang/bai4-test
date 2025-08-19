<template>
  <div class="p-4 flex flex-col gap-3 h-screen">
    <h2 class="text-xl font-bold mb-2">Highlight + Audio Timeline</h2>
  
    <div class="border text-black text-left flex justify-center p-4 flex-2 overflow-auto bg-gray-100 max-w-full">
      <span v-html="formattedText"></span>
    </div>

    <div class="flex justify-center gap-4">
      <button @click="togglePlay" class="bg-blue-500 text-white px-4 py-2 rounded">
        <div v-if="!statePlay">▶</div>
        <div v-else>⏸</div>
      </button>
    </div>

    <div id="scroll-container" style="overflow-x: auto; white-space: nowrap;">
      <div id="waveform-timeline" style="height: 30px;"></div>
      <div id="waveform"></div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WaveSurfer from 'wavesurfer.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'
import { useCounterStore } from '@/stores/store'

const formattedText = ref('')
const statePlay = ref(false)
let wavesurfer = null
const stores = useCounterStore()
let timestamps = stores.getTimestamps

onMounted(() => {
  timestamps = normalizeTimestamps(timestamps)
  console.log(timestamps);
  if (!stores.audioBlob || !timestamps) return

  // blob => object URL
  const audioUrl = URL.createObjectURL(stores.audioBlob)
  wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: '#ddd',
    progressColor: '#2196f3',
    height: 100,
    responsive: true,
    url: audioUrl,
    plugins: [
      TimelinePlugin.create({ container: '#waveform-timeline' })
    ]
  })

  wavesurfer.on('audioprocess', () => {
    updateHighlight(timestamps)
  })
  wavesurfer.on('seek', () => updateHighlight(timestamps))
  wavesurfer.on('interaction', () => updateHighlight(timestamps))
  wavesurfer.on('ready', () => updateHighlight(timestamps))

  formattedText.value = timestamps.sentence
    .map(s => `${s.r}: ${s.s}`)
    .join('<br><br>')
})

const togglePlay = () => {
  if (!wavesurfer) return
  statePlay.value = !statePlay.value
  if (statePlay.value) {
    wavesurfer.play()
  } else {
    wavesurfer.pause()
  }
}

// highlight
function updateHighlight(timestamps) {
  const currentMs = wavesurfer.getCurrentTime() * 1000
  let currentIndex = 0

  formattedText.value = timestamps.sentence.map(s => {
    const wordsInSentence = s.s.split(/\s+/)
    return wordsInSentence.map(w => {
      const idx = currentIndex++
      const [startTime, endTime] = timestamps.word[idx] || [0, 0]
      if (currentMs >= startTime && currentMs <= endTime) {
        return `<span style="background: #ffeb3b;">${w}</span>`
      }
      return w
    }).join(" ")
  }).join("<br><br>")
}


// Chuyển tgian bắt đầu cho audio về 0
function normalizeTimestamps(timestamps) {
  if (!timestamps || !timestamps.word?.length) return timestamps
  const offset = timestamps.word[0][0]

  return {
    sentence: timestamps.sentence.map(s => ({
      ...s,
      t0: s.t0 - offset,
      t1: s.t1 - offset
    })),
    word: timestamps.word.map(w => ([
      w[0] - offset,
      w[1] - offset,
      w[2],
      w[3],
      w[4]
    ]))
  }
}
</script>