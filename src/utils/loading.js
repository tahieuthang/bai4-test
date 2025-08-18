const elLoading = `
  <div id="getting" class="loading-overlay">
    <div class="spinner-border">
      <span class="visually-hidden">Loading...</span>
    </div>
  </div>
`;

const loadingStyles = `
  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(26, 26, 26, 0.5);
    z-index: 1000;
  }
  
  .spinner-border {
    display: inline-block;
    width: 2rem;
    height: 2rem;
    vertical-align: -0.125em;
    border: 0.25em solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spinner-border 0.75s linear infinite;
  }
  
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
  
  @keyframes spinner-border {
    to {
      transform: rotate(360deg);
    }
  }

  .position-relative {
    position: relative;
  }
`;

function injectStyles() {
  const styleEl = document.createElement('style');
  styleEl.textContent = loadingStyles;
  document.head.appendChild(styleEl);
}

// Gọi hàm này một lần khi ứng dụng của bạn khởi động
injectStyles();

export default {
  mounted(el, binding) {
    if (binding.value && !el.querySelector('#getting')) {
      el.classList.add('position-relative');
      el.insertAdjacentHTML('beforeend', elLoading);
    }
  },
  
  updated(el, binding) {
    if (binding.value === binding.oldValue) return;

    const loadingEl = el.querySelector('#getting');
    
    if (binding.value && !loadingEl) {
      el.classList.add('position-relative');
      el.insertAdjacentHTML('beforeend', elLoading);
    } else if (!binding.value && loadingEl) {
      el.removeChild(loadingEl);
    }
  },

  getSSRProps(binding, vnode) {
    console.log(binding, vnode);
    return {};
  }
};