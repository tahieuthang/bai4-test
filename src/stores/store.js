import { defineStore } from 'pinia';

export const useCounterStore = defineStore('store', {
  state: () => ({
    audioFile: localStorage.getItem('audioFile') || null,
    textFile: localStorage.getItem('textFile') || null,
    play: false,
    audioBlob: null,
    timestamps: null
  }),
  getters: {
    getAudioFile(state) {
      return state.audioFile
    },
    getTextFile(state) {
      return state.textFile
    },
    isPlay: (state) => state.play,
    getTimestamps: (state) => state.timestamps
  },
  actions: {
    setAudioFile(value) {
      this.audioFile = value
      localStorage.setItem('audioFile', value)
    },
    setTextFile(value) {
      this.textFile = value
      localStorage.setItem('textFile', value)
    },
    setPlay(value) {
      this.play = value
    }
  }
});