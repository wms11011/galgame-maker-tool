<template>
  <div class="node-form">
    <div class="form-section">
      <div class="section-title">{{ meta?.label || nodeType }}</div>

      <!-- 角色选择（特殊处理：从 characterStore 获取角色名列表） -->
      <div v-if="hasCharField" class="form-item">
        <label class="form-label">角色名</label>
        <el-select
          :model-value="formData['character'] || ''"
          placeholder="选择角色"
          size="small"
          clearable
          filterable
          allow-create
          style="width: 100%"
          @change="onFieldChange('character', $event)"
        >
          <el-option v-for="c in characterStore.characters" :key="c.name" :label="c.name" :value="c.name" />
        </el-select>
      </div>

      <div v-for="field in visibleFields" :key="field.key" class="form-item">
        <!-- Skip character — handled above -->
        <template v-if="field.key === 'character'" />

        <!-- Custom slot for complex fields -->
        <template v-else-if="$slots[`field-${field.key}`]">
          <label class="form-label">{{ field.label }}</label>
          <slot :name="`field-${field.key}`" :value="formData[field.key]" :on-change="(v: unknown) => onFieldChange(field.key, v)" />
        </template>

        <!-- string field -->
        <template v-else-if="field.kind === 'string' && !isAssetField(field.key)">
          <label class="form-label">{{ field.label }}</label>
          <el-input
            :model-value="formData[field.key]"
            :placeholder="`输入${field.label}`"
            size="small"
            @input="onFieldChange(field.key, $event)"
          />
        </template>

        <!-- textarea for content -->
        <template v-else-if="field.key === 'content'">
          <label class="form-label">{{ field.label }}</label>
          <el-input
            :model-value="formData[field.key]"
            type="textarea"
            :rows="6"
            :placeholder="`输入${field.label}`"
            size="small"
            @input="onFieldChange(field.key, $event)"
          />
        </template>

        <!-- asset select field -->
        <template v-else-if="field.kind === 'string' && isAssetField(field.key)">
          <label class="form-label">{{ field.label }}</label>
          <el-select
            :model-value="formData[field.key] || ''"
            :placeholder="`选择${field.label}`"
            size="small"
            clearable
            style="width: 100%"
            @change="onFieldChange(field.key, $event)"
          >
            <el-option v-for="asset in assetOptions(field.key)" :key="asset.relativePath" :label="asset.name" :value="asset.relativePath" />
          </el-select>
        </template>

        <!-- number field -->
        <template v-else-if="field.kind === 'number'">
          <label class="form-label">{{ field.label }}</label>
          <el-input-number
            :model-value="formData[field.key] ?? field.default ?? 0"
            :min="0" :max="99999"
            size="small" controls-position="right" style="width: 100%"
            @change="onFieldChange(field.key, $event)"
          />
        </template>

        <!-- select field -->
        <template v-else-if="field.kind === 'select'">
          <label class="form-label">{{ field.label }}</label>
          <el-select
            :model-value="formData[field.key] ?? field.default ?? ''"
            size="small" style="width: 100%"
            @change="onFieldChange(field.key, $event)"
          >
            <el-option v-for="opt in field.options || []" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </template>

        <!-- boolean field -->
        <template v-else-if="field.kind === 'boolean'">
          <label class="form-label">{{ field.label }}</label>
          <el-switch
            :model-value="formData[field.key] ?? field.default ?? false"
            @change="onFieldChange(field.key, $event)"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAssetStore } from '../stores/assetStore'
import { useCharacterStore } from '../stores/characterStore'
import { NODE_TYPE_REGISTRY } from '../utils/nodeTypeRegistry'
import type { NodeTypeMeta } from '../utils/nodeTypeRegistry'

const props = defineProps<{
  nodeType: string
  formData: Record<string, unknown>
}>()

const emit = defineEmits<{
  change: [key: string, value: unknown]
}>()

const characterStore = useCharacterStore()
const assetStore = useAssetStore()

const meta = computed<NodeTypeMeta | undefined>(() =>
  NODE_TYPE_REGISTRY[props.nodeType as keyof typeof NODE_TYPE_REGISTRY]
)

const visibleFields = computed(() =>
  meta.value?.fields.filter(f => !f.hidden && f.key !== 'id' && f.key !== 'character') ?? []
)

const hasCharField = computed(() =>
  meta.value?.fields.some(f => f.key === 'character') ?? false
)

const allImageAssets = computed(() => assetStore.assets.filter(a => a.type === 'image'))

const assetCategoryMap: Record<string, string> = {
  background: 'background', characterSprite: 'character', sprite: 'character',
  src: 'cg', model: 'live2d', iconPath: 'item', avatar: 'avatar'
}

function isAssetField(key: string): boolean { return key in assetCategoryMap }
function assetOptions(key: string) {
  const cat = assetCategoryMap[key]
  return cat ? allImageAssets.value.filter(a => a.category === cat) : allImageAssets.value
}
function onFieldChange(key: string, value: unknown): void { emit('change', key, value) }
</script>

<style scoped>
.node-form { display: flex; flex-direction: column; }
.form-section { padding: 0; }
.section-title { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; padding: 0 0 8px; margin-bottom: 8px; border-bottom: 1px solid var(--border-color); }
.form-item { margin-bottom: 10px; }
.form-label { display: block; font-size: 11px; color: var(--text-dim); margin-bottom: 4px; }
</style>
