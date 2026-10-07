<template>
	<transition name="transfer-panel-fade">
		<div v-if="visible && hasTasks" class="transfer-panel">
			<div class="transfer-panel__header">
				<div class="transfer-panel__title">
					<el-icon><Files /></el-icon>
					<span>{{ $t('home.fileview.transfer.title') }}</span>
					<span v-if="activeCount" class="transfer-panel__badge transfer-panel__badge--active">
						{{ $t('home.fileview.transfer.active', [activeCount]) }}
					</span>
					<span v-if="errorCount" class="transfer-panel__badge transfer-panel__badge--error">
						{{ $t('home.fileview.transfer.failed', [errorCount]) }}
					</span>
					<span v-if="doneCount" class="transfer-panel__badge transfer-panel__badge--done">
						{{ $t('home.fileview.transfer.done', [doneCount]) }}
					</span>
				</div>
				<div class="transfer-panel__actions">
					<el-tooltip :content="$t('home.fileview.transfer.retry-all-failed')" placement="top">
						<el-button v-if="errorCount" text size="small" @click="retryAllFailed">
							<el-icon><RefreshRight /></el-icon>
						</el-button>
					</el-tooltip>
					<el-tooltip :content="$t('home.fileview.transfer.clear-completed')" placement="top">
						<el-button text size="small" @click="clearCompleted">
							<el-icon><Check /></el-icon>
						</el-button>
					</el-tooltip>
					<el-tooltip :content="$t('home.fileview.transfer.clear-all')" placement="top">
						<el-button text size="small" @click="clearAll">
							<el-icon><Delete /></el-icon>
						</el-button>
					</el-tooltip>
					<el-button text size="small" @click="hide">
						<el-icon><Close /></el-icon>
					</el-button>
				</div>
			</div>

			<div class="transfer-panel__body">
				<div v-for="task in tasks" :key="task.id" class="transfer-row" :class="`transfer-row--${task.status}`">
					<div class="transfer-row__dir">
						<el-icon v-if="task.direction === 'upload'"><Upload /></el-icon>
						<el-icon v-else><Download /></el-icon>
					</div>
					<div class="transfer-row__main">
						<div class="transfer-row__line">
							<span class="transfer-row__name" :title="task.name">{{ task.name }}</span>
							<span class="transfer-row__meta">
								<span v-if="task.speed && task.status === 'transferring'" class="transfer-row__speed">{{ task.speed }}</span>
								<span class="transfer-row__size">{{ formatSize(task.size) }}</span>
							</span>
						</div>
						<el-progress
							:percentage="clamp(task.progress)"
							:status="progressStatus(task)"
							:stroke-width="6"
							:show-text="false"
						/>
						<div v-if="task.status === 'error'" class="transfer-row__error" :title="task.message">
							{{ task.message }}
						</div>
					</div>
					<div class="transfer-row__state">
						<el-icon v-if="task.status === 'done'" class="is-done"><CircleCheck /></el-icon>
						<el-icon v-else-if="task.status === 'transferring'" class="is-loading"><Loading /></el-icon>
						<el-icon v-else-if="task.status === 'pending'" class="is-pending"><Clock /></el-icon>
						<template v-else-if="task.status === 'error'">
							<el-tooltip :content="$t('home.fileview.transfer.retry')" placement="top">
								<el-button text size="small" @click="retry(task.id)">
									<el-icon class="is-error"><RefreshRight /></el-icon>
								</el-button>
							</el-tooltip>
						</template>
					</div>
				</div>
			</div>
		</div>
	</transition>

	<transition name="transfer-fab-fade">
		<div
			v-if="!visible && hasTasks"
			class="transfer-fab"
			:class="{ 'transfer-fab--error': errorCount > 0 }"
			:title="$t('home.fileview.transfer.title')"
			@click="show"
		>
			<el-icon v-if="activeCount > 0" class="transfer-fab__spin"><Loading /></el-icon>
			<el-icon v-else-if="errorCount > 0"><WarningFilled /></el-icon>
			<el-icon v-else><Files /></el-icon>
			<span v-if="badgeCount > 0" class="transfer-fab__badge">{{ badgeCount }}</span>
		</div>
	</transition>
</template>

<script>
import { mapState, mapActions } from 'pinia'
import useTransferStore from '@/store/modules/transfer'

function formatSize(size) {
	if (!size || size <= 0) {
		return '0 B'
	}
	const units = ['B', 'KB', 'MB', 'GB', 'TB']
	let v = size
	let i = 0
	while (v >= 1024 && i < units.length - 1) {
		v /= 1024
		i++
	}
	return `${i === 0 ? v : v.toFixed(1)} ${units[i]}`
}

