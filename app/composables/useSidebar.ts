const STORAGE_KEY = 'zapifine:sidebar:collapsed'

export function useSidebar() {
  const collapsed = useState<boolean>('sidebar-collapsed', () => false)

  if (import.meta.client) {
    onMounted(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw === '1') collapsed.value = true
        else if (raw === '0') collapsed.value = false
      } catch {}
    })
    watch(collapsed, (v) => {
      try {
        localStorage.setItem(STORAGE_KEY, v ? '1' : '0')
      } catch {}
    })
  }

  function toggle() {
    collapsed.value = !collapsed.value
  }
  function expand() {
    collapsed.value = false
  }
  function collapse() {
    collapsed.value = true
  }

  return { collapsed, toggle, expand, collapse }
}
