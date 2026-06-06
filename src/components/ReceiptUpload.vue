<template>
  <div class="receipt-upload">
    <div
      class="upload-area"
      :class="{ 'drag-over': isDragOver }"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
      @click="triggerFileInput"
    >
      <div class="upload-icon">📸</div>
      <div class="upload-text">
        <p class="main-text">拖拽图片到此处或点击选择</p>
        <p class="sub-text">支持拖拽、粘贴 (Ctrl+V)、摄像头拍照</p>
      </div>
      <div class="upload-buttons">
        <el-button size="small" icon="el-icon-picture" @click.stop="triggerFileInput">
          选择图片
        </el-button>
        <el-button size="small" icon="el-icon-camera" @click.stop="openCamera">
          拍照
        </el-button>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        style="display: none"
        @change="handleFileSelect"
      />
    </div>

    <div class="preview-list" v-if="previewImages.length > 0">
      <div class="preview-item" v-for="(img, index) in previewImages" :key="index">
        <div class="preview-image-wrapper">
          <img :src="img.preview" class="preview-image" @click="$emit('preview', img, index)" />
          <div class="preview-actions">
            <el-button
              size="mini"
              type="danger"
              icon="el-icon-delete"
              circle
              @click="removeImage(index)"
            />
          </div>
          <div class="upload-progress" v-if="img.uploading">
            <el-progress type="circle" :percentage="img.progress" :width="40" />
          </div>
          <div class="success-overlay" v-if="img.success">
            <i class="el-icon-check-circle"></i>
          </div>
        </div>
        <div class="preview-info">
          <span class="name" :title="img.originalName">{{ img.originalName }}</span>
          <span class="size">{{ formatFileSize(img.size) }}</span>
        </div>
      </div>
    </div>

    <el-dialog
      title="摄像头拍照"
      :visible.sync="cameraVisible"
      width="500px"
      @closed="closeCamera"
    >
      <div class="camera-container">
        <video ref="cameraVideo" autoplay playsinline class="camera-video"></video>
        <canvas ref="cameraCanvas" class="camera-canvas" style="display: none"></canvas>
      </div>
      <div slot="footer">
        <el-button @click="cameraVisible = false">取消</el-button>
        <el-button type="primary" icon="el-icon-camera" @click="takePhoto">拍照</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { receiptApi } from '@/api'