export default {
	name: 'TransferPanel',
	computed: {
		...mapState(useTransferStore, ['tasks', 'visible', 'activeCount', 'errorCount', 'doneCount', 'hasTasks']),
		badgeCount() {
			return this.activeCount > 0 ? this.activeCount : this.errorCount
		}
	},
	methods: {
		...mapActions(useTransferStore, ['retry', 'clearCompleted', 'clearAll', 'hide', 'show']),
		formatSize,
		clamp(v) {
			if (v < 0) return 0
			if (v > 100) return 100
			return Math.round(v)
		},
		progressStatus(task) {
			if (task.status === 'error') return 'exception'
			if (task.status === 'done') return 'success'
			return ''
		},
		retryAllFailed() {
			this.tasks.filter((t) => t.status === 'error').forEach((t) => this.retry(t.id))
		}
	}
}
</script>

<style lang="scss" scoped>
.transfer-panel {
	position: fixed;
	right: 16px;
	bottom: 16px;
	width: 380px;
	max-height: 420px;
	display: flex;
	flex-direction: column;
	background-color: var(--n-bg-color-light, #fff);
	border: 1px solid var(--el-border-color, #dcdfe6);
	border-radius: 8px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
	z-index: 2000;
	overflow: hidden;

	&__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 10px;
		border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
		flex-shrink: 0;
	}

	&__title {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		font-weight: 600;
		color: var(--n-text-color-base, #303133);
	}

	&__badge {
		font-size: 11px;
		font-weight: 400;
		padding: 1px 6px;
		border-radius: 10px;

		&--active {
			color: var(--el-color-primary, #409eff);
			background: var(--el-color-primary-light-9, #ecf5ff);
		}

		&--error {
			color: var(--el-color-danger, #f56c6c);
			background: var(--el-color-danger-light-9, #fef0f0);
		}

		&--done {
			color: var(--el-color-success, #67c23a);
			background: var(--el-color-success-light-9, #f0f9eb);
		}
	}

	&__actions {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	&__body {
		flex: 1;
		overflow-y: auto;
		padding: 4px 0;
	}
}

.transfer-row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 10px;

	&:hover {
		background-color: var(--el-fill-color-light, #f5f7fa);
	}

	&__dir {
		flex-shrink: 0;
		color: var(--el-text-color-secondary, #909399);
		font-size: 16px;
	}

	&__main {
		flex: 1;
		min-width: 0;
	}

	&__line {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 3px;
	}

	&__name {
		font-size: 12px;
		color: var(--n-text-color-base, #303133);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	&__meta {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		color: var(--el-text-color-secondary, #909399);
	}

	&__speed {
		color: var(--el-color-primary, #409eff);
	}

	&__error {
		margin-top: 3px;
		font-size: 11px;
		color: var(--el-color-danger, #f56c6c);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	&__state {
		flex-shrink: 0;
		width: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;

		.is-done {
			color: var(--el-color-success, #67c23a);
		}

		.is-error {
			color: var(--el-color-danger, #f56c6c);
		}

		.is-pending {
			color: var(--el-text-color-secondary, #909399);
		}

		.is-loading {
			color: var(--el-color-primary, #409eff);
			animation: transfer-spin 1s linear infinite;
		}
	}
}

@keyframes transfer-spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

.transfer-panel-fade-enter-active,
.transfer-panel-fade-leave-active {
	transition: opacity 0.2s ease, transform 0.2s ease;
}

.transfer-panel-fade-enter-from,
.transfer-panel-fade-leave-to {
	opacity: 0;
	transform: translateY(10px);
}

.transfer-fab {
	position: fixed;
	right: 20px;
	bottom: 20px;
	width: 44px;
	height: 44px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: var(--el-color-primary, #409eff);
	color: #fff;
	font-size: 20px;
	cursor: pointer;
	box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
	z-index: 2000;
	transition: transform 0.15s ease, box-shadow 0.15s ease;

	&:hover {
		transform: scale(1.08);
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
	}

	&--error {
		background-color: var(--el-color-danger, #f56c6c);
	}

	&__spin {
		animation: transfer-spin 1s linear infinite;
	}

	&__badge {
		position: absolute;
		top: -4px;
		right: -4px;
		min-width: 18px;
		height: 18px;
		padding: 0 4px;
		border-radius: 9px;
		background-color: #fff;
		color: var(--el-color-primary, #409eff);
		font-size: 11px;
		line-height: 18px;
		text-align: center;
		font-weight: 600;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	&--error &__badge {
		color: var(--el-color-danger, #f56c6c);
	}
}

.transfer-fab-fade-enter-active,
.transfer-fab-fade-leave-active {
	transition: opacity 0.2s ease, transform 0.2s ease;
}

.transfer-fab-fade-enter-from,
.transfer-fab-fade-leave-to {
	opacity: 0;
	transform: scale(0.6);
}
</style>
