import { defineStore } from "pinia"
import { ref, computed } from "vue"

export type TransferDirection = "upload" | "download"
export type TransferStatus = "pending" | "transferring" | "done" | "error"

export interface TransferFileTask {
	id: string
	transferId: string
	fileId: number
	name: string
	size: number
	direction: TransferDirection
	progress: number
	speed: string
	status: TransferStatus
	message: string
}

/**
 * Retry callbacks are kept outside of reactive state on purpose: they are
 * closures created by the file view that re-issue a single-file transfer.
 * Storing functions in Pinia state would trigger reactivity warnings.
 */
const retryCallbacks = new Map<string, () => Promise<void> | void>()

const useTransferStore = defineStore("transfer", () => {
	const tasks = ref<TransferFileTask[]>([])
	const visible = ref(false)

	const activeCount = computed(() => tasks.value.filter((t) => t.status === "pending" || t.status === "transferring").length)
	const errorCount = computed(() => tasks.value.filter((t) => t.status === "error").length)
	const doneCount = computed(() => tasks.value.filter((t) => t.status === "done").length)
	const hasTasks = computed(() => tasks.value.length > 0)

	function _taskKey(transferId: string, fileId: number) {
		return `${transferId}:${fileId}`
	}

	function _find(transferId: string, fileId: number) {
		const key = _taskKey(transferId, fileId)
		return tasks.value.find((t) => t.id === key)
	}

	/**
	 * Register the full file list for a transfer up-front (from the `queued` event).
	 */
	function queueFiles(
		transferId: string,
		direction: TransferDirection,
		files: Array<{ fileId: number; name: string; size: number }>
	) {
		files.forEach((f) => {
			const key = _taskKey(transferId, f.fileId)
			if (tasks.value.some((t) => t.id === key)) {
				return
			}
			tasks.value.push({
				id: key,
				transferId,
				fileId: f.fileId,
				name: f.name,
				size: f.size,
				direction,
				progress: 0,
				speed: "",
				status: "pending",
				message: ""
			})
		})
		visible.value = true
	}

	function startFile(transferId: string, fileId: number) {
		const task = _find(transferId, fileId)
		if (task) {
			task.status = "transferring"
			task.progress = task.progress || 0
		}
	}

	function updateFile(transferId: string, fileId: number, progress: number, speed: string) {
		const task = _find(transferId, fileId)
		if (task) {
			task.status = "transferring"
			task.progress = progress
			task.speed = speed || ""
		}
	}

	function finishFile(transferId: string, fileId: number) {
		const task = _find(transferId, fileId)
		if (task) {
			task.status = "done"
			task.progress = 100
			task.speed = ""
		}
	}

	function errorFile(transferId: string, fileId: number, message: string) {
		const task = _find(transferId, fileId)
		if (task) {
			task.status = "error"
			task.speed = ""
			task.message = message || "transfer failed"
		}
	}

	function registerRetry(taskId: string, fn: () => Promise<void> | void) {
		retryCallbacks.set(taskId, fn)
	}

	async function retry(taskId: string) {
		const task = tasks.value.find((t) => t.id === taskId)
		const fn = retryCallbacks.get(taskId)
		if (!task || !fn) {
			return
		}
		task.status = "pending"
		task.progress = 0
		task.speed = ""
		task.message = ""
		try {
			await fn()
		} catch (e: any) {
			task.status = "error"
			task.message = e && e.message ? e.message : String(e)
		}
	}

	function clearCompleted() {
		const removed = tasks.value.filter((t) => t.status === "done")
		removed.forEach((t) => retryCallbacks.delete(t.id))
		tasks.value = tasks.value.filter((t) => t.status !== "done")
		if (tasks.value.length === 0) {
			visible.value = false
		}
	}

	function clearAll() {
		tasks.value.forEach((t) => retryCallbacks.delete(t.id))
		tasks.value = []
		visible.value = false
	}

	function show() {
		visible.value = true
	}

	function hide() {
		visible.value = false
	}

	function toggle() {
		visible.value = !visible.value
	}

	return {
		tasks,
		visible,
		activeCount,
		errorCount,
		doneCount,
		hasTasks,
		queueFiles,
		startFile,
		updateFile,
		finishFile,
		errorFile,
		registerRetry,
		retry,
		clearCompleted,
		clearAll,
		show,
		hide,
		toggle
	}
})

export default useTransferStore
