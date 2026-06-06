<template>
  <div
    class="report-text-block"
    :style="textStyle"
    @click="handleClick"
  >
    {{ config.content }}
  </div>
</template>

<script>
export default {
  name: 'TextBlock',
  props: {
    component: {
      type: Object,
      required: true
    }
  },
  computed: {
    config() {
      return this.component.config || {}
    },
    textStyle() {
      return {
        fontSize: (this.config.fontSize || 14) + 'px',
        fontWeight: this.config.fontWeight || 'normal',
        textAlign: this.config.textAlign || 'left',
        color: this.config.color || '#333333'
      }
    }
  },
  methods: {
    handleClick() {
      this.$emit('edit')
    }
  }
}
</script>

<style scoped lang="scss">
.report-text-block {
  height: 100%;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;

  &:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  }
}
</style>
