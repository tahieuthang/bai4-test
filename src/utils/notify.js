import Toastify from 'toastify-js'

export const notify = (content, color) => {
  Toastify({
    text: `${content}`,
    duration: 1500,
    gravity: "top",
    position: 'center',
    style: {
      background: `${color}`,
      textAlign: 'center',
      position: 'fixed',
      left: '85%',
      top: '50%',
      transform: 'translateX(-50%) translateY(-50%)',
      borderRadius: '10px',
      padding: '10px',
      zIndex: 9999
    },
  }).showToast()
}