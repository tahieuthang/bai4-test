<template>
  <div class="p-4 flex flex-col gap-3 h-screen">
    <h2 class="text-xl font-bold mb-2">Highlight + Audio Timeline</h2>
  
    <div class="flex items-center border text-black text-left flex justify-center p-4 flex-2 overflow-auto bg-gray-100 max-w-full">
      <template v-for="(seg, i) in segments" :key="i">
        <span v-if="seg.type === 'plain'" class="plain">{{ seg.text }}</span>
        <span
          v-else
          class="word"
          :class="{ active: isWordActive(seg.word) }"
          :data-word-index="seg.wordIndex"
        >{{ seg.text }}</span>
      </template>
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

const combinedText = ref('')
const statePlay = ref(false)
let wavesurfer = null
const stores = useCounterStore()
let timestamps = stores.getTimestamps
let currentMs = ref(0)
let segments = ref([])
let timerId = null

onMounted(() => {
  timestamps = normalizeTimestamps(timestamps)
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

  buildCombinedText()
  buildSegmentsFromWords()
  wavesurfer.on('play', () => {
    timerId = setInterval(() => {
      currentMs.value = Math.floor(wavesurfer.getCurrentTime() * 1000)
    }, 60)
  })
  wavesurfer.on('audioprocess', (time) => {
    currentMs.value = Math.floor(time * 1000)
  })

  wavesurfer.on('pause', () => clearInterval(timerId))
  wavesurfer.on('finish', () => clearInterval(timerId))
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

function isWordActive(word) {
  if (!word) return false
  const s = word.startMs
  const e = word.durMs
  return currentMs.value >= s && currentMs.value < e
}

function sanitizeSentenceText(s) {
  return s.replace(/\s+/g, ' ').trim()
}

function buildCombinedText() {
  const arr = timestamps.sentence.map((sObj) => sanitizeSentenceText(sObj.s))
  combinedText.value = arr.join('\n')
}

function buildSegmentsFromWords() {
  const txt = combinedText.value
  const words = timestamps.word
  const segs = []
  let pos = 0

  for (let i = 0; i < words.length; i++) {
    const [startMs, durMs, wText, charStart, charLen] = words[i]
    const start = charStart
    const len = charLen

    if (start > pos) {
      segs.push({
        type: "plain",
        text: txt.slice(pos, start)
      });
    }

    const displayText = txt.slice(start, start + len)

    segs.push({
      type: "word",
      text: displayText,
      word: { startMs, durMs, text: wText, charStart: start, charLen: len },
      wordIndex: i
    });

    pos = start + len
  }

  if (pos < txt.length) {
    segs.push({ type: "plain", text: txt.slice(pos) })
  }

  segments.value = segs
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

<style scoped>
.plain { color: inherit; }
.word {
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.12s, color 0.12s;
  padding: 0 2px;
  color: inherit;
}
.word.active {
  background: #ffeb3b;
  color: #000 !important;
}
.word:hover {
  background: #fff176;
  color: #000 !important;
}
.flex.text-left {
  white-space: pre-line;
}
</style>