<template>
  <main class="main">
    <Container>
      <div class="content-warpper">
        <div class="content-view">
          <Header />

          <div class="playground">
            <div class="avatar-stage">
              <div class="avatar-wrapper">
                <VueColorAvatar
                  ref="colorAvatarRef"
                  :option="avatarOption"
                  :size="280"
                  :generated-image="
                    store.editorMode === 'ai' ? store.generatedImage : ''
                  "
                  :generated-image-alt="t('label.aiGeneratedImage')"
                  :style="{
                    transform: `rotateY(${flipped ? -180 : 0}deg)`,
                  }"
                />
              </div>

              <aside
                v-if="showPromptCard"
                class="ai-prompt-card"
                :aria-label="t('label.aiImagePrompt')"
              >
                <div class="prompt-card-title">
                  <span class="title-text">{{
                    t('label.aiImagePrompt')
                  }}</span>
                  <button
                    type="button"
                    class="card-action-btn"
                    :disabled="!currentGeneratedImagePrompt"
                    @click="handleCopyPrompt"
                  >
                    {{
                      promptCopied ? t('action.copied') : t('action.copyPrompt')
                    }}
                  </button>
                </div>
                <p class="prompt-card-text">
                  {{ currentGeneratedImagePrompt || t('text.aiPromptMissing') }}
                </p>
                <button
                  type="button"
                  class="card-action-btn save-template-btn"
                  :disabled="!currentGeneratedImagePrompt"
                  @click="handleSavePromptAsTemplate"
                >
                  {{ t('action.savePromptAsTemplate') }}
                </button>
              </aside>
            </div>

            <GeneratedImagesPanel />

            <ActionBar @action="handleAction" />

            <div class="action-group">
              <button
                type="button"
                class="action-btn action-randomize"
                @click="handleGenerate"
              >
                {{ t('action.randomize') }}
              </button>

              <button
                type="button"
                class="action-btn action-download"
                :disabled="downloading"
                @click="handleDownload"
              >
                {{
                  downloading
                    ? `${t('action.downloading')}...`
                    : t('action.download')
                }}
              </button>

              <button
                type="button"
                class="action-btn action-multiple"
                @click="handleGenerateMultiple"
              >
                {{ t('action.downloadMultiple') }}
              </button>
            </div>
          </div>

          <Footer />

          <CodeModal :visible="codeVisible" @close="codeVisible = false" />

          <DownloadModal
            :visible="downloadModalVisible"
            :image-url="imageDataURL"
            @close=";(downloadModalVisible = false), (imageDataURL = '')"
          />
        </div>

        <ConfettiCanvas />

        <div class="gradient-bg">
          <div class="gradient-top"></div>
          <div class="gradient-bottom"></div>
        </div>
      </div>
    </Container>

    <BatchDownloadModal
      :visible="avatarListVisible"
      :avatar-list="avatarList"
      @regenerate="generateMultiple"
      @close=";(avatarListVisible = false), (avatarList = [])"
    />

    <Sider>
      <Configurator />
    </Sider>
  </main>
</template>

