import { name as appName } from '../../../../package.json'
import { ModalWrapper } from '../wrapper'
import styles from './index.module.less'
import { Scrollbar } from '~/components/scrollbar'
import { ColorAvatar } from '~/components/color-avatar'
import type { AvatarOption } from '~/types'
import { recordEvent } from '~/utils/ga'

interface BatchDownloadModalProps {
  visible?: boolean
  avatarList?: AvatarOption[]
}

export const BatchDownloadModal = defineComponent<BatchDownloadModalProps>({
  emits: ['regenerate', 'close'],
  setup({ visible = false, avatarList = [] }, { emit }) {
    const { t } = useI18n()

    const making = ref(false)
    const madeCount = ref(0)

    async function handleDownload(avatarIndex) {
      const avatarEle = window.document.querySelector(`#avatar-${avatarIndex}`)

      if (avatarEle instanceof HTMLElement) {
        const html2canvas = (await import('html2canvas')).default
        const canvas = await html2canvas(avatarEle, {
          backgroundColor: null,
        })
        const dataURL = canvas.toDataURL()

        const trigger = document.createElement('a')
        trigger.href = dataURL
        trigger.download = `${appName}.png`
        trigger.click()
      }

      recordEvent('click_download', {
        event_category: 'click',
      })
    }

    async function make() {
      if (avatarList && !making.value) {
        making.value = true
        madeCount.value = 1

        const html2canvas = (await import('html2canvas')).default

        const { default: JSZip } = await import('jszip')
        const jsZip = new JSZip()

        for (let i = 0; i <= avatarList.length; i += 1) {
          const dom = window.document.querySelector(`#avatar-${i}`)

          if (dom instanceof HTMLElement) {
            const canvas = await html2canvas(dom, {
              backgroundColor: null,
            })

            const dataUrl = canvas.toDataURL().replace('data:image/png;base64,', '')
            jsZip.file(`${i + 1}.png`, dataUrl, { base64: true })
            madeCount.value = madeCount.value += 1
          }
        }

        const base64 = await jsZip.generateAsync({ type: 'base64' })

        making.value = false
        madeCount.value = 0

        const a = window.document.createElement('a')
        a.href = `data:application/zip;base64,${base64}`
        a.download = `${appName}.zip`
        a.click()

        recordEvent('click_download_multiple', {
          event_category: 'click',
        })
      }
    }

    const topBar = (
      <div class={styles['top-bar']}>
        <div>{ t('text.downloadMultipleTip') }</div>
        <div class={styles.right}>
          <button
            type="button"
            class={styles['regenerate-btn']}
            disabled={making.value}
            onClick={() => emit('regenerate')}
          >
            { t('text.regenerate') }
          </button>

          <button type="button" class={styles['download-btn']} onClick={make}>
            {
              making.value
                ? `${t('text.downloadingMultiple')}(${madeCount}/${
                    avatarList?.length
                  })`
                : t('text.downloadMultiple')
            }
          </button>
        </div>
      </div>
    )

    const avatarBox = (opt: AvatarOption, i: number) => (
      <div
        class={styles['avatar-box']} key={i}
        style={ `opacity: ${making.value && i + 1 > madeCount.value ? 0.5 : 1}` }
      >
        <ColorAvatar id={`avatar-${i}`} option={opt} size={280} />

        <button class={styles['download-single']} onClick={() => handleDownload(i)}>
          { t('action.download') }
        </button>
      </div>
    )

    const contentBox = (
      <Scrollbar
          style="height: 100%; overflow: hidden"
          options={{ suppressScrollX: false }}
        >
          <div class={styles.content}>

            {
              avatarList.map((opt, i) => (
                avatarBox(opt, i)
              ))
            }
          </div>
        </Scrollbar>
    )

    return () => {
      return (
        <ModalWrapper visible={visible} onClose={() => emit('close')}>
          <div class={styles.container}>
            {topBar}
            {contentBox}
          </div>
        </ModalWrapper>
      )
    }
  },
})
