import ElementResizeDetectorMaker from 'element-resize-detector'

export default {
  install(app) {
  app.config.globalProperties.$ptElementResizeDetector = ElementResizeDetectorMaker({
    strategy: 'scroll' // <- For ultra performance.
  })
  }
}
