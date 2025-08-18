<template>
  <div class="p-4 flex flex-col gap-3 h-screen" v-loading="loadingState">
    <h2 class="text-xl font-bold mb-2">Highlight + Audio Timeline</h2>
    
    <!-- Highlight -->
    <div class="border text-black text-left flex justify-center p-4 flex-2 overflow-auto bg-gray-100 max-w-full">
      <span v-html="formattedText"></span>
    </div>

    <!-- Controls -->
    <div class="flex justify-center gap-4">
      <button @click="markTimestamp" class="bg-green-500 text-white px-4 py-2 rounded">
        Mark
      </button>
      <button @click="saveMarks" :class="existTimestamp ? 'disabled' : ''" class="bg-green-500 text-white px-4 py-2 rounded">
        Save Marks
      </button>
      <button @click="togglePlay" class="bg-blue-500 text-white px-4 py-2 rounded">
        <div v-if="!statePlay">▶</div>
        <div v-else>⏸</div>
      </button>
      <button @click="clearMarks" class="bg-red-500 text-white px-4 py-2 rounded">
        Clear
      </button>
      <button @click="restart" class="bg-red-500 text-white px-4 py-2 rounded">
        Restart Project
      </button>
    </div>

    <div class="flex justify-center items-center gap-5">
      <label for="zoom-slider">Zoom:</label>
      <input id="zoom-slider" type="range" min="20" max="2000" value="100" step="10" />
    </div>

    <!-- Waveform -->
    <div id="scroll-container" style="overflow-x: auto; white-space: nowrap;">
      <div id="waveform-timeline" style="height: 30px;"></div>
      <div id="waveform"></div>
    </div>
  </div>
</template>

<script setup>
import WaveSurfer from 'wavesurfer.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import { ref, onMounted, computed, reactive } from 'vue'
import { useCounterStore } from '@/stores/store'
import { removeSpeaker, base64ToFile, base64ToObjectURL } from '@/utils/base64Utils.js'
import { useRouter } from 'vue-router'
import emitter from '@/utils/eventBus'
import Toastify from 'toastify-js'
import axios from 'axios'

const stores = useCounterStore()
const router = useRouter()
const emit = defineEmits()
const audioBase64 = base64ToObjectURL(stores.getAudioFile)
const textContent = removeSpeaker(stores.getTextFile)
const loadingState = ref(false)

const words = textContent.replace(/\n/g, ' ').split(/\s+/)
const highlightedIndexes = ref([])
const formattedText = ref('')

// Đồng bộ hightlight với thanh waveform
const syncHighlight = () => {
  if (!wavesurfer) return
  const currentTime = wavesurfer.getCurrentTime()
  const duration = wavesurfer.getDuration()

  const progress = currentTime / duration
  const wordCount = Math.floor(progress * words.length)

  highlightedIndexes.value = Array.from({ length: wordCount }, (_, i) => i)

  // Format giữ xuống dòng
  let currentIndex = 0
  formattedText.value = textContent.split('\n').map(line => {
    return line
      .split(/\s+/)
      .map(word => {
        if (currentIndex < wordCount) {
          currentIndex++
          return `<span style="background: #ffeb3b">${word}</span>`
        } else {
          currentIndex++
          return word
        }
      })
      .join(' ')
  }).join('<br>')
}

const statePlay = ref(false)
var wavesurfer
let pxPerSec = 100
let regions = null

