<template>
  <div class="p-4 flex flex-col gap-3 h-screen" v-loading="loadingState">
    <h2 class="text-xl font-bold mb-2">Highlight + Audio Timeline</h2>
    
    <!-- Highlight -->
    <div class="border text-black text-left flex justify-center p-4 flex-2 overflow-auto bg-gray-100 max-w-full">
      <span @mousedown="startHightlight"
        @mousemove="hightlightSentence"
        @mouseup="endHightlight"
        @dblclick="hightlightWord"
        v-html="formattedText"></span>
    </div>

    <!-- Controls -->
    <div class="flex justify-center items-center gap-4">
      <div class="flex justify-center items-center gap-2" v-if="startMark">
        <button :class="!currentWord ? 'disabled' : ''" @click="markWord" class="flex items-center justify-center text-white w-[80px] h-[30px] rounded">
          <span class="text-xs text-green-400">Mark Word</span>
        </button>
        <button @click="newSentence" class="flex items-center justify-center text-white w-[80px] h-[30px] rounded">
          <span class="text-xs text-green-400">New Sentence</span>
        </button>
      </div>
      <button :class="!currentSentence ? 'disabled' : ''" @click="markSentence" class="bg-green-500 text-white px-4 py-2 rounded">
        Mark Sentence
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

    <div class="flex justify-center items-center gap-25">
      <div class="flex justify-center items-center gap-3">
        <label for="zoom-slider">Zoom:</label>
        <input id="zoom-slider" type="range" min="20" max="2000" value="100" step="10" />
      </div>
      
      <div class="flex items-center gap-3">
        <span>Speed: </span>
        <button @click="decreaseSpeed" class="flex justify-center items-center bg-gray-300 w-5 h-10 px-2 py-1 rounded">-</button>
        <span>{{ playbackRate.toFixed(2) }}x</span>
        <button @click="increaseSpeed" class="flex justify-center items-center bg-gray-300 w-5 h-10 px-2 py-1 rounded">+</button>
      </div>
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
import axios from 'axios'
import { notify } from '@/utils/notify'

const stores = useCounterStore()
const router = useRouter()
const emit = defineEmits()
const audioBase64 = base64ToObjectURL(stores.getAudioFile)
const textContent = computed(() => removeSpeaker(stores.getTextFile))
const loadingState = ref(false)

const words = textContent.value.replace(/\n/g, ' ').split(/\s+/)
const highlightedIndexes = ref([])
const formattedText = computed(() => {
  return textContent.value
    .split('\n')
    .map((line, index) => {
      let content = line

      if (highlightedSentences.value.includes(line)) {
        content = `<mark style="background-color: #dcab08; padding: 4px; border-radius: 6px;">${line}</mark>`
      }
      return `<span class="sentence" data-index="${index}">${content}</span>`
    }).join('<br>')
})

const statePlay = ref(false)
let wavesurfer = null
let pxPerSec = 100
let regions = null

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

let currentSentence = ref(null)
let currentWord = ref(null)

const rawLines = stores.getTextFile.split('\n').map(line => {
  const match = line.match(/^([^:]+):\s*(.*)$/);
  if (match) {
    return { r: match[1], s: match[2] }
  }
  return null;
}).filter(Boolean)

let offset = 0
const rawLinesWithIndex = rawLines.map(sentence => {
  const startSen = textContent.value.indexOf(sentence.s, offset)
  const endSen = startSen + sentence.s.length
  offset = endSen
  return { ...sentence, startSen, endSen }
})

const hightlight = ref(false)
let highlightedSentences = ref([])
let highlightedWords = ref([])

const startHightlight = () => {
  hightlight.value = true
}
const hightlightSentence = () => {
  const selection = window.getSelection()
  if(selection.anchorNode) {
    const selectionText = rawLinesWithIndex.find(line => {
      return line.s === selection.anchorNode.textContent
    })
    if(!selectionText) return
    notify('Đã hightlight câu', '#dcab08')
    currentSentence.value = {
      speaker: selectionText.r,
      text: selectionText.s,
      startIdx: selectionText.startSen,
      endIdx: selectionText.endSen,
    }
    if(!highlightedSentences.value.includes(selectionText.s)) {
      highlightedSentences.value.push(selectionText.s)
    }
  }
}
const endHightlight = () => {
  hightlight.value = false
}

const hightlightWord = () => {
  let selection = window.getSelection().toString()
  let testSelection = selection.split('')
  if(testSelection[testSelection.length - 1] === ' ') {
    testSelection = testSelection.slice(0, testSelection.length - 1)
    selection = testSelection.join('')
  }
  const startIdx = currentSentence.value.text.indexOf(selection)
  const endIdx = startIdx + selection.length
  if(!selection) return
  currentWord.value = {
    speaker: currentSentence.value.speaker,
    sentence: currentSentence.value.text,
    word: selection,
    startIdx: startIdx,
    endIdx: endIdx,
  }
  if(!highlightedWords.value.includes(currentWord.value.word)) {
    highlightedWords.value.push(currentWord.value.word)
  }
  notify('Đã hightlight từ', '#dcab08')
}

// Hàm đánh dấu câu
let markingSentence = null
let markingWord = null
const startMark = ref(false)