<script lang="ts" setup>
import { computed, ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'

import ActionBar from '@/components/ActionBar.vue'
import Configurator from '@/components/Configurator.vue'
import GeneratedImagesPanel from '@/components/GeneratedImagesPanel.vue'
import BatchDownloadModal from '@/components/Modal/BatchDownloadModal.vue'
import CodeModal from '@/components/Modal/CodeModal.vue'
import DownloadModal from '@/components/Modal/DownloadModal.vue'
import VueColorAvatar, {
  type VueColorAvatarRef,
} from '@/components/VueColorAvatar.vue'
import { ActionType } from '@/enums'
import { useAvatarOption } from '@/hooks'
import Container from '@/layouts/Container.vue'
import Footer from '@/layouts/Footer.vue'
import Header from '@/layouts/Header.vue'
import Sider from '@/layouts/Sider.vue'
import { useStore } from '@/store'
import {
  REDO,
  SET_AI_BATCH_MODAL_VISIBLE,
  SET_AI_TEMPLATE_SEED_PROMPT,
  SET_SIDER_STATUS,
  UNDO,
} from '@/store/mutation-type'
import {
  getRandomAvatarOption,
  getSpecialAvatarOption,
  showConfetti,
} from '@/utils'
import {
  DOWNLOAD_DELAY,
  NOT_COMPATIBLE_AGENTS,
  TRIGGER_PROBABILITY,
} from '@/utils/constant'
import { recordEvent } from '@/utils/ga'

import { name as appName } from '../package.json'
import ConfettiCanvas from './components/ConfettiCanvas.vue'
import type { AvatarOption } from './types'

const store = useStore()

const [avatarOption, setAvatarOption] = useAvatarOption()

const { t } = useI18n()

const colorAvatarRef = ref<VueColorAvatarRef>()

// AI 模式展示生图时，主图右侧同步显示这张图对应的生图 prompt
const showPromptCard = computed(
  () => store.editorMode === 'ai' && !!store.generatedImage
)
const currentGeneratedImagePrompt = computed(
  () => store.generatedImagePrompts[store.generatedImage] ?? ''
)

const promptCopied = ref(false)
let promptCopiedTimer: ReturnType<typeof setTimeout> | undefined

/** 复制当前生图 prompt；优先用剪贴板 API，旧环境回退到隐藏文本域 */
async function handleCopyPrompt() {
  const prompt = currentGeneratedImagePrompt.value
  if (!prompt) return

  let succeeded = false
  try {
    await navigator.clipboard.writeText(prompt)
    succeeded = true
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = prompt
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    succeeded = document.execCommand('copy')
    document.body.removeChild(textarea)
  }

  if (succeeded) {
    promptCopied.value = true
    if (promptCopiedTimer) clearTimeout(promptCopiedTimer)
    promptCopiedTimer = setTimeout(() => {
      promptCopied.value = false
    }, 1600)
  }
}

/** 把当前生图 prompt 带入侧栏的模板命名表单，创建自定义模板 */
function handleSavePromptAsTemplate() {
  const prompt = currentGeneratedImagePrompt.value
  if (!prompt) return

  // 侧栏若处于折叠状态先展开，保证命名表单可见
  if (store.isSiderCollapsed) {
    store[SET_SIDER_STATUS](false)
  }
  store[SET_AI_TEMPLATE_SEED_PROMPT](prompt)
}

function handleGenerate() {
  if (Math.random() <= TRIGGER_PROBABILITY) {
    let colorfulOption = getSpecialAvatarOption()
    while (
      JSON.stringify(colorfulOption) === JSON.stringify(avatarOption.value)
    ) {
      colorfulOption = getSpecialAvatarOption()
    }
    colorfulOption.wrapperShape = avatarOption.value.wrapperShape
    colorfulOption.background.image = avatarOption.value.background.image
    setAvatarOption(colorfulOption)
    showConfetti()
  } else {
    const randomOption = getRandomAvatarOption(avatarOption.value)
    setAvatarOption(randomOption)
  }

  recordEvent('click_randomize', {
    event_category: 'click',
  })
}

const downloadModalVisible = ref(false)
const downloading = ref(false)
const imageDataURL = ref('')

/** 生成下载文件名：AI 生图携带时间戳，避免多次下载相互覆盖 */
function getDownloadFileName() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  const timestamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return store.editorMode === 'ai'
    ? `${appName}_${timestamp}.png`
    : `${appName}.png`
}

async function handleDownload() {
  try {
    downloading.value = true
    const avatarEle = colorAvatarRef.value?.avatarRef

    const userAgent = window.navigator.userAgent.toLowerCase()
    const notCompatible = NOT_COMPATIBLE_AGENTS.some(
      (agent) => userAgent.indexOf(agent) !== -1
    )

    if (avatarEle) {
      let dataURL = store.editorMode === 'ai' ? store.generatedImage : ''

      if (!dataURL) {
        const html2canvas = (await import('html2canvas')).default
        const canvas = await html2canvas(avatarEle, {
          backgroundColor: null,
        })
        dataURL = canvas.toDataURL()
      }

      if (notCompatible) {
        imageDataURL.value = dataURL
        downloadModalVisible.value = true
      } else {
        const trigger = document.createElement('a')
        trigger.href = dataURL
        trigger.download = getDownloadFileName()
        trigger.click()
      }
    }

    recordEvent('click_download', {
      event_category: 'click',
    })
  } finally {
    setTimeout(() => {
      downloading.value = false
    }, DOWNLOAD_DELAY)
  }
}

const flipped = ref(false)
const codeVisible = ref(false)