onMounted(async() => {
  loadingState.value = true
  await new Promise(resolve => setTimeout(resolve, 3000))
  loadingState.value = false
  const scrollContainer = document.getElementById('scroll-container')
  const waveformEl = document.getElementById('waveform')
  const timelineEl = document.querySelector('#waveform-timeline')
  wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: '#ddd',
    progressColor: '#2196f3',
    height: 100,
    responsive: true,
    url: audioBase64,
    plugins: [
      TimelinePlugin.create({
        container: '#waveform-timeline',
        primaryLabelInterval: 1,
        secondaryLabelInterval: 0.1,
        
      }),
      RegionsPlugin.create()
    ]
  })
  regions = wavesurfer.registerPlugin(RegionsPlugin.create())
  wavesurfer.on('ready', () => {
    updateWidth()
  })

  // Zoom slider
  document.getElementById('zoom-slider').addEventListener('input', e => {
    pxPerSec = Number(e.target.value)
    wavesurfer.zoom(pxPerSec)
    updateWidth()
  })

  function updateWidth() {
    const duration = wavesurfer.getDuration()
    const totalWidth = duration * pxPerSec
    waveformEl.style.width = totalWidth + 'px'
    timelineEl.style.width = totalWidth + 'px'
  }

  wavesurfer.on('play', () => {
    statePlay.value = true
  })

  wavesurfer.on('pause', () => {
    statePlay.value = false
  })

  wavesurfer.on('seek', syncHighlight)
  wavesurfer.on('audioprocess', syncHighlight)
  wavesurfer.on('interaction', syncHighlight)
  wavesurfer.on('ready', syncHighlight)

  // ======= Zoom control =======
  const zoomSlider = document.getElementById('zoom-slider')
  zoomSlider.addEventListener('input', e => {
    const pxPerSec = Number(e.target.value)
    wavesurfer.zoom(pxPerSec)
  })
})

const togglePlay = () => {
  if (wavesurfer) {
    wavesurfer.playPause()
  }
}

const timestamps = reactive({
  sentence: [],
  word: []
})
const existTimestamp = computed(() => {
  return timestamps.sentence.length === 0 && timestamps.word.length === 0
})

let currentSentence = null
let currentWord = null

const rawLines = stores.getTextFile.split('\n').map(line => {
  const match = line.match(/^([^:]+):\s*(.*)$/);
  if (match) {
    return { r: match[1], s: match[2] };
  }
  return null;
}).filter(Boolean);
console.log(rawLines);

// Hàm markTimestamp để đánh dấu câu
const markTimestamp = () => {
  if (!wavesurfer) return;
  console.log(rawLines);
  Toastify({
    text: "Đã đánh dấu!",
    duration: 1500,
    gravity: "top",
    position: 'center',
    style: {
      background: "linear-gradient(to right, #00b09b, #96c93d)",
      textAlign: 'center',
      position: 'fixed',
      left: '50%',
      top: '50%',
      transform: 'translateX(-50%) translateY(-50%)',
      borderRadius: '10px',
      padding: '10px',
    },
  }).showToast();
  const t = Math.floor(wavesurfer.getCurrentTime() * 1000);
  const duration = wavesurfer.getDuration() * 1000;
  const charPos = Math.floor((t / duration) * textContent.length)

  // Build rawLinesWithIndex để giữ start/end
  let offset = 0;
  const rawLinesWithIndex = rawLines.map(sentence => {
    const start = textContent.indexOf(sentence.s, offset);
    const end = start + sentence.s.length;
    offset = end;
    return { ...sentence, start, end };
  });
  
  // Tìm câu hiện tại
  const sentenceIndex = Math.floor((t / duration) * rawLines.length)

  if (sentenceIndex === -1) return
  const sentenceObj = rawLinesWithIndex[sentenceIndex]

  if (!currentSentence) {
    currentSentence = {
      r: sentenceObj.r,
      s: sentenceObj.s,
      t0: t,
      t1: null,
      b: sentenceObj.start,
      e: null
    };
    console.log("Đánh dấu t0 cho câu:", currentSentence)
  } else if (currentSentence.t1 === null) {
  currentSentence.t1 = t
  currentSentence.e = sentenceObj.end
  timestamps.sentence.push({ ...currentSentence })
  console.log("Sentence hoàn tất và push:", currentSentence)

  //  highlight trên waveform bằng region
  regions.addRegion({
    id: `sentence-${timestamps.sentence.length}`,
    start: currentSentence.t0 / 1000,
    end: currentSentence.t1 / 1000,
    color: 'rgba(0, 150, 136, 0.3)',
    drag: false,
    resize: false,
  })

  const words = currentSentence.s.split(/\s+/);
  const totalChars = words.reduce((sum, w) => sum + w.length, 0)
  let curTime = currentSentence.t0
  let charOffset = currentSentence.b

  words.forEach(word => {
    const wordDuration = (word.length / totalChars) * (currentSentence.t1 - currentSentence.t0)
    const start = curTime
    const end = curTime + wordDuration

    timestamps.word.push([
      Math.floor(start),
      Math.floor(end),
      word,
      charOffset,
      word.length
    ]);

    curTime = end;
    charOffset += word.length + 1;
  });

  console.log("Words đã thêm:", timestamps.word)
  currentSentence = null;
  } else {
    console.warn("Câu này đã được đánh dấu xong.")
  }

  console.log(timestamps);
}