const markSentence = () => {
  if (!wavesurfer) return
  const t = wavesurfer.getCurrentTime() * 1000
  if(!markingSentence) {
    notify('Bắt đầu đánh dấu câu!', "rgb(2, 173, 153)")
    markingSentence = {
      r: currentSentence.value.speaker,
      s: currentSentence.value.text,
      t0: t,
      t1: null,
      b: currentSentence.value.startIdx,
      e: currentSentence.value.endIdx
    }
  } else if (markingSentence.t1 === null) {
    notify('Hoàn thành 1 câu!', "rgb(2, 173, 153)")
    markingSentence.t1 = t
    console.log(markingSentence);
    
    timestamps.sentence.push({ ...markingSentence })

    //  highlight trên waveform bằng region
    regions.addRegion({
      start: markingSentence.t0 / 1000,
      end: markingSentence.t1 / 1000,
      color: 'rgba(0, 150, 136, 0.3)',
      drag: false,
      resize: false,
    })
    markingSentence = null
    startMark.value = true
  }
}

const getCurrentSentenceRange = () => {
  if (timestamps.sentence.length === 0) return null
  return timestamps.sentence[timestamps.sentence.length - 1]
}

const markWord = () => {
  if (!wavesurfer) return
  const t = wavesurfer.getCurrentTime() * 1000
  const currentSentenceRange = getCurrentSentenceRange()
  if(!markingWord) {
    markingWord = [
      t,
      null,
      currentWord.value.word,
      currentWord.value.startIdx,
      currentWord.value.word.length
    ]
    if (markingWord[0] < currentSentenceRange.t0 || markingWord[0] > currentSentenceRange.t1) {
      notify('Quá phạm vi câu, Đánh lại!', "#ff0000")
      markingWord = null
      return
    }
    notify('Bắt đầu đánh từ!', "rgb(2, 173, 153)")
  } else if (markingWord[1] === null) {
    markingWord[1] = t
    if (markingWord[0] >= currentSentenceRange.t0 && markingWord[1] <= currentSentenceRange.t1) {
      notify('Hoàn thành 1 từ!', "rgb(2, 173, 153)")
      timestamps.word.push([...markingWord])
      //  highlight trên waveform bằng region
      regions.addRegion({
        start: markingWord[0] / 1000,
        end: markingWord[1] / 1000,
        color: 'rgba(255, 213, 79, 0.4)',
        drag: false,
        resize: false,
      })
      markingWord = null
      currentWord.value = null
    } else {
      notify('Quá phạm vi câu, Đánh lại!', "#ff0000")
      markingWord = null
    }
  }
}

const newSentence = () => {
  startMark.value = false
  currentSentence.value = null
  notify('Câu mới', '#dcab08')
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

// Ghép các đoạn audio dựa theo mốc đánh dấu -> bản audio mới
async function rebuildAudioFromMarks() {
  if (!timestamps.sentence.length) return null

  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const res = await fetch(audioBase64)
  const arr = await res.arrayBuffer()
  const src = await ctx.decodeAudioData(arr)

  const sr = src.sampleRate
  let total = 0
  timestamps.sentence.forEach(seg => {
    const a = Math.max(0, Math.floor(seg.t0 * sr / 1000))
    const b = Math.min(src.length, Math.floor(seg.t1 * sr / 1000))
    if (b > a) total += (b - a)
  })

  const out = ctx.createBuffer(src.numberOfChannels, total, sr)
  let writePtr = 0
  timestamps.sentence.forEach(seg => {
    const a = Math.max(0, Math.floor(seg.t0 * sr / 1000))
    const b = Math.min(src.length, Math.floor(seg.t1 * sr / 1000))

    if (b > a) { // chỉ copy khi đoạn có độ dài thực sự
      const len = b - a
      for (let ch = 0; ch < src.numberOfChannels; ch++) {
        out.getChannelData(ch).set(src.getChannelData(ch).subarray(a, b), writePtr)
      }
      writePtr += len
    }
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

const clearMarks = async () => {
  loadingState.value = true
  startMark.value = false
  timestamps.sentence = []
  timestamps.word = []
  highlightedSentences.value = []
  regions.clearRegions()
  await new Promise(resolve => setTimeout(resolve, 500))
  loadingState.value = false
}

const restart = async () => {
  loadingState.value = true
  stores.setAudioFile(null)
  stores.setTextFile(null)
  await new Promise(resolve => setTimeout(resolve, 2000))
  loadingState.value = false
  router.push('/')
}

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
    wavesurfer.setPlaybackRate(1)
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

  // ======= Zoom control =======
  const zoomSlider = document.getElementById('zoom-slider')
  zoomSlider.addEventListener('input', e => {
    const pxPerSec = Number(e.target.value)
    wavesurfer.zoom(pxPerSec)
  })
})

const playbackRate = ref(1.0)

const increaseSpeed = () => {
  if (playbackRate.value < 2) {
    playbackRate.value += 0.25
    wavesurfer.setPlaybackRate(playbackRate.value)
  }
}

const decreaseSpeed = () => {
  if (playbackRate.value > 0.5) {
    playbackRate.value -= 0.25
    wavesurfer.setPlaybackRate(playbackRate.value)
  }
}
</script>

<style scoped>
.disabled {
  background-color: #ccc;
  color: black;
  cursor: not-allowed;
  opacity: 0.6;
  pointer-events: none;
  position: relative;
}
.disabled span {
  color: black;
}
</style>
