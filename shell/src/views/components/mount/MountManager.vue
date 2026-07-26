<template>
	<el-dialog
		v-model="visible"
		:title="$t('mount.manager.title')"
		width="700px"
		:close-on-click-modal="false"
		@close="handleClose"
	>
		<div class="mount-manager">
			<!-- 挂载点列表 -->
			<div class="mount-list">
				<div
					v-for="mount in mounts"
					:key="mount.id"
					class="mount-item"
					:class="{ active: selectedMount?.id === mount.id }"
					@click="selectMount(mount)"
				>
					<div class="mount-icon">
						<el-icon v-if="mount.type === 'local'"><Folder /></el-icon>
						<el-icon v-else-if="mount.type === 'webdav'"><Cloudy /></el-icon>
						<el-icon v-else-if="mount.type === 'sftp'"><Monitor /></el-icon>
						<el-icon v-else><FolderOpened /></el-icon>
					</div>
					<div class="mount-info">
						<div class="mount-name">{{ mount.name }}</div>
						<div class="mount-type">{{ getMountTypeLabel(mount.type) }}</div>
					</div>
					<div class="mount-status">
						<el-tag v-if="mount.readonly" size="small" type="info">{{ $t('mount.readonly') }}</el-tag>
						<el-tag v-if="mount.id === 'local'" size="small" type="success">{{ $t('mount.default') }}</el-tag>
					</div>
				</div>
			</div>

			<!-- 操作按钮 -->
			<div class="mount-actions">
				<el-button type="primary" @click="showAddDialog">
					<el-icon><Plus /></el-icon>
					{{ $t('mount.add') }}
				</el-button>
				<el-button
					:disabled="!selectedMount || selectedMount.id === 'local'"
					@click="showEditDialog"
				>
					<el-icon><Edit /></el-icon>
					{{ $t('mount.edit') }}
				</el-button>
				<el-button
					type="danger"
					:disabled="!selectedMount || selectedMount.id === 'local'"
					@click="handleDelete"
				>
					<el-icon><Delete /></el-icon>
					{{ $t('mount.delete') }}
				</el-button>
			</div>
		</div>

		<!-- 添加/编辑对话框 -->
		<el-dialog
			v-model="editDialogVisible"
			:title="isEditing ? $t('mount.edit') : $t('mount.add')"
			width="500px"
			append-to-body
			:close-on-click-modal="false"
		>
			<el-form
				ref="formRef"
				:model="editForm"
				:rules="formRules"
				label-width="100px"
			>
				<el-form-item :label="$t('mount.form.name')" prop="name">
					<el-input v-model="editForm.name" :placeholder="$t('mount.form.namePlaceholder')" />
				</el-form-item>

				<el-form-item :label="$t('mount.form.type')" prop="type">
					<el-radio-group v-model="editForm.type" :disabled="isEditing">
						<el-radio value="webdav">WebDAV</el-radio>
						<el-radio value="sftp">SFTP</el-radio>
					</el-radio-group>
				</el-form-item>

				<!-- WebDAV 配置 -->
				<template v-if="editForm.type === 'webdav'">
					<el-form-item :label="$t('mount.form.url')" prop="config.url">
						<el-input v-model="editForm.config.url" placeholder="https://dav.example.com" />
					</el-form-item>
					<el-form-item :label="$t('mount.form.basePath')">
						<el-input v-model="editForm.config.basePath" placeholder="/nxshell" />
					</el-form-item>
					<el-form-item :label="$t('mount.form.username')">
						<el-input v-model="editForm.config.username" />
					</el-form-item>
					<el-form-item :label="$t('mount.form.password')">
						<el-input v-model="editForm.config.password" type="password" show-password />
					</el-form-item>
				</template>

				<!-- SFTP 配置 -->
				<template v-if="editForm.type === 'sftp'">
					<el-form-item :label="$t('mount.form.host')" prop="config.host">
						<el-input v-model="editForm.config.host" placeholder="192.168.1.100" />
					</el-form-item>
					<el-form-item :label="$t('mount.form.port')">
						<el-input-number v-model="editForm.config.port" :min="1" :max="65535" />
					</el-form-item>
					<el-form-item :label="$t('mount.form.basePath')">
						<el-input v-model="editForm.config.basePath" placeholder="~/.nxshell" />
					</el-form-item>
					<el-form-item :label="$t('mount.form.username')">
						<el-input v-model="editForm.config.username" />
					</el-form-item>
					<el-form-item :label="$t('mount.form.authType')">
						<el-radio-group v-model="editForm.config.authType">
							<el-radio value="password">{{ $t('mount.form.authPassword') }}</el-radio>
							<el-radio value="publickey">{{ $t('mount.form.authKey') }}</el-radio>
						</el-radio-group>
					</el-form-item>
					<el-form-item v-if="editForm.config.authType === 'password'" :label="$t('mount.form.password')">
						<el-input v-model="editForm.config.password" type="password" show-password />
					</el-form-item>
					<el-form-item v-if="editForm.config.authType === 'publickey'" :label="$t('mount.form.privateKey')">
						<el-input v-model="editForm.config.privateKey" :placeholder="$t('mount.form.privateKeyPlaceholder')" />
					</el-form-item>
				</template>

				<el-form-item :label="$t('mount.form.readonly')">
					<el-switch v-model="editForm.readonly" />
				</el-form-item>
			</el-form>

			<template #footer>
				<el-button @click="editDialogVisible = false">{{ $t('common.cancel') }}</el-button>
				<el-button type="info" :loading="testing" @click="handleTestConnection">
					{{ $t('mount.testConnection') }}
				</el-button>
				<el-button type="primary" :loading="saving" @click="handleSave">
					{{ $t('common.save') }}
				</el-button>
			</template>
		</el-dialog>
	</el-dialog>
