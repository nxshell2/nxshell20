export class EventBus {
  private topics: { [propName: string]: Function[] }
  constructor() {
    this.topics = {}
  }

  public subscript(topic: string, handler: Function): void {
    let topicHandlers: Function[] = this.topics[topic]
    if (!topicHandlers) {
      topicHandlers = [handler]
      this.topics[topic] = topicHandlers
    } else {
      topicHandlers.push(handler)
    }
  }

  public unsubscript(topic: string, handler: Function): void {
    const topicHandlers: Function[] = this.topics[topic]
    if (!topicHandlers) {
      return
    }
    for (let i = 0; i < topicHandlers.length; i++) {
      const curHandler = topicHandlers[i]
      if (curHandler === handler) {
        topicHandlers.splice(i, 1)
        return
      }
    }
  }

  public publish(topic: string, data: any): void {
    const topicHandlers: Function[] = this.topics[topic]
    if (!topicHandlers) {
      return
    }
    topicHandlers.forEach((handler) => {
      handler(data)
    })
  }

  public removeall(topic: string): void {
    this.topics[topic] = []
  }
}
