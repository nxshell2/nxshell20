<script>
export default {
  name: 'PtProfileItem',
  props: {
    title: String,
    description: String,
    value: [String, Number, Array, Boolean],
    modelValue: [String, Number, Array, Boolean],
    defaultValue: [String, Number, Boolean],
    type: String,
    options: Array,
    show: Boolean,
    simple: {
      type: Boolean,
      default: false
    },
    component: Object,
    context: Object
  },
  data() {
    return {
      editValue: undefined
    }
  },

  watch: {
    value(newVal) {
      if (this.editValue !== newVal) {
        this.editValue = newVal
      }
    },
    modelValue(newVal) {
      if (this.editValue !== newVal) {
        this.editValue = newVal
      }
    },
    editValue(newVal) {
      this.$emit('update:modelValue', newVal)
    }
  },

  created() {
    this.editValue = typeof this.modelValue === 'undefined' ? (typeof this.value === 'undefined' ? this.defaultValue : this.value) : this.modelValue
  }
}
</script>

<template>
  <div v-if="show" class="pt-profile-item" :class="{ simple }">
    <template v-if="!simple">
      <h2>{{ $t(title) }}</h2>
      <p>{{ $t(description) }}</p>
      <el-row>
        <el-col :span="8">
          <el-input v-if="type === 'text'" v-model="editValue" type="text" />
          <el-input v-if="type === 'number'" v-model="editValue" type="text" />
          <el-input v-if="type === 'password'" v-model="editValue" type="password" />
          <el-switch v-if="type === 'switch'" v-model="editValue" />
          <el-input v-if="type === 'input'" v-model="editValue" />
          <el-radio-group v-if="type === 'radio-group'" v-model="editValue">
            <el-radio-button v-for="(r, index) in options" :key="index" :value="r.value">
              {{ r.label }}
            </el-radio-button>
          </el-radio-group>
          <pt-file v-if="type === 'file'" v-model="editValue" type="text" />
          <pt-folder v-if="type === 'folder'" v-model="editValue" type="text" />
          <el-select v-if="type === 'select'" v-model="editValue" style="width: 100%;">
            <el-option
              v-for="(opt, idx) in options"
              :key="idx"
              :label="$t(opt.label)"
              :value="opt.value"
            />
          </el-select>
          <component :is="component" v-if="component" :context="context" />
        </el-col>
      </el-row>
    </template>
    <template v-else>
      <el-row :title="$t(description)">
        <el-col :span="8">
          <label>{{ $t(title) }}</label>
        </el-col>
        <el-col :span="8">
          <el-input v-if="type === 'text'" v-model="editValue" type="text" />
          <el-input v-if="type === 'number'" v-model="editValue" type="text" />
          <el-input v-if="type === 'password'" v-model="editValue" type="password" />
          <el-switch v-if="type === 'switch'" v-model="editValue" />
          <el-input v-if="type === 'input'" v-model="editValue" />
          <el-radio-group v-if="type === 'radio-group'" v-model="editValue">
            <el-radio-button v-for="(r, index) in options" :key="index" :value="r.value">
              {{ r.label }}
            </el-radio-button>
          </el-radio-group>
          <pt-file v-if="type === 'file'" v-model="editValue" type="text" />
          <pt-folder v-if="type === 'folder'" v-model="editValue" type="text" />
          <el-select v-if="type === 'select'" v-model="editValue" style="width: 100%;">
            <el-option v-for="(opt, idx) in options" :key="idx" :label="$t(opt.label)" :value="opt.value" />
          </el-select>
          <component :is="component" v-if="component" :context="context" />
        </el-col>
      </el-row>
    </template>
  </div>
</template>

<style lang="scss">
.pt-profile-item {
  position: relative;
  margin-bottom: 15px;
  padding: 10px;

  &:hover {
    background-color: var(--lightBackgroundColor);
  }

  &.simple {
    margin-bottom: 5px;
    padding: 5px 10px;
  }

  .pt-col {
    height: 30px;
    line-height: 30px;
  }

  h2 {
    margin-bottom: 10px;
    font-size: 14px;
    font-weight: 600;
    color: var(--primaryTextColor);
  }

  label {
    font-size: 11px;
    font-weight: 600;
    color: var(--primaryTextColor);
  }

  p {
    margin-bottom: 10px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--secondaryTextColor);
  }
}
</style>