</template>

<script>
import { Folder, Cloudy, Monitor, FolderOpened, Plus, Edit, Delete } from "@element-plus/icons-vue"
import { ElMessage, ElMessageBox } from "element-plus"
import mountManager, { MOUNT_TYPES } from "@/services/storage/mountManager"

export default {
	name: "MountManager",
	components: {
		Folder,
		Cloudy,
		Monitor,
		FolderOpened,
		Plus,
		Edit,
		Delete
	},
	props: {
		modelValue: {
			type: Boolean,
			default: false
		}
	},
	emits: ["update:modelValue", "change"],
	data() {
		return {
			mounts: [],
			selectedMount: null,
			editDialogVisible: false,
			isEditing: false,
			testing: false,
			saving: false,
			editForm: this.getDefaultForm(),
			formRules: {
				name: [{ required: true, message: this.$t("mount.form.nameRequired"), trigger: "blur" }],
				type: [{ required: true, message: this.$t("mount.form.typeRequired"), trigger: "change" }],
				"config.url": [{ required: true, message: this.$t("mount.form.urlRequired"), trigger: "blur" }],
				"config.host": [{ required: true, message: this.$t("mount.form.hostRequired"), trigger: "blur" }]
			}
		}
	},
	computed: {
		visible: {
			get() {
				return this.modelValue
			},
			set(val) {
				this.$emit("update:modelValue", val)
			}
		}
	},
	watch: {
		modelValue(val) {
			if (val) {
				this.loadMounts()
			}
		}
	},
	methods: {
		getDefaultForm() {
			return {
				name: "",
				type: "webdav",
				readonly: false,
				config: {
					url: "",
					basePath: "/nxshell",
					host: "",
					port: 22,
					username: "",
					password: "",
					authType: "password",
					privateKey: ""
				}
			}
		},
		async loadMounts() {
			await mountManager.initialize()
			this.mounts = mountManager.getMounts()
		},
		selectMount(mount) {
			this.selectedMount = mount
		},
		getMountTypeLabel(type) {
			const labels = {
				[MOUNT_TYPES.LOCAL]: this.$t("mount.type.local"),
				[MOUNT_TYPES.WEBDAV]: "WebDAV",
				[MOUNT_TYPES.SFTP]: "SFTP",
				[MOUNT_TYPES.S3]: "S3"
			}
			return labels[type] || type
		},
		showAddDialog() {
			this.isEditing = false
			this.editForm = this.getDefaultForm()
			this.editDialogVisible = true
		},
		showEditDialog() {
			if (!this.selectedMount) return
			this.isEditing = true
			this.editForm = {
				id: this.selectedMount.id,
				name: this.selectedMount.name,
				type: this.selectedMount.type,
				readonly: this.selectedMount.readonly,
				config: { ...this.selectedMount.config }
			}
			this.editDialogVisible = true
		},
		async handleTestConnection() {
			this.testing = true
			try {
				const result = await mountManager.testConnection(this.editForm)
				if (result.success) {
					ElMessage.success(result.message)
				} else {
					ElMessage.error(result.message)
				}
			} catch (e) {
				ElMessage.error(e.message || this.$t("mount.testFailed"))
			} finally {
				this.testing = false
			}
		},
		async handleSave() {
			try {
				await this.$refs.formRef.validate()
			} catch {
				return
			}

			this.saving = true
			try {
				if (this.isEditing) {
					await mountManager.updateMount(this.editForm.id, {
						name: this.editForm.name,
						readonly: this.editForm.readonly,
						config: this.editForm.config
					})
					ElMessage.success(this.$t("mount.updateSuccess"))
				} else {
					await mountManager.addMount({
						name: this.editForm.name,
						type: this.editForm.type,
						readonly: this.editForm.readonly,
						config: this.editForm.config
					})
					ElMessage.success(this.$t("mount.addSuccess"))
				}
				this.editDialogVisible = false
				await this.loadMounts()
				this.$emit("change")
			} catch (e) {
				ElMessage.error(e.message || this.$t("mount.saveFailed"))
			} finally {
				this.saving = false
			}
		},
		async handleDelete() {
			if (!this.selectedMount || this.selectedMount.id === "local") return

			try {
				await ElMessageBox.confirm(
					this.$t("mount.deleteConfirm", { name: this.selectedMount.name }),
					this.$t("common.warning"),
					{ type: "warning" }
				)
			} catch {
				return
			}

			try {
				await mountManager.removeMount(this.selectedMount.id)
				ElMessage.success(this.$t("mount.deleteSuccess"))
				this.selectedMount = null
				await this.loadMounts()
				this.$emit("change")
			} catch (e) {
				ElMessage.error(e.message || this.$t("mount.deleteFailed"))
			}
		},
		handleClose() {
			this.selectedMount = null
		}
	}
}
</script>

<style lang="scss" scoped>
.mount-manager {
	min-height: 300px;
}

.mount-list {
	border: 1px solid var(--el-border-color);
	border-radius: 4px;
	max-height: 400px;
	overflow-y: auto;
}

.mount-item {
	display: flex;
	align-items: center;
	padding: 12px 16px;
	cursor: pointer;
	border-bottom: 1px solid var(--el-border-color-lighter);
	transition: background-color 0.2s;

	&:last-child {
		border-bottom: none;
	}

	&:hover {
		background-color: var(--el-fill-color-light);
	}

	&.active {
		background-color: var(--el-color-primary-light-9);
	}
}

.mount-icon {
	font-size: 24px;
	margin-right: 12px;
	color: var(--el-color-primary);
}

.mount-info {
	flex: 1;
}

.mount-name {
	font-size: 14px;
	font-weight: 500;
}

.mount-type {
	font-size: 12px;
	color: var(--el-text-color-secondary);
	margin-top: 2px;
}

.mount-status {
	display: flex;
	gap: 4px;
}

.mount-actions {
	margin-top: 16px;
	display: flex;
	gap: 8px;
}
</style>