export default {
  name: 'ReceiptUpload',
  props: {
    recordId: {
      type: String,
      default: null
    },
    autoUpload: {
      type: Boolean,
      default: true
    },
    maxFiles: {
      type: Number,
      default: 9
    }
  },
  data() {
    return {
      isDragOver: false,
      previewImages: [],
      cameraVisible: false,
      cameraStream: null
    }
  },
  mounted() {
    document.addEventListener('paste', this.handlePaste)
  },
  beforeDestroy() {
    document.removeEventListener('paste', this.handlePaste)
    this.closeCamera()
  },
  methods: {
    triggerFileInput() {
      this.$refs.fileInput.click()
    },

    handleDragOver(e) {
      this.isDragOver = true
    },

    handleDragLeave(e) {
      this.isDragOver = false
    },

    handleDrop(e) {
      this.isDragOver = false
      const files = e.dataTransfer.files
      this.handleFiles(files)
    },

    handleFileSelect(e) {
      const files = e.target.files
      this.handleFiles(files)
      e.target.value = ''
    },

    handlePaste(e) {
      if (!e.clipboardData) return
      
      const items = e.clipboardData.items
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile()
          if (file) {
            this.handleFiles([file])
            e.preventDefault()
            break
          }
        }
      }
    },

    async handleFiles(files) {
      if (!files || files.length === 0) return
      
      const remainingSlots = this.maxFiles - this.previewImages.length
      if (remainingSlots <= 0) {
        this.$message.warning(`最多只能上传 ${this.maxFiles} 张图片`)
        return
      }

      const validFiles = []
      for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
        const file = files[i]
        if (file.type && file.type.startsWith('image/')) {
          validFiles.push(file)
        } else {
          this.$message.warning(`${file.name} 不是有效的图片文件`)
        }
      }

      for (const file of validFiles) {
        const reader = new FileReader()
        reader.onload = async (e) => {
          const base64 = e.target.result
          const imgItem = {
            base64,
            preview: base64,
            originalName: file.name,
            type: file.type === 'image/png' ? 'png' : 'jpg',
            size: file.size,
            uploading: true,
            progress: 0,
            success: false,
            receiptId: null
          }
          this.previewImages.push(imgItem)
          
          if (this.autoUpload) {
            await this.uploadImage(imgItem)
          }
        }
        reader.readAsDataURL(file)
      }
    },

    async uploadImage(imgItem) {
      try {
        imgItem.progress = 30
        
        const result = await receiptApi.saveImage({
          base64: imgItem.base64,
          type: imgItem.type,
          originalName: imgItem.originalName,
          recordId: this.recordId
        })
        
        if (result) {
          imgItem.progress = 100
          imgItem.success = true
          imgItem.receiptId = result.id
          imgItem.receipt = result
          this.$emit('uploaded', result)
        } else {
          imgItem.uploading = false
          this.$message.error('上传失败')
        }
      } catch (error) {
        console.error('Upload error:', error)
        imgItem.uploading = false
        this.$message.error('上传失败')
      }
    },

    removeImage(index) {
      const imgItem = this.previewImages[index]
      if (imgItem && imgItem.receiptId) {
        this.$confirm('确定要删除这张图片吗？', '提示', {
          type: 'warning'
        }).then(async () => {
          await receiptApi.deleteReceipt(imgItem.receiptId)
          this.previewImages.splice(index, 1)
          this.$emit('removed', imgItem.receiptId)
        }).catch(() => {})
      } else {
        this.previewImages.splice(index, 1)
      }
    },

    async openCamera() {
      try {
        const constraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        }
        
        this.cameraStream = await navigator.mediaDevices.getUserMedia(constraints)
        this.$refs.cameraVideo.srcObject = this.cameraStream
        this.cameraVisible = true
      } catch (error) {
        console.error('Camera error:', error)
        this.$message.error('无法访问摄像头，请检查权限设置')
      }
    },

    closeCamera() {
      if (this.cameraStream) {
        this.cameraStream.getTracks().forEach(track => track.stop())
        this.cameraStream = null
      }
    },

    takePhoto() {
      const video = this.$refs.cameraVideo
      const canvas = this.$refs.cameraCanvas
      
      if (!video || !canvas) return
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      const base64 = canvas.toDataURL('image/jpeg', 0.9)
      
      const imgItem = {
        base64,
        preview: base64,
        originalName: `photo_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`,
        type: 'jpg',
        size: Math.round(base64.length * 0.75),
        uploading: true,
        progress: 0,
        success: false,
        receiptId: null
      }
      
      this.previewImages.push(imgItem)
      this.cameraVisible = false
      this.closeCamera()
      
      if (this.autoUpload) {
        this.uploadImage(imgItem)
      }
    },

    formatFileSize(bytes) {
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    },

    getUploadedReceipts() {
      return this.previewImages.filter(img => img.success).map(img => img.receipt)
    },

    clearAll() {
      this.previewImages = []
    }
  }
}
</script>

<style lang="scss" scoped>
.receipt-upload {
  width: 100%;
}

.upload-area {
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 30px;
  text-align: center;
  transition: all 0.3s;
  cursor: pointer;
  background: #fafafa;

  &:hover,
  &.drag-over {
    border-color: $primary-color;
    background: #ecf5ff;
  }

  &.drag-over {
    border-color: $primary-color;
    background: #ecf5ff;
    transform: scale(1.01);
  }

  .upload-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .upload-text {
    margin-bottom: 16px;

    .main-text {
      font-size: 15px;
      color: $text-primary;
      margin: 0 0 6px 0;
    }

    .sub-text {
      font-size: 12px;
      color: $text-secondary;
      margin: 0;
    }
  }

  .upload-buttons {
    display: flex;
    justify-content: center;
    gap: 12px;
  }
}

.preview-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.preview-item {
  width: 120px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  .preview-image-wrapper {
    position: relative;
    width: 120px;
    height: 120px;
    border-radius: 8px;
    overflow: hidden;
    background: #f0f0f0;

    .preview-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      cursor: pointer;
      transition: transform 0.2s;

      &:hover {
        transform: scale(1.05);
      }
    }

    .preview-actions {
      position: absolute;
      top: 4px;
      right: 4px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    &:hover .preview-actions {
      opacity: 1;
    }

    .upload-progress {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255, 255, 255, 0.9);
      border-radius: 50%;
      padding: 4px;
    }

    .success-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #67c23a;
      font-size: 32px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .preview-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 2px;

    .name {
      font-size: 12px;
      color: $text-regular;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .size {
      font-size: 11px;
      color: $text-secondary;
    }
  }
}

.camera-container {
  width: 100%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;

  .camera-video {
    width: 100%;
    max-height: 400px;
    object-fit: contain;
  }
}
</style>
