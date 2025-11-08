import { ref, h, render } from 'vue';
import Toast from '@/components/Toast.vue';

const toasts = ref([]);
let toastIdCounter = 0;

export function useToast() {
  const add = (options) => {
    const id = ++toastIdCounter;
    const toastData = {
      id,
      message: options.message || '',
      type: options.type || 'info',
      duration: options.duration !== undefined ? options.duration : 3000,
      position: options.position || 'top-right',
      dismissible: options.dismissible !== undefined ? options.dismissible : true
    };

    toasts.value.push(toastData);

    // Create toast element
    const container = document.createElement('div');
    document.body.appendChild(container);

    const vnode = h(Toast, {
      ...toastData,
      onClose: () => {
        remove(id);
        render(null, container);
        document.body.removeChild(container);
      }
    });

    render(vnode, container);

    return id;
  };

  const remove = (id) => {
    const index = toasts.value.findIndex(t => t.id === id);
    if (index > -1) {
      toasts.value.splice(index, 1);
    }
  };

  const success = (message, options = {}) => {
    return add({ message, type: 'success', ...options });
  };

  const error = (message, options = {}) => {
    return add({ message, type: 'error', ...options });
  };

  const warning = (message, options = {}) => {
    return add({ message, type: 'warning', ...options });
  };

  const info = (message, options = {}) => {
    return add({ message, type: 'info', ...options });
  };

  const clear = () => {
    toasts.value = [];
  };

  return {
    toasts,
    add,
    remove,
    success,
    error,
    warning,
    info,
    clear
  };
}