// gọi sau khi đã build AudioBuffer "out" từ các segment
// Chuyển AudioBuffer -> WAV Blob 16-bit PCM
function audioBufferToWav(abuffer) {
  const numCh = abuffer.numberOfChannels
  const sampleRate = abuffer.sampleRate
  const numFrames = abuffer.length

  const bytesPerSample = 2;
  const blockAlign = numCh * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = numFrames * blockAlign

  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  let pos = 0
  const writeString = (s) => { for (let i = 0; i < s.length; i++) view.setUint8(pos++, s.charCodeAt(i)); }
  const writeUint16 = (d) => { view.setUint16(pos, d, true); pos += 2; }
  const writeUint32 = (d) => { view.setUint32(pos, d, true); pos += 4; }

  writeString('RIFF')
  writeUint32(36 + dataSize)
  writeString('WAVE')
  writeString('fmt ')
  writeUint32(16)
  writeUint16(1)
  writeUint16(numCh)
  writeUint32(sampleRate)
  writeUint32(byteRate)
  writeUint16(blockAlign)
  writeUint16(16)
  writeString('data')
  writeUint32(dataSize)
  const channels = [];
  for (let ch = 0; ch < numCh; ch++) channels.push(abuffer.getChannelData(ch));

  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      let sample = channels[ch][i];
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      pos += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function rebuildTimestamps(timestamps) {
  let offset = 0
  const newSentences = []
  const newWords = []

  timestamps.sentence.forEach(seg => {
    const duration = seg.t1 - seg.t0 
    newSentences.push({
      ...seg,
      t0: offset,
      t1: offset + duration
    })

    const words = seg.s.split(/\s+/)
    const step = duration / words.length
    words.forEach((w, i) => {
      const start = offset + i * step
      const end = offset + (i + 1) * step
      newWords.push([start, end, w])
    })

    offset += duration
  })

  return { sentence: newSentences, word: newWords }
}

async function rebuildAudioFromMarks() {
  if (!timestamps.sentence.length) return null

  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const res = await fetch(audioBase64)
  const arr = await res.arrayBuffer()
  const src = await ctx.decodeAudioData(arr)

  const sr = src.sampleRate
  let total = 0
  timestamps.sentence.forEach(seg => {
    total += Math.max(0, Math.floor((seg.t1 - seg.t0) * sr / 1000))
  })

  const out = ctx.createBuffer(src.numberOfChannels, total, sr)
  let writePtr = 0
  timestamps.sentence.forEach(seg => {
    const a = Math.floor(seg.t0 * sr / 1000)
    const b = Math.floor(seg.t1 * sr / 1000)
    const len = Math.max(0, b - a)
    for (let ch = 0; ch < src.numberOfChannels; ch++) {
      out.getChannelData(ch).set(src.getChannelData(ch).subarray(a, b), writePtr)
    }
    writePtr += len
  })

  return out
}

const saveMarks = () => {
  loadingState.value = true
  try {
    const blob = new Blob([JSON.stringify(timestamps, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timestamps.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a); 
    // Audio WAV
    rebuildAudioFromMarks().then(async(out) => {
      if (!out) return
      const wavBlob = audioBufferToWav(out)
      stores.audioBlob = wavBlob
      stores.timestamps = timestamps
      await new Promise(resolve => setTimeout(resolve, 2000)) 
      router.push('/player')
    })
  } finally {
    setTimeout(() => {
      loadingState.value = false
    }, 2500)
  }
}

const clearMarks = () => {
  timestamps.sentence = []
  timestamps.word = []
  regions.clearRegions()
}

const restart = async () => {
  loadingState.value = true
  stores.setAudioFile(null)
  stores.setTextFile(null)
  await new Promise(resolve => setTimeout(resolve, 2000))
  loadingState.value = false
  router.push('/')
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
