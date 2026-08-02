<template>
	<SessionFormLayout
		ref="formLayoutRef"
		protocol="SSH"
		:rules="rules"
		:default-form="defaultForm"
		description="ssh session"
		:show-port-forward="true"
		:show-advanced="true"
		:form-data="formData"
		@save="handleSave"
		@save-and-connect="handleSaveAndConnect"
		@cancel="handleCancel"
	>
		<template #base>
			<el-row :gutter="5" style="margin-bottom: 18px">
				<el-col :xs="4" :sm="4" :md="4" :lg="6" :xl="4">
					<el-form-item :label="t('components.session.base.link-type.label')">
						<el-select v-model="formData.proxy" :placeholder="t('components.session.base.link-type.placeholder')">
							<el-option value="none" :label="t('components.session.base.link-type.options.directly')" />
							<el-option value="socksv5" :label="t('components.session.base.link-type.options.socks')" />
						</el-select>
					</el-form-item>
				</el-col>
				<el-col :xs="12" :sm="12" :md="12" :lg="12" :xl="15">
					<el-form-item :label="t('home.profile.base.host.title')" prop="hostAddress">
						<el-input
							v-model="formData.hostAddress"
							:placeholder="t('home.profile.base.host.placeholder')"
						/>
					</el-form-item>
				</el-col>
				<el-col :xs="8" :sm="8" :md="6" :lg="6" :xl="4">
					<el-form-item :label="t('home.profile.base.port.title')">
						<el-input-number
							size="small"
							v-model="formData.hostPort"
							controls-position="right"
							:placeholder="t('home.profile.base.port.placeholder')"
						/>
					</el-form-item>
				</el-col>
			</el-row>
			<el-row :gutter="5" v-if="formData.proxy === 'socksv5'">
				<el-col :xs="12" :sm="12" :md="12" :lg="18" :xl="19">
					<el-form-item :label="t('home.profile.auth.socksv5.host.title')">
						<el-input v-model="formData.proxyHost" :placeholder="t('home.profile.auth.socksv5.host.placeholder')" />
					</el-form-item>
				</el-col>
				<el-col :xs="8" :sm="8" :md="6" :lg="6" :xl="4">
					<el-form-item :label="t('home.profile.auth.socksv5.port.title')">
						<el-input-number size="small" v-model="formData.proxyPort" controls-position="right" :placeholder="t('home.profile.auth.socksv5.port.placeholder')" />
					</el-form-item>
				</el-col>
			</el-row>
			<el-radio-group v-model="formData.authType">
				<el-radio-button value="password">
					{{ t("home.profile.auth.auth-type.options.password") }}
				</el-radio-button>
				<el-radio-button value="cert">
					{{ t("home.profile.auth.auth-type.options.publickey") }}
				</el-radio-button>
				<el-radio-button value="keyboard-interactive">
					{{ t("home.profile.auth.auth-type.options.keyboard-interactive") }}
				</el-radio-button>
			</el-radio-group>
			<el-row :gutter="5">
				<el-col :span="12">
					<el-form-item :label="t('home.profile.auth.username.title')">
						<el-input v-model="formData.username" :placeholder="t('home.profile.auth.username.placeholder')" />
					</el-form-item>
					<el-form-item v-if="formData.authType === 'cert'" :label="t('home.profile.auth.passphrase.title')">
						<el-input v-model="formData.passphrase" :placeholder="t('home.profile.auth.passphrase.placeholder')" show-password />
					</el-form-item>
				</el-col>
				<el-col :span="12">
					<el-form-item v-if="formData.authType === 'password'" :label="t('home.profile.auth.password.title')">
						<el-input v-model="formData.password" :placeholder="t('home.profile.auth.password.placeholder')" show-password />
					</el-form-item>
					<el-form-item v-if="formData.authType === 'cert'" :label="t('home.profile.auth.publickey.title')">
						<div style="display: flex; gap: 8px; width: 100%;">
							<el-select
								v-model="selectedKeyName"
								:placeholder="t('home.settings.ssh-keys.select-placeholder')"
								clearable
								style="flex: 1;"
								@change="handleKeySelect"
							>
								<el-option
									v-for="key in sshKeys"
									:key="key.name"
									:label="`${key.name} (${key.type})`"
									:value="key.name"
								/>
								<el-option
									v-if="customFileLabel"
									:label="customFileLabel"
									:value="customFileLabel"
								/>
								<el-option :label="t('home.settings.ssh-keys.browse-file')" value="__browse__" />
							</el-select>
							<input type="file" ref="keyFileInput" style="display: none" @change="handleKeyFileChange" />
							<el-button size="small" @click="sshKeyManagerRef?.show()">{{ t('home.settings.ssh-keys.manage') }}</el-button>
						</div>
					</el-form-item>
				</el-col>
			</el-row>
		</template>
		<template #portForward>
			<el-form-item :label="t('home.profile.auth.forwardin.title')">
				<div class="n-port-forward template">
					<div class="forward-remote">
						<div class="host">
							<el-input v-model="portForwardForm.remoteHost" placeholder="127.0.0.1" />
						</div>
						<div class="port">
							<el-input-number v-model="portForwardForm.remotePort" :min="1" :max="65535" placeholder="10024" controls-position="right" />
						</div>
					</div>
					<div class="forward-link">
						<Right />
					</div>
					<div class="forward-local">
						<div class="host">
							<el-input v-model="portForwardForm.localHost" placeholder="127.0.0.1" />
						</div>
						<div class="port">
							<el-input-number v-model="portForwardForm.localPort" :min="1" :max="65535" placeholder="10024" controls-position="right" />
						</div>
					</div>
					<div class="options">
						<el-button type="primary" @click="addForward">{{ t('components.session.port.add') }}</el-button>
					</div>
				</div>
				<el-scrollbar v-if="formData.forwardIn.length" style="max-height: 260px">
					<div class="n-port-forward" v-for="(item, index) in formData.forwardIn" :key="index">
						<div class="forward-local">
							<div class="host">{{ item.localHost }}</div>
							<div class="port">{{ item.localPort }}</div>
						</div>
						<div class="forward-link">
							<Right />
						</div>
						<div class="forward-remote">
							<div class="host">{{ item.remoteHost }}</div>
							<div class="port">{{ item.remotePort }}</div>
						</div>
						<div class="options">
							<el-button link icon="Delete" @click="removeForward(index)"></el-button>
						</div>
					</div>
				</el-scrollbar>
			</el-form-item>
		</template>
		<template #advanced>
			<n-space vertical fill>
				<n-space fill align="space-between">
					<span>{{ t("home.profile.auth.forward-type.title") }}</span>
					<el-switch v-model="formData.forward" active-value="x11" inactive-value="none" />
				</n-space>
				<n-space fill align="space-between">
					<span>{{ t("home.profile.connect.keepalive.title") }}</span>
					<el-input-number v-model="formData.keepAliveInterval" controls-position="right" />
				</n-space>
				<n-space fill align="space-between">
					<span>{{ t("home.profile.connect.keepalive-count-max.title") }}</span>
					<el-input-number v-model="formData.keepAliveCountMax" controls-position="right" />
				</n-space>
				<n-space fill align="space-between">
					<span>{{ t("home.profile.connect.ready-timeout.title") }}</span>
					<el-input-number v-model="formData.readyTimeout" controls-position="right" />
				</n-space>
				<n-space fill align="space-between">
					<span>{{ t("home.profile.connect.sftp-dirt.title") }}</span>
					<el-input v-model="formData.sftpDir" style="width: 200px" />
				</n-space>
			</n-space>
		</template>
	</SessionFormLayout>
	<SshKeyManager ref="sshKeyManagerRef" @refresh="loadSshKeys" />
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { publish } from '@/services/eventbus'
import { SESSION_CONFIG_TYPE, SessionConfig } from '@/services/sessionMgr'
import sessionManager from '@/services/sessionMgr'
import { useSessionStore } from '@/store'
import SessionFormLayout from '../SessionFormLayout.vue'
import SshKeyManager from '@/views/settings/SshKeyManager.vue'
import { Right } from '@element-plus/icons-vue'

