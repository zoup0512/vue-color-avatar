<template>
  <div class="configurator-shell">
    <div class="configurator-tabs" role="tablist">
      <button
        id="ai-generator-tab"
        type="button"
        role="tab"
        class="configurator-tab"
        :class="{ active: store.editorMode === 'ai' }"
        :aria-selected="store.editorMode === 'ai'"
        aria-controls="ai-generator-panel"
        @click="switchEditorMode('ai')"
      >
        {{ t('tab.aiGenerator') }}
      </button>
      <button
        id="svg-generator-tab"
        type="button"
        role="tab"
        class="configurator-tab"
        :class="{ active: store.editorMode === 'svg' }"
        :aria-selected="store.editorMode === 'svg'"
        aria-controls="svg-generator-panel"
        @click="switchEditorMode('svg')"
      >
        {{ t('tab.svgGenerator') }}
      </button>
    </div>

    <PerfectScrollbar ref="scrollbarRef" class="configurator-scroll">
      <div
        v-show="store.editorMode === 'ai'"
        id="ai-generator-panel"
        role="tabpanel"
        aria-labelledby="ai-generator-tab"
      >
        <AIImageGenerator />
      </div>

      <div
        v-show="store.editorMode === 'svg'"
        id="svg-generator-panel"
        class="configurator"
        role="tabpanel"
        aria-labelledby="svg-generator-tab"
      >
        <SectionWrapper :title="t('label.wrapperShape')">
          <ul class="wrapper-shape">
            <li
              v-for="wrapperShape in SETTINGS.wrapperShape"
              :key="wrapperShape"
              class="wrapper-shape__item"
              :title="t(`wrapperShape.${wrapperShape}`)"
              @click="switchWrapperShape(wrapperShape)"
            >
              <div
                class="shape"
                :class="[
                  wrapperShape,
                  { active: wrapperShape === avatarOption.wrapperShape },
                ]"
              />
            </li>
          </ul>
        </SectionWrapper>

        <SectionWrapper :title="t('label.borderColor')">
          <ul class="color-list">
            <li
              v-for="borderColor in SETTINGS.borderColor"
              :key="borderColor"
              class="color-list__item"
              @click="switchBorderColor(borderColor)"
            >
              <div
                :style="{ background: borderColor }"
                class="bg-color"
                :class="[
                  {
                    active: borderColor === avatarOption.background.borderColor,
                    transparent: borderColor === 'transparent',
                  },
                ]"
              />
            </li>
          </ul>
        </SectionWrapper>

        <SectionWrapper :title="t('label.backgroundColor')">
          <ul class="color-list">
            <li
              v-for="bgColor in SETTINGS.backgroundColor"
              :key="bgColor"
              class="color-list__item"
              @click="switchBgColor(bgColor)"
            >
              <div
                :style="{ background: bgColor }"
                class="bg-color"
                :class="{
                  active: bgColor === avatarOption.background.color,
                  transparent: bgColor === 'transparent',
                }"
              ></div>
            </li>
          </ul>

          <ul v-if="SETTINGS.backgroundImages.length" class="bg-image-list">
            <li
              v-for="img in SETTINGS.backgroundImages"
              :key="img"
              class="bg-image-list__item"
              :class="{ active: img === avatarOption.background.image }"
              @click="switchBgImage(img)"
            >
              <img
                :src="img"
                class="bg-image"
                :alt="t('label.backgroundImage')"
              />
            </li>
          </ul>

          <div class="bg-image-actions">
            <button type="button" class="bg-image-btn" @click="handlePickImage">
              {{ t('label.uploadBackgroundImage') }}
            </button>

            <input
              ref="fileInputRef"
              type="file"
              class="file-input"
              accept="image/*"
              @change="handleUploadImage"
            />

            <template v-if="avatarOption.background.image">
              <img
                :src="avatarOption.background.image"
                class="bg-image-current"
                :alt="t('label.backgroundImage')"
              />
              <button
                type="button"
                class="bg-image-btn"
                @click="removeBackgroundImage"
              >
                {{ t('label.removeBackgroundImage') }}
              </button>
            </template>
          </div>
        </SectionWrapper>

        <SectionWrapper
          v-for="s in sections"
          :key="s.widgetType"
          :title="t(`widgetType.${s.widgetType}`)"
        >
          <details
            v-if="
              s.widgetType === WidgetType.Tops ||
              s.widgetType === WidgetType.Face ||
              s.widgetType === WidgetType.Clothes
            "
            class="color-picker"
            :open="s.widgetType === WidgetType.Face"
          >
            <summary class="color">{{ t('label.colors') }}</summary>
            <ul class="color-list">
              <li
                v-for="fillColor in SETTINGS[
                  s.widgetType === WidgetType.Face
                    ? 'skinColors'
                    : 'commonColors'
                ]"
                :key="fillColor"
                class="color-list__item"
                @click="setWidgetColor(s.widgetType, fillColor)"
              >
                <div
                  :style="{ background: fillColor }"
                  class="bg-color"
                  :class="{
                    active: fillColor === getWidgetColor(s.widgetType),
                  }"
                />
              </li>
            </ul>
          </details>

          <ul class="widget-list">
            <li
              v-for="it in s.widgetList"
              :key="it.widgetShape"
              class="list-item"
              :class="{
                selected:
                  it.widgetShape ===
                  avatarOption.widgets?.[s.widgetType]?.shape,
              }"
              @click="switchWidget(s.widgetType, it.widgetShape)"
              v-html="it.svgRaw"
            />
          </ul>
        </SectionWrapper>
      </div>
    </PerfectScrollbar>
  </div>
