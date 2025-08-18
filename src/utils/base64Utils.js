export function removeSpeaker(text) {
  return text.split('\n').map(line => line.replace(/^[^:]+:\s*/, '')).join('\n');
}
export function base64ToFile(dataUrl, filename = 'audio.ogg') {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}
export function base64ToObjectURL(dataUrl) {
  const file = base64ToFile(dataUrl)
  return URL.createObjectURL(file)
}