const { t } = useI18n()
const emits = defineEmits(['ok', 'cancel'])
const sessionStore = useSessionStore()
const formLayoutRef = ref()
const sshKeyManagerRef = ref()
const sshKeys = ref([])
const selectedKeyName = ref('')
const customFileLabel = ref('')
const keyFileInput = ref()
const powertools = window.powertools

const loadSshKeys = async () => {
	try {
		sshKeys.value = await powertools.listSshKeys()
	} catch {}
}

const handleKeySelect = async (keyName) => {
	if (!keyName) return
	if (keyName === '__browse__') {
		selectedKeyName.value = customFileLabel.value || ''
		keyFileInput.value?.click()
		return
	}
	if (keyName === customFileLabel.value) return
	try {
		const content = await powertools.readSshPrivateKey(keyName)
		formData.value.cert = content
		customFileLabel.value = ''
	} catch (err) {
		ElMessage.error(err.message || String(err))
	}
}

const handleKeyFileChange = async (e) => {
	const file = e.target.files?.[0]
	if (!file) return
	try {
		const content = await file.text()
		formData.value.cert = content
		customFileLabel.value = file.name
		selectedKeyName.value = file.name
	} catch (err) {
		ElMessage.error(err.message || String(err))
	}
	e.target.value = ''
}