</template>

<script lang="ts" setup>
import { nextTick, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import AIImageGenerator from '@/components/AIImageGenerator.vue'
import PerfectScrollbar, {
  type PerfectScrollbarRef,
} from '@/components/PerfectScrollbar.vue'
import SectionWrapper from '@/components/SectionWrapper.vue'
import {
  type WidgetShape,
  type WrapperShape,
  BeardShape,
  WidgetType,
} from '@/enums'
import { useAvatarOption } from '@/hooks'
import { type EditorMode, useStore } from '@/store'
import { SET_EDITOR_MODE } from '@/store/mutation-type'
import { AVATAR_LAYER, SETTINGS } from '@/utils/constant'
import { previewData } from '@/utils/dynamic-data'

const { t } = useI18n()
const store = useStore()

const [avatarOption, setAvatarOption] = useAvatarOption()
const scrollbarRef = ref<PerfectScrollbarRef>()

async function switchEditorMode(mode: EditorMode) {
  if (mode === store.editorMode) return

  store[SET_EDITOR_MODE](mode)
  await nextTick()
  scrollbarRef.value?.update(true)
}

const sectionList = reactive(Object.values(WidgetType))
const sections = ref<
  {
    widgetType: WidgetType
    widgetList: {
      widgetType: WidgetType
      widgetShape: WidgetShape
      svgRaw: string
    }[]
  }[]
>([])

onMounted(() => {
  void (async () => {
    const a = await Promise.all(
      sectionList.map((section) => {
        return getWidgets(section)
      })
    )

    sections.value = sectionList.map((li, i) => {
      return {
        widgetType: li,
        widgetList: a[i],
      }
    })

    await nextTick()
    scrollbarRef.value?.update()
  })()
})

async function getWidgets(widgetType: WidgetType) {
  const list = SETTINGS[`${widgetType}Shape`]
  // const promises: Promise<string>[] = list.map(async (widget: string) => {
  //   return (await import(`../assets/preview/${widgetType}/${widget}.svg?raw`))
  //     .default
  // })
  const promises: Promise<string>[] = list.map(async (widget: string) => {
    if (widget !== 'none' && previewData?.[widgetType]?.[widget]) {
      return (await previewData[widgetType][widget]()).default
    }
    return 'X'
  })
  const svgRawList = await Promise.all(promises).then((raw) => {
    return raw.map((svgRaw, i) => {
      return {
        widgetType,
        widgetShape: list[i],
        svgRaw,
      }
    })
  })
  return svgRawList
}

function switchWrapperShape(wrapperShape: WrapperShape) {
  if (wrapperShape !== avatarOption.value.wrapperShape) {
    setAvatarOption({ ...avatarOption.value, wrapperShape })
  }
}

function switchBorderColor(borderColor: string) {
  if (borderColor !== avatarOption.value.background.borderColor) {
    setAvatarOption({
      ...avatarOption.value,
      background: { ...avatarOption.value.background, borderColor },
    })
  }
}

function switchBgColor(bgColor: string) {
  // 点击颜色时同时清除图片底图，避免图片盖住颜色导致无反馈
  if (
    bgColor !== avatarOption.value.background.color ||
    avatarOption.value.background.image
  ) {
    setAvatarOption({
      ...avatarOption.value,
      background: {
        ...avatarOption.value.background,
        color: bgColor,
        image: undefined,
      },
    })
  }
}

const fileInputRef = ref<HTMLInputElement>()

function switchBgImage(image: string) {
  if (image !== avatarOption.value.background.image) {
    setAvatarOption({
      ...avatarOption.value,
      background: { ...avatarOption.value.background, image },
    })
  }
}

function handlePickImage() {
  fileInputRef.value?.click()
}

function handleUploadImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  // 选择后重置，允许重复选择同一文件
  input.value = ''

  if (!file) return
  if (!file.type.startsWith('image/')) return

  const reader = new FileReader()
  reader.onload = () => {
    const image = reader.result as string

    // 先确认图片能正常加载再应用，避免不支持格式（如 HEIC）静默失效
    const probe = new Image()
    probe.onload = () => {
      setAvatarOption({
        ...avatarOption.value,
        background: {
          ...avatarOption.value.background,
          image,
        },
      })
    }
    probe.onerror = () => {
      console.warn('Background image failed to load:', file.name)
    }
    probe.src = image
  }
  reader.readAsDataURL(file)
}

