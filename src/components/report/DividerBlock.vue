<template>
  <div class="report-divider">
    <div v-if="config.title || config.showLine" class="divider-content">
      <div v-if="config.title" class="divider-title">{{ config.title }}</div>
      <div v-if="config.showLine !== false" class="divider-line"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DividerBlock',
  props: {
    component: {
      type: Object,
      required: true
    }
  },
  computed: {
    config() {
      return this.component.config || {}
    }
  }
}
</script>

<style scoped lang="scss">
.report-divider {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  .divider-content {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .divider-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .divider-line {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent 0%, #dcdfe6 50%, transparent 100%);
  }
}
</style>