const SUPPORTED_KEY_HEADERS = [
	'-----BEGIN OPENSSH PRIVATE KEY-----',
	'-----BEGIN RSA PRIVATE KEY-----',
	'-----BEGIN DSA PRIVATE KEY-----',
	'-----BEGIN EC PRIVATE KEY-----',
	'-----BEGIN PRIVATE KEY-----',
]

const forwardDefault = {
	localHost: '127.0.0.1',
	localPort: 10024,
	remoteHost: '127.0.0.1',
	remotePort: 10024
}
const defaultForm = {
	sessType: 'ssh',
	protocal: 'ssh',
	proxy: 'none',
	system: 'ssh',
	hostName: '',
	hostAddress: '',
	hostPort: 22,
	authType: 'password',
	username: '',
	password: '',
	cert: '',
	passphrase: '',
	proxyHost: '',
	proxyPort: 1080,
	forward: 'none',
	sftpDir: '/',
	keepAliveInterval: 60,
	keepAliveCountMax: 3,
	readyTimeout: 20000,
	xtermTheme: 'Night_3024',
	forwardIn: []
}
const deepClone = (obj) => JSON.parse(JSON.stringify(obj || {}))
const formData = ref(deepClone(defaultForm))
const portForwardForm = ref({ ...forwardDefault })

watch(() => formData.value.cert, async (newVal) => {
	if (!newVal || newVal === '') return
	try {
		let content = ''
		if (Array.isArray(newVal)) {
			const fileObj = newVal[0]
			if (fileObj?.data instanceof File) {
				content = await fileObj.data.text()
			} else if (typeof fileObj?.data === 'string') {
				content = fileObj.data
			}
		} else if (typeof newVal === 'string') {
			content = newVal
		}
		if (!content) return
		const trimmed = content.trim()
		const isSupported = SUPPORTED_KEY_HEADERS.some(h => trimmed.startsWith(h))
		const isPPK = trimmed.startsWith('PuTTY-User-Key-File-')
		if (isPPK) {
			ElMessage.warning(t('home.profile.auth.publickey.ppk-not-supported'))
			formData.value.cert = ''
		} else if (!isSupported) {
			ElMessage.warning(t('home.profile.auth.publickey.unsupported-format'))
			formData.value.cert = ''
		}
	} catch (e) {
		// ignore read errors
	}
})