function removeBackgroundImage() {
  if (avatarOption.value.background.image) {
    setAvatarOption({
      ...avatarOption.value,
      background: {
        ...avatarOption.value.background,
        image: undefined,
      },
    })
  }
}

function switchWidget(widgetType: WidgetType, widgetShape: WidgetShape) {
  if (widgetShape && avatarOption.value.widgets?.[widgetType]) {
    setAvatarOption({
      ...avatarOption.value,
      widgets: {
        ...avatarOption.value.widgets,
        [widgetType]: {
          ...avatarOption.value.widgets?.[widgetType],
          shape: widgetShape,
          ...(widgetShape === BeardShape.Scruff
            ? { zIndex: AVATAR_LAYER['mouth'].zIndex - 1 }
            : undefined),
        },
      },
    })
  }
}

function setWidgetColor(widgetType: WidgetType, fillColor: string) {
  if (avatarOption.value.widgets?.[widgetType]) {
    setAvatarOption({
      ...avatarOption.value,
      widgets: {
        ...avatarOption.value.widgets,
        [widgetType]: {
          ...avatarOption.value.widgets?.[widgetType],
          fillColor,
        },
      },
    })
  }
}

function getWidgetColor(type: string) {
  if (
    type === WidgetType.Face ||
    type === WidgetType.Tops ||
    type === WidgetType.Clothes
  ) {
    return avatarOption.value.widgets[type]?.fillColor
  } else return ''
}
</script>

<style lang="scss" scoped>
@use 'src/styles/var';
@use 'sass:color';

.configurator-shell {
  display: flex;
  flex-direction: column;
  width: var.$layout-sider-width;
  height: 100%;
  color: var.$color-text;
  background-color: var.$color-configurator;
}

.configurator-tabs {
  display: flex;
  flex-shrink: 0;
  padding: 0.6rem;
  column-gap: 0.5rem;
  border-bottom: 1px solid color.adjust(var.$color-dark, $lightness: 10%);
}

.configurator-tab {
  flex: 1;
  padding: 0.7rem 0.4rem;
  color: var.$color-text;
  font: inherit;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 0.45rem;
  outline: none;
  transition: color 0.2s, background-color 0.2s;

  &:hover,
  &:focus-visible {
    background-color: color.adjust(var.$color-dark, $lightness: 7%);
  }

  &.active {
    color: #fff;
    font-weight: bold;
    background-color: var.$color-primary;
  }
}

.configurator-scroll {
  flex: 1;
  width: 100%;
  min-height: 0;
}