function handleAction(actionType: ActionType) {
  switch (actionType) {
    case ActionType.Undo:
      store[UNDO]()
      recordEvent('action_undo', {
        event_category: 'action',
        event_label: 'Undo',
      })
      break

    case ActionType.Redo:
      store[REDO]()
      recordEvent('action_redo', {
        event_category: 'action',
        event_label: 'Redo',
      })
      break

    case ActionType.Flip:
      flipped.value = !flipped.value
      recordEvent('action_flip_avatar', {
        event_category: 'action',
        event_label: 'Flip Avatar',
      })
      break

    case ActionType.Code:
      codeVisible.value = !codeVisible.value
      recordEvent('action_view_code', {
        event_category: 'action',
        event_label: 'View Avatar Option Code',
      })
      break
  }
}

const avatarListVisible = ref(false)
const avatarList = ref<AvatarOption[]>([])

watchEffect(() => {
  avatarListVisible.value =
    Array.isArray(avatarList.value) && avatarList.value.length > 0
})

/** 顶部“批量生成”按当前模式分流：AI 模式打开模板批量生成弹窗，普通模式走 SVG 批量 */
function handleGenerateMultiple() {
  if (store.editorMode === 'ai') {
    store[SET_AI_BATCH_MODAL_VISIBLE](true)
    return
  }

  generateMultiple()
}

async function generateMultiple(count = 5 * 6) {
  const { default: hash } = await import('object-hash')

  const avatarMap = [...Array(count)].reduce<Map<string, AvatarOption>>(
    (res) => {
      let randomAvatarOption: AvatarOption
      let hashKey: string

      do {
        randomAvatarOption = getRandomAvatarOption(avatarOption.value)
        hashKey = hash.sha1(randomAvatarOption)
      } while (
        randomAvatarOption.background.color === 'transparent' ||
        res.has(hashKey)
      )

      res.set(hashKey, randomAvatarOption)

      return res
    },
    new Map()
  )

  avatarList.value = Array.from(avatarMap.values())

  recordEvent('click_generate_multiple', {
    event_category: 'click',
  })
}
</script>

<style lang="scss" scoped>
@use 'src/styles/var';
@use 'sass:color';

.main {
  width: 100%;
  height: 100%;
  overflow: hidden;
  overscroll-behavior: none;
  color: var.$color-text;
  background-color: var.$color-page-bg;

  .content-warpper {
    height: 100%;
    transform: scale(1);

    .content-view {
      position: relative;
      z-index: 110;
      display: flex;
      flex-direction: column;
      height: 100%;
      // 头像舞台光晕等装饰性伪元素会横向越界,裁掉避免出现横向滚动
      overflow-x: hidden;
      overflow-y: auto;
    }
  }
}