const rules = {
	hostName: [{ required: true, message: t('home.profile.base.host-name.required'), trigger: 'blur' }],
	hostAddress: [{ required: true, message: t('home.profile.base.host.placeholder'), trigger: 'blur' }]
}

const addForward = () => {
	formData.value.forwardIn.push({ ...portForwardForm.value })
	portForwardForm.value = { ...forwardDefault }
}

const removeForward = (index) => {
	formData.value.forwardIn.splice(index, 1)
}

const saveOrUpdateSession = async () => {
	const layout = formLayoutRef.value
	const formVal = layout.getFormData()
	const isEdit = layout.getIsEdit()
	const sessionConfig = layout.getSessionConfig()
	const sessionName = formVal.hostName

	if (isEdit) {
		await sessionConfig.update(sessionName, Object.assign(sessionConfig.config, formVal), '')
	} else {
		const newConfig = new SessionConfig(
			sessionName,
			SESSION_CONFIG_TYPE.NODE,
			formVal,
			'ssh session'
		)
		await sessionStore.appendSessionConfig(newConfig)
	}
	publish('refresh-session-tree')
	return { formVal, sessionConfig, isEdit }
}

const handleSave = async () => {
	const { formVal } = await saveOrUpdateSession()
	formLayoutRef.value?.close()
	emits('ok', formVal)
}

const handleSaveAndConnect = async () => {
	const { formVal, sessionConfig } = await saveOrUpdateSession()
	await sessionManager.createSessionInstance(sessionConfig)
	formLayoutRef.value?.close()
	emits('ok', formVal)
}

const handleCancel = () => {
	for (const key of Object.keys(formData.value)) {
		delete formData.value[key]
	}
	Object.assign(formData.value, deepClone(defaultForm))
	portForwardForm.value = deepClone(forwardDefault)
	emits('cancel')
}

const showModal = (sessionId) => {
	// Reset formData in-place (not reassign, to preserve prop binding)
	for (const key of Object.keys(formData.value)) {
		delete formData.value[key]
	}
	Object.assign(formData.value, deepClone(defaultForm))
	portForwardForm.value = deepClone(forwardDefault)
	selectedKeyName.value = ''
	customFileLabel.value = ''
	loadSshKeys()

	if (sessionId) {
		// Handle legacy forwardInRemoteHost migration before SessionFormLayout loads config
		const sessionConfig = sessionManager.getSessionConfigById(sessionId)
		if (sessionConfig) {
			const { config } = sessionConfig
			if (config && Object.prototype.hasOwnProperty.call(config, 'forwardInRemoteHost') && !["127.0.0.1", "localhost"].includes(config.forwardInRemoteHost)) {
				const { forwardInRemoteHost, forwardInRemotePort, forwardInLocalHost, forwardInLocalPort } = config
				config.forwardIn = [
					{
						localHost: forwardInLocalHost,
						localPort: forwardInLocalPort,
						remoteHost: forwardInRemoteHost,
						remotePort: forwardInRemotePort
					}
				]
			}
		}
	}
	formLayoutRef.value?.showModal(sessionId)
}

defineExpose({ showModal })
</script>

<style lang="scss" scoped>
.n-port-forward {
	width: 100%;
	display: grid;
	grid-template-columns: 40% 50px 40% 8%;
	grid-gap: 10px;

	.forward-local,
	.forward-remote {
		display: flex;
		justify-content: space-between;
		align-items: center;
		column-gap: 5px;

		.host,
		.port {
			display: flex;
			justify-content: flex-start;
			align-items: center;
		}
	}

	.forward-link {
		display: flex;
		justify-content: center;
		align-items: center;
		box-sizing: content-box;
		font-size: 24px;

		svg {
			width: 24px;
			height: 24px;
		}
	}

	.options {
		display: flex;
		justify-content: center;
		align-items: center;
		color: #f00;
	}
}

.template {
	margin-bottom: 10px;
}
</style>
