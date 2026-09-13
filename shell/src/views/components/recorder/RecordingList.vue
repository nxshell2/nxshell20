<template>
	<el-dialog
		v-model="visible"
		:title="$t('home.recorder.recordings-title')"
		width="600px"
		@close="onClose"
	>
		<div class="recordings-list" v-loading="loading">
			<div v-if="recordings.length === 0 && !loading" class="empty-tip">
				{{ $t('home.recorder.no-recordings') }}
			</div>
			<div v-for="rec in recordings" :key="rec.fileName" class="recording-item">
				<div class="rec-info">
					<div class="rec-name">{{ rec.sessionName }}</div>
					<div class="rec-meta">
						<span>{{ formatDate(rec.startTime) }}</span>
						<span>{{ formatDuration(rec.duration) }}</span>
					</div>
				</div>
				<div class="rec-actions">
					<el-button size="small" type="primary" @click="playRecording(rec)">
						{{ $t('home.recorder.play') }}
					</el-button>
					<el-button size="small" @click="exportRecording(rec)">
						{{ $t('home.recorder.export') }}
					</el-button>
					<el-button size="small" type="danger" @click="deleteRecording(rec)">
						{{ $t('home.recorder.delete') }}
					</el-button>
				</div>
			</div>
		</div>
	</el-dialog>
</template>

<script>
import { listRecordings, deleteRecording } from "@/services/terminalRecorder"

export default {
	name: "RecordingList",
	data() {
		return {
			visible: false,
			loading: false,
			recordings: [],
			sessionUuid: null
		}
	},
	methods: {
		async show(sessionUuid) {
			this.sessionUuid = sessionUuid || null
			this.visible = true
			this.loading = true
			try {
				this.recordings = await listRecordings(sessionUuid || undefined)
			} catch (e) {
				console.error("[RecordingList] Failed to list recordings:", e)
				this.recordings = []
			}
			this.loading = false
		},
		playRecording(rec) {
			this.visible = false
			this.$emit("play", rec)
		},
		async exportRecording(rec) {
			try {
				const Storage = (await import("@/services/storage")).default
				const content = await Storage.localStorage.readFile(rec.filePath)
				if (!content) return
				const blob = new Blob([content], { type: "text/plain" })
				const url = URL.createObjectURL(blob)
				const a = document.createElement("a")
				a.href = url
				a.download = rec.fileName
				document.body.appendChild(a)
				a.click()
				document.body.removeChild(a)
				URL.revokeObjectURL(url)
			} catch (e) {
				console.error("[RecordingList] Export failed:", e)
			}
		},
		async deleteRecording(rec) {
			try {
				await deleteRecording(rec.filePath)
				this.recordings = this.recordings.filter(r => r.fileName !== rec.fileName)
			} catch (e) {
				console.error("[RecordingList] Delete failed:", e)
			}
		},
		formatDate(timestamp) {
			const d = new Date(timestamp)
			return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
		},
		formatDuration(seconds) {
			const m = Math.floor(seconds / 60)
			const s = Math.floor(seconds % 60)
			return `${m}:${s.toString().padStart(2, "0")}`
		},
		onClose() {
			this.visible = false
		}
	}
}
</script>

<style lang="scss" scoped>
.recordings-list {
	max-height: 400px;
	overflow-y: auto;

	.empty-tip {
		text-align: center;
		padding: 40px;
		color: var(--n-text-color-disabled);
	}

	.recording-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 12px;
		border-bottom: 1px solid var(--n-border-color);

		&:hover {
			background-color: var(--n-bg-color-light);
		}

		.rec-info {
			flex: 1;
			min-width: 0;

			.rec-name {
				font-size: 14px;
				color: var(--n-text-color-base);
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.rec-meta {
				display: flex;
				gap: 16px;
				margin-top: 4px;
				font-size: 12px;
				color: var(--n-text-color-disabled);
			}
		}

		.rec-actions {
			display: flex;
			gap: 8px;
			flex-shrink: 0;
		}
	}
}
</style>