.playground {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1rem;

  // 头像舞台:玻璃卡片 + 径向光晕
  .avatar-stage {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    column-gap: 1rem;
    padding: 2.6rem 3rem;
    overflow: hidden;
    background: rgba(var.$color-dark, 0.55);
    border: 1px solid var.$color-border-strong;
    border-radius: 1.9rem;
    box-shadow: 0 2rem 4.5rem rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(1rem);

    @supports not (backdrop-filter: blur(1rem)) {
      background: color.adjust(var.$color-dark, $lightness: 2%);
    }

    &::before {
      position: absolute;
      top: 50%;
      left: 50%;
      width: min(130%, 100vw);
      aspect-ratio: 1;
      background: radial-gradient(
        closest-side,
        rgba(var.$color-accent, 0.5),
        rgba(var.$color-secondary, 0.25) 55%,
        transparent 78%
      );
      border-radius: 50%;
      transform: translate(-50%, -50%);
      content: '';
      pointer-events: none;
    }

    // AI 生图 prompt 信息卡：与主图等高、可滚动，窄屏隐藏（与右侧历史面板策略一致）
    .ai-prompt-card {
      display: flex;
      flex-direction: column;
      width: 12rem;
      max-height: 280px;
      padding: 0.7rem 0.8rem;
      overflow: hidden;
      user-select: text;
      background: color.adjust(var.$color-dark, $lightness: 5%);
      border-radius: 0.6rem;
      box-shadow: 0 0.4rem 1.2rem rgba(0, 0, 0, 0.35);

      .prompt-card-title {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.4rem;

        .title-text {
          overflow: hidden;
          color: color.adjust(var.$color-text, $lightness: -12%);
          font-size: 0.78rem;
          font-weight: bold;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .prompt-card-text {
        flex: 1;
        min-height: 0;
        margin: 0;
        overflow-y: auto;
        font-size: 0.78rem;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;

        &::-webkit-scrollbar {
          width: 4px;
        }

        &::-webkit-scrollbar-thumb {
          background: color.adjust(var.$color-dark, $lightness: 20%);
          border-radius: 2px;
        }
      }

      .card-action-btn {
        flex-shrink: 0;
        padding: 0.15rem 0.45rem;
        color: var.$color-text;
        font: inherit;
        font-size: 0.7rem;
        white-space: nowrap;
        cursor: pointer;
        background: color.adjust(var.$color-dark, $lightness: 12%);
        border: 0;
        border-radius: 0.35rem;
        outline: none;

        &:hover:not(:disabled),
        &:focus-visible {
          background: color.adjust(var.$color-dark, $lightness: 18%);
          outline: 1px solid var.$color-primary;
        }

        &:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }
      }

      .save-template-btn {
        flex: 1 0 auto;
        width: 100%;
        margin-top: 0.5rem;
        padding: 0.35rem 0;
      }

      @media screen and (max-width: var.$screen-md) {
        display: none;
      }
    }

    @media screen and (max-width: var.$screen-sm) {
      padding: 1.6rem 1.8rem;
    }
  }

  .avatar-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;

    :deep(.vue-color-avatar) {
      transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }
  }

  .action-group {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 1.2rem;
    column-gap: 0.8rem;

    .action-btn {
      min-width: 6.5rem;
      height: 2.75rem;
      padding: 0 1.3rem;
      color: var.$color-text;
      font-weight: 600;
      font-size: 0.95rem;
      background: rgba(var.$color-dark, 0.6);
      border: 1px solid var.$color-border-strong;
      border-radius: 2.75rem;
      cursor: pointer;
      transition: color 0.2s, border-color 0.2s, transform 0.15s,
        box-shadow 0.2s;
      user-select: none;

      &:hover:not(:disabled) {
        color: var.$color-text-strong;
        border-color: rgba(var.$color-accent, 0.5);
        transform: translateY(-1px);
      }

      &:active:not(:disabled) {
        transform: translateY(0) scale(0.98);
      }

      &:disabled,
      &[disabled] {
        color: rgba(var.$color-text, 0.5);
        cursor: default;
      }
    }

    .action-download {
      color: #fff;
      background: linear-gradient(
        115deg,
        var.$color-primary,
        var.$color-secondary
      );
      border-color: transparent;
      box-shadow: 0 0.5rem 1.6rem rgba(var.$color-accent, 0.35);

      &:hover:not(:disabled) {
        color: #fff;
        border-color: transparent;
        box-shadow: 0 0.6rem 2rem rgba(var.$color-accent, 0.5);
      }

      &:disabled,
      &[disabled] {
        color: rgba(#fff, 0.75);
        background: linear-gradient(
          115deg,
          rgba(var.$color-primary, 0.55),
          rgba(var.$color-secondary, 0.55)
        );
        box-shadow: none;
      }
    }

    .action-multiple {
      background: transparent;
      border-style: dashed;
    }

    // 移动端:双列网格,批量生成整行
    @media screen and (max-width: var.$screen-sm) {
      width: 100%;
      max-width: 24rem;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));

      .action-btn {
        width: 100%;
        min-width: 0;
      }

      .action-multiple {
        grid-column: 1 / -1;
      }
    }
  }
}

// 极光背景光晕
.gradient-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;

  @mixin gradient-style($color) {
    position: absolute;
    width: 100vh;
    height: 100vh;
    background-image: radial-gradient(
      rgba($color, 0.55) 20%,
      rgba($color, 0.35) 45%,
      rgba($color, 0.15) 65%,
      transparent 85%
    );
    border-radius: 50%;
    opacity: 0.32;
    filter: blur(4.5rem);
  }

  .gradient-top {
    @include gradient-style(var.$color-secondary);

    top: -55%;
    right: -25%;
  }

  .gradient-bottom {
    @include gradient-style(var.$color-accent);

    bottom: -55%;
    left: -25%;
  }
}
</style>