.configurator {
  width: 100%;
  color: var.$color-text;

  .wrapper-shape {
    display: flex;
    align-items: center;

    .wrapper-shape__item {
      padding: 0.4rem 0.5rem;
      cursor: pointer;

      .shape {
        display: inline-block;
        width: 1.5rem;
        height: 1.5rem;
        background-color: var.$color-text;
        transition: background-color 0.2s;

        &.circle {
          border-radius: 50%;
        }

        &.squircle {
          border-radius: 20%;
        }

        &.active {
          background-color: var.$color-accent;
        }
      }
    }
  }

  .color-picker {
    margin: 1rem 0 0.5rem 0;

    summary {
      color: color.adjust(var.$color-text, $lightness: -20%);
      font-size: small;
      cursor: pointer;
      user-select: none;
    }
  }

  .color-list {
    display: flex;
    flex-wrap: wrap;
    align-items: center;

    .color-list__item {
      position: relative;
      z-index: 1;
      width: calc(100% / 7);
      padding: 0.6rem 0;
      cursor: pointer;
      transition: transform 0.2s;

      .bg-color {
        position: relative;
        box-sizing: content-box;
        width: 1.3em;
        height: 1.3em;
        margin: 0 auto;
        font-size: 16px;
        border-radius: 50%;
        box-shadow: 0 0 0.05em 0.2em var.$color-configurator;

        &.transparent {
          background: #fff !important;

          &::after {
            position: absolute;
            top: 50%;
            left: 50%;
            z-index: 1;
            color: #ff4757;
            font-weight: bold;
            font-size: 1.8rem;
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 1;
            content: '\\';
          }
        }

        &::before {
          position: absolute;
          top: 50%;
          left: 50%;
          z-index: -1;
          width: 100%;
          height: 100%;
          background: inherit;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.5;
          transition: width 0.15s, height 0.15s;
          content: '';
        }

        &::after {
          position: absolute;
          top: 50%;
          left: 50%;
          z-index: 1;
          color: var.$color-configurator;
          font-size: 1.5rem;
          transform: translate(-50%, -50%) scale(0.5);
          opacity: 0;
          transition: opacity 0.15s;
          content: '\2714';
        }

        &.active::before {
          width: 160%;
          height: 160%;
        }

        &.active::after {
          opacity: 1;
        }
      }
    }
  }

  .bg-image-list {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    margin-top: 0.5rem;

    .bg-image-list__item {
      position: relative;
      width: calc(100% / 4);
      padding: 0.4rem;
      cursor: pointer;

      .bg-image {
        display: block;
        width: 100%;
        height: 2.6rem;
        object-fit: cover;
        border-radius: 0.4rem;
        box-shadow: 0 0 0.05em 0.2em var.$color-configurator;
      }

      &.active .bg-image {
        box-shadow: 0 0 0 0.15em var.$color-accent,
          0 0 0.05em 0.2em var.$color-configurator;
      }
    }
  }

  .bg-image-actions {
    display: flex;
    align-items: center;
    margin-top: 0.5rem;
    column-gap: 0.5rem;

    .bg-image-btn {
      padding: 0.3rem 0.6rem;
      color: var.$color-text;
      font-size: small;
      background: color.adjust(var.$color-configurator, $lightness: 4%);
      border: none;
      border-radius: 0.4rem;
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover {
        background: color.adjust(var.$color-configurator, $lightness: 8%);
      }
    }

    .bg-image-current {
      width: 2.6rem;
      height: 2.6rem;
      object-fit: cover;
      border-radius: 0.4rem;
    }
  }

  .file-input {
    display: none;
  }

  .widget-list {
    display: flex;
    flex-wrap: wrap;

    .list-item {
      display: flex;
      align-items: center;
      justify-content: center;
      width: calc(100% / 4);
      height: 5rem;
      padding: 1rem;
      border-radius: 0.8rem;
      cursor: pointer;
      transition: background-color 0.2s;

      &.selected.selected {
        background-color: color.adjust(var.$color-configurator, $lightness: 6%);
      }

      &:hover {
        background-color: color.adjust(var.$color-configurator, $lightness: 0%);
      }

      & > :deep(svg) {
        width: 100% !important;
        height: 100% !important;
      }

      & :deep(path) {
        stroke: var.$color-stroke !important;
      }
    }
  }
}
</style>
